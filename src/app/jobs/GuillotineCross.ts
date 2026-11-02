import { ClassName } from './_class-name';
import { AssassinCross } from './AssassinCross';
import { ActiveSkillModel, AtkSkillFormulaInput, AtkSkillModel, PassiveSkillModel } from './_character-base.abstract';
import { DarkClawFn } from '../constants/share-active-skills';

const jobBonusTable: Record<number, [number, number, number, number, number, number]> = {
  1: [0, 1, 0, 0, 0, 0],
  2: [0, 1, 0, 0, 1, 0],
  3: [0, 1, 0, 0, 1, 0],
  4: [1, 1, 0, 0, 1, 0],
  5: [2, 1, 0, 0, 1, 0],
  6: [2, 1, 0, 0, 1, 0],
  7: [2, 1, 0, 0, 1, 0],
  8: [2, 1, 0, 0, 1, 0],
  9: [3, 1, 0, 0, 1, 0],
  10: [3, 2, 0, 0, 1, 0],
  11: [3, 2, 0, 0, 2, 0],
  12: [3, 2, 0, 0, 2, 0],
  13: [3, 2, 0, 0, 2, 0],
  14: [3, 2, 1, 0, 2, 0],
  15: [3, 2, 2, 0, 2, 0],
  16: [4, 2, 2, 0, 2, 0],
  17: [4, 2, 2, 0, 2, 0],
  18: [4, 2, 2, 0, 2, 0],
  19: [4, 2, 3, 0, 2, 0],
  20: [5, 2, 3, 0, 2, 0],
  21: [5, 2, 3, 0, 2, 0],
  22: [5, 2, 3, 0, 2, 0],
  23: [5, 3, 3, 0, 2, 0],
  24: [5, 4, 3, 0, 2, 0],
  25: [5, 4, 3, 0, 3, 0],
  26: [5, 4, 3, 0, 3, 0],
  27: [5, 4, 3, 0, 3, 0],
  28: [5, 4, 3, 1, 3, 0],
  29: [5, 4, 3, 2, 3, 0],
  30: [6, 4, 3, 2, 3, 0],
  31: [6, 4, 4, 2, 3, 0],
  32: [6, 4, 4, 2, 3, 0],
  33: [6, 4, 4, 2, 3, 0],
  34: [6, 4, 4, 2, 3, 0],
  35: [6, 5, 4, 2, 3, 0],
  36: [6, 5, 4, 2, 4, 0],
  37: [6, 5, 4, 2, 5, 0],
  38: [6, 5, 4, 2, 5, 0],
  39: [6, 5, 4, 2, 5, 0],
  40: [6, 5, 4, 2, 5, 0],
  41: [6, 5, 4, 3, 5, 0],
  42: [6, 5, 5, 3, 5, 0],
  43: [6, 6, 5, 3, 5, 0],
  44: [6, 7, 5, 3, 5, 0],
  45: [6, 7, 5, 3, 5, 0],
  46: [6, 7, 5, 3, 5, 0],
  47: [6, 7, 5, 3, 5, 0],
  48: [6, 7, 5, 4, 5, 0],
  49: [6, 7, 5, 4, 6, 0],
  50: [6, 7, 5, 4, 7, 0],
  51: [6, 7, 5, 4, 7, 1],
  52: [7, 7, 5, 4, 7, 1],
  53: [7, 8, 5, 4, 7, 1],
  54: [7, 8, 6, 4, 7, 1],
  55: [7, 8, 6, 4, 7, 1],
  56: [7, 8, 6, 5, 7, 1],
  57: [7, 8, 6, 5, 7, 1],
  58: [8, 8, 6, 5, 7, 1],
  59: [8, 8, 6, 5, 7, 2],
  60: [8, 9, 6, 5, 7, 2],
  61: [8, 9, 6, 5, 7, 2],
  62: [8, 9, 6, 5, 8, 2],
  63: [8, 9, 6, 5, 8, 2],
  64: [8, 9, 6, 5, 8, 3],
  65: [8, 10, 6, 5, 8, 3],
  66: [8, 10, 6, 5, 8, 3],
  67: [8, 10, 6, 5, 8, 3],
  68: [8, 10, 6, 5, 8, 3],
  69: [8, 10, 6, 5, 8, 3],
  70: [8, 11, 6, 5, 9, 4],
};

