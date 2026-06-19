import { RandomOption } from './rrf/types';

/**
 * Maps a replay's random options ("Bônus Aleatórios") onto the calculator's
 * option-script vocabulary.
 *
 * The replay stores each option as a numeric id from the rAthena
 * `e_random_option_var` enum (the same ids the client's `addrandomoptionname`
 * table is keyed by — verified against ragreplaystats' generated randomopt.json)
 * plus a rolled value. The calculator instead represents an option as a
 * `"<attr>:<value>"` string whose `<attr>` is an `EquipmentSummaryModel` field
 * the damage engine sums (see create-raw-total-bonus.ts / option-scripts.ts).
 *
 * Only options the engine can actually model are mapped; defensive / utility
 * rolls the calculator has no field for (elemental & racial resistances, natural
 * regen, heal power, SP cost, weapon-property enchants, EXP, …) return `null` so
 * the importer can count them as "skipped" rather than apply a no-op.
 */

// Calc attr suffixes in the same order the rAthena enums iterate, so the
// per-family option-id blocks line up by index.
const ELEMENTS = ['neutral', 'water', 'earth', 'fire', 'wind', 'poison', 'holy', 'dark', 'ghost', 'undead'] as const;
const RACES = ['formless', 'undead', 'brute', 'plant', 'insect', 'fish', 'demon', 'demihuman', 'angel', 'dragon'] as const;
const SIZES = ['s', 'm', 'l'] as const;

/** Build the contiguous-id family maps (id -> attr) used below. */
const familyMap = (() => {
  const m = new Map<number, string>();
  const range = (startId: number, step: number, attrs: readonly string[], prefix: string) => {
    attrs.forEach((attr, i) => m.set(startId + i * step, `${prefix}${attr}`));
  };

  // Physical / magical damage vs element (interleaved with resist: odd = damage).
  range(37, 2, ELEMENTS, 'p_element_'); // 37,39,…,55
  range(57, 2, ELEMENTS, 'm_element_'); // 57,59,…,75
  // Physical / magical damage vs race (contiguous).
  range(97, 1, RACES, 'p_race_'); // 97..106
  range(107, 1, RACES, 'm_race_'); // 107..116
  // DEF / MDEF penetration vs race.
  range(127, 1, RACES, 'p_pene_race_'); // 127..136
  range(137, 1, RACES, 'm_pene_race_'); // 137..146
  // Physical / magical damage vs size.
  range(157, 1, SIZES, 'p_size_'); // 157,158,159
  range(187, 1, SIZES, 'm_size_'); // 187,188,189
  // "My element" magic damage (cast property).
  range(221, 1, ELEMENTS, 'm_my_element_'); // 221..230
  return m;
})();

/** Standalone id -> calc attr entries (no regular family stride). */
const SCALAR_MAP: Record<number, string> = {
  1: 'hp', // HP máx. +n
  2: 'sp', // SP máx. +n
  3: 'str',
  4: 'agi',
  5: 'vit',
  6: 'int',
  7: 'dex',
  8: 'luk',
  9: 'hpPercent', // HP máx. +n%
  10: 'spPercent', // SP máx. +n%
  13: 'atkPercent', // ATQ da arma +n%
  14: 'matkPercent', // Dano mágico +n%
  15: 'aspd', // Velocidade de ataque +n
  16: 'aspdPercent', // Velocidade de ataque +n%
  17: 'atk', // ATQ +n
  18: 'hit', // Precisão +n
  19: 'matk', // ATQM +n
  20: 'def', // DEF +n
  21: 'mdef', // DEFM +n
  22: 'flee', // Esquiva +n
  23: 'perfectDodge', // Esquiva perfeita +n
  24: 'cri', // CRIT +n
  147: 'p_class_normal', // Dano físico contra alvo Normal +n%
  148: 'p_class_boss', // Dano físico contra Chefes +n%
  151: 'm_class_normal', // Dano mágico contra alvo Normal +n%
  152: 'm_class_boss', // Dano mágico contra Chefes +n%
  153: 'p_pene_class_normal', // Ignora n% da DEF de alvo Normal
  154: 'p_pene_class_boss', // Ignora n% da DEF de Chefes
  155: 'm_pene_class_normal', // Ignora n% da DEFM de alvo Normal
  156: 'm_pene_class_boss', // Ignora n% da DEFM de Chefes
  164: 'criDmg', // Dano crítico +n%
  166: 'range', // Dano físico a distância +n%
  170: 'vct', // Conjuração variável -n%
  171: 'acd', // Pós-conjuração -n%
  204: 'range', // Dano físico a distância +n% (alt id)
  219: 'melee', // Dano físico corpo a corpo +n%
  231: 'm_my_element_all', // Dano mágico todas as prop. n%
  243: 'pow',
  244: 'spl',
  245: 'sta',
  246: 'wis',
  247: 'con',
  248: 'crt',
  249: 'pAtk',
  250: 'sMatk',
  251: 'res', // TEN +n    (rAthena RES trait — "Tenacidade" on LATAM)
  252: 'mres', // MTEN +n   (MRES trait)
  253: 'hplus', // C.Mais +n (HPlus — heal bonus)
  254: 'cRate', // T.CRÍT +n (CRate — critical rate trait)
};

/** "Anula a penalidade de tamanho da arma" — a flag, not a scaled value. */
const IGNORE_SIZE_PENALTY_ID = 163;

/**
 * Resolve one random option to a calculator option-script string
 * (`"<attr>:<value>"`), or `null` if the engine can't represent it.
 */
export function randomOptionToScript(opt: RandomOption): string | null {
  if (!opt || !opt.id) return null;
  if (opt.id === IGNORE_SIZE_PENALTY_ID) return 'ignore_size_penalty:1';

  const attr = SCALAR_MAP[opt.id] ?? familyMap.get(opt.id) ?? null;
  if (!attr) return null;
  // The calc's option-script parser only accepts non-negative magnitudes
  // (`/(.+):(\d+)/`); every mapped attr is an additive bonus where the rolled
  // value is the positive magnitude (delay/cast reductions included). Drop
  // non-positive rolls rather than emit an unparseable string.
  if (!Number.isFinite(opt.value) || opt.value <= 0) return null;
  return `${attr}:${opt.value}`;
}
