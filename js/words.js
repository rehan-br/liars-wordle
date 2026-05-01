/* Word list for Bluff.
 *
 * ANSWERS — pool the daily target is sampled from. Chosen to be common enough
 *   that a casual solver recognizes it on sight; the lying schedule is the
 *   challenge, not the vocabulary.
 * VALID  — full set of words accepted as guesses (ANSWERS ∪ extras).
 *
 * This is a starter list (~520 words). Easy to expand later.
 */
(function () {
    'use strict';

    const ANSWERS = [
        "about","above","abuse","actor","acute","admit","adopt","adult","after","again",
        "agent","agree","ahead","alarm","album","alert","alike","alive","allow","alone",
        "along","alter","among","anger","angle","angry","apart","apple","apply","arena",
        "argue","arise","array","aside","asset","audio","audit","avoid","award","aware",
        "badly","baker","bases","basic","basis","beach","began","begin","begun","being",
        "below","bench","billy","birth","black","blame","blind","block","blood","board",
        "boost","booth","bound","brain","brand","bread","break","breed","brief","bring",
        "broad","broke","brown","build","built","buyer","cable","calif","carry","catch",
        "cause","chain","chair","chart","chase","cheap","check","chest","chief","child",
        "china","chose","civil","claim","class","clean","clear","click","clock","close",
        "coach","coast","could","count","court","cover","craft","crash","cream","crime",
        "cross","crowd","crown","curve","cycle","daily","dance","dated","dealt","death",
        "debut","delay","depth","doing","doubt","dozen","draft","drama","drawn","dream",
        "dress","drill","drink","drive","drove","dying","eager","early","earth","eight",
        "elite","empty","enemy","enjoy","enter","entry","equal","error","event","every",
        "exact","exist","extra","faith","false","fault","fiber","field","fifth","fifty",
        "fight","final","first","fixed","flash","fleet","floor","fluid","focus","force",
        "forth","forty","forum","found","frame","frank","fraud","fresh","front","fruit",
        "fully","funny","giant","given","glass","globe","going","grace","grade","grand",
        "grant","grass","great","green","gross","group","grown","guard","guess","guest",
        "guide","happy","harry","heart","heavy","hence","horse","hotel","house","human",
        "ideal","image","index","inner","input","issue","japan","jimmy","joint","jones",
        "judge","known","label","large","laser","later","laugh","layer","learn","lease",
        "least","leave","legal","level","lewis","light","limit","links","lives","local",
        "logic","loose","lower","lucky","lunch","lying","magic","major","maker","march",
        "maria","match","maybe","mayor","meant","media","metal","might","minor","minus",
        "mixed","model","money","month","moral","motor","mount","mouse","mouth","movie",
        "music","needs","never","newly","night","noise","north","noted","novel","nurse",
        "occur","ocean","offer","often","order","other","ought","paint","panel","paper",
        "party","peace","peter","phase","phone","photo","piece","pilot","pitch","place",
        "plain","plane","plant","plate","point","pound","power","press","price","pride",
        "prime","print","prior","prize","proof","proud","prove","queen","quick","quiet",
        "quite","radio","raise","range","rapid","ratio","reach","ready","refer","right",
        "rival","river","robin","roger","roman","rough","round","route","royal","rural",
        "scale","scene","scope","score","sense","serve","seven","shall","shape","share",
        "sharp","sheet","shelf","shell","shift","shirt","shock","shoot","short","shown",
        "sight","since","sixth","sixty","sized","skill","sleep","slide","small","smart",
        "smith","smoke","solid","solve","sorry","sound","south","space","spare","speak",
        "speed","spend","spent","split","spoke","sport","staff","stage","stake","stand",
        "start","state","steam","steel","stick","still","stock","stone","stood","store",
        "storm","story","strip","stuck","study","stuff","style","sugar","suite","super",
        "sweet","table","taken","taste","taxes","teach","teeth","terry","texas","thank",
        "theft","their","theme","there","these","thick","thing","think","third","those",
        "three","threw","throw","tight","times","tired","title","today","topic","total",
        "touch","tough","tower","track","trade","train","treat","trend","trial","tried",
        "tries","truck","truly","trust","truth","twice","under","undue","union","unity",
        "until","upper","upset","urban","usage","usual","valid","value","video","virus",
        "visit","vital","voice","waste","watch","water","wheel","where","which","while",
        "white","whole","whose","woman","women","world","worry","worse","worst","worth",
        "would","wound","write","wrong","wrote","yield","young","youth","blast","brave",
        "brick","bride","brush","cabin","camel","candy","cargo","chess","chunk","cider",
        "clamp","clasp","cliff","cloud","clown","comet","crane","crisp","crust","daisy",
        "dairy","ditch","dough","drift","eagle","ember","fable","fence","flame","flask",
        "flare","frost","glade","glory","glove","grain","graph","grasp","greet","grime",
        "grip","gripe","gulch","haste","heath","hinge","honey","hover","hutch","ivory",
        "jolly","joust","kayak","kneel","knelt","knife","knock","leash","lemon","level"
    ];

    /* Extra accepted guesses (not used as answers, but valid input). Keep
       light; we just want common-ish 5-letter words to stop "is this a word?"
       frustration. */
    const EXTRAS = [
        "abide","ached","aches","acids","acing","acorn","acres","acrid","acted","actor",
        "added","adept","adore","aimed","aisle","amber","amend","amino","amuse","ankle",
        "annex","apart","apron","arose","arrow","ashen","ashes","aspic","atlas","atoll",
        "attic","auger","aunts","autos","awful","axiom","babes","bacon","badge","bagel",
        "baked","balmy","banal","bands","banjo","barge","baron","basil","baths","beads",
        "beard","beats","beefs","beers","beget","beige","belch","belly","bends","beret",
        "berry","bevel","bezel","bible","biker","bingo","biome","birds","bites","blade",
        "bland","blare","blast","blaze","bleak","bleed","bless","blimp","blink","bliss",
        "bloat","blond","bloom","blots","blown","blunt","blurb","blurt","blush","boast",
        "boats","bobby","bogus","boils","bombs","bones","bongo","bonus","books","boost",
        "boots","booty","booze","borax","bored","botch","bough","boxed","boxer","brace",
        "braid","brake","brash","brass","brats","brawl","brawn","bread","breed","briar",
        "bribe","brine","bring","brink","brisk","brood","brook","broom","broth","browse",
        "brunt","bucks","buggy","bugle","built","bulks","bully","bunny","bunch","burly",
        "bursa","busts","butte","cacao","cache","caddy","cadet","cages","caked","calls",
        "calms","camps","canal","candy","canes","canon","canoe","caped","caper","cards",
        "cared","carve","caste","casts","caved","caves","cease","cedar","cello","cents",
        "chafe","chant","chaos","chaps","chard","charm","cheek","cheer","chefs","chews",
        "chick","chide","chile","chili","chime","chin","chips","chirp","chock","choir",
        "choke","chops","chord","chore","chose","chuck","chute","cigar","cinch","cited",
        "civet","civic","clack","clams","clang","clank","clans","claps","clash","clasp",
        "clays","clean","clear","cleat","cleft","clerk","clews","cling","clink","cloak",
        "clods","clogs","clomp","clone","close","cloth","clots","cloud","cloven","clown",
        "clubs","cluck","clued","clues","clump","cobra","cocoa","codes","coils","colon",
        "color","combs","comet","comfy","comma","comps","cones","conic","cooed","cooks",
        "cools","coops","copes","cords","cored","corny","corps","costs","couch","cough",
        "could","count","coupe","coups","coven","cover","coves","covet","cowed","cower",
        "crabs","crack","craft","cramp","crane","crank","crape","crash","crass","crate",
        "crave","crawl","craze","crazy","creak","cream","credo","creed","creek","creep",
        "crepe","cress","crest","crews","cribs","cried","cries","crime","crimp","crisp",
        "croak","crock","crone","crony","crook","crops","cross","croup","crowd","crown",
        "crows","crude","cruel","crumb","crush","crust","crypt","cubed","cubes","cubic",
        "cuffs","culls","cults","curbs","cured","cures","curls","curly","curse","curve",
        "cycle","daddy","daily","dairy","daisy","dance","dared","dashy","dater","datum",
        "daubs","daunt","dazed","deals","deans","debit","debug","debut","decaf","decal",
        "decay","decks","decoy","decry","deeds","defer","deity","delve","demon","demur",
        "denim","dense","dents","depot","depth","derby","desks","detox","deuce","devil",
        "diary","diced","dicey","didst","diets","digit","dimes","diner","dined","dingy",
        "dinky","dints","direr","dirge","dirty","disco","ditch","ditto","ditty","divas",
        "diver","dives","divot","dizzy","docks","dodge","doily","doing","dolly","dolts",
        "donor","donut","doodad","dopey","dosed","dotes","doted","doubt","dough","dousd",
        "dover","downy","dowry","dozen","draft","drags","drain","drake","drama","drank",
        "drape","drawl","drawn","draws","dread","dream","dregs","dress","dried","drier",
        "drift","drill","drink","drips","drive","drone","drool","droop","drops","dross",
        "drove","drown","drugs","drums","drunk","dryer","ducts","duels","duets","duked",
        "dukes","dummy","dumps","dunce","dunes","dusky","dusty","dwarf","dwell","dying"
    ];

    const all = new Set(ANSWERS.concat(EXTRAS));
    const VALID = new Set();
    all.forEach(function (w) {
        if (typeof w === 'string' && w.length === 5) {
            VALID.add(w.toLowerCase());
        }
    });

    window.BLUFF_WORDS = {
        ANSWERS: ANSWERS,
        VALID: VALID,
        isValid: function (w) {
            if (typeof w !== 'string' || w.length !== 5) return false;
            return VALID.has(w.toLowerCase());
        }
    };
})();
