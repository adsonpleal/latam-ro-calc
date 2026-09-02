/**
 * Calculator → a compact result an agent can afford to read.
 *
 * `getTotalSummary()` is enormous: its `dmg` key spreads the whole damage summary,
 * including `skillFormulaGraph`/`skillFormulaTrace` node graphs, alongside every
 * non-zero bonus key and the full monster and weapon records — easily 15-40 kB per
 * call. Never spread it; pick.
 */
import { Calculator } from 'src/app/core/calculator';
import { bonusKeyLabel } from 'src/app/core/bonus-key-label';
import {
  buildAtkTypeTable,
  buildElementTable,
  buildMonsterTypeTables,
  buildRaceTables,
  buildSizeTable,
} from 'src/app/core/summary-tables';
import { elementPtBr, monsterTypePtBr, racePtBr, sizePtBr } from 'src/app/constants/monster-i18n';
import { round } from 'src/app/utils';
import { compact } from '../tools/helpers';
import { STAT_KEYS } from './build-input';
import { ResolvedBuild } from './build-input';

export type IncludeSection = 'bonuses' | 'tables';

const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
const round2 = (v: unknown): number | undefined => {
  const n = num(v);
  return n === undefined ? undefined : round(n, 2);
};

/** The engine's own skillHitKill is `ceil(HP / dano minimo)` on the base roll; the
 *  triggered pass needs the same division against its own minimum. */
const hitsToKill = (monster: any, min: unknown): number | undefined => {
  const hp = num(monster?.hp);
  const d = num(min);
  return hp === undefined || !d ? undefined : Math.ceil(hp / d);
};

export interface ProjectOptions {
  include?: IncludeSection[];
  share?: string;
  /** The prepared monster carries no id, so the caller supplies the one it targeted. */
  targetId?: number;
  /** Proc effects the solve was asked to trigger. `stats` already reflects them (they
   *  are ordinary bonuses by then), but the damage summary keeps the triggered pass in
   *  its own `effected*` fields, so without this the reported damage would be the base
   *  roll while the ATQ next to it was the triggered one. */
  effects?: string[];
}

export function projectResult(calc: Calculator, rb: ResolvedBuild, opts: ProjectOptions = {}) {
  const summary = calc.getTotalSummary() as any;
  const { calcSkill = {}, calc: c = {}, dmg = {}, monster } = summary;
  const model = rb.model as any;
  const include = new Set(opts.include ?? []);

  // Reported damage follows the pass the caller asked for. `effected*` is always
  // populated (it falls back to the base figures when nothing is ticked), so this only
  // diverges when an effect actually fired.
  const effected = (opts.effects?.length ?? 0) > 0 && num(dmg.effectedSkillDamageMin) !== undefined;
  const skillMin = effected ? dmg.effectedSkillDamageMin : dmg.skillMinDamage;
  const skillMax = effected ? dmg.effectedSkillDamageMax : dmg.skillMaxDamage;

  const result: Record<string, any> = {
    build: compact({
      class: model.class,
      className: rb.classInfo?.name,
      level: model.level,
      jobLevel: model.jobLevel,
      stats: compact(Object.fromEntries(STAT_KEYS.map((k) => [k, model[k]]))),
      atkSkill: model.selectedAtkSkill,
    }),

    // `summary.monster` is the *prepared* monster (src/app/domain/monster.ts), whose
    // fields are flattened and re-cased — not the raw monster.json record.
    target: monster
      ? compact({
          id: opts.targetId,
          name: monster.name,
          level: num(monster.level),
          hp: num(monster.hp),
          // elementPtBr already translates the head word and keeps the level suffix.
          element: monster.elementName ? elementPtBr(String(monster.elementName)) : undefined,
          race: monster.raceUpper ? racePtBr(monster.raceUpper) : undefined,
          size: monster.sizeFullUpper ? sizePtBr(monster.sizeFullUpper) : undefined,
          type: monsterTypePtBr(monster.typeUpper),
          mvp: monster.isMvp || undefined,
          def: num(monster.def),
          mdef: num(monster.mdef),
          res: num(monster.res),
          mres: num(monster.mres),
        })
      : undefined,

    damage: compact({
      skill: compact({
        min: num(skillMin),
        max: num(skillMax),
        dps: round2(effected ? dmg.effectedSkillDps : dmg.skillDps),
        hits: num(effected ? dmg.effectedSkillTotalHit : dmg.skillTotalHit),
        hitsToKill: num(effected ? hitsToKill(monster, skillMin) : dmg.skillHitKill),
        type: calcSkill.dmgType,
        element: calcSkill.propertySkill,
        accuracy: round2(effected ? dmg.effectedSkillAccuracy : dmg.skillAccuracy),
        critRate: round2(effected ? dmg.effectedSkillCriRateToMonster : dmg.skillCriRateToMonster),
        baseRatio: num(calcSkill.baseSkillDamage),
      }),
      basic: compact({
        min: num(effected ? dmg.effectedBasicDamageMin : dmg.basicMinDamage),
        max: num(effected ? dmg.effectedBasicDamageMax : dmg.basicMaxDamage),
        critMin: num(effected ? dmg.effectedBasicCriDamageMin : dmg.criMinDamage),
        critMax: num(effected ? dmg.effectedBasicCriDamageMax : dmg.criMaxDamage),
        dps: round2(effected ? dmg.effectedBasicDps : dmg.basicDps),
        critRate: round2(dmg.basicCriRate),
      }),
    }),

    stats: compact({
      atk: num(c.totalStatusAtk),
      matk: num(c.totalStatusMatk),
      hit: num(c.totalHit),
      flee: num(c.totalFlee),
      crit: num(c.totalCri),
      aspd: num(c.totalAspd),
      hitsPerSec: round2(c.hitPerSecs),
      maxHp: num(c.maxHp),
      maxSp: num(c.maxSp),
      def: num(c.def),
      softDef: num(c.softDef),
      mdef: num(c.mdef),
      softMdef: num(c.softMdef),
      res: num(c.res),
      mres: num(c.mres),
      cast: compact({ vct: round2(calcSkill.vct), fct: round2(calcSkill.fct), acd: round2(calcSkill.acd), cd: round2(calcSkill.cd) }),
    }),
  };

  const effects = (calc.chanceList ?? []).map((ch: any) => ch?.label).filter(Boolean);
  if (effects.length) result['availableEffects'] = effects;

  if (include.has('bonuses')) {
    result['bonuses'] = Object.entries(summary)
      .filter(([key, value]) => typeof value === 'number' && value !== 0 && !['monster', 'calc', 'calcSkill', 'dmg'].includes(key))
      .map(([key, value]) => ({ key, label: bonusKeyLabel(key), value }));
  }

  if (include.has('tables')) {
    result['tables'] = {
      element: buildElementTable(summary),
      ...buildRaceTables(summary),
      size: buildSizeTable(summary),
      ...buildMonsterTypeTables(summary),
      atkType: buildAtkTypeTable(summary),
    };
  }

  if (opts.share) result['share'] = opts.share;
  if (rb.warnings.length) result['warnings'] = rb.warnings;

  return result;
}
