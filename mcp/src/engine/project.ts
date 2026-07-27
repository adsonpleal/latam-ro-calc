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
import { elementPtBr, racePtBr, sizePtBr } from 'src/app/constants/monster-i18n';
import { ClassInfo } from '../data/class-registry';
import { ResolvedBuild } from './build-input';

export type IncludeSection = 'bonuses' | 'tables';

const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
const round2 = (v: unknown): number | undefined => {
  const n = num(v);
  return n === undefined ? undefined : Math.round(n * 100) / 100;
};

/** Strip undefined so they don't serialize as noise. */
const compact = <T extends Record<string, any>>(o: T): T => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

export interface ProjectOptions {
  include?: IncludeSection[];
  warnings?: string[];
  share?: string;
  /** The prepared monster carries no id, so the caller supplies the one it targeted. */
  targetId?: number;
}

export function projectResult(calc: Calculator, rb: ResolvedBuild, classInfo: ClassInfo | undefined, opts: ProjectOptions = {}) {
  const summary = calc.getTotalSummary() as any;
  const { calcSkill = {}, calc: c = {}, dmg = {}, monster } = summary;
  const model = rb.model as any;
  const include = new Set(opts.include ?? []);

  const result: Record<string, any> = {
    build: compact({
      class: model.class,
      className: classInfo?.name,
      level: model.level,
      jobLevel: model.jobLevel,
      stats: compact({
        str: model.str, agi: model.agi, vit: model.vit, int: model.int, dex: model.dex, luk: model.luk,
        pow: model.pow, sta: model.sta, wis: model.wis, spl: model.spl, con: model.con, crt: model.crt,
      }),
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
          element: monster.elementName ? `${elementPtBr(String(monster.elementName).split(' ')[0])} ${String(monster.elementName).split(' ')[1] ?? ''}`.trim() : undefined,
          race: monster.raceUpper ? racePtBr(monster.raceUpper) : undefined,
          size: monster.sizeFullUpper ? sizePtBr(monster.sizeFullUpper) : undefined,
          type: monster.typeUpper === 'Boss' ? 'Chefe' : 'Normal',
          mvp: monster.isMvp || undefined,
          def: num(monster.def),
          mdef: num(monster.mdef),
          res: num(monster.res),
          mres: num(monster.mres),
        })
      : undefined,

    damage: compact({
      skill: compact({
        min: num(dmg.skillMinDamage),
        max: num(dmg.skillMaxDamage),
        dps: round2(dmg.skillDps),
        hits: num(dmg.skillTotalHit),
        hitsToKill: num(dmg.skillHitKill),
        type: calcSkill.dmgType,
        element: calcSkill.propertySkill,
        accuracy: round2(dmg.skillAccuracy),
        critRate: round2(dmg.skillCriRateToMonster),
        baseRatio: num(calcSkill.baseSkillDamage),
      }),
      basic: compact({
        min: num(dmg.basicMinDamage),
        max: num(dmg.basicMaxDamage),
        critMin: num(dmg.criMinDamage),
        critMax: num(dmg.criMaxDamage),
        dps: round2(dmg.basicDps),
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
  const warnings = [...(opts.warnings ?? []), ...rb.warnings];
  if (warnings.length) result['warnings'] = warnings;

  return result;
}
