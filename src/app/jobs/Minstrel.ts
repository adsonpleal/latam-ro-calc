import { ClassName } from './_class-name';
import { ActiveSkillModel, AtkSkillModel, PassiveSkillModel } from './_character-base.abstract';
import { ARROW_VULCAN, METALIC_SOUND, REVERBERATION, SEVERE_RAINSTORM } from '../skills/shared-skills';
import { InfoForClass } from '../models/info-for-class.model';
import {
  CirclingNatureFn,
  DanceWithWug,
  FriggsSongFn,
  GreatEchoFn,
  LeradsDew,
  Lesson,
  MetalicSoundFn,
  SevereRainstormFn,
  SongOfMana,
} from '../constants/share-passive-skills';
import { BragisPoemFn, SwingDanceFn } from '../constants/share-active-skills';
import { Dancer } from './Dancer';

const jobBonusTable: Record<number, [number, number, number, number, number, number]> = {
  1: [0, 0, 0, 1, 0, 0],
  2: [0, 0, 0, 1, 0, 0],
  3: [0, 0, 1, 1, 0, 0],
  4: [0, 0, 1, 1, 0, 0],
  5: [0, 0, 1, 1, 1, 0],
  6: [0, 0, 1, 1, 1, 0],
  7: [0, 0, 1, 2, 1, 0],
  8: [0, 0, 1, 3, 1, 0],
  9: [0, 0, 1, 3, 1, 0],
  10: [0, 0, 2, 3, 1, 0],
  11: [0, 0, 3, 3, 1, 0],
  12: [0, 0, 3, 3, 1, 0],
  13: [0, 0, 3, 3, 1, 0],
  14: [0, 0, 3, 3, 2, 0],
  15: [0, 0, 3, 3, 3, 0],
  16: [0, 0, 3, 3, 3, 0],
  17: [0, 0, 3, 3, 3, 0],
  18: [1, 0, 3, 3, 3, 0],
  19: [2, 0, 3, 3, 3, 0],
  20: [2, 0, 3, 3, 3, 0],
  21: [2, 0, 3, 3, 3, 0],
  22: [2, 0, 3, 4, 3, 0],
  23: [2, 0, 3, 4, 3, 0],
  24: [3, 0, 3, 4, 3, 0],
  25: [3, 0, 3, 4, 3, 0],
  26: [3, 1, 3, 4, 3, 0],
  27: [3, 2, 3, 4, 3, 0],
  28: [4, 2, 3, 4, 3, 0],
  29: [4, 2, 3, 4, 3, 0],
  30: [4, 2, 3, 4, 3, 0],
  31: [4, 2, 3, 4, 3, 0],
  32: [4, 2, 3, 5, 3, 0],
  33: [4, 2, 3, 5, 3, 0],
  34: [4, 2, 4, 5, 3, 0],
  35: [4, 2, 4, 5, 3, 0],
  36: [4, 2, 4, 5, 4, 0],
  37: [4, 2, 4, 5, 4, 0],
  38: [4, 3, 4, 5, 4, 0],
  39: [4, 4, 4, 5, 4, 0],
  40: [4, 4, 4, 6, 4, 0],
  41: [4, 4, 4, 7, 4, 0],
  42: [4, 4, 4, 7, 4, 0],
  43: [4, 4, 4, 7, 4, 0],
  44: [4, 4, 4, 7, 5, 0],
  45: [4, 4, 5, 7, 5, 0],
  46: [5, 4, 5, 7, 5, 0],
  47: [5, 4, 5, 7, 5, 0],
  48: [5, 4, 5, 7, 5, 0],
  49: [5, 4, 5, 8, 5, 0],
  50: [5, 4, 5, 8, 6, 0],
  51: [5, 5, 5, 8, 6, 0],
  52: [5, 5, 6, 8, 6, 0],
  53: [6, 5, 6, 8, 6, 0],
  54: [6, 5, 6, 8, 6, 1],
  55: [6, 5, 6, 8, 6, 1],
  56: [6, 5, 6, 8, 7, 1],
  57: [6, 5, 7, 8, 7, 1],
  58: [7, 5, 7, 8, 7, 1],
  59: [7, 5, 7, 9, 7, 1],
  60: [7, 5, 7, 9, 8, 1],
  61: [7, 5, 7, 9, 8, 1],
  62: [7, 5, 7, 9, 8, 1],
  63: [7, 5, 7, 9, 8, 1],
  64: [7, 6, 7, 9, 9, 1],
  65: [7, 6, 7, 9, 9, 2],
  66: [7, 6, 7, 9, 9, 2],
  67: [7, 6, 7, 9, 9, 2],
  68: [7, 6, 7, 9, 9, 2],
  69: [7, 6, 7, 9, 9, 2],
  70: [7, 7, 7, 9, 10, 3],
};

export class Minstrel extends Dancer {
  protected override CLASS_NAME = ClassName.Minstrel;
  protected override JobBonusTable = jobBonusTable;

