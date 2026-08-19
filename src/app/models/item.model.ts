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
  isRefinable?: boolean;
  cardPrefix?: string;
  /** Derived from itemLevel by RoService (see canGradeItem) — not read from item.json. */
  canGrade?: boolean;
  script: Record<string, any[]>;
}
