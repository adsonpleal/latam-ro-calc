import { ClassName } from './_class-name';
import { ActiveSkillModel, AtkSkillModel, PassiveSkillModel } from './_character-base.abstract';
import { ARROW_VULCAN, METALIC_SOUND, REVERBERATION, SEVERE_RAINSTORM } from '../skills/shared-skills';
import { AdditionalBonusInput, InfoForClass } from '../models/info-for-class.model';
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
import { Bard } from './Bard';

const jobBonusTable: Record<number, [number, number, number, number, number, number]> = {
  1: [0, 0, 0, 0, 1, 0],
  2: [0, 0, 0, 1, 1, 0],
  3: [0, 0, 0, 2, 1, 0],
  4: [0, 1, 0, 2, 1, 0],
  5: [0, 1, 0, 2, 1, 0],
  6: [0, 1, 0, 2, 1, 0],
  7: [0, 2, 0, 2, 1, 0],
  8: [0, 2, 0, 2, 2, 0],
  9: [0, 2, 0, 3, 2, 0],
  10: [0, 2, 0, 3, 2, 0],
  11: [0, 2, 0, 3, 2, 0],
  12: [0, 2, 1, 3, 2, 0],
  13: [0, 2, 2, 3, 2, 0],
  14: [0, 2, 3, 3, 2, 0],
  15: [0, 2, 3, 3, 2, 0],
  16: [0, 2, 3, 3, 2, 0],
  17: [0, 2, 3, 3, 3, 0],
  18: [0, 3, 3, 3, 3, 0],
  19: [0, 3, 3, 3, 3, 0],
  20: [0, 3, 3, 3, 3, 0],
  21: [0, 3, 3, 4, 3, 0],
  22: [0, 3, 4, 4, 3, 0],
  23: [0, 3, 4, 4, 4, 0],
  24: [0, 3, 4, 4, 4, 0],
  25: [0, 3, 4, 4, 4, 0],
  26: [1, 3, 4, 4, 4, 0],
  27: [2, 3, 4, 4, 4, 0],
  28: [2, 3, 4, 4, 4, 0],
  29: [2, 3, 4, 4, 4, 0],
  30: [2, 3, 4, 4, 5, 0],
  31: [2, 4, 4, 4, 5, 0],
  32: [2, 4, 5, 4, 5, 0],
  33: [2, 4, 5, 4, 5, 0],
  34: [2, 4, 5, 4, 5, 0],
  35: [2, 4, 5, 4, 5, 0],
  36: [2, 4, 5, 5, 5, 0],
  37: [2, 4, 5, 6, 5, 0],
  38: [2, 4, 5, 7, 5, 0],
  39: [2, 5, 5, 7, 5, 0],
  40: [2, 5, 5, 7, 5, 0],
  41: [2, 5, 5, 7, 5, 0],
  42: [2, 5, 5, 7, 5, 0],
  43: [2, 6, 5, 7, 5, 0],
  44: [2, 6, 5, 7, 6, 0],
  45: [2, 7, 5, 7, 6, 0],
  46: [2, 7, 5, 7, 6, 0],
  47: [2, 7, 5, 7, 6, 0],
  48: [2, 7, 5, 7, 6, 0],
  49: [2, 7, 5, 8, 6, 0],
  50: [2, 8, 5, 8, 6, 0],
  51: [3, 8, 5, 8, 6, 0],
  52: [3, 8, 6, 8, 6, 0],
  53: [3, 8, 6, 8, 7, 0],
  54: [3, 8, 6, 8, 7, 0],
  55: [3, 8, 6, 8, 7, 1],
  56: [3, 8, 6, 9, 7, 1],
  57: [3, 8, 6, 9, 7, 1],
  58: [3, 8, 7, 9, 7, 1],
  59: [3, 9, 7, 9, 7, 1],
  60: [3, 9, 7, 9, 8, 1],
  61: [3, 9, 7, 9, 8, 1],
  62: [3, 9, 7, 9, 8, 1],
  63: [3, 9, 7, 9, 8, 1],
  64: [3, 9, 7, 9, 8, 1],
  65: [5, 9, 7, 9, 8, 2],
  66: [5, 9, 7, 9, 8, 2],
  67: [5, 9, 7, 9, 8, 2],
  68: [5, 9, 7, 9, 8, 2],
  69: [5, 9, 7, 9, 8, 2],
  70: [7, 9, 7, 9, 8, 3],
};

