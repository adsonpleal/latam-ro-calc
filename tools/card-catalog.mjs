// Read every card the LATAM client ships and say, for each one, where it goes and which
// of its description lines the calculator can hold.
//
// The library behind two CLIs, which is why it lives on its own: they must not disagree
// about what a card is or what a line means.
//
//   tools/classify-missing-cards.mjs   counts the groups and writes the queue JSON
//   tools/register-missing-cards.mjs   writes the item.json records
//
// This backs the "Faltam 470 cartas no banco" tracker card. a54f32e6 registered the 64
// whose *every* description line maps to a bonus key the engine already has and left the
// rest carded, with the split quoted from a script that was never committed. This file is
// that script, rebuilt so the lists stop depending on anyone rerunning anything.
//
// ── The join key: the numeric item id, which is the object key of BOTH files ──────────
//
// `src/assets/demo/data/latam-items.json` and `src/assets/demo/data/item.json` are both
// plain objects keyed by the item id, so the join is `latam[id]` <-> `items[id]` and
// nothing else. That is also the join the cards' own spec uses
// (src/app/core/__tests__/card-bonus-registration.spec.ts reads `latam[id].description`
// straight off the id), which is the evidence that it is the intended one.
//
// The two name-ish fields both fail, and it is worth writing down why so nobody retries:
//
//   aegisName  All 64 records a54f32e6 added carry the Korean placeholder "이름없는카드"
//              ("nameless card") — on BOTH sides, because that is what the client ships
//              for them. Joining on it collapses those 64 into a single bucket. Verified:
//              the 64 have exactly one distinct aegisName between them.
//   name       item.json's `name` is the English (or, for a slice of the file, Thai)
//              client name — "Concentration Potion", not "Poção de Concentração". The
//              pt-BR name is overlaid at runtime from latam-items.json by RoService, so
//              it is simply not in item.json to match against. Verified: 517 of the 613
//              registered cards have an item.json name that differs from the pt-BR one,
//              so a name join loses 84% of them.
//
// ── What "a card" is ─────────────────────────────────────────────────────────────────
//
// `latam[id].name` starting with "Carta ", MINUS the ids in NOT_A_CARD — 1064 records.
//
// The name test alone gives 1083, which is the number the original tracker card reported,
// and 19 of those are not compound cards: "Carta" is also the pt-BR word for a letter, so
// the list pulled in correspondence, Halloween event props, pet bait, a consumable and one
// lower head gear. Eighteen of them have no slot, which is precisely why they pooled in the
// old "slotless" group and read as backlog. The footer's "Tipo: Carta" line does not
// separate them either — 17 real cards print no "Tipo:" line at all — so the exclusions are
// listed by id instead, each with what it actually is.
//
// ── The groups ───────────────────────────────────────────────────────────────────────
//
//   registered  already in item.json.
//   ready       not in item.json, and every effect line maps to a bonus key that exists
//               in createRawTotalBonus — i.e. registrable today under a54f32e6's own
//               criterion. These are new work the commit's own rules would have taken.
//   mixed       at least one mappable line AND at least one that is not (a proc, a
//               refine/base-attribute gate, a Conjunto block, or an unmodelled effect).
//   proc        no mappable line at all: proc/utility only.
//   noSlot      a guard, and empty: every card compounds onto something, so a card this
//               cannot place is a gap in the reading. resolveSlot takes "Equipa em:", the
//               older "Utilização:" / "Equipado em:" / "Localização:", "Classes:" when its
//               value is a real slot, and finally SLOT_FROM_DIVINE_PRIDE for the two cards
//               whose text names no slot at all. A hit here means a new wording to teach
//               resolveSlot (or one more id to look up), not a card to park.
//   undefined   has a slot line but nothing this script can stand behind — no effect text
//               at all, or a slot label outside CardPosition. Reported, never guessed at.
//
// Every non-registered card also carries `gatedMappable`: the lines that WOULD map if they
// were not under a condition. That is the difference between "the engine cannot express
// this" and "the engine expresses it, but as a conditional entry" — "ATQ +20" under
// "A cada 2 refinos:" is the `2---20` form, while "5% de chance de" is nothing at all. Both
// sit in `blocked`, and only one of them is waiting on engine work.
//
// A line is mappable only if its every phrase matches a rule in RULES below, and every
// rule's target key is checked against createRawTotalBonus at startup — an invented key
// aborts the run. `--witness` goes further and finds, for each rule, an item ALREADY in
// item.json whose pt-BR description carries the phrase and whose script carries the key.
// That is a54f32e6's own method ("each phrase was resolved against an item already
// carrying it") turned into an assertion.
//
// Gated text is never mappable, whatever it says. "ATQ +20" under "FOR base 80 ou mais:"
// is a real bonus the engine can express, but not as a flat script entry, so it belongs
// to the follow-up work and not to this batch. A line ending in ":" opens a gate that
// runs to the end of its block; a block whose first line is "Conjunto" is gated whole.
//
// ── How this lines up with a54f32e6's own numbers ────────────────────────────────────
//
// It reproduced them exactly when written, which is what established that the two counts
// were measuring the same thing:
//
//                                 a54f32e6   as written
//   cards the client ships           1083     1083
//   registered before the commit      549      549   (git show a54f32e6^:…/item.json)
//   registered by the commit           64       64
//   still missing after it            470      470
//   of those, no "Equipa em:" line     51       51
//
// Two of those rows moved since, on purpose, and the run no longer reproduces them: the
// catalogue is 1064 (19 non-cards excluded) and the slotless group is 0 (every card placed).
// Both were corrections, not drift — the old numbers counted letters as cards and called
// placeable cards unplaceable. Anyone re-deriving the 1083/51 pair should read the two
// sections above before assuming this file regressed.
//
// The mixed/proc boundary does not reproduce, and cannot: it is a pure function of how
// many pt-BR wordings the phrase table knows, and a54f32e6's table was never committed.
// Here it comes out 35 ready + 169 mixed + 215 proc against the commit's 197 + 222.
//
// The gap is measurable rather than mysterious. Of the 204 cards with at least one
// mappable line, 33 are carried entirely by wordings that none of the 64 exercise — the
// modern "a oponentes de propriedade X" phrasing (9), plural lists like "as propriedades
// Fogo, Água e Terra" (10), comma-joined bonuses on one line (5), "Resistência a danos
// físicos a distância" (3), "monstros Normais e Chefes" (3), "X e Y +N" sharing one
// magnitude (2) and "Crítico" as a synonym of "CRIT" (1). Strip those and proc rises to
// 248. So the reachable range is proc ∈ [215, 248] and mixed ∈ [171, 204], and both of
// the commit's numbers (222 and 197) sit inside it: its table was broader than the bare
// 64 needed and narrower than this one. This file is the wider end of that range, and
// every rule in it is witnessed against item.json rather than assumed.

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'src/assets/demo/data');

