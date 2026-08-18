// Turns the engine's per-skill solves into everything the rotation panel draws.
// Pure (no Angular imports), like battle-hud.logic.ts, so it is unit-testable with
// plain Vitest. It only reshapes numbers the engine already produced — it never
// re-derives game truth. The timing itself lives in src/app/core/rotation-schedule.ts.

import { BASIC_ATTACK_VALUE, isBasicAttack } from '../../../../core/rotation';
import { RotationCycle, RotationLane, RotationScheduleStep, simulateRotation } from '../../../../core/rotation-schedule';
import { dmgTypeLabel } from '../../../../utils/dmg-type-label';
import { floor } from '../../../../utils/floor';
import { buildDpsSteps, formatDuration, isCritWeighted, TimeToKill, TTK_CAP_SECONDS } from './battle-hud.logic';

/** The catalog fields a rotation row needs to render itself. */
export interface RotationSkillMeta {
  value?: string;
  values?: string[];
  label?: string;
  icon?: number;
  levelList?: { label: string; value: any }[];
  /** `boolean` when the skill always (or never) crits; a function when it depends on
   *  the character's state — which is what makes the row's crit reading conditional. */
  canCri?: boolean | ((input: any) => boolean);
}

export interface RotationEntryView {
  index: number;
  /** The `"Name==Level"` value, or BASIC_ATTACK_VALUE. */
  value: string;
  isBasic: boolean;
  /** Skill name without the level, e.g. "Chute Solar". */
  name: string;
  /** "Nv7", or empty for ataque básico and for skills that carry no level. */
  levelLabel: string;
  icon?: number;
  /** Levels this entry can be switched between; empty when the catalog fixes the level.
   *  Only 7 job files declare `levelList`, so most rows show a static level. */
  levelList: { label: string; value: any }[];
  /** Total damage for one use, summed over every hit. */
  damage: number;
  contributionPercent: number;
  /** "Corpo a corpo" / "À distância" / "Mágico". */
  dmgTypeLabel: string;
  element: string;
  propertyMultiplier: number;
  /** Set when the build cannot cast this skill (weapon gating). Damage is then 0. */
  requireTxt: string;
  /**
   * Crit state, which every row states explicitly — silence would read as missing data.
   * `canCrit` false renders "Sem crít."; true renders the rate.
   */
  canCrit: boolean;
  critRate: number;
  /**
   * Whether that reading depends on the character's state. Derived from the catalog
   * entry's `canCri` being a *function* rather than a flag — the only honest signal
   * available, since no skill declares which state it needs (see docs/combo.md §7).
   * The condition itself therefore cannot be named, only flagged.
   */
  critConditional: boolean;
  /**
   * True when {@link damage} is a crit-weighted *mean* rather than a single outcome —
   * the skill crits some of the time, so the row's figure sits between the sem-crít. and
   * com-crít. readings the skill card shows. The row labels itself on this, because a
   * bare number next to "Crít. 38,0%" reads as an invitation to apply the 38% again.
   */
  critWeighted: boolean;
  /**
   * The two outcomes {@link damage} is the mean of, on the same per-use scale, so the row
   * can show all three the way the skill card does. Both 0 when the skill cannot crit —
   * there is only one outcome then, and it is `damage` itself.
   */
  damageNoCri: number;
  damageCri: number;
  /**
   * The rotation idled on *this* entry's own recarga — the red "Recarga não fecha" state.
   *
   * Always false for a one-entry rotation: there the skill simply repeats on its own
   * timer and the wait *is* the cycle, so every skill with a cooldown would be flagged
   * (Firmamento reported 59,53s missing on a perfectly normal rotation). This mirrors
   * `isSingleEntryRotation` in battle-hud.component.ts, which suppresses `showsFirstCycle`
   * for the same reason.
   */
  stalled: boolean;
  /** How many times this same skill appears before this entry — drives the "2ª vez" note. */
  occurrence: number;
  /** The full `getTotalSummary()` this entry was solved with, for its (i) popover. */
  summary: any;
  lane: RotationLane;
}

