export const WeaponSubTypeNameMapById = {
  256: 'Dagger',
  257: 'Sword',
  258: 'Two-Handed Sword',
  259: 'Spear',
  260: 'Two-Handed Spear',
  261: 'Axe',
  262: 'Two-Handed Axe',
  263: 'Mace',
  264: 'Two-Handed Mace',
  265: 'Rod',
  266: 'Two-Handed Rod',
  267: 'Bow',
  268: 'Fistweapon',
  269: 'Instrument',
  270: 'Whip',
  271: 'Book',
  272: 'Katar',
  273: 'Revolver',
  274: 'Rifle',
  275: 'Gatling Gun',
  276: 'Shotgun',
  277: 'Grenade Launcher',
  278: 'Shuriken',
} as const;

export const WeaponTypeNameMapBySubTypeId = {
  256: 'dagger',
  257: 'sword',
  258: 'twohandSword',
  259: 'spear',
  260: 'twohandSpear',
  261: 'axe',
  262: 'twohandAxe',
  263: 'mace',
  264: 'twohandMace',
  265: 'rod',
  266: 'twohandRod', //rod staff
  267: 'bow',
  268: 'fist', // knuckle
  269: 'instrument',
  270: 'whip',
  271: 'book',
  272: 'katar',
  273: 'gun',
  274: 'gun',
  275: 'gun',
  276: 'gun',
  277: 'gun',
  278: 'shuriken',
} as const;

type Keys = keyof typeof WeaponTypeNameMapBySubTypeId;
export type WeaponTypeName = (typeof WeaponTypeNameMapBySubTypeId)[Keys];
export type WeaponSubTypeName = (typeof WeaponSubTypeNameMapById)[Keys];

/**
 * pt-BR names for every weapon subtype, as the Custom Item Studio's weapon dropdown
 * already showed them. Shared from here so the "Requer ..." warning and the dropdown
 * cannot drift apart.
 */
export const WEAPON_SUBTYPE_LABEL_PT_BR: Record<WeaponSubTypeName, string> = {
  Dagger: 'Adaga', Sword: 'Espada', 'Two-Handed Sword': 'Espada de duas mãos',
  Spear: 'Lança', 'Two-Handed Spear': 'Lança de duas mãos', Axe: 'Machado',
  'Two-Handed Axe': 'Machado de duas mãos', Mace: 'Maça', 'Two-Handed Mace': 'Maça de duas mãos',
  Rod: 'Cajado', 'Two-Handed Rod': 'Cajado de duas mãos', Bow: 'Arco', Fistweapon: 'Soqueira',
  Instrument: 'Instrumento', Whip: 'Chicote', Book: 'Livro', Katar: 'Katar',
  Revolver: 'Revólver', Rifle: 'Rifle', 'Gatling Gun': 'Metralhadora', Shotgun: 'Espingarda',
  'Grenade Launcher': 'Lança-granadas', Shuriken: 'Shuriken',
};

/**
 * The same names keyed by the engine's weapon *type*. `gun` covers five subtypes at once
 * (revolver through grenade launcher), so it gets the umbrella term the client uses.
 */
export const WEAPON_TYPE_LABEL_PT_BR: Record<WeaponTypeName, string> = {
  dagger: 'Adaga', sword: 'Espada', twohandSword: 'Espada de duas mãos',
  spear: 'Lança', twohandSpear: 'Lança de duas mãos', axe: 'Machado',
  twohandAxe: 'Machado de duas mãos', mace: 'Maça', twohandMace: 'Maça de duas mãos',
  rod: 'Cajado', twohandRod: 'Cajado de duas mãos', bow: 'Arco', fist: 'Soqueira',
  instrument: 'Instrumento', whip: 'Chicote', book: 'Livro', katar: 'Katar',
  gun: 'Arma de fogo', shuriken: 'Shuriken',
};

/** Equipment slots a skill can demand, beyond the weapon itself. */
const GEAR_LABEL_PT_BR: Record<string, string> = { Shield: 'Escudo', Arrow: 'Flecha', Ammo: 'Munição' };

/**
 * Turn a skill's `verifyItemFn` requirement into the pt-BR text the warning shows.
 *
 * A class may return either a comma-separated list of the engine's own identifiers
 * ("spear, twohandSpear") or ready-made prose ("Auréola do Juiz ou das Chamas"). Only
 * the first kind is translated: a string with no recognisable identifier in it comes
 * back untouched, so prose written in the class survives verbatim. The list reads as
 * alternatives, because `verifyItemFn` accepts any one of them.
 */
/**
 * The "Apenas com …" line of a skill, in the shape `verifyItemFn` wants: an empty string
 * when the equipped weapon is one of them, the list of names when it is not — which
 * `localizeRequirement` right below turns into the pt-BR warning. Declared here, next to
 * that half of the contract, so a class states the requirement instead of re-deriving it.
 *
 * Structural parameter rather than `AtkSkillFormulaInput`: this module is what
 * `_character-base.abstract` imports its weapon names from, so it cannot import back.
 */
interface WeaponCheck {
  weapon: { isType(name: WeaponTypeName): boolean; isSubType(name: WeaponSubTypeName): boolean };
}

export const requiresWeaponType = (...requires: WeaponTypeName[]) =>
  ({ weapon }: WeaponCheck): string =>
    (requires.some((wType) => weapon.isType(wType)) ? '' : requires.join(', '));

export const requiresWeaponSubType = (...requires: WeaponSubTypeName[]) =>
  ({ weapon }: WeaponCheck): string =>
    (requires.some((subType) => weapon.isSubType(subType)) ? '' : requires.join(', '));

export const localizeRequirement = (requirement: string): string => {
  const parts = requirement.split(',').map((part) => part.trim()).filter(Boolean);
  const labelOf = (part: string) =>
    WEAPON_TYPE_LABEL_PT_BR[part as WeaponTypeName]
    ?? WEAPON_SUBTYPE_LABEL_PT_BR[part as WeaponSubTypeName]
    ?? GEAR_LABEL_PT_BR[part];

  if (!parts.some(labelOf)) return requirement;

  const labels = parts.map((part) => labelOf(part) ?? part);
  if (labels.length === 1) return labels[0];

  return `${labels.slice(0, -1).join(', ')} ou ${labels[labels.length - 1]}`;
};