const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
const latam = read(join(DATA, 'latam-items.json'));
const items = read(join(DATA, 'item.json'));

/** The colour codes the client embeds, e.g. "^777777" — noise for every match here. */
const plain = (s) => (s || '').replace(/\^[0-9a-fA-F]{6}/g, '');

/** Footer lines. "Utilização:" / "Equipado em:" are older spellings of "Equipa em:". */
const FOOTER =
  /^(Tipo|Equipa em|Equipado em|Utiliza[cç][aã]o|Peso|Classes|N[ií]vel necess[aá]rio|Composi[cç][aã]o|Grupo|Localiza[cç][aã]o)\s*[:.]/i;

// ── the bonus-key vocabulary ─────────────────────────────────────────────────────────

const ELEMENT = {
  Neutro: 'neutral', 'Água': 'water', Terra: 'earth', Fogo: 'fire', Vento: 'wind',
  Veneno: 'poison', Sagrado: 'holy', Sombrio: 'dark', Fantasma: 'ghost', Maldito: 'undead',
};
const RACE = {
  Amorfo: 'formless', 'Morto-Vivo': 'undead', Bruto: 'brute', Planta: 'plant',
  Inseto: 'insect', Peixe: 'fish', 'Demônio': 'demon', Humanoide: 'demihuman',
  Anjo: 'angel', 'Dragão': 'dragon', Humano: 'player_human', Doram: 'player_doram',
};
const SIZE = { Pequeno: 's', 'Médio': 'm', Grande: 'l' };
const STAT = { FOR: 'str', AGI: 'agi', VIT: 'vit', INT: 'int', DES: 'dex', SOR: 'luk' };

/** `Weapon = 0` -> { Weapon: 0 }. Read, not copied, so this file cannot drift from it. */
function readCardPositions() {
  const src = readFileSync(join(ROOT, 'src/app/constants/card-position.enum.ts'), 'utf8');
  const body = /export enum CardPosition\s*{([\s\S]*?)}/.exec(src);
  if (!body) throw new Error('could not find `export enum CardPosition` — has it moved?');
  const out = {};
  for (const m of body[1].matchAll(/^\s*(\w+)\s*=\s*(-?\d+)\s*,/gm)) out[m[1]] = Number(m[2]);
  if (!Object.keys(out).length) throw new Error('CardPosition parsed empty');
  return out;
}

const POS = readCardPositions();

/**
 * "Equipa em:" label -> CardPosition member.
 *
 * These are the values the app routes cards with — an equip bitmask (0/16/32/…/769), not
 * an ordinal. An earlier revision of this file numbered the slots 1..9 in label order,
 * which collides with the real enum on 'Capa' alone (4) and is wrong for every other
 * slot; anything cadastrado from that JSON would have landed in the wrong picker.
 */
/** Every "Tipo:" line of a description — see the last branch of resolveSlot. */
const TYPE_LINE = /Tipo\s*:\s*([^\n]*)/g;

const CARD_POSITION = {
  'Arma': POS.Weapon, 'Armadura': POS.Armor, 'Escudo': POS.Shield, 'Capa': POS.Garment,
  'Calçado': POS.Boot, 'Acessório': POS.Acc, 'Aces. Direito': POS.AccR,
  'Aces. Esquerdo': POS.AccL, 'Equip. para Cabeça': POS.Head,
  // Seen once, on 4610: the same slot spelled out. Kept separate so the label the client
  // actually printed survives into the JSON and nobody has to trust this line.
  'Equipamento para Cabeça': POS.Head,
  // The client's own typos, one card each: 27105 prints "Aces. DIreito" and 27116 the
  // Spanish "Accesorio". Both are kept verbatim for the same reason as the line above.
  'Aces. DIreito': POS.AccR,
  'Accesorio': POS.Acc,
};

