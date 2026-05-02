/* Word lists for Bluff.
 *
 * ANSWERS — pool the daily target is sampled from (~2,315 common 5-letter
 *   words, sourced from the canonical Wordle answer list).
 * VALID   — the full set of words accepted as guesses (~14,855 5-letter
 *   words, the canonical Wordle vocabulary).
 *
 * Both lists arrive packed as concatenated 5-char strings in
 * valid-words.js, which MUST run before this file (see index.html load
 * order) so the BLUFF_*_PACKED globals are defined.
 *
 * The small inline array below is a fallback only — used if the packed
 * answer string didn't load for some reason. It also defines the
 * historical answer order for the very first version of the game; after
 * the canonical list loads, ANSWERS is replaced with that list (sorted),
 * so the daily seed-to-answer mapping is stable across deployments. */
(function () {
    'use strict';

    const FALLBACK_ANSWERS = [
        "about","above","abuse","actor","acute","admit","adopt","adult","after","again",
        "agent","agree","ahead","alarm","album","alert","alike","alive","allow","alone",
        "along","alter","among","anger","angle","angry","apart","apple","apply","arena",
        "argue","arise","array","aside","asset","audio","audit","avoid","award","aware",
        "badly","baker","bases","basic","basis","beach","began","begin","begun","being",
        "below","bench","billy","birth","black","blame","blind","block","blood","board",
        "boost","booth","bound","brain","brand","bread","break","breed","brief","bring",
        "broad","broke","brown","build","built","buyer","cable","carry","catch","cause",
        "chain","chair","chart","chase","cheap","check","chest","chief","child","china",
        "chose","civil","claim","class","clean","clear","click","clock","close","coach",
        "coast","could","count","court","cover","craft","crash","cream","crime","cross",
        "crowd","crown","curve","cycle","daily","dance","dated","dealt","death","debut",
        "delay","depth","doing","doubt","dozen","draft","drama","drawn","dream","dress",
        "drill","drink","drive","drove","dying","eager","early","earth","eight","elite",
        "empty","enemy","enjoy","enter","entry","equal","error","event","every","exact",
        "exist","extra","faith","false","fault","fiber","field","fifth","fifty","fight",
        "final","first","fixed","flash","fleet","floor","fluid","focus","force","forth",
        "forty","forum","found","frame","frank","fraud","fresh","front","fruit","fully",
        "funny","giant","given","glass","globe","going","grace","grade","grand","grant",
        "grass","great","green","gross","group","grown","guard","guess","guest","guide",
        "happy","heart","heavy","hence","horse","hotel","house","human","ideal","image",
        "index","inner","input","issue","joint","judge","known","label","large","laser",
        "later","laugh","layer","learn","lease","least","leave","legal","level","light",
        "limit","links","lives","local","logic","loose","lower","lucky","lunch","lying",
        "magic","major","maker","march","match","maybe","mayor","meant","media","metal",
        "might","minor","minus","mixed","model","money","month","moral","motor","mount",
        "mouse","mouth","movie","music","needs","never","newly","night","noise","north",
        "noted","novel","nurse","occur","ocean","offer","often","order","other","ought",
        "paint","panel","paper","party","peace","phase","phone","photo","piece","pilot",
        "pitch","place","plain","plane","plant","plate","point","pound","power","press",
        "price","pride","prime","print","prior","prize","proof","proud","prove","queen",
        "quick","quiet","quite","radio","raise","range","rapid","ratio","reach","ready",
        "refer","right","rival","river","rough","round","route","royal","rural","scale",
        "scene","scope","score","sense","serve","seven","shall","shape","share","sharp",
        "sheet","shelf","shell","shift","shirt","shock","shoot","short","shown","sight",
        "since","sixth","sixty","sized","skill","sleep","slide","small","smart","smoke",
        "solid","solve","sorry","sound","south","space","spare","speak","speed","spend",
        "spent","split","spoke","sport","staff","stage","stake","stand","start","state",
        "steam","steel","stick","still","stock","stone","stood","store","storm","story",
        "strip","stuck","study","stuff","style","sugar","suite","super","sweet","table",
        "taken","taste","taxes","teach","teeth","theft","their","theme","there","these",
        "thick","thing","think","third","those","three","threw","throw","tight","times",
        "tired","title","today","topic","total","touch","tough","tower","track","trade",
        "train","treat","trend","trial","tried","tries","truck","truly","trust","truth",
        "twice","under","undue","union","unity","until","upper","upset","urban","usage",
        "usual","valid","value","video","virus","visit","vital","voice","waste","watch",
        "water","wheel","where","which","while","white","whole","whose","woman","women",
        "world","worry","worse","worst","worth","would","wound","write","wrong","wrote",
        "yield","young","youth","blast","brave","brick","bride","brush","cabin","camel",
        "candy","cargo","chess","chunk","cider","clamp","clasp","cliff","cloud","clown",
        "comet","crane","crisp","crust","daisy","dairy","ditch","dough","drift","eagle",
        "ember","fable","fence","flame","flask","flare","frost","glade","glory","glove",
        "grain","graph","grasp","greet","grime","gripe","gulch","haste","heath","hinge",
        "honey","hover","hutch","ivory","jolly","joust","kayak","kneel","knife","knock",
        "leash","lemon"
    ];

    /* Unpack a 5-char-per-word concatenated string into an array. */
    function unpack(s) {
        const out = [];
        if (!s) return out;
        for (let i = 0; i + 5 <= s.length; i += 5) out.push(s.substr(i, 5));
        return out;
    }

    const VALID = new Set(unpack(window.BLUFF_VALID_PACKED));
    let ANSWERS = unpack(window.BLUFF_ANSWERS_PACKED);
    if (ANSWERS.length === 0) {
        // Fallback only — packed list didn't load. Use the inline pool.
        ANSWERS = FALLBACK_ANSWERS.slice();
    }
    // Belt-and-braces: every answer must be a valid guess too.
    ANSWERS.forEach(function (w) {
        if (typeof w === 'string' && w.length === 5) VALID.add(w.toLowerCase());
    });

    window.BLUFF_WORDS = {
        ANSWERS: ANSWERS,
        VALID: VALID,
        isValid: function (w) {
            if (typeof w !== 'string' || w.length !== 5) return false;
            return VALID.has(w.toLowerCase());
        }
    };

    /* Once consumed, the packed globals are dead weight that would just
       sit in window for any console snooper to read. Drop them now. */
    try { delete window.BLUFF_VALID_PACKED; } catch (_) { window.BLUFF_VALID_PACKED = undefined; }
    try { delete window.BLUFF_ANSWERS_PACKED; } catch (_) { window.BLUFF_ANSWERS_PACKED = undefined; }
})();
