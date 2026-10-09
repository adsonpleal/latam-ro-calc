import { Agi, ASPD, AtkPercent, Dex, EA, Fatal, FS, Int, Luk, MatkPercent, MHP, Sharp, Spell, Str, Vit } from './_basic';

/**
 * Túmulo do Monarca — Colecionadora and Homem Suspeito.
 * https://browiki.org/wiki/T%C3%BAmulo_do_Monarca#Encantamento
 * Tracker: aFYCOaWVT5xep4prM67W.
 *
 * Match the wiki's accessory IDs, not their Korean sprite names: several IDs
 * share a name with other accessories (including slotted/unslotted variants).
 * The NPC requires the right side only while enchanting; a finished accessory
 * keeps its enchant when worn on either side.
 */
type Positions = (string[] | null)[];
const levels = (prefix: string, from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => `${prefix}${from + i}`);

// The Colecionadora fills one position, the last socket, with this 44-option pool.
const common = [
  Str._2, Str._3, Str._4, Agi._2, Agi._3, Agi._4,
  Vit._2, Vit._3, Vit._4, Dex._2, Dex._3, Dex._4,
  Int._2, Int._4, Int._6,
  FS._3, FS._4, FS._5, Spell._3, Spell._4, Spell._5,
  Sharp._2, Sharp._3, Sharp._4, EA._1, 'Fatal0', Fatal._1, Fatal._2,
  'Heal_Amount2', 'Heal_Amount3', AtkPercent._1, MatkPercent._1, 'Matk1p',
  'HP200', 'HP400', MHP._1, MHP._2, 'SP50', 'SP100', 'aegis_4929',
  'Def6', 'Def12', 'Mdef2', 'Mdef4',
];

// The three categories are available in both Monarca positions. The calculator
// offers their union because it models a finished roll, not the NPC's category choice.
const physical = [
  ...levels('Agility', 3, 7), ...levels('Strength', 3, 7), ...levels('Vitality', 3, 7),
  ...levels('Fighting_Spirit', 3, 7), ...levels('Sharp', 1, 5),
  AtkPercent._1, AtkPercent._2, AtkPercent._3, ASPD._1, ASPD._2,
];
const magical = [
  ...levels('Inteligence', 3, 7), ...levels('Dexterity', 3, 7), ...levels('Vitality', 3, 7),
  ...levels('Heal_Amount', 2, 5), ...levels('Spell', 3, 7),
  'Matk1p', 'Matk2p', 'Matk3p', MatkPercent._1, MatkPercent._2, 'aegis_4929',
];
const ranged = [
  ...levels('Agility', 3, 7), ...levels('Dexterity', 3, 7),
  Luk._3, Luk._4, Luk._5, Luk._6, Luk._7,
  'Fatal0', Fatal._1, Fatal._2, Fatal._3, Fatal._4,
  ...levels('Sharp', 1, 5), EA._1, EA._2, EA._3, ASPD._1, ASPD._2,
];
const monarch = [...new Set([...physical, ...magical, ...ranged])];

/** Exact IDs from the wiki's 14 rows of four common accessories. */
const commonAccessories = new Set([
  2601, 2602, 2605, 2603,
  2789, 2788, 2790, 2607,
  2665, 2604, 2652, 2627,
  2853, 2701, 2881, 2654,
  2729, 2619, 2745, 2650,
  2616, 2749, 2787, 2651,
  2620, 2617, 2718, 2608,
  2703, 2667, 2736, 2737,
  2772, 2716, 2747, 2746,
  2774, 2854, 2727, 2726,
  2773, 2664, 2719, 2635,
  2648, 2649, 2658, 2618,
  2610, 2628, 2656, 2614,
  2611, 2732, 2728, 2700,
]);

const commonPositions: Positions = [null, null, null, common];
const monarchPositions: Positions = [null, null, monarch, monarch];

export const getMonarchTombEnchants = (id: number): Positions | undefined => {
  if (id === 28483) return monarchPositions;
  return commonAccessories.has(id) ? commonPositions : undefined;
};
