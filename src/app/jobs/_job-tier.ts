import { ClassName } from './_class-name';

/**
 * The caps a job carries when it is **played at its own tier** instead of only serving as
 * an ancestor for `inheritSkills`.
 *
 * Almost every file under `src/app/jobs` is both: the Taekwon is the base the Mestre
 * Taekwon and the Espiritualista inherit from, and a class a player can pick. The two
 * roles want different numbers — a 3rd job runs base 99..200 with 130-point stats and the
 * 193 ASPD cap, a pre-3rd job runs base 1..99 with 99-point stats and 190 — and the
 * descendant must keep the 3rd/4th job's own caps even though it extends the ancestor.
 *
 * `CharacterBase` resolves the four cap getters through this table by `className`, so the
 * row applies to exactly the job that owns it and never leaks down the chain. A job with
 * no row here keeps the base-class defaults, which are the 3rd/4th job ones.
 *
 * It is not the only route: ~20 third/fourth-job files still set the `minMaxLevel` and
 * `maxJob` fields, which is correct for them because they are leaves — nothing inherits
 * from them, so a field cannot leak. A row here is for a job that is *also* an ancestor,
 * and it wins over the fields.
 *
 * Sources per row are named beside it; the base/job level pair is the one bROWiki states
 * on the class page ("Ao atingirem o nível de base 99 e classe 50, podem evoluir…").
 */
export interface JobTierCaps {
  /** The base-level range, in the shape of the `minMaxLevel` field it stands in for. */
  minMaxLevel: [number, number];
  /** Highest job level the picker offers. (The job-bonus tables are padded to row 70
   *  for every class, so they do not say where a job stops.) */
  maxJobLevel: number;
  /** Cap of a single base stat (the 130 of a 3rd job does not apply below it). */
  maxBaseStat: number;
  /** "Vel. de Atq." ceiling; 190 below the 3rd jobs, which reach 193. */
  maxAspd: number;
  /** Job levels the picker must leave out — none below the 3rd jobs, which skip 66..69. */
  excludedJobLevels: number[];
}

/** Every pre-3rd job runs base 1..99 with 99-point stats and the 190 cap; only the job
 *  level differs. */
const preThird = (maxJobLevel: number): JobTierCaps =>
  ({ minMaxLevel: [1, 99], maxJobLevel, maxBaseStat: 99, maxAspd: 190, excludedJobLevels: [] });

export const JOB_TIER_CAPS: Partial<Record<ClassName, JobTierCaps>> = {
  // The thirteen transcendental 2nd jobs: base 99, job 70.
  //
  // A class page states the *requirement* for the next job change ("Ao atingirem os níveis
  // 99 de base e 60 de classe, podem evoluir para Trovadores"), which is not the cap —
  // only https://browiki.org/wiki/Lordes spells 70 out. What settles it for all thirteen is
  // their own job-bonus tables in this folder: each one keeps changing through row 70 and
  // distributes the trans tier's full 45 stat points, which a 50- or 60-level job could not.
  [ClassName.LordKnight]: preThird(70),
  [ClassName.Paladin]: preThird(70),
  [ClassName.HighPriest]: preThird(70),
  [ClassName.Champion]: preThird(70),
  [ClassName.HighWizard]: preThird(70),
  [ClassName.Scholar]: preThird(70),
  [ClassName.Sniper]: preThird(70),
  [ClassName.Clown]: preThird(70),
  [ClassName.Gypsy]: preThird(70),
  [ClassName.Whitesmith]: preThird(70),
  [ClassName.Creator]: preThird(70),
  [ClassName.AssassinCross]: preThird(70),
  [ClassName.Stalker]: preThird(70),

  // Expanded ½ jobs. The Taekwon changes job at class level 40 but keeps levelling to 50;
  // both of its promotions state "nível de base 99 e classe 50".
  // https://browiki.org/wiki/Taekwons · /Mestres_Taekwons · /Espiritualistas
  [ClassName.Taekwondo]: preThird(50),
  [ClassName.StarGladiator]: preThird(50),
  [ClassName.SoulLinker]: preThird(50),

  // The Justiceiro and the Ninja run base 1..99 with job 70. bROWiki states neither cap
  // (its Justiceiro page gives the Insurgente requirement, 99/50, and its Ninja page gives
  // only base 99), so the job level comes from irowiki's infobox — Gunslinger "Job Level:
  // 70", Ninja "Job Level: 70" — which the local job-bonus tables corroborate: the Ninja's
  // last bonus lands at job 64, exactly where irowiki puts its final SOR +4.
  // https://irowiki.org/wiki/Gunslinger · https://irowiki.org/wiki/Ninja
  [ClassName.Gunslinger]: preThird(70),
  [ClassName.Ninja]: preThird(70),
};