export class GuillotineCross extends AssassinCross {
  protected override CLASS_NAME = ClassName.GuillotineCross;
  protected override JobBonusTable = jobBonusTable;

  private readonly classNames3rd = [ClassName.Only_3rd, ClassName.GuillotineCross];
  private readonly atkSkillList3rd: AtkSkillModel[] = [
    {
      label: 'Soul Destroyer',
      name: 'Soul Destroyer',
      value: 'Soul Destroyer==10',
      values: ['[Improved 1st] Soul Destroyer==10', '[Improved 2nd] Soul Destroyer==10'],
      acd: 1,
      fct: 0.25,
      vct: 0.25,
      cd: 0.25,
      canCri: true,
      baseCriPercentage: 0.5,
      criDmgPercentage: 0.5,
      formula: (input: AtkSkillFormulaInput): number => {
        const { skillLevel, model, status } = input;
        const baseLevel = model.level;
        const { totalStr, totalInt } = status;

        return (skillLevel * 150 + totalStr + totalInt) * (baseLevel / 100);
      },
    },
    {
      name: 'Rolling Cutter',
      label: 'Rolling Cutter Lv5',
      value: 'Rolling Cutter==5',
      values: ['[Improved] Rolling Cutter==5'],
      acd: 0.2,
      fct: 0,
      vct: 0,
      cd: 0,
      isMelee: true,
      formula: (input: AtkSkillFormulaInput): number => {
        const { model, skillLevel } = input;
        const baseLevel = model.level;

        return (50 + skillLevel * 80) * (baseLevel / 100);
      },
    },
    {
      name: 'Cross Impact',
      label: 'Cross Impact Lv5',
      value: 'Cross Impact==5',
      values: ['[Improved 1st] Cross Impact==5', '[Improved 2rd] Cross Impact==5'],
      acd: 0.5,
      fct: 0,
      vct: 0,
      cd: 0.35,
      isMelee: true,
      canCri: true,
      baseCriPercentage: 0.5,
      criDmgPercentage: 0.5,
      hit: 7,
      formula: (input: AtkSkillFormulaInput): number => {
        const { model, skillLevel } = input;
        const baseLevel = model.level;

        return (1400 + skillLevel * 150) * (baseLevel / 100);
      },
    },
    {
      label: 'Counter Slash Lv10',
      name: 'Counter Slash',
      value: 'Counter Slash==10',
      acd: 1,
      fct: 0,
      vct: 0,
      cd: 0,
      isMelee: true,
      isIgnoreDef: true,
      formula: (input: AtkSkillFormulaInput): number => {
        const { model, skillLevel, status } = input;
        const { level: baseLevel, jobLevel } = model;
        const { totalAgi } = status;

        return (300 + skillLevel * 150) * (baseLevel / 120) + totalAgi * 2 + jobLevel * 4;
      },
    },
    {
      name: 'Cross Ripper Slasher',
      label: 'Cross Ripper Slasher Lv5',
      value: 'Cross Ripper Slasher==5',
      values: ['[Improved] Cross Ripper Slasher==5'],
      acd: 0.3,
      fct: 0,
      vct: 0,
      cd: 0.2,
      formula: (input: AtkSkillFormulaInput): number => {
        const { model, skillLevel, status } = input;
        const { level: baseLevel } = model;
        const { totalAgi } = status;
        const spinCnt = this.activeSkillLv('Spin Count');

        return skillLevel * 80 * (baseLevel / 100) + 200 * spinCnt + totalAgi * 3;
      },
    },
  ];

