import { ItemAutoCastEffectScript, ItemAutoCastPendingScript, ItemAutoCastScript } from './auto-cast.model';

export type ItemScriptValue = string[] | ItemAutoCastScript[] | ItemAutoCastPendingScript[] | ItemAutoCastEffectScript[];
export const ITEM_AUTO_CAST_DIRECTIVE = 'autoCast' as const;
export const ITEM_AUTO_CAST_PENDING_DIRECTIVE = 'autoCastPending' as const;
export const ITEM_AUTO_CAST_EFFECT_DIRECTIVE = 'autoCastEffect' as const;
const STRUCTURED_SCRIPT_DIRECTIVES = new Set<string>([
  ITEM_AUTO_CAST_DIRECTIVE, ITEM_AUTO_CAST_PENDING_DIRECTIVE, ITEM_AUTO_CAST_EFFECT_DIRECTIVE,
]);

function structuredScripts<T>(script: Record<string, ItemScriptValue> | undefined, directive: string): readonly T[] {
  const value = script?.[directive];
  return Array.isArray(value) && (value as unknown[]).every((entry) => typeof entry !== 'string')
    ? value as T[]
    : [];
}

export function itemAutoCastEffectScripts(script: Record<string, ItemScriptValue> | undefined): readonly ItemAutoCastEffectScript[] {
  return structuredScripts<ItemAutoCastEffectScript>(script, ITEM_AUTO_CAST_EFFECT_DIRECTIVE);
}

export function itemAutoCastScripts(script: Record<string, ItemScriptValue> | undefined): readonly ItemAutoCastScript[] {
  return structuredScripts<ItemAutoCastScript>(script, ITEM_AUTO_CAST_DIRECTIVE);
}

export function itemAutoCastPendingScripts(script: Record<string, ItemScriptValue> | undefined): readonly ItemAutoCastPendingScript[] {
  return structuredScripts<ItemAutoCastPendingScript>(script, ITEM_AUTO_CAST_PENDING_DIRECTIVE);
}

/** Ordinary numeric bonuses, excluding every reserved structured directive. */
export function itemBonusScriptEntries(script: Record<string, ItemScriptValue> | undefined): Array<[string, string[]]> {
  return Object.entries(script ?? {}).filter((entry): entry is [string, string[]] => (
    !STRUCTURED_SCRIPT_DIRECTIVES.has(entry[0])
      && (entry[1] as unknown[]).every((value) => typeof value === 'string')
  ));
}

export interface ItemModel {
  id: number;
  aegisName: string;
  name: string;
  /** Original English display name, preserved by the LATAM overlay before `name`
   *  is swapped to pt-BR. Item-name script conditions (EQUIP[...], POS_SPECIFIC[...],
   *  REFINE_NAME[...]) are authored against this, so matching uses it. */
  enName?: string;
  /** Present on the LATAM server. Precomputed by tools/build-web-data.mjs from
   *  the latam-items.json key set; the dropdowns list only these. */
  presentInLatam?: boolean;
  /** Not on LATAM yet, but listed anyway with its iRO English name and description.
   *  Hand-authored in item.json — it is what forces `presentInLatam` on. Temporary:
   *  src/app/api-services/pre-release-items.spec.ts fails once LATAM ships the id,
   *  which is the cue to drop the flag and let the pt-BR overlay take over. */
  preRelease?: boolean;
  slots: number;
  itemTypeId: number;
  itemSubTypeId: number;
  itemLevel: any;
  attack: any;
  propertyAtk?: any;
  defense: any;
  weight: number;
  location: any;
  /** Every head slot the item fills, when it fills more than one (see getHeadGearSlots). */
  locations?: string[];
  compositionPos: number;
  /** Classes that may wear the item; absent means anyone. Read through `canUsedByClass`. */
  usableClass?: string[];
  /** Classes that may not, which wins over `usableClass`. */
  unusableClass?: string[];
  isRefinable?: boolean;
  cardPrefix?: string;
  /** Derived from itemLevel by RoService (see canGradeItem) — not read from item.json. */
  canGrade?: boolean;
  /** Numeric bonus entries plus the reserved structured `autoCast` directive. */
  script: Record<string, ItemScriptValue>;
}