export interface RotationView {
  entries: RotationEntryView[];
  cycle: RotationCycle;
  /** Null when nothing can die — zero DPS, or an immune target. */
  ttk: TimeToKill | null;
  /** Cycles needed to kill the target. */
  cyclesToKill: number;
  /** Entries the build cannot actually cast. */
  blocked: { name: string; requireTxt: string }[];
  /** Seconds per action imposed by VelAtq. */
  aspdPeriod: number;
}

const splitValue = (value: string): { name: string; level: string } => {
  const [, name, level] = value?.match(/(.+)==(\d+)/) ?? [];
  return { name: name ?? value ?? '', level: level ?? '' };
};

/**
 * One row's three damage readings. `damage` is the crit-weighted mean — the figure the
 * rotation and the DPS run on — and the other two are the outcomes it averages.
 */
interface DamageReadings {
  damage: number;
  noCri: number;
  cri: number;
}

const NO_DAMAGE: DamageReadings = { damage: 0, noCri: 0, cri: 0 };

/**
 * The effected pass's DPS inputs when Efeitos are ticked, the base ones otherwise —
 * the same effected-or-base rule {@link pickHeroDamage} applies to the hero figure, and
 * gated on the same flag for the same reason (unticking the last Efeito can leave
 * `effected*` stale).
 *
 * Without this the rows read the un-effected inputs, so ticking an Efeito moved the hero
 * DPS and the (i) popover but left every row and the cycle total untouched.
 */
function effectedDpsInputs(dmg: any, hasSelectedChances: boolean): any {
  if (!dmg) return dmg;
  const hasEffected = hasSelectedChances && (dmg.effectedSkillDpsInputMin ?? 0) > 0;
  if (!hasEffected) return dmg;

  return {
    ...dmg,
    skillDpsInputMin: dmg.effectedSkillDpsInputMin,
    skillDpsInputMax: dmg.effectedSkillDpsInputMax,
    skillDpsInputCriDmg: dmg.effectedSkillDpsInputCriDmg,
    skillDpsInputHitsPerSec: dmg.effectedSkillDpsInputHitsPerSec,
    skillCriRateToMonster: dmg.effectedSkillCriRateToMonster,
    skillAccuracy: dmg.effectedSkillAccuracy,
    skillTotalHit: dmg.effectedSkillTotalHit,
  };
}

/**
 * Per-use damage for one skill: the engine's own damage arithmetic (accuracy- and
 * crit-weighted, summed over every hit), with no rate applied.
 *
 * DELIBERATE DIVERGENCE from `dmg.skillDps`. The engine derives its DPS through
 * truncations that are invisible at high rates and lossy at low ones:
 * `totalHitPerSec = floor(1 / hitPeriod, 6)` (calc-skill-aspd.ts) and
 * `oneHitDps = floor(hitsPerSec * totalDamage)` (calc-dmg-dps.ts) — that second floor
 * takes a slow skill's per-second damage down to whole units before the hit count
 * multiplies it back up.
 *
 * The rotation divides real damage by real time, so it reports the true rate, and it is
 * why this panel was already correct while the one-decimal `totalHitPerSec` had the old
 * tab reporting 60s-cooldown skills 122x too high. See docs/combo.md.
 */
function skillDamagePerUse(dmg: any): DamageReadings {
  const steps = buildDpsSteps(dmg);
  if (!steps) return NO_DAMAGE;

  return {
    damage: steps.damagePerUse,
    // The same two legs the mean averages, scaled by the hit count so all three readings
    // are per use and the mean visibly sits between them.
    noCri: steps.totalHit * steps.avgBasicDamage,
    cri: steps.totalHit * steps.criDmg,
  };
}

/** Per-use damage for ataque básico. `basicDps` is already damage x rate, so dividing by
 *  the rate recovers the damage exactly rather than re-deriving it from min/max/crit. */
