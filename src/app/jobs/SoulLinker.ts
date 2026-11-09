import { Taekwondo, TAEKWON_KICK_NAMES } from './Taekwondo';
import { ActiveSkillModel, AtkSkillFormulaInput, AtkSkillModel, PassiveSkillModel } from './_character-base.abstract';
import { ClassName } from './_class-name';
import { ElementType } from '../constants/element-type.const';
import { atkSkillLevelList } from '../utils';

/**
 * The kicks the Espiritualista gives up. The client prints "Não pode ser usada por
 * Espiritualistas" on each of the five, and bROWiki says it the other way round on the
 * class page: "por seu foco nos estudos, os Espiritualistas perdem todas as habilidades
 * que envolvem chutes dos Taekwons".
 *
 * `inheritSkills` only ever passes skills down, so a class that loses one has to filter
 * it out — the same shape the Algoz uses to drop Venom Impression. Filtering here covers
 * the Ceifador de Almas and the Asceta das Almas too, which is right: neither gets the
 * kicks back.
 */
const TAEKWON_KICKS: ReadonlySet<string> = new Set<string>(TAEKWON_KICK_NAMES);

/**
 * Estin, Estun and Esma differ only in their ratio and their cast: all three are Neutro
 * magic with a 0,5 s pós-conjuração, as the client's "Informação de Conjuração" rows say.
 */
const es = (
  name: 'Estin' | 'Estun' | 'Esma',
  maxLv: number,
  cast: { fct: number; vct: number },
  formula: (input: AtkSkillFormulaInput) => number,
  extra: Partial<AtkSkillModel> = {},
): AtkSkillModel => ({
  name,
  label: `${name} Nv${maxLv}`,
  value: `${name}==${maxLv}`,
  levelList: atkSkillLevelList(name, maxLv),
  ...cast,
  acd: 0.5,
  cd: 0,
  isMatk: true,
  element: ElementType.Neutral,
  formula,
  ...extra,
});

const jobBonusTable: Record<number, [number, number, number, number, number, number]> = {
  1: [0, 0, 0, 1, 0, 0],
  2: [0, 0, 0, 2, 0, 0],
  3: [0, 0, 0, 3, 0, 0],
  4: [0, 0, 0, 4, 0, 0],
  5: [0, 0, 0, 5, 0, 0],
  6: [0, 0, 0, 6, 0, 0],
  7: [0, 0, 0, 7, 0, 0],
  8: [0, 0, 0, 8, 0, 0],
  9: [0, 0, 0, 9, 0, 0],
  10: [0, 0, 0, 10, 0, 0],
  11: [0, 0, 0, 11, 0, 0],
  12: [0, 0, 0, 12, 0, 0],
  13: [0, 0, 0, 12, 0, 0],
  14: [0, 0, 0, 12, 0, 0],
  15: [0, 0, 0, 12, 0, 0],
  16: [0, 0, 0, 12, 0, 0],
  17: [0, 0, 0, 12, 0, 0],
  18: [0, 0, 0, 12, 0, 0],
  19: [0, 0, 0, 12, 0, 0],
  20: [0, 0, 1, 12, 0, 0],
  21: [0, 0, 2, 12, 0, 0],
  22: [0, 0, 3, 12, 0, 0],
  23: [0, 0, 4, 12, 0, 0],
  24: [0, 0, 5, 12, 0, 0],
  25: [0, 0, 6, 12, 0, 0],
  26: [0, 0, 6, 12, 0, 0],
  27: [0, 0, 6, 12, 0, 0],
  28: [0, 0, 6, 12, 0, 0],
  29: [0, 0, 6, 12, 0, 0],
  30: [0, 0, 6, 12, 0, 0],
  31: [0, 0, 6, 12, 0, 0],
  32: [0, 0, 6, 12, 0, 0],
  33: [0, 0, 6, 12, 0, 0],
  34: [0, 0, 6, 12, 0, 0],
  35: [0, 0, 6, 12, 0, 0],
  36: [0, 0, 6, 12, 0, 0],
  37: [0, 0, 6, 12, 0, 0],
  38: [0, 0, 6, 12, 0, 0],
  39: [0, 0, 6, 12, 1, 0],
  40: [0, 0, 6, 12, 2, 0],
  41: [0, 0, 6, 12, 3, 0],
  42: [0, 0, 6, 12, 4, 0],
  43: [0, 0, 6, 12, 5, 0],
  44: [0, 0, 6, 12, 6, 0],
  45: [0, 0, 6, 12, 7, 0],
  46: [0, 0, 6, 12, 8, 0],
  47: [0, 0, 6, 12, 9, 0],
  48: [0, 0, 6, 12, 10, 0],
  49: [0, 0, 6, 12, 11, 0],
  50: [0, 0, 6, 12, 12, 0],
  51: [0, 0, 6, 12, 12, 0],
  52: [0, 0, 6, 12, 12, 0],
  53: [0, 0, 6, 12, 12, 0],
  54: [0, 0, 6, 12, 12, 0],
  55: [0, 0, 6, 12, 12, 0],
  56: [0, 0, 6, 12, 12, 0],
  57: [0, 0, 6, 12, 12, 0],
  58: [0, 0, 6, 12, 12, 0],
  59: [0, 0, 6, 12, 12, 0],
  60: [0, 0, 6, 12, 12, 0],
  61: [0, 0, 6, 12, 12, 0],
  62: [0, 0, 6, 12, 12, 0],
  63: [0, 0, 6, 12, 12, 0],
  64: [0, 0, 6, 12, 12, 0],
  65: [0, 0, 6, 12, 12, 0],
  66: [0, 0, 6, 12, 12, 0],
  67: [0, 0, 6, 12, 12, 0],
  68: [0, 0, 6, 12, 12, 0],
  69: [0, 0, 6, 12, 12, 0],
  70: [0, 0, 6, 12, 12, 0],
};