  private readonly classNames3rd = [ClassName.Only_3rd, ClassName.Minstrel];

  private readonly atkSkillList3rd: AtkSkillModel[] = [ARROW_VULCAN, METALIC_SOUND, SEVERE_RAINSTORM, REVERBERATION];

  private readonly activeSkillList3rd: ActiveSkillModel[] = [
    {
      label: 'Rush To Windmill',
      name: 'Rush To Windmill',
      inputType: 'dropdown',
      isMasteryAtk: true,
      dropdown: [
        { label: '-', value: 0, isUse: false },
        { label: 'Nv 1', value: 1, isUse: true, bonus: { x_atk: 1 * 6 } },
        { label: 'Nv 2', value: 2, isUse: true, bonus: { x_atk: 2 * 6 } },
        { label: 'Nv 3', value: 3, isUse: true, bonus: { x_atk: 3 * 6 } },
        { label: 'Nv 4', value: 4, isUse: true, bonus: { x_atk: 4 * 6 } },
        { label: 'Nv 5', value: 5, isUse: true, bonus: { x_atk: 5 * 6 } },
      ],
    },
    BragisPoemFn(),
    SwingDanceFn(),
  ];

  private readonly passiveSkillList3rd: PassiveSkillModel[] = [
    SevereRainstormFn(),
    {
      label: 'Musical Lesson',
      name: 'Musical Lesson',
      inputType: 'dropdown',
      isMasteryAtk: true,
      dropdown: [
        { label: '-', value: 0, isUse: false },
        { label: 'Nv 1', value: 1, isUse: true, bonus: { instrument_atk: 1 * 3, aspdPercent: 1, spPercent: 1 } },
        { label: 'Nv 2', value: 2, isUse: true, bonus: { instrument_atk: 2 * 3, aspdPercent: 2, spPercent: 2 } },
        { label: 'Nv 3', value: 3, isUse: true, bonus: { instrument_atk: 3 * 3, aspdPercent: 3, spPercent: 3 } },
        { label: 'Nv 4', value: 4, isUse: true, bonus: { instrument_atk: 4 * 3, aspdPercent: 4, spPercent: 4 } },
        { label: 'Nv 5', value: 5, isUse: true, bonus: { instrument_atk: 5 * 3, aspdPercent: 5, spPercent: 5 } },
        { label: 'Nv 6', value: 6, isUse: true, bonus: { instrument_atk: 6 * 3, aspdPercent: 6, spPercent: 6 } },
        { label: 'Nv 7', value: 7, isUse: true, bonus: { instrument_atk: 7 * 3, aspdPercent: 7, spPercent: 7 } },
        { label: 'Nv 8', value: 8, isUse: true, bonus: { instrument_atk: 8 * 3, aspdPercent: 8, spPercent: 8 } },
        { label: 'Nv 9', value: 9, isUse: true, bonus: { instrument_atk: 9 * 3, aspdPercent: 9, spPercent: 9 } },
        { label: 'Nv 10', value: 10, isUse: true, bonus: { instrument_atk: 10 * 3, aspdPercent: 10, spPercent: 10 } },
      ],
    },
    Lesson,
    {
      label: 'Musical Strike',
      name: 'Musical Strike',
      inputType: 'dropdown',
      dropdown: [
        { label: '-', value: 0, isUse: false },
        { label: 'Nv 1', value: 1, isUse: true },
        { label: 'Nv 2', value: 2, isUse: true },
        { label: 'Nv 3', value: 3, isUse: true },
        { label: 'Nv 4', value: 4, isUse: true },
        { label: 'Nv 5', value: 5, isUse: true },
      ],
    },
    SongOfMana,
    DanceWithWug,
    LeradsDew,
    CirclingNatureFn(),
    FriggsSongFn(),
    MetalicSoundFn(),
    GreatEchoFn(),
  ];

  constructor() {
    super();

    this.inheritSkills({
      activeSkillList: this.activeSkillList3rd,
      atkSkillList: this.atkSkillList3rd,
      passiveSkillList: this.passiveSkillList3rd,
      classNames: this.classNames3rd,
    });
  }

  override getUiMasteryAtk(info: InfoForClass): number {
    const weaponType = info.weapon?.data?.typeName;
    const { totalAtk } = this.calcHiddenMasteryAtk(info, { prefix: `${weaponType}` });

    return totalAtk;
  }

  override getMasteryAtk(info: InfoForClass): number {
    const { jobLevel } = info.model;

    const isActiveRush = this.bonuses.activeSkillNames.has('Rush To Windmill');
    if (!isActiveRush) return 0;

    const weaponType = info.weapon?.data?.typeName;
    const { totalAtk } = this.calcHiddenMasteryAtk(info, { prefix: `x_${weaponType}` });

    const { learnedSkillMap } = this.bonuses;
    const lessonLv = learnedSkillMap.get('Lesson') || 0;

    return totalAtk + lessonLv + Math.floor(jobLevel / 5);
  }
}