/**
 * "Carta" is also the pt-BR word for a letter, and the name test below cannot tell the two
 * apart: these 19 records are correspondence, quest props, pet bait, a consumable and one
 * lower head gear, not compound cards. Their own descriptions say so — "Uma carta para o bom
 * amigo Otto", "Tipo: Isca", "Temporariamente encanta o usuário", "Equipa em: Baixo" — and
 * eighteen of them print no slot line at all, which is how they came to sit in the slotless
 * pile pretending to be a backlog.
 *
 * Excluded from the queue outright rather than filed as unplaceable cards: the real card
 * count is 1064, not 1083, and a queue that counts letters overstates the work left.
 */
const NOT_A_CARD = new Map([
  [6043, 'letter — "Uma carta para o bom amigo Otto"'],
  [6044, 'letter — Otto\'s reply to Lugen'],
  [6546, 'letter — from a brother'],
  [6925, 'letter — from a prisoner'],
  [6929, 'letter — sealed with the Walther family crest'],
  [7148, 'letter — from a mother to her conscripted son'],
  [7183, 'letter — from a girl to her older brother'],
  [7416, 'letter of recommendation — Merchant Guild quest'],
  [7468, 'Halloween event prop — the letter "P"'],
  [7469, 'Halloween event prop — the letter "U"'],
  [7471, 'Halloween event prop — the letter "Y"'],
  [7490, 'letter — addressed to Elly'],
  [7501, 'letter — from "K.H."'],
  [7643, 'bloodstained letter — quest prop'],
  [12370, 'pet bait — prints "Tipo: Isca"'],
  [22511, 'consumable — temporarily grants the Power of Fenrir'],
  [25167, 'ancient letter — quest prop'],
  [25627, 'golden letter — quest prop'],
  // A lower head gear, not a compound card: "Todas as cartas dos seus equipamentos estão
  // perfeitas, mas você achou aquela carta especial… A solução? Colocar em si mesmo!". Its
  // footer prints "Equipa em: Baixo" and item.json has always held it as the hat it is.
  [5536, 'lower head gear — the joke hat "Carta Imperfeita"'],
]);

/**
 * Slots for the cards whose own description names none, from divine-pride's "Compound on"
 * field (the id is the same on both databases; the English name is kept so the lookup can be
 * repeated).
 *
 * There is no such thing as a card without a slot — every card compounds onto something, so
 * a card the client's text does not place is a gap in the text, not a property of the card.
 * The client feed cannot fill it either: ragassets' items.json ships `equipSlots: []` for
 * every card. These two are the whole list, and both turn out to be `mixed` once placed, so
 * neither is registrable today.
 */
const SLOT_FROM_DIVINE_PRIDE = new Map([
  [4414, { label: 'Escudo', enName: 'Seeker Card', dp: 'Compounds On: Shield' }],
  [4417, { label: 'Calçado', enName: 'Ice Titan Card', dp: 'Compounds On: Shoes' }],
]);

const NUM = String.raw`[+-]\s*\d[\d.,]*`;
const alt = (o) => Object.keys(o).map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
const E = alt(ELEMENT), R = alt(RACE), Z = alt(SIZE);

/**
 * Table lookup that ignores case, because the client does not keep it: the same wording
 * ships as "oponentes de tamanho Grande" on one card and "oponentes de tamanho pequeno"
 * on the next (4082, 4092). Every rule below matches case-insensitively, so a lookup that
 * did not would silently resolve to `undefined` and emit a key like `p_size_undefined` —
 * a key nothing reads, from a line that looked perfectly well understood.
 */
function labelIn(table, label) {
  if (label in table) return table[label];
  const found = Object.keys(table).find((k) => k.toLowerCase() === String(label).toLowerCase());
  return found === undefined ? undefined : table[found];
}

/** "Fogo, Terra e Vento" -> ['subele_fire', …]; null if any member is unknown. */
function listOf(text, table, prefix) {
  const parts = text.split(/\s*,\s*|\s+e\s+/).map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return null;
  const keys = [];
  for (const p of parts) {
    const value = labelIn(table, p);
    if (value === undefined) return null;
    keys.push(prefix + value);
  }
  return keys;
}

/**
 * phrase -> bonus keys. Order matters: the longer wording of a pair comes first, so
 * "ATQ da arma +N%" is not eaten by the "ATQ +N" rule.
 *
 * `witness` is a description substring that some already-registered item prints, used by
 * --witness to re-derive the mapping from the data instead of from this comment.
 */
