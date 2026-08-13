import { JOB_4_MAX_JOB_LEVEL, JOB_4_MIN_MAX_LEVEL } from '../app-config';
import { EquipmentSummaryModel } from '../models/equipment-summary.model';
import { AdditionalBonusInput } from '../models/info-for-class.model';
import { addBonus, genSkillList } from '../utils';
import { StarEmperor } from './StarEmperor';
import { ActiveSkillModel, AtkSkillFormulaInput, AtkSkillModel, PassiveSkillModel } from './_character-base.abstract';
import { ClassName } from './_class-name';

const jobBonusTable: Record<number, [number, number, number, number, number, number]> = {
  1: [1, 0, 0, 0, 1, 0],
  2: [2, 0, 0, 0, 1, 0],
  3: [2, 1, 0, 1, 1, 0],
  4: [3, 2, 0, 1, 2, 0],
  5: [4, 2, 0, 2, 2, 0],
  6: [5, 2, 0, 2, 2, 0],
  7: [6, 2, 0, 2, 3, 0],
  8: [6, 2, 0, 2, 4, 0],
  9: [6, 3, 1, 2, 4, 0],
  10: [6, 3, 1, 2, 5, 0],
  11: [6, 3, 2, 3, 5, 0],
  12: [7, 3, 2, 3, 5, 1],
  13: [8, 3, 3, 3, 5, 1],
  14: [8, 3, 3, 3, 5, 1],
  15: [8, 3, 3, 3, 5, 1],
  16: [9, 3, 3, 3, 5, 1],
  17: [10, 4, 3, 3, 5, 1],
  18: [10, 4, 3, 3, 5, 1],
  19: [10, 4, 3, 3, 5, 1],
  20: [11, 4, 3, 3, 5, 1],
  21: [11, 4, 3, 3, 6, 1],
  22: [11, 5, 3, 3, 6, 1],
  23: [11, 6, 3, 3, 6, 1],
  24: [12, 6, 3, 3, 7, 1],
  25: [12, 7, 3, 3, 7, 1],
  26: [12, 7, 3, 3, 8, 2],
  27: [12, 7, 3, 3, 8, 2],
  28: [12, 8, 3, 3, 8, 2],
  29: [12, 8, 4, 3, 9, 2],
  30: [12, 8, 4, 3, 9, 3],
  31: [12, 9, 5, 3, 9, 3],
  32: [12, 10, 5, 3, 9, 3],
  33: [12, 10, 6, 3, 9, 3],
  34: [12, 10, 6, 3, 9, 3],
  35: [12, 10, 6, 3, 9, 3],
  36: [12, 10, 6, 3, 9, 3],
  37: [12, 10, 6, 3, 9, 3],
  38: [12, 10, 6, 3, 9, 3],
  39: [12, 10, 6, 3, 9, 3],
  40: [12, 10, 6, 3, 9, 3],
  41: [12, 10, 6, 3, 9, 3],
  42: [12, 10, 6, 3, 9, 3],
  43: [12, 10, 6, 3, 9, 3],
  44: [12, 10, 6, 3, 9, 3],
  45: [12, 10, 6, 3, 9, 3],
  46: [12, 10, 6, 3, 9, 3],
  47: [12, 10, 6, 3, 9, 3],
  48: [12, 10, 6, 3, 9, 3],
  49: [12, 10, 6, 3, 9, 3],
  50: [12, 10, 6, 3, 9, 3],
  51: [12, 10, 6, 3, 9, 3],
  52: [12, 10, 6, 3, 9, 3],
  53: [12, 10, 6, 3, 9, 3],
  54: [12, 10, 6, 3, 9, 3],
  55: [12, 10, 6, 3, 9, 3],
  56: [12, 10, 6, 3, 9, 3],
  57: [12, 10, 6, 3, 9, 3],
  58: [12, 10, 6, 3, 9, 3],
  59: [12, 10, 6, 3, 9, 3],
  60: [12, 10, 6, 3, 9, 3],
  61: [12, 10, 6, 3, 9, 3],
  62: [12, 10, 6, 3, 9, 3],
  63: [12, 10, 6, 3, 9, 3],
  64: [12, 10, 6, 3, 9, 3],
  65: [12, 10, 6, 3, 9, 3],
  66: [12, 10, 6, 3, 9, 3],
  67: [12, 10, 6, 3, 9, 3],
  68: [12, 10, 6, 3, 9, 3],
  69: [12, 10, 6, 3, 9, 3],
  70: [12, 10, 6, 3, 9, 3],
};

