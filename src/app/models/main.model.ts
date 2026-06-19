import { ElementType } from '../constants/element-type.const';
import { EquipmentModel } from '../constants/item-type.enum';

export interface MainModel extends Partial<EquipmentModel> {
  class: number;
  level: number;
  jobLevel: number;

  /**
   * Character appearance, for the saved-sim paper-doll. Populated by the replay
   * import; left undefined for builds assembled by hand (the paper-doll then
   * falls back to its male / default-hair defaults). `sex`: 0 = female, 1 = male.
   * `hairStyle` is a sprite id; `hairColor` / `clothesColor` are palette indices.
   */
  sex?: number;
  hairStyle?: number;
  hairColor?: number;
  clothesColor?: number;

  str: number;
  jobStr?: number;
  agi: number;
  jobAgi?: number;
  vit: number;
  jobVit?: number;
  int: number;
  jobInt?: number;
  dex: number;
  jobDex?: number;
  luk: number;
  jobLuk?: number;

  pow: number;
  jobPow: number;
  sta: number;
  jobSta: number;
  wis: number;
  jobWis: number;
  spl: number;
  jobSpl: number;
  con: number;
  jobCon: number;
  crt: number;
  jobCrt: number;

  selectedAtkSkill?: string;
  propertyAtk?: ElementType;
  rawOptionTxts: string[];

  skillBuffs: number[];
  skillBuffMap: Record<string, number>;

  activeSkills: number[];
  activeSkillMap: Record<string, number>;
  passiveSkills: number[];
  passiveSkillMap: Record<string, number>;
  consumables: number[];
  consumables2: number[];
  aspdPotion?: number;
  aspdPotions: number[];
}
