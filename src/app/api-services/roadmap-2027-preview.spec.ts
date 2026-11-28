/**
 * Pins the ROADMAP 2027 preview: the equipment, weapons and cards LATAM has announced for
 * next year and that iRO or kRO has already shipped, listed in the pickers with the
 * **Prévia** marker and their English client text (see docs/item-json.md, `preRelease`).
 *
 * Nothing here invents data. Every id below was already a complete record in item.json —
 * English name, English description and a modelled `script` — merely invisible, because
 * `presentInLatam` is derived from latam-items.json and these ids are not in it yet. The
 * change this spec guards is one flag per record.
 *
 * Each list is one roadmap entry, with the official page it was read from. The roadmap's
 * names are the LATAM translations, so the mapping to a source page is recorded per list
 * rather than left to be re-derived. Episódio 21 has shipped on kRO but not on iRO, so its
 * source is the kRO dev note plus divine-pride; the iRO-sourced entries say so per list.
 *
 * The `preRelease === (shipped ? undefined : true)` shape is the one issgard-preview.spec.ts
 * already uses: it keeps asserting the preview today and, on the day LATAM ships an id,
 * flips to demanding the flag be gone — the same graduation signal pre-release-items.spec.ts
 * raises, but per family, so the quarter that landed is named by the failure.
 */
import { describe, expect, it } from 'vitest';
import items from '../../assets/demo/data/item.json';
import latam from '../../assets/demo/data/latam-items.json';
import { ItemModel } from '../models/item.model';
import { ItemTypeId } from '../constants/item.const';
import { getEnchants } from '../constants/enchant_item/_enchant_table';
import { isEquipmentEnchant } from '../constants/enchant_item/equipment_enchants';

const db = items as Record<string, ItemModel>;
const client = latam as Record<string, { description?: string }>;
const shipped = (id: number) => !!client[id];
const visible = (id: number) => !!db[id]?.preRelease || shipped(id);
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

/**
 * Q1 — "Episódio 20". iRO: https://renewal.playragnarok.com/news/updatedetail.aspx?id=422
 * The page publishes the Glacier set (11 pieces), the Dim Glacier set (6) and 20 cards.
 */
const EP20_GLACIER = [450264, 450265, 450266, 450267, 450268, 460040, 470196, 490327, 490328, 490329, 490330];
const EP20_DIM_GLACIER = [450270, 450271, 470197, 470198, 480283, 480284];
const EP20_CARDS = range(300455, 300474);
/** Glacier Flower, the EP20 enchant pool, and the Dim Glacier weapon/armour pools. */
const EP20_ENCHANTS = [
  300454, 312050, 312051, 312052, 312053, 312054, 312055, 312056, 312057, 312058,
  312059, 312060, 312061, 312062, 312063, 312064, 312065, 312066, 312067, 312068,
  312069, 312070, 312071, 312073, 312074, 312075, 312076, 312077, 312078, 312079,
  312080, 312081, 312082, 312083, 312084, 312085, 312086, 312087, 312088, 312089,
  312090, 312091, 312092, 312093, 312094, 312095,
  312099, 312100, 312101, 312102, 312103, 312104, 312105, 312109, 312110, 312111,
  312112, 312113, 312114, 312115, 312119, 312120, 312121, 312122, 312123, 312124,
  312125, 312126, 312130, 312131, 312132, 312133, 312134, 312135, 312136, 312140,
  312141, 312142, 312143, 312144, 312145, 312146, 312150, 312151, 312152, 312153,
  312154, 312155, 312156, 312157, 312161, 312162, 312163, 312164, 312165, 312166,
  312167, 312171, 312172, 312173, 312174, 312175, 312176, 312177, 312181, 312182,
  312183, 312184, 312185, 312186, 312187, 312188,
];