const traitBonusTable: Record<number, [number, number, number, number, number, number]> = {
  1: [0, 0, 0, 0, 0, 0],
  2: [1, 0, 0, 0, 0, 0],
  3: [1, 0, 0, 0, 0, 0],
  4: [1, 0, 0, 0, 0, 0],
  5: [2, 0, 0, 0, 0, 0],
  6: [2, 0, 0, 0, 0, 0],
  7: [2, 0, 0, 0, 0, 0],
  8: [2, 0, 0, 0, 0, 1],
  9: [2, 0, 0, 0, 0, 1],
  10: [2, 0, 0, 0, 0, 1],
  11: [2, 0, 0, 0, 0, 1],
  12: [2, 0, 0, 0, 0, 1],
  13: [2, 0, 0, 0, 0, 1],
  14: [2, 0, 0, 0, 0, 2],
  15: [2, 0, 1, 0, 0, 2],
  16: [2, 0, 1, 0, 0, 2],
  17: [2, 0, 1, 0, 0, 2],
  18: [2, 1, 1, 0, 0, 2],
  19: [3, 1, 1, 0, 0, 2],
  20: [3, 1, 1, 0, 0, 2],
  21: [3, 1, 1, 0, 0, 2],
  22: [3, 1, 1, 0, 0, 2],
  23: [3, 1, 1, 0, 0, 2],
  24: [3, 1, 1, 0, 0, 2],
  25: [3, 1, 1, 0, 0, 2],
  26: [3, 1, 1, 0, 0, 2],
  27: [3, 1, 1, 0, 1, 2],
  28: [4, 1, 1, 0, 1, 2],
  29: [4, 1, 1, 0, 1, 2],
  30: [4, 1, 1, 0, 2, 2],
  31: [4, 1, 1, 0, 2, 2],
  32: [4, 1, 1, 0, 2, 2],
  33: [4, 2, 1, 0, 2, 2],
  34: [5, 2, 1, 0, 2, 2],
  35: [5, 3, 1, 0, 3, 2],
  36: [6, 3, 1, 0, 3, 2],
  37: [6, 3, 1, 0, 4, 2],
  38: [6, 3, 1, 0, 4, 3],
  39: [6, 4, 1, 0, 4, 3],
  40: [7, 4, 1, 0, 4, 3],
  41: [8, 4, 1, 0, 4, 3],
  42: [8, 5, 1, 0, 4, 4],
  43: [8, 6, 1, 0, 4, 4],
  44: [9, 6, 1, 0, 4, 4],
  45: [9, 7, 1, 0, 4, 5],
  46: [9, 7, 1, 0, 4, 6],
  47: [10, 7, 2, 0, 4, 6],
  48: [10, 8, 2, 0, 4, 6],
  49: [10, 8, 2, 0, 5, 6],
  50: [11, 8, 2, 0, 5, 7],
  51: [11, 8, 2, 0, 5, 7],
  52: [11, 8, 2, 0, 5, 7],
  53: [11, 8, 2, 0, 5, 7],
  54: [11, 8, 2, 0, 5, 7],
  55: [11, 8, 2, 0, 5, 7],
  56: [11, 8, 2, 0, 5, 7],
  57: [11, 8, 2, 0, 5, 7],
  58: [11, 8, 2, 0, 5, 7],
  59: [11, 8, 2, 0, 5, 7],
  60: [11, 8, 2, 0, 5, 7],
  61: [11, 8, 2, 0, 5, 7],
  62: [11, 8, 2, 0, 5, 7],
  63: [11, 8, 2, 0, 5, 7],
  64: [11, 8, 2, 0, 5, 7],
  65: [11, 8, 2, 0, 5, 7],
  66: [11, 8, 2, 0, 5, 7],
  67: [11, 8, 2, 0, 5, 7],
  68: [11, 8, 2, 0, 5, 7],
  69: [11, 8, 2, 0, 5, 7],
  70: [11, 8, 2, 0, 5, 7],
};

