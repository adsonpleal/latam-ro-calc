import { ClassName } from './_class-name';
import {
  ActiveSkillModel,
  AtkSkillFormulaInput,
  AtkSkillModel,
  CharacterBase,
  PassiveSkillModel,
} from './_character-base.abstract';
import { ElementCharm } from '../constants/share-active-skills/element-charm';
import { requiresWeaponSubType } from '../constants/weapon-type-mapper';
import { ElementType } from '../constants/element-type.const';
import { atkSkillLevelList, genSkillList } from '../utils';

const jobBonusTable: Record<number, [number, number, number, number, number, number]> = {
  1: [0, 1, 0, 0, 0, 0],
  2: [0, 2, 0, 0, 0, 0],
  3: [0, 2, 0, 0, 0, 0],
  4: [0, 2, 0, 0, 0, 0],
  5: [0, 2, 0, 0, 0, 0],
  6: [0, 2, 0, 0, 0, 0],
  7: [0, 2, 0, 0, 0, 0],
  8: [0, 2, 0, 0, 0, 0],
  9: [0, 2, 0, 0, 0, 0],
  10: [0, 2, 0, 0, 1, 0],
  11: [0, 3, 0, 0, 1, 0],
  12: [0, 3, 0, 0, 1, 0],
  13: [0, 3, 0, 0, 1, 0],
  14: [0, 3, 0, 0, 1, 0],
  15: [0, 3, 0, 0, 1, 0],
  16: [0, 3, 0, 0, 1, 0],
  17: [0, 3, 0, 0, 1, 0],
  18: [0, 3, 0, 0, 1, 0],
  19: [0, 3, 0, 0, 1, 0],
  20: [0, 3, 0, 1, 1, 0],
  21: [0, 4, 0, 1, 1, 0],
  22: [0, 4, 0, 1, 2, 0],
  23: [0, 4, 0, 1, 2, 0],
  24: [0, 4, 0, 1, 2, 0],
  25: [0, 4, 0, 1, 2, 0],
  26: [0, 4, 0, 1, 2, 0],
  27: [0, 4, 0, 1, 2, 0],
  28: [0, 4, 0, 1, 2, 0],
  29: [0, 4, 0, 2, 2, 0],
  30: [0, 4, 0, 2, 2, 1],
  31: [0, 5, 0, 2, 2, 1],
  32: [0, 5, 0, 2, 3, 1],
  33: [0, 5, 0, 2, 3, 1],
  34: [0, 5, 0, 2, 3, 1],
  35: [0, 5, 0, 2, 3, 1],
  36: [0, 5, 0, 2, 3, 1],
  37: [0, 5, 0, 2, 3, 1],
  38: [0, 5, 0, 2, 3, 1],
  39: [0, 5, 0, 2, 3, 1],
  40: [0, 5, 0, 2, 3, 2],
  41: [0, 6, 0, 2, 3, 2],
  42: [0, 6, 0, 3, 3, 2],
  43: [0, 6, 0, 3, 4, 2],
  44: [0, 6, 0, 3, 4, 2],
  45: [0, 6, 0, 3, 4, 2],
  46: [0, 6, 0, 3, 4, 2],
  47: [0, 6, 0, 3, 4, 2],
  48: [0, 6, 0, 3, 4, 2],
  49: [0, 6, 0, 3, 4, 2],
  50: [0, 6, 0, 4, 4, 2],
  51: [0, 7, 0, 4, 4, 2],
  52: [0, 7, 0, 4, 4, 3],
  53: [0, 7, 0, 4, 5, 3],
  54: [0, 7, 0, 4, 5, 3],
  55: [0, 7, 0, 4, 5, 3],
  56: [0, 7, 0, 4, 5, 3],
  57: [0, 7, 0, 4, 5, 3],
  58: [0, 7, 0, 4, 5, 3],
  59: [1, 7, 0, 4, 5, 3],
  60: [1, 7, 1, 4, 5, 3],
  61: [1, 8, 1, 4, 5, 3],
  62: [1, 8, 1, 5, 5, 3],
  63: [1, 8, 1, 5, 6, 3],
  64: [1, 8, 1, 5, 6, 4],
  65: [1, 8, 1, 5, 6, 4],
  66: [1, 8, 1, 5, 6, 4],
  67: [1, 8, 1, 5, 6, 4],
  68: [1, 8, 1, 5, 6, 4],
  69: [1, 8, 1, 5, 6, 4],
  70: [1, 8, 1, 5, 6, 4],
};

