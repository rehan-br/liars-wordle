/* Daily seed + deterministic PRNG for Bluff.
 *
 * The whole sharing mechanic depends on every player worldwide getting the
 * same puzzle on the same date. Never use Math.random for anything that
 * affects gameplay — only for cosmetic UI flourishes.
 */
(function () {
    'use strict';

    /* The reference epoch. All puzzle numbers are days-since-epoch. */
    const EPOCH = new Date(2026, 0, 1); // Jan 1, 2026 local time = Puzzle #1.
    const MS_PER_DAY = 24 * 60 * 60 * 1000;

    /* mulberry32 — small, fast, decent-quality 32-bit PRNG. Seeded once,
       used for every random choice in the puzzle (target word + lie config). */
    function mulberry32(seed) {
        let s = seed >>> 0;
        return function () {
            s = (s + 0x6D2B79F5) >>> 0;
            let t = s;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    /* Stable hash of a string → 32-bit int. */
    function hashStr(s) {
        let h = 2166136261 >>> 0;
        for (let i = 0; i < s.length; i++) {
            h ^= s.charCodeAt(i);
            h = Math.imul(h, 16777619) >>> 0;
        }
        return h;
    }

    function dateKey(d) {
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function puzzleNumber(d) {
        const a = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const days = Math.round((a - EPOCH) / MS_PER_DAY);
        return days + 1;
    }

    /* Today's PRNG. Kept as a single instance so subsequent calls advance the
       same stream — the order of consumers (target → lie schedule → lie
       params) is part of the determinism contract. Don't reorder. */
    function makeDailyRng(date) {
        const key = dateKey(date);
        return mulberry32(hashStr('bluff-v1:' + key));
    }

    function pick(rng, arr) {
        return arr[Math.floor(rng() * arr.length)];
    }

    function intRange(rng, lo, hi) {
        return lo + Math.floor(rng() * (hi - lo + 1));
    }

    /* Fisher–Yates shuffle, seeded. */
    function shuffled(rng, arr) {
        const out = arr.slice();
        for (let i = out.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            const tmp = out[i]; out[i] = out[j]; out[j] = tmp;
        }
        return out;
    }

    /* Tiny stream cipher — XOR with a pseudo-random byte stream keyed off a
       shared secret. NOT real crypto. The point is twofold:
       (a) the answer in localStorage isn't a plaintext word a casual snooper
           can read in DevTools → Application,
       (b) tampered payloads fail their checksum so an attempt to "edit my
           save to start over" gets rejected. Determined attackers can read
           the JS and decode anything; we're stopping the casual case. */
    function xorStream(text, seedInt) {
        const rng = mulberry32(seedInt);
        let out = '';
        for (let i = 0; i < text.length; i++) {
            const k = Math.floor(rng() * 256);
            out += String.fromCharCode(text.charCodeAt(i) ^ k);
        }
        return out;
    }

    function utf8ToB64(s) {
        // unescape/escape pair handles unicode safely.
        return btoa(unescape(encodeURIComponent(s)));
    }
    function b64ToUtf8(b) {
        try { return decodeURIComponent(escape(atob(b))); }
        catch (_) { return null; }
    }

    function obfuscate(text, seedInt) {
        return utf8ToB64(xorStream(text, seedInt));
    }
    function deobfuscate(payload, seedInt) {
        const raw = b64ToUtf8(payload);
        if (raw === null) return null;
        return xorStream(raw, seedInt);
    }

    window.BLUFF_SEED = {
        EPOCH: EPOCH,
        dateKey: dateKey,
        puzzleNumber: puzzleNumber,
        makeDailyRng: makeDailyRng,
        pick: pick,
        intRange: intRange,
        shuffled: shuffled,
        mulberry32: mulberry32,
        hashStr: hashStr,
        obfuscate: obfuscate,
        deobfuscate: deobfuscate
    };
})();
