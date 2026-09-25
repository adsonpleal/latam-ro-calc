/** Ingrata D's Peças Suplementares and Autopeças: https://browiki.org/wiki/Verus */
type Positions = (string[] | null)[];

const levels = (name: string, max: number) => Array.from({ length: max }, (_, i) => `${name}${i + 1}`);
const stats = (max: number) => ['Strength', 'Agility', 'Vitality', 'Dexterity', 'Luck'].flatMap((name) => levels(name, max));
const unique = (...groups: string[][]) => [...new Set(groups.flat())];
const three = (pool: string[]): Positions => [null, pool, pool, pool];
const two = (pool: string[]): Positions => [null, null, pool, pool];

// The +9 options join the ordinary options. Like the Mora enchant picker, the
// current picker cannot restrict an option by the equipped item's refine level.
const strengthArmor = unique(
  levels('Agility', 2), levels('Luck', 2), levels('Attack_Delay_', 2),
  ['Evasion1', 'Evasion3', 'Evasion12'], levels('Vitality', 3),
  levels('MHP', 3), ['Def3', 'Def6', 'Def9'], ['aegis_4933', 'aegis_4934', 'aegis_4935'],
);
const carburetor = unique(
  levels('Agility', 2), levels('Luck', 2), levels('Attack_Delay_', 2),
  ['Evasion1', 'Evasion3', 'Evasion12'], levels('Strength', 3),
  levels('Dexterity', 3), levels('Fighting_Spirit', 3), levels('Expert_Archer', 3),
);
const accelerator = unique(stats(2), levels('Spell', 2), levels('Attack_Delay_', 2));
const engine = unique(stats(3), levels('Expert_Archer', 3));
const exhaust = unique(stats(2), levels('Spell', 2), ['Attack_Delay_1']);

const VERUS_ENCHANTS_BY_ID: Record<number, Positions> = {
  15110: three(strengthArmor), // Peça de FOR Suplementar [0]
  15343: three(strengthArmor), // Peça de FOR Suplementar [1]
  15111: three(carburetor),   // Autopeça - Carburador [0]
  15344: three(carburetor),   // Autopeça - Carburador [1]
  22043: three(accelerator),  // Peça de AGI Suplementar
  22044: three(accelerator),  // Autopeça - Acelerador
  20732: three(engine),       // Peça de VIT Suplementar
  20733: three(engine),       // Autopeça - Motor
  2995: two(exhaust),         // Peça de DES Suplementar
  2996: two(exhaust),         // Autopeça - Exaustor
};

export const getVerusEnchants = (id: number): Positions | undefined => VERUS_ENCHANTS_BY_ID[id];