function basicDamagePerUse(summary: any, hasSelectedChances: boolean): DamageReadings {
  const dmg = summary?.dmg;
  const rate = summary?.calc?.hitPerSecs || 0;
  if (!dmg || rate <= 0) return NO_DAMAGE;

  const dps = (hasSelectedChances ? dmg.effectedBasicDps : 0) || dmg.basicDps || 0;

  return {
    damage: dps / rate,
    // Exactly the two values damage-calculator.ts hands calcDmgDps for basicDps, so the
    // pair the row prints is the pair the mean was actually built from.
    noCri: floor(((dmg.basicMinDamage || 0) + (dmg.basicMaxDamage || 0)) / 2),
    cri: floor(((dmg.criMinDamage || 0) + (dmg.criMaxDamage || 0)) / 2),
  };
}

/**
 * Map one solved summary onto the scheduler's per-step timing.
 *
 * `castPeriod` is used rather than `reducedFct + reducedVct` so that `hitEveryNSec`
 * skills come through the way calc-skill-aspd already treats them: the channel time is
 * the cast and the block period is zero. `blockPeriod === 0` is exactly that signal.
 */
export function toScheduleStep(input: { value: string; summary: any; damage: number }): RotationScheduleStep {
  const { value, summary, damage } = input;
  if (isBasicAttack(value)) {
    return { key: BASIC_ATTACK_VALUE, cast: 0, acd: 0, cd: 0, damage };
  }

  const calcSkill = summary?.calcSkill ?? {};
  const cast = calcSkill.castPeriod || 0;
  const blockPeriod = Math.max(0, (calcSkill.hitPeriod || 0) - cast);
  const channelled = blockPeriod <= 0 && (calcSkill.reducedAcd > 0 || calcSkill.reducedCd > 0);

  return {
    // Recarga is per skill, shared across its levels, so the name is the identity.
    key: splitValue(value).name,
    cast,
    acd: channelled ? 0 : calcSkill.reducedAcd || 0,
    cd: channelled ? 0 : calcSkill.reducedCd || 0,
    damage,
  };
}

/**
 * When the target actually dies, walked off the schedule instead of divided out of the
 * sustained DPS.
 *
 * `hp / sustainedDps` smears one burst across the whole cycle, which for a 60s-recarga
 * skill answers a question nobody asked: Firmamento reported "Morre em 24,6s" next to
 * "1 usos" for a target that one cast overkills at ~1s. Damage is discrete — it lands
 * when a cast ends — so the honest reading is the moment the running total passes the
 * target's HP.
 *
 * The steady cycle is repeated for every pass, including the first. That is slightly
 * pessimistic (the first pass has every recarga clear and closes sooner), which the
 * panel already reports separately as "PRIMEIRO CICLO" rather than folding in here.
 */
export function computeRotationTimeToKill(hp: number, cycle: RotationCycle): TimeToKill | null {
  if (!(hp > 0) || !(cycle?.damagePerCycle > 0) || !(cycle.cycleDuration > 0)) return null;

  const cycles = Math.ceil(hp / cycle.damagePerCycle);
  let dealt = 0;

  for (let c = 0; c < cycles; c++) {
    for (const lane of cycle.lanes) {
      if (!(lane.damage > 0)) continue;
      dealt += lane.damage;
      if (dealt >= hp) {
        // The blow lands when its cast ends, not when the step was scheduled.
        const seconds = c * cycle.cycleDuration + lane.castEnd;
        return { seconds, text: seconds > TTK_CAP_SECONDS ? '> 24h' : formatDuration(seconds) };
      }
    }
  }

  return null;
}