/**
 * Espaço Celeste — o estado único que Amanhecer/Anoitecer alternam em sequência, mais
 * o Elo Celestial. Os seis estados de sol/lua são mutuamente exclusivos entre si, e o
 * Elo Celestial cancela todos eles, então tudo cabe em um seletor só.
 */
const CelestialSpace = {
  Sunrise: 1,
  Noon: 2,
  Sunset: 3,
  Moonrise: 4,
  Midnight: 5,
  Moonset: 6,
  /** Elo Celestial: libera as quatro habilidades de estado no efeito máximo. */
  Unity: 7,
} as const;

export class SkyEmperor extends StarEmperor {
  protected override CLASS_NAME = ClassName.SkyEmperor;
  protected override JobBonusTable = jobBonusTable;
  protected override TraitBonusTable = traitBonusTable;

  protected override minMaxLevel = JOB_4_MIN_MAX_LEVEL;
  protected override maxJob = JOB_4_MAX_JOB_LEVEL;

  private readonly classNames4th = [ClassName.Only_4th, ClassName.SkyEmperor];

  /** Estado atual do Espaço Celeste (0 = nenhum). */
  private celestialSpace(): number {
    return this.activeSkillLv('_SkyEmperor_Celestial_Space');
  }

  /** O estado pedido, ou o Elo Celestial, que libera o efeito máximo dos quatro. */
  private isCelestialSpace(space: number): boolean {
    const current = this.celestialSpace();

    return current === space || current === CelestialSpace.Unity;
  }