const RULES = [
  // "VIT e INT +1" — one magnitude shared by two stats, not two phrases (phrasesOf only
  // splits on " e " that follows a number, so this arrives whole).
  ['statPair', new RegExp(`^(FOR|AGI|VIT|INT|DES|SOR) e (FOR|AGI|VIT|INT|DES|SOR)\\s*${NUM}$`, 'i'), (m) => [labelIn(STAT, m[1]), labelIn(STAT, m[2])], 'VIT e INT +'],
  ['stat', new RegExp(`^(FOR|AGI|VIT|INT|DES|SOR)\\s*${NUM}$`, 'i'), (m) => [labelIn(STAT, m[1])], 'FOR +'],
  ['allStatus', new RegExp(`^Todos os atributos\\s*${NUM}$`, 'i'), () => ['allStatus'], 'Todos os atributos +'],
  ['hpsp%', new RegExp(`^HP e SP m[áa]x\\.?\\s*${NUM}%$`, 'i'), () => ['hpPercent', 'spPercent'], 'HP e SP máx. +'],
  ['hp%', new RegExp(`^HP m[áa]x\\.?\\s*${NUM}%$`, 'i'), () => ['hpPercent'], 'HP máx. +'],
  ['hp', new RegExp(`^HP m[áa]x\\.?\\s*${NUM}$`, 'i'), () => ['hp'], 'HP máx. +'],
  ['sp%', new RegExp(`^SP m[áa]x\\.?\\s*${NUM}%$`, 'i'), () => ['spPercent'], 'SP máx. +'],
  ['sp', new RegExp(`^SP m[áa]x\\.?\\s*${NUM}$`, 'i'), () => ['sp'], 'SP máx. +'],
  ['atk+matk', new RegExp(`^ATQ e ATQM\\s*${NUM}$`, 'i'), () => ['atk', 'matk'], 'ATQ e ATQM +'],
  // "ATQ da arma +N%" is the old wording of today's "Dano físico +N%" — see a54f32e6 and
  // src/app/core/__tests__/dano-fisico-percent.spec.ts.
  ['atk%', new RegExp(`^ATQ da arma\\s*${NUM}%$`, 'i'), () => ['atkPercent'], 'ATQ da arma +'],
  ['atk', new RegExp(`^ATQ\\s*${NUM}$`, 'i'), () => ['atk'], 'ATQ +'],
  ['matk', new RegExp(`^ATQM\\s*${NUM}$`, 'i'), () => ['matk'], 'ATQM +'],
  ['def+mdef', new RegExp(`^DEF e DEFM\\s*${NUM}$`, 'i'), () => ['def', 'mdef'], 'DEF e DEFM +'],
  ['def', new RegExp(`^DEF\\s*${NUM}$`, 'i'), () => ['def'], 'DEF +'],
  ['mdef', new RegExp(`^DEFM\\s*${NUM}$`, 'i'), () => ['mdef'], 'DEFM +'],
  ['perfectHit', new RegExp(`^Precis[ãa]o perfeita\\s*${NUM}$`, 'i'), () => ['perfectHit'], 'Precisão perfeita +'],
  ['hit', new RegExp(`^Precis[ãa]o\\s*${NUM}$`, 'i'), () => ['hit'], 'Precisão +'],
  ['perfectDodge', new RegExp(`^Esquiva perfeita\\s*${NUM}$`, 'i'), () => ['perfectDodge'], 'Esquiva perfeita +'],
  ['flee', new RegExp(`^Esquiva\\s*${NUM}$`, 'i'), () => ['flee'], 'Esquiva +'],
  // "CRIT" and "Crítico" are the same stat under two client generations. Only the bare
  // forms: "CRIT +3 contra a raça Peixe" is conditional and stays blocked.
  ['cri', new RegExp(`^(?:CRIT|Cr[íi]tico)\\s*${NUM}$`, 'i'), () => ['cri'], 'Crítico +'],
  ['criDmg', new RegExp(`^Dano cr[íi]tico\\s*${NUM}%$`, 'i'), () => ['criDmg'], 'Dano crítico +'],
  ['aspd%', new RegExp(`^Velocidade de ataque\\s*${NUM}%$`, 'i'), () => ['aspdPercent'], 'Velocidade de ataque +'],
  ['range', new RegExp(`^Dano f[íi]sico a dist[âa]ncia\\s*${NUM}%$`, 'i'), () => ['range'], 'Dano físico a distância +'],
  ['melee', new RegExp(`^Dano f[íi]sico corpo a corpo\\s*${NUM}%$`, 'i'), () => ['melee'], 'Dano físico corpo a corpo +'],
  ['matk%', new RegExp(`^Dano m[áa]gico\\s*${NUM}%$`, 'i'), () => ['matkPercent'], 'Dano mágico +'],
  ['atk%2', new RegExp(`^Dano f[íi]sico\\s*${NUM}%$`, 'i'), () => ['atkPercent'], 'Dano físico +'],
  ['vct', new RegExp(`^Conjura[çc][ãa]o vari[áa]vel\\s*${NUM}%$`, 'i'), () => ['vct'], 'Conjuração variável '],
  // Only the % form. The flat one is `fct` (2016 Cetro de Vellum), the % one `fctPercent`
  // (4456 Carta Sombra do Guardião) — reading one as the other is off by a whole unit.
  ['fct%', new RegExp(`^Conjura[çc][ãa]o fixa\\s*${NUM}%$`, 'i'), () => ['fctPercent'], 'Conjuração fixa '],
  ['dmg_taken_range', new RegExp(`^Resist[êe]ncia a danos f[íi]sicos a dist[âa]ncia\\s*${NUM}%$`, 'i'), () => ['dmg_taken_range'], 'Resistência a danos físicos a distância'],
  ['p_class', new RegExp(`^Dano f[íi]sico contra monstros Normais e Chefes\\s*${NUM}%$`, 'i'), () => ['p_class_normal', 'p_class_boss'], 'monstros Normais e Chefes'],

  // damage dealt. "contra a X" is the old wording, "contra oponentes de/da X" the modern
  // one; both are live in the client and both resolve to the same key (see --witness).
  ['p_element', new RegExp(`^Dano f[íi]sico contra (?:a propriedade|oponentes de propriedade) (${E})\\s*${NUM}%$`, 'i'), (m) => ['p_element_' + labelIn(ELEMENT, m[1])], 'Dano físico contra oponentes de propriedade'],
  ['p_race', new RegExp(`^Dano f[íi]sico contra (?:a ra[çc]a|oponentes da ra[çc]a) (${R})\\s*${NUM}%$`, 'i'), (m) => ['p_race_' + labelIn(RACE, m[1])], 'Dano físico contra a raça'],
  ['p_size', new RegExp(`^Dano f[íi]sico contra (?:o tamanho|oponentes de tamanho|monstros de tamanho) (${Z})\\s*${NUM}%$`, 'i'), (m) => ['p_size_' + labelIn(SIZE, m[1])], 'Dano físico contra oponentes de tamanho'],
  ['p_raceList', new RegExp(`^Dano f[íi]sico contra as ra[çc]as (.+?)\\s*${NUM}%$`, 'i'), (m) => listOf(m[1], RACE, 'p_race_'), 'Dano físico contra as raças'],
  ['m_element', new RegExp(`^Dano m[áa]gico contra (?:a propriedade|oponentes de propriedade) (${E})\\s*${NUM}%$`, 'i'), (m) => ['m_element_' + labelIn(ELEMENT, m[1])], 'Dano mágico contra oponentes de propriedade'],
  ['m_race', new RegExp(`^Dano m[áa]gico contra (?:a ra[çc]a|oponentes da ra[çc]a) (${R})\\s*${NUM}%$`, 'i'), (m) => ['m_race_' + labelIn(RACE, m[1])], 'Dano mágico contra a raça'],

  // damage taken
  ['subele', new RegExp(`^Resist[êe]ncia a (?:propriedade|oponentes de propriedade) (${E})\\s*${NUM}%$`, 'i'), (m) => ['subele_' + labelIn(ELEMENT, m[1])], 'Resistência a oponentes de propriedade'],
  ['subrace', new RegExp(`^Resist[êe]ncia a (?:ra[çc]a|oponentes da ra[çc]a) (${R})\\s*${NUM}%$`, 'i'), (m) => ['subrace_' + labelIn(RACE, m[1])], 'Resistência a raça'],
  ['subsize', new RegExp(`^Resist[êe]ncia ao tamanho (${Z})\\s*${NUM}%$`, 'i'), (m) => ['subsize_' + labelIn(SIZE, m[1])], 'Resistência ao tamanho'],
  // Plural forms, e.g. "Resistência as propriedades Fogo, Terra, Água, Vento, Sombrio e
  // Maldito +5%.". The whole list has to resolve — one unrecognised member and the line
  // is blocked, rather than silently registering the members that happened to parse.
  ['subeleList', new RegExp(`^Resist[êe]ncia [àa]s propriedades (.+?)\\s*${NUM}%$`, 'i'), (m) => listOf(m[1], ELEMENT, 'subele_'), 'Resistência as propriedades'],
  ['subraceList', new RegExp(`^Resist[êe]ncia [àa]s ra[çc]as (.+?)\\s*${NUM}%$`, 'i'), (m) => listOf(m[1], RACE, 'subrace_'), 'Resistência as raças'],
  ['subsizeList', new RegExp(`^Resist[êe]ncia a oponentes de tamanho (.+?)\\s*${NUM}%$`, 'i'), (m) => listOf(m[1], SIZE, 'subsize_'), 'Resistência a oponentes de tamanho'],
  // The pre-2019 phrasing, still printed by the oldest cards. There is deliberately no
  // by-element twin: the client's "Reduz em N% … da propriedade X" lines (2543, 5316,
  // 5381, 5526, 13903) are all worded differently from each other, none belongs to a
  // card, and --witness finds nothing to resolve a guess against.
  ['subrace2', new RegExp(`^Reduz em \\d[\\d.,]*% o dano causado por monstros da ra[çc]a (${R})$`, 'i'), (m) => ['subrace_' + labelIn(RACE, m[1])], 'Reduz em'],
];