/**
 * Q1 — "Renovação das Ecosferas de Varmunt".
 * iRO: https://renewal.playragnarok.com/news/updatedetail.aspx?id=397 (Biosphere Part II).
 *
 * The renewal reforms the Varmundt gear LATAM already has into a level-230 tier. The base
 * tier (450199-450203, 470107-470111, 480144-480148) and the Grácil rings are live and are
 * deliberately NOT in this list: the card asked for a new section, not a change to what is
 * already there. `LIVE_VARMUNDT_TIER` below asserts they stayed untouched.
 */
const BIO_RENEWAL_ARMOR = [
  450234, 450243, 450244, 450245, 470173, 470174, 470175, 470176, 480230, 480231, 480232, 480233,
];
const BIO_RENEWAL_RINGS = [490299, 490300, 490301, 490302, 490303, 490304, 490305, 490306, 490307];
/** Varmundt's Crystal (Lv.1-5) and the Biosphere Gems. */
const BIO_RENEWAL_ENCHANTS = [
  311862, 311863, 311865, 311866, 311867, 311868, 311870, 311871, 311872, 311873,
  311875, 311876, 311877, 311878, 311880, 311881, 311927, 311929, 311930, 311932,
  311933, 311935, 311936, 311938, 311939, 311941, 311942, 311943, 311944, 311945,
  311946, 311947, 311948, 311949, 311950, 311951, 311952, 311953, 311954, 311955,
  311956, 311957, 311958, 311959, 311960, 311961, 311962, 311963, 311964, 311965,
  311966, 311967, 311968, 311969, 311970, 311971, 311972, 311973, 311974, 311975,
  311976, 311977, 311978, 311979, 311980, 311981, 311982, 311983, 311984, 311985,
  311986, 311987, 311988, 311989, 311990, 311991, 311992, 311993, 311994, 311995,
  311996, 311997, 311998, 311999, 312000, 312001, 312002, 312003,
];
/**
 * The Lv.3 crystals and the second-tier gems. They sit in their own list because the
 * renewal armour, the renewal rings and the Abismo weapons all draw on them, so they
 * belong to no single entry. No live item offers any of them — `leaves every live item the
 * enchant options it already had` below is what proves that, rather than a comment.
 */
const BIO_SHARED_ENCHANTS = [
  311864, 311869, 311874, 311879, 311928, 311931, 311934, 311937, 311940, 312800,
];

/**
 * Q2 — "Profundezas da Ecosfera".
 * iRO: https://renewal.playragnarok.com/news/updatedetail.aspx?id=427 (Deep Level 1).
 * Four Deep Rune Armor pieces plus their Engraved versions, all Required Level 250.
 */
const BIO_DEEP_1 = [450274, 450279, 450280, 450281, 450282, 450283, 450284, 450285];
/** The eight base runes (Lv1-5) and the four fused deep runes (Lv1-10) they combine into. */
const BIO_DEEP_1_ENCHANTS = range(312315, 312394);

/**
 * Q2 — "Guerra de Heroria", the only part of it item.json holds.
 * kRO notice 2022-09-26 (신공성전 성역 헤로스리아); dev note
 * https://ro.gnjoy.com/news/devnote/View.asp?category=3&seq=4154469
 *
 * The siege's own exclusive gear has no records at all. What does exist is the season-one
 * reward, the "차원 방랑자" right-accessory series, at Required Level 240. Those three are
 * the entry's whole preview; the rest is listed as unsourced in docs/roadmap-2027-preview.md.
 */
const HEROSRIA_SEASON = [490276, 490277, 490278];
/** The Herosria enchant pools those three accessories are reformed with. */
const HEROSRIA_SEASON_ENCHANTS = [
  311782, 311783, 311784, 311785, 311786, 311787, 311788, 311789, 311790, 311791,
  311792, 311793, 311794, 311795, 311796,
  311802, 311803, 311804, 311805, 311806, 311807, 311808, 311809, 311810, 311811,
  311812, 311813, 311814, 311815, 311816,
  311822, 311823, 311824, 311825, 311826, 311827, 311828, 311829, 311830, 311831,
  311837, 311838, 311839, 311840, 311841, 311842, 311843, 311844, 311845, 311846,
  311852, 311853, 311854, 311855, 311856, 311857, 311858, 311859, 311860, 311861,
];

