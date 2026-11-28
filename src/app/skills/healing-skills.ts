import type { SkillName } from './skill-meta.generated';
import { ClassName } from '../jobs/_class-name';
import type { SkillTimingModel } from '../utils/calc-skill-aspd';

/**
 * The healing skills the Cura panel can cast, and the only ones it can.
 *
 * Three skills, because three are what the client's own `skilldescript.lub` publishes
 * for this line — Curar (28), Curatio (2051) and Sopro Divino (2043), all three already
 * in `skill-meta.generated.ts` with their pt-BR names and descriptions. Renovatio,
 * Santuário, Praefatio and Mediale Votum are *not* in that catalog, so there is no
 * client text to read their tables off and nothing here invents them.
 *
 * ## One base heal, three skills
 *
 * Curatio and Sopro Divino do not have healing formulas of their own: both relay Curar
 * and then scale it. rAthena's `AB_HIGHNESS_HEAL` and `AB_CHEAL` call `skill_calc_heal`
 * with `AL_HEAL` and the caster's own Curar level, and the client's descriptions say the
 * same in words — Curatio "recupera o HP do alvo de forma mais eficiente que a habilidade
 * [Curar]" and Sopro Divino "conjura [Curar] nos membros do grupo ao redor do usuário".
 *
 * That is why {@link HealSkillModel} carries an `effectiveness` instead of a formula: the
 * base comes from `calcHeal` at the caster's own Curar level — the level the build already
 * holds, read off its Curar dropdown — and each skill applies its own percentage on top.
 *
 * ## Timings
 *
 * `fct`/`vct`/`acd`/`cd` are the client's own "Informação de Conjuração / Espera" window,
 * read from `src/assets/demo/data/skill-delay.json` (ids 28, 2051 and 2043) — the same
 * table `skill-delay.spec.ts` holds every attack skill to. Seconds here, milliseconds
 * there, which is why `healing.spec.ts` re-reads that file and pins all four fields of
 * all three rows against it rather than trusting the transcription.
 */
export interface HealSkillModel extends SkillTimingModel {
  /** Catalog name, so `resolveSkillMeta` can give the client's own pt-BR label. */
  name: SkillName;
  /** In-game id — the icon, the description, and the `cd__<id>` item reductions. */
  id: number;
  /** Highest level the client publishes for it. */
  maxLevel: number;
  /**
   * What this skill restores, as a percentage of the base heal, at `level`. `members` is
   * the party size, which only Sopro Divino reads.
   */
  effectiveness: (level: number, members: number) => number;
  /** Earliest class in the ArchBishop line that has it. */
  from: ClassName;
}

/**
 * Curatio's own published column: 200 / 230 / 260 / 290 / 320%.
 *
 * `170 + 30 x Nv` reproduces all five rows of the client's table exactly, and is the
 * expression rAthena uses as well, so it is kept as a formula rather than a transcription.
 */
const curatioEffectiveness = (level: number): number => 170 + 30 * level;

/**
 * Sopro Divino's party term, from bROWiki's
 * [Sopro Divino](https://browiki.org/wiki/Sopro_Divino) article (read 27/11/2026):
 *
 *     Cura = Valor curado + {[(Valor curado / 100) x (Nº de membros x 10)] / 4}
 *
 * which is `Valor x (1 + membros x 0,025)` — 2,5% of the base heal per party member. The
 * skill's own level sets the area (7x7, 15x15, 31x31) and its cast time, not the amount,
 * which is why `level` goes unread here.
 */
const soproDivinoEffectiveness = (_level: number, members: number): number =>
  100 + Math.max(0, members) * 2.5;

export const HEAL_SKILLS: HealSkillModel[] = [
  {
    name: 'Heal',
    id: 28,
    maxLevel: 10,
    fct: 0,
    vct: 0,
    acd: 0.5,
    cd: 0,
    effectiveness: () => 100,
    from: ClassName.Acolyte,
  },
  {
    name: 'Highness Heal',
    id: 2051,
    maxLevel: 5,
    fct: 0,
    vct: 1,
    acd: 1,
    cd: 3,
    effectiveness: curatioEffectiveness,
    from: ClassName.ArchBishop,
  },
  {
    name: 'Coluceo Heal',
    id: 2043,
    maxLevel: 3,
    // The one per-level row of the three: 1,0 / 0,5 / 0,0 s, written as the level
    // function `calcSkillAspd` reads — the same idiom the attack skills use.
    fct: (level: number) => [1, 0.5, 0][Math.max(1, level) - 1] ?? 0,
    vct: 3,
    acd: 0,
    cd: 2,
    effectiveness: soproDivinoEffectiveness,
    from: ClassName.ArchBishop,
  },
];

/**
 * The ArchBishop line, root first.
 *
 * Adson's wording on card c3W2qySdAGV69qMOyM5w is "quando classes da linha do arcebispo
 * estiverem selecionadas", so the gate is this lineage and nothing else. The Monk branch
 * (Champion, Sura, Inquisitor) extends the same Acolyte in `src/app/jobs` and does keep
 * Curar in game, and Templários learn it too — the client's own description lists their
 * prerequisites — but neither is the ArchBishop line and neither was asked for.
 */
export const HEAL_CLASS_LINE: readonly ClassName[] = [
  ClassName.Acolyte,
  ClassName.HighPriest,
  ClassName.ArchBishop,
  ClassName.Cardinal,
];

/** Whether the Cura panel shows at all for this class. */
export const hasHealingPanel = (className: ClassName): boolean => HEAL_CLASS_LINE.includes(className);

/**
 * The healing skills `className` can cast — every entry whose `from` is at or before it
 * in the line, so an Acolyte gets Curar alone and an ArchBishop gets all three.
 */
export const healSkillsForClass = (className: ClassName): HealSkillModel[] => {
  const reached = HEAL_CLASS_LINE.indexOf(className);
  if (reached < 0) return [];

  return HEAL_SKILLS.filter((skill) => HEAL_CLASS_LINE.indexOf(skill.from) <= reached);
};

/** The catalog entry for a skill name, or undefined when the name is not a healing skill. */
export const findHealSkill = (name: string): HealSkillModel | undefined =>
  HEAL_SKILLS.find((skill) => skill.name === name);