// ── guard: every key a rule can emit has to exist in createRawTotalBonus ─────────────

function knownBonusKeys() {
  const src = readFileSync(join(ROOT, 'src/app/utils/create-raw-total-bonus.ts'), 'utf8');
  return new Set([...src.matchAll(/^ {4}([a-zA-Z_][\w]*):/gm)].map((m) => m[1]));
}

/**
 * Every key a rule can emit, found by feeding it every label of every table. A label a
 * rule does not own yields an "…_undefined" key; that is a probe artifact, not a data
 * error, so it is dropped. A typo inside a table still surfaces, as the wrong suffix.
 */
function keysOfRule(fn) {
  const keys = new Set();
  for (const table of [ELEMENT, RACE, SIZE, STAT]) {
    for (const label of Object.keys(table)) {
      // Same label in every capture slot: rules with two captures (statPair) need m[2].
      try { for (const k of fn([null, label, label]) || []) keys.add(k); } catch { /* rule takes no capture */ }
    }
  }
  try { for (const k of fn([]) || []) keys.add(k); } catch { /* rule needs a capture */ }
  keys.delete(undefined);
  for (const k of [...keys]) if (k.endsWith('undefined')) keys.delete(k);
  return keys;
}

function assertKeysExist() {
  const known = knownBonusKeys();
  const emitted = new Set();
  for (const [, , fn] of RULES) for (const k of keysOfRule(fn)) emitted.add(k);
  const bad = [...emitted].filter((k) => k && !known.has(k));
  if (bad.length) {
    console.error('Invented bonus keys, absent from createRawTotalBonus:', bad.join(', '));
    process.exit(1);
  }
  return emitted;
}