/**
 * Q3 — "Episódio 21" / 영웅의 시대 (Age of Heroes). kRO 2024-04-03, not on iRO.
 * kRO dev note https://ro.gnjoy.com/news/devnote/View.asp?category=3&seq=4180756 — it names
 * the "게오보르그" armour series equippable from level 245 and 29 new monster cards.
 * Romanized Gaebolg on divine-pride, which is where the ids come from.
 */
const EP21_GAEBOLG = [450350, 450351, 470260, 470261, 480415, 480416, 490507, 490508, 490509, 490510];
/** The Forest Magic Orb pool the Gaebolg pieces are enchanted with. */
const EP21_GAEBOLG_ENCHANTS = range(313070, 313109);
/**
 * Q3 — the Yorscalp follow-up (EPISODE 21 요르스칼프, kRO 2024-10-16, dev note
 * https://ro.gnjoy.com/news/devnote/View.asp?category=3&seq=4186411): two dungeons at
 * level 240 and 250 and the Yorscalp series, including the two crowns.
 */
const EP21_YORSCALP = [
  450412, 450413, 470303, 470304, 480495, 480496, 490620, 490621, 490622, 490623, 400723, 400724,
];
/** Strength/Intelligence/Smart/Speed of Yorscalp 1-4Lv, plus the two crown warrants. */
const EP21_YORSCALP_ENCHANTS = [...range(313406, 313421), 313426, 313427];
/**
 * The Age of Heroes cards. The dev note says 29; item.json holds 13 of them — the three
 * hero variants and the ten field cards. Of the rest, 300427-300440 carry no name in any
 * language even upstream, so they are not nameable, let alone previewable.
 *
 * Attribution caveat: no official page publishes card ids. These 13 are tied to EP21 by
 * their monsters, which spawn only on ra_pol01 and mjo_wst01 (the two level-260 dungeons
 * the cap-260 update shipped), and by the Gaebolg naming on the hero variants. That is
 * inference from divine-pride, not a sourced list — recorded here so it can be re-checked.
 */
const EP21_CARDS = [
  300422, 300424, 300426, 300441, 300442, 300443, 300444, 300445, 300446, 300447, 300448, 300449, 300450,
];

/**
 * Q3 — "Abismo da Ecosfera".
 * iRO: https://renewal.playragnarok.com/news/updatedetail.aspx?id=428 (Deep Level Abyss).
 *
 * That page names its rewards rather than tabulating them: the "Time Dimension Rune Crown"
 * crafted per class, and the "Dimension Weapon" the Enchant Master enchants. Those are the
 * Time_DM_R_Crown_* crowns (one per fourth class) and the Dimen_* weapons, all Required
 * Level 250, matching the page's Base level 250 entry gate. No item table is published, so
 * this pair is matched by name and level — which is why it is written down here.
 */
const BIO_ABYSS_CROWNS = range(400529, 400546);
const BIO_ABYSS_WEAPONS = [
  500092, 500093, 500094, 510139, 530054, 540079, 540080, 540081, 540082, 540083,
  550130, 550131, 550132, 550133, 550134, 550135, 560060, 560061, 570062, 570063,
  580061, 580062, 590079, 590080, 600054, 610064, 610065, 620037, 630041, 640049,
  640050, 650046, 650047, 700092, 700093, 700094, 810040, 840032,
];
const BIO_ABYSS_ENCHANTS = [
  312695, 312696, 312697, 312698, 312699, 312700, 312701, 312702, 312703, 312704,
  312705, 312706, 312707, 312708, 312709, 312710, 312711, 312712, 312713, 312714,
  312715, 312716, 312717, 312718, 312721, 312722, 312723, 312724, 312725, 312726,
  312727, 312728, 312731, 312732, 312733, 312734, 312735, 312736, 312737, 312738,
  312741, 312742, 312743, 312744, 312745, 312746, 312747, 312748, 312751, 312752,
  312753, 312754, 312755, 312756, 312757, 312758, 312761, 312762, 312763, 312764,
  312765, 312766, 312767, 312768, 312771, 312772, 312773, 312774, 312775, 312776,
  312777, 312778, 312781, 312782, 312783, 312784, 312785, 312786, 312787, 312788,
];