export class Wanderer extends Bard {
  protected override CLASS_NAME = ClassName.Wanderer;
  protected override JobBonusTable = jobBonusTable;

  private readonly classNames3rd = [ClassName.Only_3rd, ClassName.Wanderer];
  private readonly atkSkillList3rd: AtkSkillModel[] = [ARROW_VULCAN, METALIC_SOUND, SEVERE_RAINSTORM, REVERBERATION];

  private readonly activeSkillList3rd: ActiveSkillModel[] = [SwingDanceFn(), BragisPoemFn()];

  private readonly passiveSkillList3rd: PassiveSkillModel[] = [
    SevereRainstormFn(),
    {
      label: 'Dancing Lesson',
      name: 'Dancing Lesson',
      inputType: 'dropdown',
      isMasteryAtk: true,
      dropdown: [
        { label: '-', value: 0, isUse: false },
        { label: 'Nv 1', value: 1, isUse: true, bonus: { x_whip_atk: 1 * 3, whip_cri: 1, spPercent: 1 } },
        { label: 'Nv 2', value: 2, isUse: true, bonus: { x_whip_atk: 2 * 3, whip_cri: 2, spPercent: 2 } },
        { label: 'Nv 3', value: 3, isUse: true, bonus: { x_whip_atk: 3 * 3, whip_cri: 3, spPercent: 3 } },
        { label: 'Nv 4', value: 4, isUse: true, bonus: { x_whip_atk: 4 * 3, whip_cri: 4, spPercent: 4 } },
        { label: 'Nv 5', value: 5, isUse: true, bonus: { x_whip_atk: 5 * 3, whip_cri: 5, spPercent: 5 } },
        { label: 'Nv 6', value: 6, isUse: true, bonus: { x_whip_atk: 6 * 3, whip_cri: 6, spPercent: 6 } },
        { label: 'Nv 7', value: 7, isUse: true, bonus: { x_whip_atk: 7 * 3, whip_cri: 7, spPercent: 7 } },
        { label: 'Nv 8', value: 8, isUse: true, bonus: { x_whip_atk: 8 * 3, whip_cri: 8, spPercent: 8 } },
        { label: 'Nv 9', value: 9, isUse: true, bonus: { x_whip_atk: 9 * 3, whip_cri: 9, spPercent: 9 } },
        { label: 'Nv 10', value: 10, isUse: true, bonus: { x_whip_atk: 10 * 3, whip_cri: 10, spPercent: 10 } },
      ],
    },
    Lesson,
    {
      label: 'Dart Arrow',
      name: 'Dart Arrow',
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
    const { weapon } = info;
    const weaponType = weapon?.data?.typeName;

    const { totalAtk } = this.calcHiddenMasteryAtk(info, { prefix: `x_${weaponType}` });

    return totalAtk;
  }

  override setAdditionalBonus(params: AdditionalBonusInput) {
    const { totalBonus, weapon } = params;
    const { typeName } = weapon.data;

    const { masteryAtks, equipAtks, learnedSkillMap, activeSkillNames } = this.bonuses;

    const prefixCondition = `${typeName}_`;
    for (const [_skillName, bonus] of Object.entries({ ...(masteryAtks || {}), ...(equipAtks || {}) })) {
      for (const [attr, value] of Object.entries(bonus)) {
        if (attr.startsWith(prefixCondition)) {
          const actualAttr = attr.replace(prefixCondition, '');
          totalBonus[actualAttr] += value;
        }
      }
    }

    const isActiveSwing = activeSkillNames.has('Swing Dance');
    const lessonLv = learnedSkillMap.get('Lesson') || 0;
    if (isActiveSwing && lessonLv > 0) {
      totalBonus.skillAspd += lessonLv;
    }

    return totalBonus;
  }
}