export class Ninja extends CharacterBase {
  protected CLASS_NAME = ClassName.Ninja;
  protected JobBonusTable = jobBonusTable;
  protected initialStatusPoint = 40;

  protected readonly classNames = [ClassName.Ninja];
  /**
   * The Ninja's own offensive tree, straight out of the client's `JT_NINJA` list. Every
   * ratio is the per-level ATQ/ATQM column the skill's description prints, and every
   * fct/vct/acd/cd is its Conjuração/Espera row in `skill-delay.json`.
   *
   * The seven magic skills below were defined on Oboro.ts, which made them unreachable
   * for the Kagerou and the Shinkiro even though the client gives the whole branch to the
   * Ninja. They are moved here verbatim — same ratios, same timings, same hit counts — so
   * the only change is which classes can see them. The physical six are new.
   *
   * Left out, for want of a ratio rather than by choice: Escudo de Chamas, which prints an
   * "Ataques" count and no ATQM figure; Chuva de Moedas, whose damage is a random amount
   * of zeny rather than a ratio; and Ataque Mortal, whose damage is written as "o HP
   * restante do usuário aumenta o dano" with no table at all.
   */
  protected readonly _atkSkillList: AtkSkillModel[] = [
    {
      // Arremessar Shuriken (NJ_SYURIKEN, id 523): 105% at Nv1, +5% per level. No row in
      // the client's delay table, so nothing paces it but Vel. de Atq.
      name: 'Throw Shuriken',
      label: 'Throw Shuriken Lv10',
      value: 'Throw Shuriken==10',
      levelList: atkSkillLevelList('Throw Shuriken', 10),
      acd: 0,
      fct: 0,
      vct: 0,
      cd: 0,
      formula: ({ skillLevel }: AtkSkillFormulaInput): number => 100 + skillLevel * 5,
    },
    {
      // Arremessar Kunai (NJ_KUNAI, id 524): a flat 100% per level, 100% to 500%.
      name: 'Throw Kunai',
      label: 'Throw Kunai Lv5',
      value: 'Throw Kunai==5',
      levelList: atkSkillLevelList('Throw Kunai', 5),
      acd: 0,
      fct: 0,
      vct: 0,
      cd: 0.2,
      formula: ({ skillLevel }: AtkSkillFormulaInput): number => skillLevel * 100,
    },
    {
      // Arremessar Huuma (NJ_HUUMA, id 525): 200% at Nv1, +250% per level.
      // "Apenas com Shuriken Huuma" — the engine's one shuriken subtype.
      name: 'Throw Huuma Shuriken',
      label: 'Throw Huuma Shuriken Lv5',
      value: 'Throw Huuma Shuriken==5',
      levelList: atkSkillLevelList('Throw Huuma Shuriken', 5),
      acd: 0.5,
      fct: 0.5,
      vct: 1,
      cd: 0,
      verifyItemFn: requiresWeaponSubType('Shuriken'),
      formula: ({ skillLevel }: AtkSkillFormulaInput): number => -50 + skillLevel * 250,
    },
    {
      // Virar Tatami (NJ_TATAMIGAESHI, id 527): 110% at Nv1, +10% per level, on everything
      // around the caster.
      name: 'Flip Tatami',
      label: 'Flip Tatami Lv5',
      value: 'Flip Tatami==5',
      levelList: atkSkillLevelList('Flip Tatami', 5),
      acd: 3,
      fct: 0,
      vct: 0,
      cd: 0,
      isMelee: true,
      formula: ({ skillLevel }: AtkSkillFormulaInput): number => 100 + skillLevel * 10,
    },
    {
      // Corte da Névoa (NJ_KASUMIKIRI, id 528): 120% at Nv1, +20% per level.
      name: 'Haze Slasher',
      label: 'Haze Slasher Lv10',
      value: 'Haze Slasher==10',
      levelList: atkSkillLevelList('Haze Slasher', 10),
      acd: 0,
      fct: 0,
      vct: 0,
      cd: 0.5,
      isMelee: true,
      formula: ({ skillLevel }: AtkSkillFormulaInput): number => 100 + skillLevel * 20,
    },
    {
      // Descarga Elétrica (NJ_RAIGEKISAI, id 541): 200% at Nv1, +100% per level.
      name: 'Lightning Jolt',
      label: 'Lightning Jolt Lv5',
      value: 'Lightning Jolt==5',
      levelList: atkSkillLevelList('Lightning Jolt', 5),
      acd: 0,
      fct: 0.3,
      vct: 1.7,
      cd: 0,
      element: ElementType.Wind,
      isMatk: true,
      formula: ({ skillLevel }: AtkSkillFormulaInput): number => 100 + skillLevel * 100,
    },
    {
      label: 'Flaming Petals Lv10',
      name: 'Flaming Petals',
      value: 'Flaming Petals==10',
      acd: 0,
      fct: 1.4,
      vct: 5.6,
      cd: 0,
      element: ElementType.Fire,
      isMatk: true,
      totalHit: 10,
      formula: (): number => {
        return 90;
      },
    },
    {
      label: 'Freezing Spear Lv10',
      name: 'Freezing Spear',
      value: 'Freezing Spear==10',
      acd: 0,
      fct: 1.4,
      vct: 5.6,
      cd: 0,
      element: ElementType.Water,
      isMatk: true,
      totalHit: 12,
      formula: (): number => {
        return 70;
      },
    },
    {
      label: 'Freezing Spear Lv10 (in Watery Evasion)',
      name: 'Freezing Spear',
      value: 'Freezing Spear Water==10',
      acd: 0,
      fct: 1.4,
      vct: 5.6,
      cd: 0,
      element: ElementType.Water,
      isMatk: true,
      totalHit: 12,
      formula: (input: AtkSkillFormulaInput): number => {
        const { skillLevel } = input;

        return 70 + skillLevel * 2;
      },
    },
    {
      label: 'Wind Blade Lv10',
      name: 'Wind Blade',
      value: 'Wind Blade==10',
      acd: 0,
      fct: 1.1,
      vct: 4.4,
      cd: 0,
      element: ElementType.Wind,
      isMatk: true,
      totalHit: 6,
      formula: (): number => {
        return 150;
      },
    },
    {
      label: 'Exploding Dragon Lv5',
      name: 'Exploding Dragon',
      value: 'Exploding Dragon==5',
      acd: 0.5,
      fct: 0.8,
      vct: 2,
      cd: 0.3,
      element: ElementType.Fire,
      isMatk: true,
      hit: 3,
      formula: (input: AtkSkillFormulaInput): number => {
        const { skillLevel } = input;

        return 150 + skillLevel * 150;
      },
    },
    {
      label: 'Snow Flake Draft Lv5',
      name: 'Snow Flake Draft',
      value: 'Snow Flake Draft==5',
      acd: 0.5,
      fct: 0.8,
      vct: 2.5,
      cd: 0.3,
      element: ElementType.Water,
      isMatk: true,
      hit: 5,
      formula: (input: AtkSkillFormulaInput): number => {
        const { skillLevel } = input;

        return 150 + skillLevel * 150;
      },
    },
    {
      label: 'First Wind Lv5',
      name: 'First Wind',
      value: 'First Wind==5',
      acd: 0,
      fct: 0.3,
      vct: 1.2,
      cd: 0,
      element: ElementType.Wind,
      isMatk: true,
      hit: 5,
      formula: (input: AtkSkillFormulaInput): number => {
        const { skillLevel } = input;

        return 100 + skillLevel * 100;
      },
    },
  ];
  protected readonly _activeSkillList: ActiveSkillModel[] = [
    {
      label: 'Ninja Aura 5',
      name: 'Ninja Aura',
      inputType: 'selectButton',
      dropdown: [
        { label: 'Sim', value: 5, skillLv: 5, isUse: true, bonus: { str: 5, int: 5 } },
        { label: 'Não', value: 0, isUse: false },
      ],
    },
    ...ElementCharm,
  ];
  protected readonly _passiveSkillList: PassiveSkillModel[] = [
    {
      label: 'Flaming Petals',
      name: 'Flaming Petals',
      inputType: 'dropdown',
      dropdown: genSkillList(10),
    },
    {
      label: 'Freezing Spear',
      name: 'Freezing Spear',
      inputType: 'dropdown',
      dropdown: genSkillList(10),
    },
    {
      label: 'Wind Blade',
      name: 'Wind Blade',
      inputType: 'dropdown',
      dropdown: genSkillList(10),
    },
    {
      name: 'Lightning Jolt', label: 'Descarga Elétrica aprendida', inputType: 'dropdown',
      dropdown: genSkillList(5),
    },
    {
      label: 'Ninja Mastery',
      name: 'Ninja Mastery',
      inputType: 'dropdown',
      dropdown: [
        { label: '-', value: 0, isUse: false },
        { label: 'Nv 10', value: 10, isUse: true },
        // { label: 'Nv 1', value: 1, isUse: true } },
        // { label: 'Nv 2', value: 2, isUse: true } },
        // { label: 'Nv 3', value: 3, isUse: true } },
        // { label: 'Nv 4', value: 4, isUse: true } },
        // { label: 'Nv 5', value: 5, isUse: true } },
        // { label: 'Nv 6', value: 6, isUse: true } },
        // { label: 'Nv 7', value: 7, isUse: true } },
        // { label: 'Nv 8', value: 8, isUse: true } },
        // { label: 'Nv 9', value: 9, isUse: true } },
      ],
    },
    {
      label: 'Dagger Practice',
      name: 'Dagger Throwing Practice',
      inputType: 'dropdown',
      dropdown: [
        { label: '-', value: 0, isUse: false },
        { label: 'Nv 10', value: 10, isUse: true, bonus: { x_atk: 10 * 3 } },
        // { label: 'Nv 1', value: 1, isUse: true, bonus: { x_atk: 1 * 3 } },
        // { label: 'Nv 2', value: 2, isUse: true, bonus: { x_atk: 2 * 3 } },
        // { label: 'Nv 3', value: 3, isUse: true, bonus: { x_atk: 3 * 3 } },
        // { label: 'Nv 4', value: 4, isUse: true, bonus: { x_atk: 4 * 3 } },
        // { label: 'Nv 5', value: 5, isUse: true, bonus: { x_atk: 5 * 3 } },
        // { label: 'Nv 6', value: 6, isUse: true, bonus: { x_atk: 6 * 3 } },
        // { label: 'Nv 7', value: 7, isUse: true, bonus: { x_atk: 7 * 3 } },
        // { label: 'Nv 8', value: 8, isUse: true, bonus: { x_atk: 8 * 3 } },
        // { label: 'Nv 9', value: 9, isUse: true, bonus: { x_atk: 9 * 3 } },
      ],
    },
    {
      label: 'Throw Huuma',
      name: 'Throw Huuma Shuriken',
      inputType: 'dropdown',
      dropdown: [
        { label: '-', value: 0, isUse: false },
        { label: 'Nv 5', value: 5, isUse: true },
        // { label: 'Nv 1', value: 1, isUse: true },
        // { label: 'Nv 2', value: 2, isUse: true },
        // { label: 'Nv 3', value: 3, isUse: true },
        // { label: 'Nv 4', value: 4, isUse: true },
        // { label: 'Nv 5', value: 5, isUse: true },
      ],
    },
  ];
}