  /**
   * Valores por nível: descrição do PRÓPRIO CLIENTE (data.grf, skilldescript.lub), com
   * browiki.org concordando, e validados pacote a pacote contra uma gravação em jogo —
   * ver SkyEmperor.replay.spec.ts.
   *
   * NÃO troque pelas tabelas do blog do Sigma (as "[V2]" que estavam aqui, nem as do
   * "3rd version" de fev/2026). Nenhuma das duas reproduz a gravação: para as do V3 não
   * existe ATQ nenhum, em nenhuma DEF suave, que feche os seis pacotes.
   */
  private readonly atkSkillList4th: AtkSkillModel[] = [
    {
      name: 'Noon Blast',
      label: 'Noon Blast Lv5',
      value: 'Noon Blast==5',
      acd: 0.5,
      fct: 0,
      vct: 0,
      cd: 0.7,
      isMelee: true,
      hit: 2,
      canCri: () => this.isCelestialSpace(CelestialSpace.Noon),
      criDmgPercentage: 0.5,
      baseCriPercentage: 1,
      formula: (input: AtkSkillFormulaInput): number => {
        const { model, skillLevel, status } = input;
        const { totalPow } = status;
        const baseLevel = model.level;
        const skillBonusLv = this.learnLv('Sky Mastery');

        return (1500 + skillLevel * (900 + skillBonusLv * 5) + totalPow * 5) * (baseLevel / 100);
      },
    },
    {
      name: 'Sunset Blast',
      label: 'Sunset Blast Lv5',
      value: 'Sunset Blast==5',
      acd: 0.5,
      fct: 0,
      vct: 0,
      cd: 0.3,
      isMelee: true,
      hit: 2,
      canCri: () => this.isCelestialSpace(CelestialSpace.Sunset),
      criDmgPercentage: 0.5,
      baseCriPercentage: 1,
      formula: (input: AtkSkillFormulaInput): number => {
        const { model, skillLevel, status } = input;
        const { totalPow } = status;
        const baseLevel = model.level;
        const skillBonusLv = this.learnLv('Sky Mastery');

        return (900 + skillLevel * (300 + skillBonusLv * 5) + totalPow * 5) * (baseLevel / 100);
      },
    },
    {
      name: 'Midnight Kick',
      label: 'Midnight Kick Lv5',
      value: 'Midnight Kick==5',
      acd: 0,
      fct: 0.5,
      vct: 1,
      cd: 0.7,
      isMelee: true,
      hit: 2,
      criDmgPercentage: 0.5,
      formula: (input: AtkSkillFormulaInput): number => {
        const { model, skillLevel, status } = input;
        const { totalPow } = status;
        const baseLevel = model.level;
        const skillBonusLv = this.learnLv('Sky Mastery');

        if (this.isCelestialSpace(CelestialSpace.Midnight)) {
          return (1500 + skillLevel * (1200 + skillBonusLv * 5) + totalPow * 5) * (baseLevel / 100);
        }

        return (500 + skillLevel * (1000 + skillBonusLv * 5) + totalPow * 5) * (baseLevel / 100);
      },
    },
    {
      name: 'Dawn Break',
      label: 'Dawn Break Lv5',
      value: 'Dawn Break==5',
      acd: 0,
      fct: 0.5,
      vct: 1,
      cd: 0.3,
      isMelee: true,
      hit: 2,
      criDmgPercentage: 0.5,
      formula: (input: AtkSkillFormulaInput): number => {
        const { model, skillLevel, status } = input;
        const { totalPow } = status;
        const baseLevel = model.level;
        const skillBonusLv = this.learnLv('Sky Mastery');

        if (this.isCelestialSpace(CelestialSpace.Moonset)) {
          return (300 + skillLevel * (600 + skillBonusLv * 5) + totalPow * 5) * (baseLevel / 100);
        }

        return (300 + skillLevel * (400 + skillBonusLv * 5) + totalPow * 5) * (baseLevel / 100);
      },
    },
    {
      name: 'Twinkling Galaxy',
      label: 'Twinkling Galaxy Lv5 (1 estrela)',
      value: 'Twinkling Galaxy==5',
      // Diferente das outras, a Constelação costuma ficar em nível baixo (é só o
      // habilitador da Explosão Galática), então os cinco níveis são selecionáveis.
      levelList: [
        { label: 'Twinkling Galaxy Lv1 (1 estrela)', value: 'Twinkling Galaxy==1' },
        { label: 'Twinkling Galaxy Lv2 (1 estrela)', value: 'Twinkling Galaxy==2' },
        { label: 'Twinkling Galaxy Lv3 (1 estrela)', value: 'Twinkling Galaxy==3' },
        { label: 'Twinkling Galaxy Lv4 (1 estrela)', value: 'Twinkling Galaxy==4' },
        { label: 'Twinkling Galaxy Lv5 (1 estrela)', value: 'Twinkling Galaxy==5' },
      ],
      acd: 0,
      fct: 0.5,
      vct: 1,
      cd: 5,
      isMelee: true,
      hit: 3,
      criDmgPercentage: 0.5,
      formula: (input: AtkSkillFormulaInput): number => {
        const { model, skillLevel, status } = input;
        const { totalPow } = status;
        const baseLevel = model.level;
        const skillBonusLv = this.learnLv('Sky Mastery');

        return (200 + skillLevel * (400 + skillBonusLv * 3) + totalPow * 3) * (baseLevel / 100);
      },
    },
    {
      name: 'Star Burst',
      label: 'Star Burst Lv5 (1 estrela)',
      value: 'Star Burst==5',
      acd: 0.5,
      fct: 0.5,
      vct: 0,
      cd: 1,
      isMelee: true,
      hit: 2,
      criDmgPercentage: 0.5,
      formula: (input: AtkSkillFormulaInput): number => {
        const { model, skillLevel, status } = input;
        const { totalPow } = status;
        const baseLevel = model.level;
        const skillBonusLv = this.learnLv('Sky Mastery');

        return (500 + skillLevel * (400 + skillBonusLv * 5) + totalPow * 3) * (baseLevel / 100);
      },
    },
    {
      name: 'Star Cannon',
      label: 'Star Cannon Lv5 (1 estrela)',
      value: 'Star Cannon==5',
      acd: 0,
      fct: 0.5,
      vct: 0,
      cd: 5,
      isMelee: true,
      hit: 3,
      criDmgPercentage: 0.5,
      formula: (input: AtkSkillFormulaInput): number => {
        const { model, skillLevel, status } = input;
        const { totalPow } = status;
        const baseLevel = model.level;
        const skillBonusLv = this.learnLv('Sky Mastery');

        return (200 + skillLevel * (500 + skillBonusLv * 5) + totalPow * 5) * (baseLevel / 100);
      },
    },
    {
      name: 'All in the Sky',
      label: 'All in the Sky Lv10',
      value: 'All in the Sky==10',
      // Tempos de conjuração/recarga: NÃO medidos. O bloco pt-BR do cliente só traz o
      // custo de AP, e as três fontes externas discordam entre si (e do LATAM) até no
      // ATQ por nível. Só o dano está validado — ver SkyEmperor.firmamento.spec.ts.
      acd: 0,
      fct: 0.5,
      vct: 0,
      cd: 2,
      isMelee: true,
      // 3 golpes CHEIOS contra Humanoide/Demônio (não é um pacote repartido como as
      // irmãs, que usam `hit`): a gravação só fecha como 3 × o dano inteiro, e a tabela
      // da divine-pride rotula a coluna como "ATK per Hit". Contra as demais raças, 1.
      totalHit: ({ monster }: AtkSkillFormulaInput) =>
        monster.race === 'demihuman' || monster.race === 'demon' ? 3 : 1,
      canCri: () => true,
      criDmgPercentage: 0.5,
      baseCriPercentage: 1,
      formula: (input: AtkSkillFormulaInput): number => {
        const { model, skillLevel, status } = input;
        const { totalPow } = status;
        const baseLevel = model.level;

        // Sem termo de Maestria Celestial de propósito: a tabela do cliente para esta
        // habilidade não tem a coluna "Nv. Maestria" que todas as irmãs têm (é dela que
        // sai o `skillLevel * mastery * 5` delas), e a gravação confirma — com Maestria
        // 10, o único inteiro que fecha é 2.000×Nv + POD×10. A linha "afetado pelo nível
        // de Maestria Celestial" da descrição é texto padrão repetido em toda a classe.
        return (skillLevel * 2000 + totalPow * 10) * (baseLevel / 100);
      },
    },
  ];
  private readonly activeSkillList4th: ActiveSkillModel[] = [
    {
      name: '_SkyEmperor_Celestial_Space',
      label: 'Espaço Celeste',
      inputType: 'dropdown',
      dropdown: [
        { label: '-', value: 0, isUse: false },
        { label: 'Nascer do Sol', value: CelestialSpace.Sunrise, isUse: true },
        { label: 'Meio-Dia', value: CelestialSpace.Noon, isUse: true },
        { label: 'Pôr do Sol', value: CelestialSpace.Sunset, isUse: true },
        { label: 'Nascer da Lua', value: CelestialSpace.Moonrise, isUse: true },
        { label: 'Meia-Noite', value: CelestialSpace.Midnight, isUse: true },
        { label: 'Pôr da Lua', value: CelestialSpace.Moonset, isUse: true },
        { label: 'Elo Celestial', value: CelestialSpace.Unity, isUse: true },
      ]
    },
  ];
  private readonly passiveSkillList4th: PassiveSkillModel[] = [
    {
      name: 'Sky Mastery',
      label: 'Sky Mastery',
      inputType: 'dropdown',
      dropdown: genSkillList(10)
    },
    {
      name: 'War Book Mastery',
      label: 'War Book Mastery',
      inputType: 'dropdown',
      dropdown: genSkillList(10)
    },
  ];

  constructor() {
    super();

    this.inheritSkills({
      activeSkillList: this.activeSkillList4th,
      atkSkillList: this.atkSkillList4th,
      passiveSkillList: this.passiveSkillList4th,
      classNames: this.classNames4th,
    });
  }

  override setAdditionalBonus(params: AdditionalBonusInput): EquipmentSummaryModel {
    super.setAdditionalBonus(params);

    const { totalBonus, weapon } = params;

    const warMastLv = this.learnLv('War Book Mastery');
    if (warMastLv > 0 && weapon.isType('book')) {
      addBonus(totalBonus, 'pAtk', warMastLv + 2);
      addBonus(totalBonus, 'hit', warMastLv * 3);
    }

    return totalBonus;
  }
}
