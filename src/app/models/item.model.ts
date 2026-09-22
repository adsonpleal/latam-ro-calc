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
  script: Record<string, any[]>;
  /** Attack-triggered effects sourced from the LATAM client description. */
  autoCasts?: ItemAutoCastRule[];
}

export type AutoCastTrigger = 'physical-attack' | 'physical-hit' | 'melee-physical-hit' | 'ranged-physical-hit';

export interface ItemAutoCastRule {
  key: string;
  /** The skill cast by this effect. Non-damaging/audited clauses may omit it. */
  skillId?: number;
  /** A fixed cast level, or the highest learned level when the client says so. */
  skillLevel?: number;
  skillLevelMode?: 'fixed' | 'highest-learned';
  /** Percentage chance per eligible successful basic attack, when client text provides one. */
  chance?: number;
  trigger: AutoCastTrigger;
  roll: 'independent' | 'all' | 'one-of';
  /** Rules with the same group share one roll when `roll` is `all` or `one-of`. */
  rollGroup?: string;
  /** Existing item-script condition fragments, evaluated against the equipped build. */
  conditions?: string[];
  status: 'verified-direct-damage' | 'non-damaging' | 'wrong-trigger' | 'unsupported-formula' | 'ambiguous' | 'duplicate-reissue';
  evidence: string;
}