// ── description -> effect lines ──────────────────────────────────────────────────────


/**
 * The partner cards named directly under a "Conjunto" line, in the two spellings the client
 * uses: bracketed ("[Carta Molusco]") and bare ("Carta Espírito da Água").
 *
 * The list ends at the first line that is not one — the set's own bonuses follow it. A
 * bonus line always prints a number, which is what separates "Carta Espírito da Água" from
 * "Carta Poe" as a partner and from any effect line as a bonus.
 */
function partnersAfter(lines, index) {
  const names = [];
  for (const line of lines.slice(index + 1)) {
    const bracketed = /^\[(.+?)\]$/.exec(line);
    if (bracketed) { names.push(bracketed[1].trim()); continue; }
    if (/^Carta \S/.test(line) && !/\d/.test(line)) { names.push(line.trim()); continue; }
    break;
  }
  return names;
}

/**
 * Effect lines of a description, each tagged with whether a gate covers it.
 *
 * Blocks are the "-------------" runs the client prints. Not every card has them: 4087
 * runs its two effect lines straight into the footer, so footer lines are dropped by
 * pattern rather than by block position.
 */
function effectLines(description) {
  const out = [];
  for (const block of plain(description).split(/\n-{5,}\n?/)) {
    const lines = block
      .split('\n').map((l) => l.trim())
      .filter((l) => l && !FOOTER.test(l) && !/^-+$/.test(l));
    if (!lines.length) continue;
    /**
     * Every gate covering the line, outermost first, carried down the block so a report can
     * say WHAT the condition is — a refine step and a job restriction are both "gated" and
     * only one of them is something item.json's script grammar can express.
     *
     * Gates STACK rather than replace, because the client nests them and the inner one does
     * not cancel the outer. 27117 Carta Agressor Ominoso is the case that proves it:
     *
     *   Bônus para Chicotes, Instrumentos Musicais, Livros, …:
     *   CRIT +5.
     *   A cada refino:
     *   ATQ +3.
     *
     * The +3 is per refine AND only on those weapons — item.json holds it as
     * `WEAPON_TYPE[whip||instrument||…]1---3`. Reading the inner gate as a replacement gives
     * a bare `1---3`, which pays on every weapon in the game.
     *
     * A "Conjunto" line opens one too, wherever it sits: a set bonus needs the partner
     * equipped. It is not always the first line of its block — 27163 Carta Verme com Rosto
     * runs its own bonuses straight into the Conjunto with no separator between them, and
     * reading only `lines[0]` hands that card's set bonus out unconditionally.
     *
     * A Conjunto gate is written `Conjunto[nome||nome]`, carrying the partners named right
     * under it, because the gate is only meaningful together with them and one card can
     * open several: 27328 Carta Caídos has nine Conjunto blocks with a different partner in
     * each, and 4628 Carta Neo Punk runs two of them into a single block with no separator.
     * A bare "Conjunto" would collapse all of those into one indistinguishable condition.
     */
    const gates = [];
    for (let i = 0; i < lines.length; i++) {
      const text = lines[i];
      out.push({ text, gated: gates.length > 0, gate: gates[gates.length - 1] ?? null, gates: [...gates] });
      if (/^Conjunto$/i.test(text)) gates.push(`Conjunto[${partnersAfter(lines, i).join('||')}]`);
      else if (/:$/.test(text)) gates.push(text);
    }
  }
  return out;
}

/**
 * Split a line into phrases. Cards pack several bonuses per line — "DES +1. Precisão +3",
 * "AGI +1, Esquiva +2", "FOR +1 e VIT +1." — but "HP máx. +100" has a period inside the
 * label, so the split only fires on a separator that FOLLOWS a number. The same guard is
 * what keeps "Resistência as raças Bruto e Doram" whole: its " e " follows a word.
 */
const phrasesOf = (line) =>
  line.split(/(?<=\d[\d.,]*%?)(?:\s*[.,;]\s+|\s+e\s+)/)
    .map((p) => p.replace(/[.,;]\s*$/, '').trim())
    .filter(Boolean);

/**
 * The keys whose sign is flipped on the way into a script, because the engine stores them
 * as *reductions*: the client prints "Conjuração variável -15%" and the record carries
 * `vct: ["15"]`. Carta Fen (4077) is the precedent, registered as `vct: ["-25"]` for a
 * printed "+25%". See docs/item-json.md § 3 ("Sinais").
 */
