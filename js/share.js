/* Share-string formatter.
 *
 * Output looks like:
 *   Bluff #42 4/6 ↯
 *   ⬛🟧⬛🟨⬛
 *   🟨⬛🟧⬛🟧
 *   🟧🟧⬛🟧🟧
 *   🟧🟧🟧🟧🟧
 *
 * The trailing ↯ on the title line is the give-away that the colours below
 * are also lying. We share the LIED colours, not the true ones — the whole
 * point is that other players see the same liar-coloured pattern.
 */
(function () {
    'use strict';

    const GLYPH = {
        correct: '\u{1F7E7}', // 🟧 large orange square
        present: '\u{1F7E8}', // 🟨 large yellow square
        absent:  '⬛'     // ⬛ large black square
    };

    function format(state) {
        const {puzzleNumber, guesses, won, maxGuesses} = state;
        const head = 'Bluff #' + puzzleNumber + ' ' +
            (won ? guesses.length : 'X') + '/' + maxGuesses + ' ↯';
        const body = guesses.map(function (g) {
            return g.lied.map(c => GLYPH[c]).join('');
        }).join('\n');
        const url = 'https://bluff.thedeveloperguys.com';
        return head + '\n' + body + '\n' + url;
    }

    /* Copy to clipboard. Returns a Promise resolving true/false. */
    function copy(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text).then(() => true).catch(() => fallback(text));
        }
        return Promise.resolve(fallback(text));
    }

    function fallback(text) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        let ok = false;
        try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
        document.body.removeChild(ta);
        return ok;
    }

    window.BLUFF_SHARE = {
        format: format,
        copy: copy
    };
})();