export function buildRotationView(input: {
  rotation: string[];
  /** One solved `getTotalSummary()` per distinct rotation value. */
  summaryByValue: Map<string, any>;
  /** Any solved summary — ataque básico and the VelAtq floor read from it. */
  baseSummary: any;
  hasSelectedChances: boolean;
  atkSkills: RotationSkillMeta[];
}): RotationView {
  const { rotation, summaryByValue, baseSummary, hasSelectedChances, atkSkills } = input;

  const metaFor = (value: string): RotationSkillMeta | undefined =>
    atkSkills?.find((s) => s.value === value || s.values?.includes(value) || s.levelList?.some((l) => l.value === value));

  const aspdPeriod = baseSummary?.calc?.hitPerSecs > 0 ? 1 / baseSummary.calc.hitPerSecs : 0;

  const seen = new Map<string, number>();
  const partial = (rotation ?? []).map((value, index) => {
    const basic = isBasicAttack(value);
    const summary = basic ? baseSummary : summaryByValue.get(value) ?? baseSummary;
    const dmg = summary?.dmg;
    const { name, level } = splitValue(value);
    const meta = metaFor(value);

    // One effected-or-base view of this skill's numbers, so the crit the row prints is
    // the crit its damage was computed with.
    const edmg = basic ? dmg : effectedDpsInputs(dmg, hasSelectedChances);
    const requireTxt = basic ? '' : dmg?.requireTxt || '';
    const readings = requireTxt ? NO_DAMAGE : basic ? basicDamagePerUse(summary, hasSelectedChances) : skillDamagePerUse(edmg);

    const occurrence = seen.get(value) ?? 0;
    seen.set(value, occurrence + 1);

    return {
      index,
      value,
      isBasic: basic,
      name: basic ? 'Ataque básico' : meta?.label?.replace(/\s*Lv\d+.*$/, '') || name,
      levelLabel: basic || !level ? '' : `Nv${level}`,
      icon: meta?.icon,
      levelList: meta?.levelList ?? [],
      damage: readings.damage,
      damageNoCri: readings.noCri,
      damageCri: readings.cri,
      contributionPercent: 0,
      dmgTypeLabel: basic ? dmgTypeLabel('Melee') : dmgTypeLabel(summary?.calcSkill?.dmgType ?? ''),
      element: basic ? summary?.propertyAtk ?? '' : summary?.calcSkill?.propertySkill ?? '',
      propertyMultiplier: basic ? 1 : dmg?.skillPropertyMultiplier ?? 1,
      requireTxt,
      // Ataque básico always rolls crit; a skill only where the engine says so.
      canCrit: basic ? (dmg?.criRateToMonster ?? 0) > 0 : !!dmg?.skillCanCri,
      critRate: basic ? dmg?.criRateToMonster ?? 0 : edmg?.skillCriRateToMonster ?? 0,
      critConditional: !basic && typeof meta?.canCri === 'function',
      // Ataque básico's own damage figure is recovered from basicDps, which is averaged
      // the same way, so both kinds of row answer this the same question.
      critWeighted: isCritWeighted(
        basic ? (dmg?.criRateToMonster ?? 0) > 0 : !!dmg?.skillCanCri,
        basic ? dmg?.criRateToMonster ?? 0 : edmg?.skillCriRateToMonster ?? 0,
      ),
      occurrence,
      summary,
    };
  });

  const cycle = simulateRotation({
    steps: partial.map((entry) => toScheduleStep({ value: entry.value, summary: entry.summary, damage: entry.damage })),
    aspdPeriod,
  });

  // A one-entry rotation cannot stall on itself — see RotationEntryView.stalled.
  const isSingleEntry = partial.length < 2;
  const entries: RotationEntryView[] = partial.map((entry, i) => ({
    ...entry,
    contributionPercent: cycle.lanes[i]?.contributionPercent ?? 0,
    lane: cycle.lanes[i],
    stalled: !isSingleEntry && (cycle.lanes[i]?.cdWait ?? 0) > 1e-3,
  }));

  const monsterHp = baseSummary?.monster?.hp || 0;

  return {
    entries,
    cycle,
    ttk: computeRotationTimeToKill(monsterHp, cycle),
    cyclesToKill: cycle.damagePerCycle > 0 ? Math.ceil(monsterHp / cycle.damagePerCycle) : 0,
    blocked: entries.filter((e) => e.requireTxt).map((e) => ({ name: e.name, requireTxt: e.requireTxt })),
    aspdPeriod,
  };
}
