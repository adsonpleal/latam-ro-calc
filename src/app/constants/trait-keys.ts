/** The six trait fields, in the order the game's status window lists them. */
export const TRAIT_KEYS = ['pow', 'sta', 'wis', 'spl', 'con', 'crt'] as const;

export type TraitKey = (typeof TRAIT_KEYS)[number];

/** The six main stats, in the order the status panel lists them. */
export const MAIN_STAT_KEYS = ['str', 'agi', 'vit', 'int', 'dex', 'luk'] as const;

export type MainStatKey = (typeof MAIN_STAT_KEYS)[number];