const STORED_INVERTED = new Set(['vct', 'fctPercent']);

/**
 * The magnitude a phrase carries, as the number a script entry would hold.
 *
 * One phrase names one bonus and prints one number, so the first number in it IS the
 * magnitude — "ATQ da arma -3%" is -3, "Reduz em 30% o dano causado..." is 30. pt-BR
 * punctuation is undone here and nowhere else: "." groups thousands ("HP máx. +1.000")
 * and "," is the decimal point.
 */
function magnitudeOf(phrase) {
  const m = /([+-]?)\s*(\d[\d.,]*)/.exec(phrase);
  if (!m) return null;
  const value = Number(m[1] + m[2].replace(/\./g, '').replace(/,/g, '.'));
  return Number.isFinite(value) ? value : null;
}

/** phrase -> the script entries it becomes, e.g. [{ key: 'atk', value: 5 }]. */
function mapPhrase(phrase) {
  for (const [, re, fn] of RULES) {
    const m = re.exec(phrase);
    if (!m) continue;
    const keys = fn(m);
    // A rule that matched but could not resolve one of its labels. `labelIn` makes this
    // unreachable for the wordings in the tables; the guard is here so that a client
    // update introducing a new element/race/size name blocks the line instead of writing
    // a key like `p_size_undefined`, which nothing reads.
    if (!keys || keys.some((key) => !key || key.endsWith('undefined'))) return null;
    const value = magnitudeOf(phrase);
    if (value == null) return null;
    // One magnitude, shared by every key the phrase resolves to: "VIT e INT +1" is +1 on
    // each, and "Resistência as raças Bruto e Doram +15%" is +15 against each.
    return keys.map((key) => ({ key, value: STORED_INVERTED.has(key) ? -value : value }));
  }
  return null;
}

/** A line is mappable only when EVERY phrase in it maps. Half a line is not a bonus. */
function mapLine(text) {
  const phrases = phrasesOf(text);
  if (!phrases.length) return null;
  const entries = [];
  for (const p of phrases) {
    const e = mapPhrase(p);
    if (!e) return null;
    entries.push(...e);
  }
  return entries;
}

// ── classification ───────────────────────────────────────────────────────────────────

const isCard = (rec, id) => /^Carta /.test(rec?.name || '') && !NOT_A_CARD.has(Number(id));

/**
 * Where the card goes, from whichever wording the client used — plus divine-pride for the
 * two it does not place at all.
 *
 * Every spelling is treated as equal evidence rather than "Equipa em:" being the only real
 * one. The older forms were verified against the RagnaPlace API when resolve-card-slots.mjs
 * ran: all 29 cards that use them agree, so preferring the modern spelling bought nothing
 * and cost a group of 50 cards that read as unplaceable while their slot was printed on
 * screen the whole time.
 *
 * `\s*:` — 300277 (Carta Rancor de Thanatos) prints "Equipa em : Escudo", with a space
 * before the colon, and a strict "Equipa em:" dropped it as if no slot had been named.
 *
 * "Classes:" is accepted last and only when its value is a slot: on a card the client uses
 * that line for the equipment type (4421 Carta Drosera prints "Classes: Arma"), but on
 * ordinary gear the same label lists job classes, so a value outside CardPosition is left
 * for the `undefined` group to report instead of being read as a slot.
 */
function resolveSlot(desc, id) {
  const modern = /Equipa em\s*:\s*([^\n]*)/.exec(desc)?.[1].trim();
  if (modern) return { label: modern, source: 'Equipa em' };

  const older = /(?:Utiliza[cç][aã]o|Equipado em|Localiza[cç][aã]o)\s*:\s*([^\n]*)/.exec(desc)?.[1].trim();
  if (older) return { label: older, source: 'older spelling' };

  const classes = /Classes\s*:\s*([^\n]*)/.exec(desc)?.[1].trim();
  if (classes && classes in CARD_POSITION) return { label: classes, source: 'Classes' };

  // 4423 (Carta Galion) prints no slot line at all: it prints "Tipo:" twice, once for
  // "Carta" and once for the slot. Read last, and only when the value is a slot, so the
  // ordinary "Tipo: Carta" every other card prints cannot be mistaken for one.
  const types = [...desc.matchAll(TYPE_LINE)].map((m) => m[1].trim()).filter((t) => t in CARD_POSITION);
  if (types.length) return { label: types[types.length - 1], source: 'second "Tipo:" line' };

  const dp = SLOT_FROM_DIVINE_PRIDE.get(Number(id));
  if (dp) return { label: dp.label, source: `divine-pride (${dp.enName}, ${dp.dp})` };

  return null;
}