  private readonly activeSkillList3rd: ActiveSkillModel[] = [
    DarkClawFn(),
    {
      name: 'Spin Count',
      label: 'Pontos de Rotação',
      inputType: 'dropdown',
      dropdown: [
        { label: '-', isUse: false, value: 0 },
        { label: '1', isUse: true, value: 1 },
        { label: '2', isUse: true, value: 2 },
        { label: '3', isUse: true, value: 3 },
        { label: '4', isUse: true, value: 4 },
        { label: '5', isUse: true, value: 5 },
        { label: '6', isUse: true, value: 6 },
        { label: '7', isUse: true, value: 7 },
        { label: '8', isUse: true, value: 8 },
        { label: '9', isUse: true, value: 9 },
        { label: '10', isUse: true, value: 10 },
      ],
    },
    // Aplicar Toxina is two controls: its level, and the toxin it carries. The level alone
    // does nothing — the skill needs a toxin — so none of its options is "in use"; value 0
    // is Nv 5, which makes every build saved before the split read as the maximum level.
    {
      name: 'Poisonous Weapon Lv',
      label: 'Aplicar Toxina',
      inputType: 'dropdown',
      dropdown: [
        { label: 'Nv 5', isUse: false, value: 0, skillLv: 5 },
        { label: 'Nv 4', isUse: false, value: 4, skillLv: 4 },
        { label: 'Nv 3', isUse: false, value: 3, skillLv: 3 },
        { label: 'Nv 2', isUse: false, value: 2, skillLv: 2 },
        { label: 'Nv 1', isUse: false, value: 1, skillLv: 1 },
      ],
    },
    // The toxin keeps the control's old name and values 1 (Pirexia) and 2 (Waraitake), so
    // saved builds keep their toxin. Each option carries only the toxin's "No usuário"
    // effect from its client description (items 12717-12724); the skill's own melee bonus
    // is added per level in getSkillBonusAndName. Effects the engine does not model
    // (movement speed, tolerances, HP/SP regeneration, reflected-damage resistance) are
    // name-only. Antídoto, also learned through Pesquisa de Toxinas, is not a toxin the
    // skill can apply.
    {
      name: 'Poisonous Weapon',
      label: 'Toxina aplicada',
      labelKey: 'cs.toxinApplied',
      inputType: 'dropdown',
      dropdown: [
        { label: '-', isUse: false, value: 0 },
        { label: 'Curare', labelKey: 'cs.toxin.12717', isUse: true, value: 8 },
        { label: 'Squamata', labelKey: 'cs.toxin.12720', isUse: true, value: 7 },
        { label: 'Vipera', labelKey: 'cs.toxin.12718', isUse: true, value: 6 },
        { label: 'Beladona', labelKey: 'cs.toxin.12724', isUse: true, value: 5 },
        { label: 'Cicuta', labelKey: 'cs.toxin.12721', isUse: true, value: 4 },
        { label: 'Oblivium', labelKey: 'cs.toxin.12719', isUse: true, value: 3 },
        { label: 'Waraitake', labelKey: 'cs.toxin.12723', isUse: true, value: 2, bonus: { acd: 10 } },
        { label: 'Pirexia', labelKey: 'cs.toxin.12722', isUse: true, value: 1, bonus: { criDmg: 15, flatBasicDmg: 5 } },
      ],
    },
    {
      name: 'Cloaking Exceed',
      label: 'Cloaking Exceed 5',
      inputType: 'selectButton',
      dropdown: [
        { label: 'Sim', isUse: true, value: 5 },
        { label: 'Não', isUse: false, value: 0 },
      ],
    },
  ];

