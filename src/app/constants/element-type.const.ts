export enum ElementType {
  Neutral = 'Neutral',
  Water = 'Water',
  Earth = 'Earth',
  Fire = 'Fire',
  Wind = 'Wind',
  Poison = 'Poison',
  Holy = 'Holy',
  Dark = 'Dark',
  Ghost = 'Ghost',
  Undead = 'Undead',
}

export const ElementalMasterSpirit = {
  1: ElementType.Water, // 'Divulio',
  2: ElementType.Fire, // 'Ardor',
  3: ElementType.Wind, // 'Procella',
  4: ElementType.Earth, // 'Terramotus',
  5: ElementType.Poison, // 'Serpens',
};

/**
 * Domínio Elemental (SO_EL_CONTROL, 2456) — the mode a summoned elemental is kept in.
 * Every "Invocar <elemental>" description ends with "Também possui efeitos diferentes
 * conforme o nível usado de Domínio Elemental"; browiki spells the modes out one page
 * per elemental (Invocar_Serpens, Invocar_Diluvium, ...).
 *
 * Level 4 deletes the elemental, so it is not a state a build can sit in and it is not
 * offered. Only Passivo carries effects the engine can measure — see
 * ElementalMaster.setSpiritBonus.
 *
 * It lives here rather than in ElementalMaster.ts because Sorcerer reads it too (Onda
 * Psíquica's element), and ElementalMaster already imports Sorcerer.
 */
export const ElementalControlMode = {
  Passive: 1,
  Defensive: 2,
  Offensive: 3,
} as const;