type Family = readonly [label: string, ids: readonly number[], count: number];

/** Equipment and weapons, i.e. everything whose enchant pools must resolve. */
const EQUIPMENT = [
  ['Q1 Episódio 20 · Glacier', EP20_GLACIER, 11],
  ['Q1 Episódio 20 · Dim Glacier', EP20_DIM_GLACIER, 6],
  ['Q1 Renovação das Ecosferas · armour', BIO_RENEWAL_ARMOR, 12],
  ['Q1 Renovação das Ecosferas · rings', BIO_RENEWAL_RINGS, 9],
  ['Q2 Guerra de Heroria · Dimensional Wanderer', HEROSRIA_SEASON, 3],
  ['Q2 Profundezas da Ecosfera', BIO_DEEP_1, 8],
  ['Q3 Episódio 21 · Gaebolg', EP21_GAEBOLG, 10],
  ['Q3 Episódio 21 · Yorscalp', EP21_YORSCALP, 12],
  ['Q3 Abismo da Ecosfera · crowns', BIO_ABYSS_CROWNS, 18],
  ['Q3 Abismo da Ecosfera · weapons', BIO_ABYSS_WEAPONS, 38],
] as const satisfies readonly Family[];

const ENCHANTS = [
  ['Q1 Episódio 20', EP20_ENCHANTS, 112],
  ['Q1 Renovação das Ecosferas', BIO_RENEWAL_ENCHANTS, 88],
  ['Q1/Q3 shared rune crystals and gems', BIO_SHARED_ENCHANTS, 10],
  ['Q2 Guerra de Heroria · Dimensional Wanderer', HEROSRIA_SEASON_ENCHANTS, 60],
  ['Q2 Profundezas da Ecosfera', BIO_DEEP_1_ENCHANTS, 80],
  ['Q3 Episódio 21 · Gaebolg', EP21_GAEBOLG_ENCHANTS, 40],
  ['Q3 Episódio 21 · Yorscalp', EP21_YORSCALP_ENCHANTS, 18],
  ['Q3 Abismo da Ecosfera', BIO_ABYSS_ENCHANTS, 80],
] as const satisfies readonly Family[];

const CARDS = [
  ['Q1 Episódio 20', EP20_CARDS, 20],
  ['Q3 Episódio 21 · Age of Heroes', EP21_CARDS, 13],
] as const satisfies readonly Family[];

const FAMILIES: readonly Family[] = [...EQUIPMENT, ...ENCHANTS, ...CARDS];
const ALL = FAMILIES.flatMap(([, ids]) => ids);

/** The Varmundt tier LATAM already has. Flagging one of these would edit a live item. */
const LIVE_VARMUNDT_TIER = [
  ...range(450199, 450203), ...range(470107, 470111), ...range(480144, 480148), 490019, 490020,
];