  private readonly passiveSkillList3rd: PassiveSkillModel[] = [
    {
      name: 'New Poison Research',
      label: 'New Poison Research',
      inputType: 'dropdown',
      dropdown: [
        { label: '-', isUse: false, value: 0 },
        { label: 'Nv 1', isUse: true, value: 1 },
        { label: 'Nv 2', isUse: true, value: 2 },
        { label: 'Nv 3', isUse: true, value: 3 },
        { label: 'Nv 4', isUse: true, value: 4 },
        { label: 'Nv 5', isUse: true, value: 5 },
        { label: 'Nv 6', isUse: true, value: 6 },
        { label: 'Nv 7', isUse: true, value: 7 },
        { label: 'Nv 8', isUse: true, value: 8 },
        { label: 'Nv 9', isUse: true, value: 9 },
        { label: 'Nv 10', isUse: true, value: 10 },
      ],
    },
    {
      name: 'Dark Illusion',
      label: 'Dark Illusion',
      inputType: 'dropdown',
      dropdown: [
        { label: '-', isUse: false, value: 0 },
        { label: 'Nv 1', isUse: true, value: 1 },
        { label: 'Nv 2', isUse: true, value: 2 },
        { label: 'Nv 3', isUse: true, value: 3 },
        { label: 'Nv 4', isUse: true, value: 4 },
        { label: 'Nv 5', isUse: true, value: 5 },
      ],
    },
    {
      name: 'Cross Ripper Slasher',
      label: 'Cross Ripper Slasher',
      inputType: 'dropdown',
      dropdown: [
        { label: '-', isUse: false, value: 0 },
        { label: 'Nv 1', isUse: true, value: 1 },
        { label: 'Nv 2', isUse: true, value: 2 },
        { label: 'Nv 3', isUse: true, value: 3 },
        { label: 'Nv 4', isUse: true, value: 4 },
        { label: 'Nv 5', isUse: true, value: 5 },
      ],
    },
    {
      name: 'Cross Impact',
      label: 'Cross Impact',
      inputType: 'dropdown',
      dropdown: [
        { label: '-', isUse: false, value: 0 },
        { label: 'Nv 1', isUse: true, value: 1 },
        { label: 'Nv 2', isUse: true, value: 2 },
        { label: 'Nv 3', isUse: true, value: 3 },
        { label: 'Nv 4', isUse: true, value: 4 },
        { label: 'Nv 5', isUse: true, value: 5 },
      ],
    },
    {
      name: 'Weapon Blocking',
      label: 'Weapon Blocking',
      inputType: 'dropdown',
      dropdown: [
        { label: '-', isUse: false, value: 0 },
        { label: 'Nv 1', isUse: true, value: 1 },
        { label: 'Nv 2', isUse: true, value: 2 },
        { label: 'Nv 3', isUse: true, value: 3 },
        { label: 'Nv 4', isUse: true, value: 4 },
        { label: 'Nv 5', isUse: true, value: 5 },
      ],
    },
    {
      name: 'Cloaking Exceed',
      label: 'Cloaking Exceed',
      inputType: 'dropdown',
      dropdown: [
        { label: '-', isUse: false, value: 0 },
        { label: 'Nv 1', isUse: true, value: 1 },
        { label: 'Nv 2', isUse: true, value: 2 },
        { label: 'Nv 3', isUse: true, value: 3 },
        { label: 'Nv 4', isUse: true, value: 4 },
        { label: 'Nv 5', isUse: true, value: 5 },
      ],
    },
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

  /**
   * With any toxin applied, Aplicar Toxina raises melee physical damage by 2% per level
   * (bROWiki, Aplicar Toxina: +2/4/6/8/10% at Nv 1-5). It is written into the toxin's own
   * bonus entry so the breakdown credits it to the skill.
   */
  override getSkillBonusAndName() {
    const result = super.getSkillBonusAndName();
    if (!result.activeSkillNames.has('Poisonous Weapon')) return result;

    const index = this.activeSkills.findIndex((skill) => skill.name === 'Poisonous Weapon Lv');
    const level = this.activeSkills[index]?.dropdown.find((option) => option.value === (this.activeSkillIds[index] ?? 0))?.skillLv ?? 5;
    const bonus = { ...result.equipAtks['Poisonous Weapon'], melee: level * 2 };
    result.equipAtks['Poisonous Weapon'] = bonus;
    this.activeBonus.set('Poisonous Weapon', bonus);
    return result;
  }
}
