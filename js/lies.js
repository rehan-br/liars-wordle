/* Lie schedules for Bluff.
 *
 * Each schedule is a pure transformation of the honest colour vector
 * (`['correct'|'present'|'absent', ...] of length 5`) into a lied vector,
 * parameterised by (params, guessIndex). Determinism is the whole game —
 * never use Math.random; every random pick must come from the daily PRNG
 * upstream and be baked into `params` at puzzle init.
 */
(function () {
    'use strict';

    const COLORS = ['correct', 'present', 'absent'];

    /* ---------- Two-faced ----------
     * Exactly two positions per guess report the wrong colour. The chosen
     * positions and the chosen "wrong" colour for each are pre-baked at
     * puzzle init so the schedule is the same for everyone, every guess,
     * forever.
     *
     * params.lies[guessIndex] = [ {pos, wrong}, {pos, wrong} ]
     */
    function buildTwoFacedParams(rng, maxGuesses) {
        const lies = [];
        for (let g = 0; g < maxGuesses; g++) {
            // pick 2 distinct positions in [0..4]
            const positions = [0,1,2,3,4];
            for (let i = positions.length - 1; i > 0; i--) {
                const j = Math.floor(rng() * (i + 1));
                const t = positions[i]; positions[i] = positions[j]; positions[j] = t;
            }
            const a = positions[0], b = positions[1];
            // pick a wrong colour for each (decided independently, but the
            // ACTUAL wrong colour depends on the true colour at run time —
            // here we just store an offset 1 or 2 to step through COLORS).
            const oa = 1 + Math.floor(rng() * 2);
            const ob = 1 + Math.floor(rng() * 2);
            lies.push([{pos: a, offset: oa}, {pos: b, offset: ob}]);
        }
        return {lies: lies};
    }
    function applyTwoFaced(trueColors, params, guessIndex) {
        const out = trueColors.slice();
        const slot = params.lies[guessIndex];
        if (!slot) return out;
        for (let i = 0; i < slot.length; i++) {
            const {pos, offset} = slot[i];
            const idx = COLORS.indexOf(out[pos]);
            out[pos] = COLORS[(idx + offset) % 3];
        }
        return out;
    }

    /* ---------- Greengrocer ----------
     * Every 'correct' is downgraded to 'present'. 'present' and 'absent'
     * are reported honestly. Cruelly effective: the player can never tell
     * if a yellow is real or a demoted green.
     */
    function applyGreengrocer(trueColors) {
        return trueColors.map(c => c === 'correct' ? 'present' : c);
    }

    /* ---------- Mirror ----------
     * Every reported colour is wrong. We use the permutation:
     *   correct → absent
     *   present → correct
     *   absent  → present
     * This is one of two coherent 3-cycles; the other (correct→present,
     * present→absent, absent→correct) is functionally equivalent under
     * relabelling, so we just pick this one.
     */
    function applyMirror(trueColors) {
        return trueColors.map(function (c) {
            if (c === 'correct') return 'absent';
            if (c === 'present') return 'correct';
            return 'present';
        });
    }

    /* ---------- Schedule registry ---------- */

    const SCHEDULES = [
        {
            id: 'two-faced',
            name: 'Two-faced',
            short: 'two-faced',
            description: 'Two of the five tiles in every row reported the wrong colour. The two positions changed each guess, but the schedule was the same for every player today.',
            buildParams: buildTwoFacedParams,
            apply: applyTwoFaced
        },
        {
            id: 'greengrocer',
            name: 'Greengrocer',
            short: 'greengrocer',
            description: 'Every correct (right letter, right place) was reported as merely present (right letter, wrong place). Every yellow tile could really have been an orange in disguise.',
            buildParams: function () { return {}; },
            apply: applyGreengrocer
        },
        {
            id: 'mirror',
            name: 'Mirror',
            short: 'mirror',
            description: 'Every reported colour was wrong. Oranges were really not in the word. Yellows were really right where they sat. Grays were really yellow.',
            buildParams: function () { return {}; },
            apply: applyMirror
        }
    ];

    function pickSchedule(rng) {
        return SCHEDULES[Math.floor(rng() * SCHEDULES.length)];
    }

    window.BLUFF_LIES = {
        SCHEDULES: SCHEDULES,
        pickSchedule: pickSchedule
    };
})();