export class SoulLinker extends Taekwondo {
  protected override CLASS_NAME = ClassName.SoulLinker;
  protected override JobBonusTable = jobBonusTable;
  protected override initialStatusPoint = 40;

  protected readonly classNamesHi = [ClassName.SoulLinker];
  /**
   * The three Es- attacks. Every ratio below is the client's own `Nível l ATQM` table,
   * which bROWiki repeats figure for figure — except Esma, whose table prints the number
   * of spirit circles instead, so its ratio comes from bROWiki's "Fórmula" line.
   *
   * All three are Neutro and all three say "a propriedade muda conforme Brisa Leve". That
   * element change is not modelled: the engine's Brisa Leve (`mildwind`) moves the
   * *physical* attack property only, and these are magic.
   *
   * They also only work on monsters ("Alvo: Apenas monstros"), which the calculator's
   * target always is.
   */
  protected readonly atkSkillListHi: AtkSkillModel[] = [
    // Only Small targets take the damage, and that decides whether the skill does
    // anything at all — so it is said next to the name rather than silently zeroing.
    // It goes in `labelSuffix`, the one part `localize` keeps when it swaps `label` for
    // the client's pt-BR name.
    es('Estin', 7, { fct: 0.02, vct: 0.08 }, ({ skillLevel }) => skillLevel * 10, { labelSuffix: 'alvo Pequeno' }),
    // bROWiki: "causa dano mágico em alvos de todos os tamanhos"; only the Atordoamento
    // is restricted to Médios, and status effects are outside the damage model.
    es('Estun', 7, { fct: 0.02, vct: 0.08 }, ({ skillLevel }) => skillLevel * 5),
    // One circle per skill level, each worth (Nv. de base + 40)% MATK — bROWiki's
    // "ATQM por círculo = [Nv. de base + 40]%". The client's table counts the circles
    // and leaves the ratio out, which is why the level column drives totalHit here.
    es('Esma', 10, { fct: 0.4, vct: 1.6 }, ({ model }) => model.level + 40, {
      totalHit: ({ skillLevel }: AtkSkillFormulaInput): number => skillLevel,
    }),
  ];
  protected readonly activeSkillListHi: ActiveSkillModel[] = [
    {
      label: 'Esma Lv10',
      name: 'Esma',
      inputType: 'dropdown',
      dropdown: [
        { label: '-', value: 0, isUse: false },
        { label: 'Nv 10', value: 10, skillLv: 10, isUse: true },
      ],
    },
  ];
  protected readonly passiveSkillListHi: PassiveSkillModel[] = [
    {
      inputType: 'dropdown',
      label: 'Kaahi',
      name: 'Kaahi',
      dropdown: [
        { label: '-', value: 0, isUse: false },
        { label: 'Nv 1', value: 1, skillLv: 1, isUse: true },
        { label: 'Nv 2', value: 2, skillLv: 2, isUse: true },
        { label: 'Nv 3', value: 3, skillLv: 3, isUse: true },
        { label: 'Nv 4', value: 4, skillLv: 4, isUse: true },
        { label: 'Nv 5', value: 5, skillLv: 5, isUse: true },
        { label: 'Nv 6', value: 6, skillLv: 6, isUse: true },
        { label: 'Nv 7', value: 7, skillLv: 7, isUse: true },
      ],
    },
  ];

  constructor() {
    super();

    this.inheritSkills({
      activeSkillList: this.activeSkillListHi,
      atkSkillList: this.atkSkillListHi,
      passiveSkillList: this.passiveSkillListHi,
      classNames: this.classNamesHi,
    });
  }

  override get atkSkills() { return super.atkSkills.filter((skill) => !TAEKWON_KICKS.has(skill.name)); }
}