function classify(id) {
  const rec = latam[id];
  const desc = plain(rec.description);
  const slot = resolveSlot(desc, id);
  const slotLabel = slot?.label ?? null;
  const lines = effectLines(rec.description);
  const mapped = [], blocked = [], gatedMappable = [];
  for (const { text, gated, gate } of lines) {
    const isHeader = /:$/.test(text);
    const entries = gated || isHeader ? null : mapLine(text);
    if (entries) { mapped.push({ text, entries }); continue; }
    blocked.push(text);
    // A gated line that WOULD map if it stood alone. The distinction the group names hide:
    // "ATQ +20" under "A cada 2 refinos:" is a bonus the engine expresses perfectly well
    // (the "2---20" entry form), while "5% de chance de" is not expressible at all. Both
    // land in `blocked`, and only one of them is waiting on engine work.
    if (gated && !isHeader) {
      const gatedEntries = mapLine(text);
      if (gatedEntries) gatedMappable.push({ text, entries: gatedEntries, gate });
    }
  }
  const base = { id: Number(id), name: rec.name, slotLabel, slotSource: slot?.source ?? null };

  if (items[id]) return { ...base, group: 'registered' };
  // Should be unreachable: a card always compounds onto something, and resolveSlot reads
  // every wording the client uses plus a divine-pride entry for the two it leaves out. Kept
  // as a guard, not as a bucket — if a client update ships a card this cannot place, that is
  // a new wording to teach resolveSlot (or one more id to look up), and the run says so
  // instead of quietly parking it.
  if (!slotLabel) return { ...base, group: 'noSlot', mapped, blocked, gatedMappable };
  if (!(slotLabel in CARD_POSITION)) {
    return { ...base, group: 'undefined', reason: `slot label "${slotLabel}" is not a CardPosition`, mapped, blocked, gatedMappable };
  }
  if (!lines.length) {
    return { ...base, group: 'undefined', reason: 'no effect text at all, only a footer', mapped, blocked, gatedMappable };
  }
  const compositionPos = CARD_POSITION[slotLabel];
  if (mapped.length && !blocked.length) return { ...base, compositionPos, group: 'ready', mapped, blocked, gatedMappable };
  if (mapped.length) return { ...base, compositionPos, group: 'mixed', mapped, blocked, gatedMappable };
  return { ...base, compositionPos, group: 'proc', mapped, blocked, gatedMappable };
}

// ── --witness: re-derive every rule from item.json instead of trusting the table ─────

function runWitness() {
  const rows = [];
  for (const [name, , fn, needle] of RULES) {
    const keys = keysOfRule(fn);
    let hit = null;
    for (const [id, it] of Object.entries(items)) {
      const rec = latam[id];
      if (!rec || !plain(rec.description).includes(needle)) continue;
      const carried = Object.keys(it.script || {}).filter((k) => keys.has(k.split('__').pop()) || keys.has(k));
      if (carried.length) { hit = `${id} ${rec.name} -> ${carried.join(',')}`; break; }
    }
    rows.push([name, needle, hit ?? 'NO WITNESS']);
  }
  const w = Math.max(...rows.map((r) => r[0].length));
  for (const [name, needle, hit] of rows) {
    console.log(`${name.padEnd(w)}  ${hit === 'NO WITNESS' ? 'NO WITNESS  ' : ''}"${needle}" -> ${hit}`);
  }
  const missing = rows.filter((r) => r[2] === 'NO WITNESS');
  console.log(`\n${rows.length - missing.length}/${rows.length} rules proven against an item already in item.json.`);
  if (missing.length) process.exitCode = 1;
}

// ── regression guard ─────────────────────────────────────────────────────────────────

/**
 * The 64 ids a54f32e6 registered, copied from its spec. Every one of them was chosen
 * because *every* line of its description mapped, so this table must still map all of
 * them — it may be broader than the one used then, never narrower. A card dropping off
 * this list means a rule stopped matching and the groups below moved for the wrong
 * reason.
 */
const REGISTERED_BY_A54F32E6 = [
  4002, 4003, 4004, 4006, 4008, 4011, 4012, 4013, 4014, 4015, 4016, 4023, 4027, 4028,
  4030, 4032, 4042, 4043, 4049, 4050, 4052, 4056, 4059, 4068, 4074, 4078, 4081, 4095,
  4097, 4106, 4108, 4109, 4113, 4116, 4120, 4136, 4138, 4142, 4272, 4309, 4314, 4328,
  4340, 4362, 4450, 4452, 4453, 4505, 4515, 4516, 4526, 4527, 4545, 4640, 4659, 4663,
  4664, 4665, 4666, 4667, 27291, 27342, 31016, 31021,
];

function assertBatchStillMaps() {
  const lost = [];
  for (const id of REGISTERED_BY_A54F32E6) {
    const lines = effectLines(latam[id].description);
    const bad = lines.filter(({ text, gated }) => gated || /:$/.test(text) || !mapLine(text));
    if (bad.length) lost.push(`${id} ${latam[id].name}: ${bad.map((b) => b.text).join(' / ')}`);
  }
  if (lost.length) {
    console.error(`${lost.length}/64 of a54f32e6's cards no longer map fully:`);
    for (const l of lost) console.error('  ' + l);
    process.exit(1);
  }
}


// ── what the two CLIs import ─────────────────────────────────────────────────────────

export {
  ROOT,
  DATA,
  latam,
  items,
  plain,
  CARD_POSITION,
  RULES,
  STORED_INVERTED,
  effectLines,
  mapLine,
  isCard,
  classify,
  assertKeysExist,
  assertBatchStillMaps,
  runWitness,
  REGISTERED_BY_A54F32E6,
};
