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
  // Transcendental jobs: base 99, job 70. https://browiki.org/wiki/Algozes
  [ClassName.AssassinCross]: preThird(70),

  // Expanded ½ jobs. The Taekwon changes job at class level 40 but keeps levelling to 50;
  // both of its promotions state "nível de base 99 e classe 50".
  // https://browiki.org/wiki/Taekwons · /Mestres_Taekwons · /Espiritualistas
  [ClassName.Taekwondo]: preThird(50),
  [ClassName.StarGladiator]: preThird(50),
  [ClassName.SoulLinker]: preThird(50),
};
