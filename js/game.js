/* Bluff — main game loop.
 *
 * Draws the board, owns input, runs the per-guess pipeline:
 *   guess + answer → trueColors → lieSchedule.apply → liedColors → render
 * Persists to localStorage keyed by date so a refresh resumes the same
 * game on the same puzzle.
 */
(function () {
    'use strict';

    const MAX_GUESSES = 6;
    const WORD_LEN = 5;
    const STORE_PREFIX = 'bluff:v1:';

    /* Pull module APIs into the IIFE closure so we can scrub the window
       globals after init without breaking gameplay. Everything below this
       line uses the locals; nothing reaches back to `window.BLUFF_*`. */
    const Words = window.BLUFF_WORDS;
    const Seed  = window.BLUFF_SEED;
    const Lies  = window.BLUFF_LIES;
    const Share = window.BLUFF_SHARE;

    /* ---------- Compute true (honest) colours for a guess ---------- */

    function trueColors(guess, answer) {
        const out = new Array(WORD_LEN).fill('absent');
        const aLeft = answer.split('');
        // pass 1 — correct
        for (let i = 0; i < WORD_LEN; i++) {
            if (guess[i] === answer[i]) {
                out[i] = 'correct';
                aLeft[i] = null;
            }
        }
        // pass 2 — present (without double-counting)
        for (let i = 0; i < WORD_LEN; i++) {
            if (out[i] === 'correct') continue;
            const idx = aLeft.indexOf(guess[i]);
            if (idx !== -1) {
                out[i] = 'present';
                aLeft[idx] = null;
            }
        }
        return out;
    }

    /* ---------- Persistence ----------
     *
     * Saves are obfuscated with an XOR stream keyed to the daily seed AND
     * signed with a checksum. Goals:
     *   • DevTools → Application doesn't show "answer: 'child'" in plaintext.
     *   • Editing the storage entry by hand breaks the checksum — we treat
     *     a tampered payload as a forfeit (locked out for the day) so
     *     trying to reset doesn't get you anywhere.
     *   • Clearing localStorage outright still loses the lockout — for that
     *     case we ALSO mirror a "completed" sentinel in sessionStorage,
     *     keyed by an unguessable hash of the date, so cheating across
     *     stores requires more than one click.
     *
     * This is not crypto. A determined user reading the JS source can decode
     * anything. We're stopping casual cheats: console snooping and storage
     * tampering. */

    function storageKey(dateKey) {
        // Hashed key — the dev console doesn't show "bluff:v1:2026-05-01"
        // sitting next to a base64 blob. Lookup is still O(1) because we
        // hash the same way every time.
        return 'b:' + Seed.hashStr(STORE_PREFIX + dateKey).toString(16);
    }

    function sessionLockKey(dateKey) {
        return 'bs:' + Seed.hashStr('bluff-locked:' + dateKey).toString(16);
    }

    function cipherSeed(dateKey) {
        return Seed.hashStr('bluff-cipher:' + dateKey);
    }

    function isSessionLocked(dateKey) {
        try { return sessionStorage.getItem(sessionLockKey(dateKey)) === '1'; }
        catch (_) { return false; }
    }
    function markSessionLocked(dateKey) {
        try { sessionStorage.setItem(sessionLockKey(dateKey), '1'); } catch (_) {}
    }

    function loadState(dateKey) {
        try {
            const raw = localStorage.getItem(storageKey(dateKey));
            if (!raw) return null;
            const decoded = Seed.deobfuscate(raw, cipherSeed(dateKey));
            if (!decoded) return 'tampered';
            const sepIdx = decoded.lastIndexOf('|');
            if (sepIdx < 0) return 'tampered';
            const payload = decoded.slice(0, sepIdx);
            const sig = decoded.slice(sepIdx + 1);
            const expected = Seed.hashStr(payload + ':' + cipherSeed(dateKey)).toString(16);
            if (sig !== expected) return 'tampered';
            const v = JSON.parse(payload);
            if (!v || v.dateKey !== dateKey) return 'tampered';
            return v;
        } catch (_) {
            return 'tampered';
        }
    }

    function saveState(s) {
        try {
            const payload = JSON.stringify(s);
            const sig = Seed.hashStr(payload + ':' + cipherSeed(s.dateKey)).toString(16);
            const blob = Seed.obfuscate(payload + '|' + sig, cipherSeed(s.dateKey));
            localStorage.setItem(storageKey(s.dateKey), blob);
            if (s.won || s.lost) markSessionLocked(s.dateKey);
        } catch (_) {}
    }

    /* ---------- Build today's puzzle (deterministic) ---------- */

    function buildPuzzle() {
        const today = new Date();
        const dateKey = Seed.dateKey(today);
        const puzzleNumber = Seed.puzzleNumber(today);
        const rng = Seed.makeDailyRng(today);

        // Order matters — see seed.js note on determinism contract.
        const answers = Words.ANSWERS;
        const answer = answers[Math.floor(rng() * answers.length)].toLowerCase();
        const schedule = Lies.pickSchedule(rng);
        const lieParams = schedule.buildParams(rng, MAX_GUESSES);

        return {
            dateKey: dateKey,
            puzzleNumber: puzzleNumber,
            answer: answer,
            scheduleId: schedule.id,
            lieParams: lieParams,
            // gameplay state
            guesses: [],   // [{word, true: [...], lied: [...]}]
            current: '',
            won: false,
            lost: false,
            maxGuesses: MAX_GUESSES
        };
    }

    function getSchedule(id) {
        return Lies.SCHEDULES.find(s => s.id === id) || Lies.SCHEDULES[0];
    }

    /* ---------- DOM ---------- */

    const $ = id => document.getElementById(id);
    const board   = $('board');
    const kb      = $('keyboard');
    const status  = $('statusLine');
    const toast   = $('toast');
    const endModal= $('endModal');
    const howModal= $('howToModal');

    let state = null;

    function render(flipRowIdx) {
        renderBoard(typeof flipRowIdx === 'number' ? flipRowIdx : -1);
        renderKeyboard();
        renderStatus();
        $('puzzleNumber').textContent = 'Puzzle #' + state.puzzleNumber;
    }

    /* renderBoard does INCREMENTAL updates after the first call:
       - It builds the 6×5 skeleton once.
       - Submitted rows are painted exactly once (with `.revealed` flip
         applied if `flipRowIdx === r`), then marked `data-locked="1"` and
         never touched again. This is the cure for both bugs:
         the pop-pulse on already-submitted rows and the flip re-trigger.
       - Only the active typing row re-renders per keystroke, and only the
         tile whose letter actually changed gets the `.pop` animation. */
    let boardBuilt = false;
    function buildSkeleton() {
        board.innerHTML = '';
        for (let r = 0; r < MAX_GUESSES; r++) {
            const row = document.createElement('div');
            row.className = 'row';
            row.dataset.row = String(r);
            for (let c = 0; c < WORD_LEN; c++) {
                const tile = document.createElement('div');
                tile.className = 'tile';
                row.appendChild(tile);
            }
            board.appendChild(row);
        }
        boardBuilt = true;
    }

    function renderBoard(flipRowIdx) {
        if (typeof flipRowIdx !== 'number') flipRowIdx = -1;
        if (!boardBuilt) buildSkeleton();
        const rows = board.children;
        for (let r = 0; r < MAX_GUESSES; r++) {
            const row = rows[r];
            const tiles = row.children;
            const locked = row.dataset.locked === '1';

            if (r < state.guesses.length) {
                // Submitted row. Paint once, then lock.
                if (locked) continue;
                const g = state.guesses[r];
                for (let c = 0; c < WORD_LEN; c++) {
                    const tile = tiles[c];
                    tile.textContent = g.word[c].toUpperCase();
                    tile.className = 'tile filled state-' + g.lied[c];
                    if (r === flipRowIdx) {
                        tile.classList.add('revealed');
                        tile.style.animationDelay = (c * 0.18) + 's';
                    } else {
                        tile.style.animationDelay = '';
                    }
                }
                row.dataset.locked = '1';
            } else if (r === state.guesses.length) {
                // Active typing row. Update only the tiles that differ.
                row.dataset.locked = '';
                for (let c = 0; c < WORD_LEN; c++) {
                    const tile = tiles[c];
                    const desired = c < state.current.length ? state.current[c].toUpperCase() : '';
                    if (tile.textContent === desired) continue;
                    tile.textContent = desired;
                    if (desired) {
                        tile.className = 'tile filled pop';
                        // Restart animation if we're overwriting a previous letter.
                        tile.style.animation = 'none';
                        // eslint-disable-next-line no-unused-expressions
                        void tile.offsetWidth;
                        tile.style.animation = '';
                    } else {
                        tile.className = 'tile';
                    }
                }
            } else {
                // Future empty row. Leave alone unless coming back from an
                // unwanted state (e.g. after a reset).
                if (row.dataset.locked === '1') {
                    row.dataset.locked = '';
                    for (let c = 0; c < WORD_LEN; c++) {
                        tiles[c].textContent = '';
                        tiles[c].className = 'tile';
                    }
                }
            }
        }
    }

    function renderStatus() {
        if (state.won || state.lost) {
            status.textContent = 'You’ve played today. ' + nextPuzzleCountdown();
        } else {
            status.textContent = '';
        }
    }

    /* Per-letter best-known status for keyboard tinting. We use the LIED
       colours, since those are what the player has actually been told. The
       priority is correct > present > absent so a letter doesn't downgrade
       once it's lit up. */
    function keyboardStates() {
        const out = {};
        const rank = {correct: 3, present: 2, absent: 1};
        state.guesses.forEach(function (g) {
            for (let i = 0; i < WORD_LEN; i++) {
                const ch = g.word[i];
                const st = g.lied[i];
                if (!out[ch] || rank[st] > rank[out[ch]]) out[ch] = st;
            }
        });
        return out;
    }

    function renderKeyboard() {
        const rows = [
            ['q','w','e','r','t','y','u','i','o','p'],
            ['a','s','d','f','g','h','j','k','l'],
            ['enter','z','x','c','v','b','n','m','back']
        ];
        const states = keyboardStates();
        const locked = state.won || state.lost;
        kb.classList.toggle('locked', locked);
        kb.innerHTML = '';
        rows.forEach(function (rdef) {
            const row = document.createElement('div');
            row.className = 'kb-row';
            rdef.forEach(function (key) {
                const btn = document.createElement('button');
                btn.className = 'key';
                btn.type = 'button';
                if (key === 'enter') {
                    btn.classList.add('wide');
                    btn.textContent = 'Enter';
                    btn.dataset.key = 'enter';
                } else if (key === 'back') {
                    btn.classList.add('wide');
                    btn.textContent = '⌫';
                    btn.setAttribute('aria-label', 'Backspace');
                    btn.dataset.key = 'back';
                } else {
                    btn.textContent = key.toUpperCase();
                    btn.dataset.key = key;
                    if (states[key]) btn.classList.add('state-' + states[key]);
                }
                row.appendChild(btn);
            });
            kb.appendChild(row);
        });
    }

    /* ---------- Toast / status ---------- */

    let toastTimer = null;
    function showToast(msg, ms) {
        if (toastTimer) clearTimeout(toastTimer);
        toast.textContent = msg;
        toast.hidden = false;
        toastTimer = setTimeout(function () { toast.hidden = true; }, ms || 1400);
    }

    function shakeRow(rowIdx) {
        const row = board.querySelector('.row[data-row="' + rowIdx + '"]');
        if (!row) return;
        row.classList.remove('shake');
        // force reflow so the animation can re-run
        void row.offsetWidth;
        row.classList.add('shake');
    }

    /* ---------- Input handling ---------- */

    function onKey(key) {
        if (state.won || state.lost) {
            // Re-open the result modal if the player taps anything after the
            // game is locked. Less mysterious than a dead screen.
            if (endModal.hidden) showEnd();
            return;
        }
        if (key === 'enter') return submit();
        if (key === 'back') {
            if (state.current.length > 0) {
                state.current = state.current.slice(0, -1);
                renderBoard();
            }
            return;
        }
        if (/^[a-z]$/.test(key)) {
            if (state.current.length < WORD_LEN) {
                state.current += key;
                renderBoard();
            }
        }
    }

    function submit() {
        if (state.current.length !== WORD_LEN) {
            shakeRow(state.guesses.length);
            showToast('Not enough letters');
            return;
        }
        if (!Words.isValid(state.current)) {
            shakeRow(state.guesses.length);
            showToast('Not in word list');
            return;
        }
        const guessIdx = state.guesses.length;
        const truth = trueColors(state.current, state.answer);
        const sched = getSchedule(state.scheduleId);
        const lied = sched.apply(truth, state.lieParams, guessIdx);
        state.guesses.push({word: state.current, true: truth, lied: lied});
        const wasGuess = state.current;
        state.current = '';

        // win/lose check uses TRUTH, not the lied feedback. The player wins
        // when they actually entered the answer — even if the lying tiles
        // wouldn't have shown all-green.
        if (wasGuess === state.answer) {
            state.won = true;
        } else if (state.guesses.length >= MAX_GUESSES) {
            state.lost = true;
        }
        saveState(state);
        render(guessIdx);

        // bounce / status / end-screen after the flip animation
        const flipDelay = 0.18 * (WORD_LEN - 1) + 0.55;
        setTimeout(function () {
            if (state.won) {
                const row = board.querySelector('.row[data-row="' + guessIdx + '"]');
                if (row) row.classList.add('bounce');
                setTimeout(showEnd, 700);
            } else if (state.lost) {
                setTimeout(showEnd, 250);
            }
        }, flipDelay * 1000);
    }

    /* ---------- End-of-game screen ---------- */

    function showEnd() {
        const sched = getSchedule(state.scheduleId);
        $('endTitle').textContent = state.won ? 'Solved.' : 'Out of guesses.';
        $('endTitle').innerHTML = state.won
            ? 'Solved <em>it.</em>'
            : 'Out of <em>guesses.</em>';
        $('endAnswer').textContent = state.answer;
        $('endLieName').textContent = sched.name;
        $('endLieDesc').textContent = sched.description;
        $('nextPuzzle').textContent = nextPuzzleCountdown();
        endModal.hidden = false;
    }

    function nextPuzzleCountdown() {
        const now = new Date();
        const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const ms = tomorrow - now;
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        return 'Next puzzle in ' + h + 'h ' + m + 'm';
    }

    /* ---------- Wiring ---------- */

    function init() {
        // Daily puzzle setup or resume.
        const today = new Date();
        const todayKey = Seed.dateKey(today);
        const saved = loadState(todayKey);
        if (saved === 'tampered') {
            // Someone edited the saved game (or the storage got corrupted).
            // Either way, today is over — we build a fresh state pinned to
            // "lost" so they get the reveal/share but no replay.
            state = buildPuzzle();
            state.lost = true;
            state.tampered = true;
            saveState(state);
            markSessionLocked(todayKey);
        } else if (saved) {
            state = saved;
            state.maxGuesses = state.maxGuesses || MAX_GUESSES;
            state.current = state.current || '';
            if (state.won || state.lost) markSessionLocked(todayKey);
        } else if (isSessionLocked(todayKey)) {
            // localStorage was cleared but sessionStorage remembers we're done.
            // Build a synthetic locked state so the player can't replay this
            // tab session.
            state = buildPuzzle();
            state.lost = true;
            state.tampered = true;
            saveState(state);
        } else {
            state = buildPuzzle();
            saveState(state);
        }

        render();

        // If the saved game is already finished, surface the end screen
        // again so the player can see the reveal / share their result.
        if (state.won || state.lost) {
            // small delay so the (already-revealed) tiles feel settled
            setTimeout(showEnd, 200);
        }

        // Keyboard click delegation
        kb.addEventListener('click', function (e) {
            const btn = e.target.closest('.key');
            if (!btn) return;
            onKey(btn.dataset.key);
        });

        // Physical keyboard
        document.addEventListener('keydown', function (e) {
            if (!endModal.hidden || !howModal.hidden) {
                if (e.key === 'Escape') closeModals();
                return;
            }
            if (e.key === 'Enter') { e.preventDefault(); onKey('enter'); return; }
            if (e.key === 'Backspace') { e.preventDefault(); onKey('back'); return; }
            const k = e.key.toLowerCase();
            if (/^[a-z]$/.test(k) && !e.metaKey && !e.ctrlKey && !e.altKey) {
                onKey(k);
            }
        });

        // Theme toggle (matches sibling labs' behaviour)
        $('themeToggle').addEventListener('click', function () {
            const root = document.documentElement;
            const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            root.setAttribute('data-theme', next);
            try { localStorage.setItem('theme', next); } catch (_) {}
        });

        // How-to modal
        $('howToBtn').addEventListener('click', function () { howModal.hidden = false; });

        // Shared close handlers
        document.querySelectorAll('[data-close]').forEach(function (el) {
            el.addEventListener('click', closeModals);
        });

        // First-time visitor: surface how-to once.
        try {
            if (!localStorage.getItem('bluff:seenHowTo')) {
                howModal.hidden = false;
                localStorage.setItem('bluff:seenHowTo', '1');
            }
        } catch (_) {}

        // Share
        $('shareBtn').addEventListener('click', function () {
            const text = Share.format(state);
            Share.copy(text).then(function (ok) {
                showToast(ok ? 'Result copied' : 'Copy failed');
            });
        });

        // Year
        const yearEl = document.getElementById('year');
        if (yearEl) yearEl.textContent = new Date().getFullYear();
    }

    function closeModals() {
        endModal.hidden = true;
        howModal.hidden = true;
    }

    /* Once init has run, scrub the cross-file globals so the dev console
       can't introspect them (`window.BLUFF_*` would otherwise let a curious
       user read state.answer or rebuild the puzzle). The closures in this
       IIFE keep the references alive for the live game; nothing else needs
       them. */
    function scrubGlobals() {
        try {
            // Use `delete` where possible; otherwise null out.
            ['BLUFF_WORDS','BLUFF_SEED','BLUFF_LIES','BLUFF_SHARE'].forEach(function (k) {
                try { delete window[k]; } catch (_) {}
                if (window[k]) {
                    try { Object.defineProperty(window, k, {value: undefined, writable: false, configurable: false}); }
                    catch (_) { window[k] = undefined; }
                }
            });
        } catch (_) {}
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { init(); scrubGlobals(); });
    } else {
        init();
        scrubGlobals();
    }
})();
