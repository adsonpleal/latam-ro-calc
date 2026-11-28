import { floor } from '../utils/floor';

/**
 * The healing side of the character sheet: how much HP one cast of a healing skill
 * restores, and how much that is per second.
 *
 * Framework-free and pure, like the rest of `core` — the Cura panel reads it and so do
 * the specs. It is deliberately separate from the damage pipeline: no stage here is ever
 * read by `damage-calculator.ts`, and `healPower`/`healReceived` keep the display-only
 * status they were registered with (see healing-stats.spec.ts). The panel is a second
 * reader of the same equipment sheet, not a new multiplier in the damage chain.
 *
 * ## The formula
 *
 * bROWiki's [Curar](https://browiki.org/wiki/Curar) article (read 27/11/2026) writes it
 * in two halves:
 *
 *     Cura A = [(Nv. de Base + INT) / 5] x Fator
 *     Cura B = (ATQM da arma + ATQM do refino da arma) x [1 + (Nv. da arma / 100)]
 *     Cura final = Cura A + Cura B
 *
 * `Fator` is that article's own per-level column, 3 per skill level — 3 at Nv 1 up to 30
 * at Nv 10. The brackets are floors, and only the division by 5 is floored inside Cura A.
 *
 * Two things the same article is explicit about, and both matter:
 *
 * - **Only the weapon's own ATQM counts.** "Não é influenciada pelo ATQM dado como bônus
 *   de equipamento" — the status ATQM and every `matk` line on a head, armour or card stay
 *   out. That is why {@link HealInput} asks for `weaponMatk` rather than a total.
 * - **Heal effectiveness enters at the base.** "Valor de cura é influenciado por itens que
 *   aumentam a efetividade de cura, entrando na fórmula Base da Cura", so it scales
 *   `Cura A + Cura B` and not the skill multiplier above it.
 *
 * The client's own description of Curar agrees on the inputs without publishing a table:
 * "Curar é afetada pela INT, nível do usuário e por bônus de efetividade de cura."
 */

/**
 * bROWiki's `Fator` column for Curar: 3 per skill level.
 *
 * A function rather than a literal table because the column is exactly linear across all
 * ten levels and a transcribed table would only invite a typo.
 */
export const healFactor = (skillLevel: number): number => 3 * Math.max(0, skillLevel);

export interface HealInput {
  /** The caster's base level — `Nv. de Base`, not job level. */
  baseLevel: number;
  /** Total INT, as the status window shows it (base + job + equipment + buffs). */
  int: number;
  /** Level of the healing skill being cast. */
  skillLevel: number;
  /**
   * The weapon's own ATQM: its base `matk` plus what the refine added. The engine's
   * `rawWeaponMATK` minus variance, which is the same sum bROWiki calls
   * "ATQM da arma + ATQM do refino da arma". Zero when healing bare-handed.
   */
  weaponMatk: number;
  /** The weapon's level (1-5); 0 bare-handed, which makes Cura B zero as well. */
  weaponLevel: number;
  /** "Efetividade de cura", summed from every source, in percent. */
  healPower: number;
  /**
   * What this skill restores as a percentage of the base heal: 100 for Curar itself,
   * 200-320 for Curatio. Defaults to 100.
   */
  skillEffectiveness?: number;
  /** "Cura recebida" on whoever is being healed, in percent. Defaults to 0. */
  targetHealReceived?: number;
}

/** Every stage of one cast, so the panel can show the derivation rather than a figure. */
export interface HealBreakdown {
  /** `[(Nv. de Base + INT) / 5] x Fator` */
  healA: number;
  /** `ATQM da arma x [1 + Nv. da arma / 100]` */
  healB: number;
  /** `Cura A + Cura B`, before any percentage. */
  baseHeal: number;
  /** After "Efetividade de cura". */
  withHealPower: number;
  /** After the skill's own effectiveness (Curatio, Sopro Divino's party term). */
  withSkillEffectiveness: number;
  /** After the target's "Cura recebida" — the HP the target actually gains. */
  total: number;
}

/**
 * One cast, stage by stage.
 *
 * Each stage truncates, the way the server int-casts every intermediate it keeps (the
 * same reason skill ratios floor rather than round — see skill-ratio-truncation). No
 * recorded heal packet has been read against this yet, so the flooring is the convention
 * the rest of the engine follows and not a measured fact; a replay carrying a heal is
 * what would confirm it.
 */
export const calcHeal = (input: HealInput): HealBreakdown => {
  const { baseLevel, int, skillLevel, weaponMatk, weaponLevel, healPower } = input;
  const skillEffectiveness = input.skillEffectiveness ?? 100;
  const targetHealReceived = input.targetHealReceived ?? 0;

  const healA = floor((baseLevel + int) / 5) * healFactor(skillLevel);
  const healB = floor(weaponMatk * (1 + weaponLevel / 100));
  const baseHeal = healA + healB;

  const withHealPower = floor(baseHeal * (1 + healPower / 100));
  const withSkillEffectiveness = floor(withHealPower * (skillEffectiveness / 100));
  const total = floor(withSkillEffectiveness * (1 + targetHealReceived / 100));

  return { healA, healB, baseHeal, withHealPower, withSkillEffectiveness, total };
};

/**
 * Heal per second: one cast divided by the time until the next one can start.
 *
 * `usesPerSec` is `SkillAspdModel.totalHitPerSec`, which `calcSkillAspd` already derives
 * from the client's fct/vct/acd/cd and every reduction an item carries. Taking it from
 * there rather than re-deriving it is the point: a cooldown reduction that shortens a
 * damage skill shortens a heal by the same path, and the two panels can never drift.
 *
 * Unlike DPS there is no accuracy and no crit to weight — a heal lands.
 */
export const calcHealPerSecond = (healPerCast: number, usesPerSec: number): number =>
  floor(healPerCast * usesPerSec);
