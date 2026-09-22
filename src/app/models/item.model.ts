import { ItemAutoCastPendingScript, ItemAutoCastScript } from './auto-cast.model';

export type ItemScriptValue = string[] | ItemAutoCastScript[] | ItemAutoCastPendingScript[];
export const ITEM_AUTO_CAST_DIRECTIVE = 'autoCast' as const;
export const ITEM_AUTO_CAST_PENDING_DIRECTIVE = 'autoCastPending' as const;

export function itemAutoCastScripts(script: Record<string, ItemScriptValue> | undefined): readonly ItemAutoCastScript[] {
  const value = script?.[ITEM_AUTO_CAST_DIRECTIVE];
  return Array.isArray(value) && (value as unknown[]).every((entry) => typeof entry !== 'string')
    ? value as ItemAutoCastScript[]
    : [];
}

export function itemAutoCastPendingScripts(script: Record<string, ItemScriptValue> | undefined): readonly ItemAutoCastPendingScript[] {
  const value = script?.[ITEM_AUTO_CAST_PENDING_DIRECTIVE];
  return Array.isArray(value) && (value as unknown[]).every((entry) => typeof entry !== 'string')
    ? value as ItemAutoCastPendingScript[]
    : [];
}

/** Ordinary numeric bonuses, excluding every reserved structured directive. */
export function itemBonusScriptEntries(script: Record<string, ItemScriptValue> | undefined): Array<[string, string[]]> {
  return Object.entries(script ?? {}).filter((entry): entry is [string, string[]] => (
    entry[0] !== ITEM_AUTO_CAST_DIRECTIVE
      && entry[0] !== ITEM_AUTO_CAST_PENDING_DIRECTIVE
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
