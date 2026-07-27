export interface ItemModel {
  id: number;
  aegisName: string;
  name: string;
  /** Original English display name, preserved by the LATAM overlay before `name`
   *  is swapped to pt-BR. Item-name script conditions (EQUIP[...], POS_SPECIFIC[...],
   *  REFINE_NAME[...]) are authored against this, so matching uses it. */
  enName?: string;
  unidName: string;
  resName: string;
  description: string;
  slots: number;
  itemTypeId: number;
  itemSubTypeId: number;
  itemLevel: any;
  attack: any;
  propertyAtk?: any;
  defense: any;
  weight: number;
  requiredLevel: any;
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