describe('ROADMAP 2027 preview items', () => {
  it('covers the roadmap entries whose content iRO or kRO has published', () => {
    for (const [label, ids, count] of FAMILIES) expect(ids, label).toHaveLength(count);
    // The grand total is the figure docs/roadmap-2027-preview.md and the PR body quote.
    expect(ALL).toHaveLength(648);
    expect(new Set(ALL).size, 'an id listed under two entries would be flagged twice').toBe(ALL.length);
  });

  it('marks every record Prévia until LATAM ships it', () => {
    for (const [label, ids] of FAMILIES) {
      for (const id of ids) {
        expect(db[id], `${label} ${id}`).toBeDefined();
        expect(db[id].preRelease, `${label} ${id}`).toBe(shipped(id) ? undefined : true);
      }
    }
  });

  it('keeps the preview out of the already-released Varmundt tier', () => {
    // The base Varmundt rune gear and the Grácil rings are live; the renewal is a new tier
    // beside them. Flagging one of these would be editing what players already use.
    for (const id of LIVE_VARMUNDT_TIER) {
      expect(shipped(id), String(id)).toBe(true);
      expect(db[id].preRelease, String(id)).toBeUndefined();
    }
  });

  it('shows every enchant the preview equipment offers', () => {
    // Resolving is not enough: an enchant record that exists but is itself invisible leaves
    // a hole in the ladder — the dropdown then skips, say, Lv3 — which is how a preview
    // quietly ships half-usable. This is the check that earns BIO_SHARED_ENCHANTS.
    const recordByName = new Map<string, number>();
    for (const [key, item] of Object.entries(db)) {
      if (item.aegisName && !recordByName.has(item.aegisName)) recordByName.set(item.aegisName, Number(key));
    }
    const holes: string[] = [];
    for (const [label, ids] of EQUIPMENT) {
      for (const id of ids) {
        for (const pool of getEnchants(db[id].aegisName) ?? []) {
          for (const name of pool ?? []) {
            const record = recordByName.get(name);
            if (record === undefined) holes.push(`${label} ${id} -> ${name} has no record`);
            else if (!visible(record)) holes.push(`${label} ${id} -> ${name} (${record}) is hidden`);
          }
        }
      }
    }
    expect(holes).toEqual([]);
  });

  it('leaves every live item the enchant options it already had', () => {
    // The other half of the same invariant, and the mechanical proof of the release note's
    // "Nada do que já está no jogo foi alterado": no shipped, unflagged item may offer an
    // enchant this change newly revealed.
    const revealed = new Set(
      ALL.filter((id) => db[id].itemTypeId === ItemTypeId.ENCHANT).map((id) => db[id].aegisName),
    );
    const leaked: string[] = [];
    for (const [key, item] of Object.entries(db)) {
      if (!item.aegisName || item.preRelease || !shipped(Number(key))) continue;
      for (const pool of getEnchants(item.aegisName) ?? []) {
        for (const name of pool ?? []) if (revealed.has(name)) leaked.push(`${key} ${item.name} -> ${name}`);
      }
    }
    expect(leaked).toEqual([]);
  });

  it('lists the cards as cards and the enchants as enchants', () => {
    const enchantNames = new Set(Object.values(db).filter(isEquipmentEnchant).map((item) => item.aegisName));
    for (const [label, ids] of CARDS) {
      for (const id of ids) expect(db[id].itemTypeId, `${label} ${id}`).toBe(ItemTypeId.CARD);
    }
    for (const [label, ids] of ENCHANTS) {
      for (const id of ids) {
        expect(db[id].itemTypeId, `${label} ${id}`).toBe(ItemTypeId.ENCHANT);
        expect(enchantNames.has(db[id].aegisName), `${label} ${id}`).toBe(true);
      }
    }
  });

  it('keeps the published level gates, which are what date the content', () => {
    const gates = [
      [230, [...EP20_GLACIER, ...EP20_DIM_GLACIER, ...BIO_RENEWAL_ARMOR]],
      [240, HEROSRIA_SEASON],
      [245, EP21_GAEBOLG],
      [250, [...BIO_DEEP_1, ...EP21_YORSCALP, ...BIO_ABYSS_CROWNS, ...BIO_ABYSS_WEAPONS]],
    ] as const;
    for (const [level, ids] of gates) {
      for (const id of ids) expect(db[id].requiredLevel, `${id} at ${level}`).toBe(level);
    }
  });
});
