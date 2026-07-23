import { describe, expect, it } from 'vitest';
import { Monster } from '../domain';
import { MonsterModel } from '../models/monster.model';
import { SkillType } from '../models/damage-summary.model';
import { DamageCalculator } from './damage-calculator';

const monsterModel = (id: number): MonsterModel =>
  ({
    id,
    name: 'Test Mob',
    spawn: 'MVP',
    stats: {
      level: 100,
      health: 1_000_000,
      str: 1,
      agi: 1,
      vit: 1,
      int: 1,
      dex: 1,
      luk: 1,
      defense: 0,
      magicDefense: 0,
      res: 0,
      mres: 0,
      elementName: 'Neutral 1',
      raceName: 'Formless',
      scaleName: 'Medium',
      class: 1,
      mvp: 1,
    },
  } as any);

// applyAuraReduction is the single chokepoint every final damage number passes
// through (physical/magical skills + basic/crit autoattacks), so testing it in
// isolation pins the red-aura 99.9% reduction without standing up the whole
// damage pipeline.
const reduceWith = (id: number, damage: number) => {
  const dc = new DamageCalculator();
  (dc as any).monster = new Monster().setData(monsterModel(id));
  return (dc as any).applyAuraReduction(damage) as number;
};

describe('DamageCalculator red-aura reduction', () => {
  it('reduces final damage by 99.9% for a red-aura MVP (Orc Hero 1087)', () => {
    expect(reduceWith(1087, 1_000_000)).toBe(1000); // floor(1_000_000 * 0.001)
    expect(reduceWith(1087, 1_234_567)).toBe(1234); // floor(1_234_567 * 0.001)
  });

  it('leaves damage untouched for an MVP without a red aura (Gemaring 3505)', () => {
    expect(reduceWith(3505, 1_000_000)).toBe(1_000_000);
  });

  it('leaves damage untouched for an ordinary monster (Poring 1002)', () => {
    expect(reduceWith(1002, 1_000_000)).toBe(1_000_000);
  });
});

// Minimal harness for the private group-B/def-data getters — same style as
// `reduceWith` above, just with the extra state those methods read.
const makeCalc = (totalBonus: Record<string, any> = {}): DamageCalculator => {
  const dc = new DamageCalculator();
  (dc as any).monster = new Monster().setData(monsterModel(1002));
  (dc as any).totalBonus = totalBonus;
  (dc as any).finalMultipliers = [];
  (dc as any).finalPhyMultipliers = [];
  (dc as any).finalMagicMultipliers = [];
  return dc;
};

// getAtkGroupB is the node-graph decomposition added for the damage-formula
// graph view (see damage-calculator.ts DamageFormulaNode) — these pin that its
// `.total` still matches the pre-existing (un-noded) math, and that `.nodes`
// only appears (and chains correctly) when an idPrefix/baseNodeId is passed.
describe('DamageCalculator.getAtkGroupB', () => {
  it('omits the node chain when no idPrefix is passed (existing 3 call sites in calcTotalAtk pass one, but the shape stays optional)', () => {
    const dc = makeCalc();
    const result = (dc as any).getAtkGroupB({ totalAtk: 1000 });
    expect(result.total).toBe(1000);
    expect(result.nodes).toEqual([]);
  });

  it('builds a chained node per real multiplier step, skipping comet when it is a no-op (=== 1)', () => {
    const dc = makeCalc();
    const result = (dc as any).getAtkGroupB({ totalAtk: 1000, idPrefix: 'g', baseNodeId: 'base' });
    expect(result.total).toBe(1000); // no bonuses -> every multiplier is 1.0
    expect(result.nodes.map((n: any) => n.id)).toEqual(['g_race', 'g_size', 'g_element', 'g_monsterType']);
    expect(result.nodes[0].inputs).toEqual(['base']);
    expect(result.nodes[1].inputs).toEqual(['g_race']);
    expect(result.nodes.every((n: any) => n.value === 1000)).toBe(true);
    // every multiplier is 1.0 here, so each stage reports a +0% bonus
    expect(result.nodes.every((n: any) => n.percent === 0)).toBe(true);
  });

  // The `percent` tag is what lets the UI render the "%" chip that explains a stage's
  // delta. It's display metadata only — tagging must never move `.total`, which the
  // floor()-order hazards depend on.
  it('tags each stage with the percentage bonus behind its multiplier, without moving the total', () => {
    const untagged = (makeCalc({ p_race_all: 50 }) as any).getAtkGroupB({ totalAtk: 1000 });
    const dc = makeCalc({ p_race_all: 50 });
    const result = (dc as any).getAtkGroupB({ totalAtk: 1000, idPrefix: 'g', baseNodeId: 'base' });

    expect(result.total).toBe(untagged.total); // 1500, unchanged by the node building
    const race = result.nodes.find((n: any) => n.id === 'g_race');
    expect(race.percent).toBe(50);
    expect(race.keys).toEqual(['p_race_all']);
    // stages with no bonus configured still report their real (zero) contribution
    expect(result.nodes.find((n: any) => n.id === 'g_size').percent).toBe(0);
  });

  it('reflects a real race bonus in both the total and the race node value, chaining into later stages', () => {
    const dc = makeCalc({ p_race_all: 50 }); // +50% racial damage
    const result = (dc as any).getAtkGroupB({ totalAtk: 1000, idPrefix: 'g', baseNodeId: 'base' });
    expect(result.total).toBe(1500); // floor(1000 * 1.5)
    const race = result.nodes.find((n: any) => n.id === 'g_race');
    expect(race.value).toBe(1500);
    expect(race.keys).toEqual(['p_race_all']);
    // downstream stages carry the same value forward (size/element/monsterType are no-ops here)
    expect(result.nodes[result.nodes.length - 1].value).toBe(1500);
  });
});

describe('DamageCalculator DEF/RES internals exposed for the graph view', () => {
  it('getPhisicalDefData exposes restRes matching the resReduction formula', () => {
    const dc = makeCalc({ monster_res: 0 });
    (dc as any).monster.data.res = 100;
    (dc as any).monster.data.def = 0;
    (dc as any).monster.data.softDef = 0;
    const { restRes, resReduction } = (dc as any).getPhisicalDefData();
    expect(restRes).toBe(100); // no pene, no monster_res bonus
    expect(resReduction).toBeCloseTo((2000 + restRes) / (2000 + restRes * 5), 10);
  });

  it('getMagicalDefData exposes mDefBypassed/restMres matching the mresReduction formula', () => {
    const dc = makeCalc({ monster_mres: 0, m_pene_race_all: 0, m_pene_class_all: 0 });
    (dc as any).monster.data.mdef = 200;
    (dc as any).monster.data.mres = 50;
    const { mDefBypassed, restMres, mresReduction } = (dc as any).getMagicalDefData();
    expect(mDefBypassed).toBe(200); // no magical penetration configured
    expect(restMres).toBe(50);
    expect(mresReduction).toBeCloseTo((2000 + restMres) / (2000 + restMres * 5), 10);
  });
});

// Intoxicação (from Poço Venenoso / Cultivar Fada) drops the target's physical DEF to
// zero — browiki.org/wiki/Efeitos_negativos#Intoxicação. Modeled like Infiltration's
// def-bypass but WITHOUT its pseudo-ATK buff / 100% pene: it only zeroes hard + soft DEF
// on the physical path. MDEF (magical) is untouched, matching the in-game status.
describe('DamageCalculator Intoxicação zeroes the target physical DEF', () => {
  const PENE_OFF = { p_pene_race_all: 0, p_pene_class_all: 0, monster_res: 0 };

  it('drops both the hard-DEF reduction and the flat soft DEF to zero when intoxicated', () => {
    const dc = makeCalc({ ...PENE_OFF, intoxication: 25 });
    (dc as any).monster.data.def = 100;
    (dc as any).monster.data.softDef = 50;
    const { finalDmgReduction, finalSoftDef } = (dc as any).getPhisicalDefData();
    expect(finalDmgReduction).toBe(1); // no % hard-DEF damage reduction
    expect(finalSoftDef).toBe(0); // no flat soft-DEF subtraction
  });

  it('leaves the target DEF intact when the debuff is off', () => {
    const dc = makeCalc({ ...PENE_OFF });
    (dc as any).monster.data.def = 100;
    (dc as any).monster.data.softDef = 50;
    const { finalDmgReduction, finalSoftDef, dmgReductionByHardDef } = (dc as any).getPhisicalDefData();
    expect(finalDmgReduction).toBe(dmgReductionByHardDef);
    expect(finalDmgReduction).toBeLessThan(1); // def=100 → 4100/5000 = 0.82
    expect(finalSoftDef).toBe(50);
  });

  it('does not touch the magical path — MDEF is unaffected by Intoxicação', () => {
    const dc = makeCalc({ intoxication: 25, monster_mres: 0, m_pene_race_all: 0, m_pene_class_all: 0 });
    (dc as any).monster.data.mdef = 200;
    (dc as any).monster.data.mres = 50;
    const { mDefBypassed } = (dc as any).getMagicalDefData();
    expect(mDefBypassed).toBe(200); // MDEF still fully applies
  });
});

// Gravitação (Ground Gravitation's [Gravitational Field]) makes the target take +10% both
// physical and magical damage — rAthena battle.cpp: `damage += damage * 10 / 100` gated on
// BF_WEAPON|BF_MAGIC. It has no effect on boss monsters.
describe('DamageCalculator Gravitação increases damage taken (+10%, phys & magic)', () => {
  it('applies +10% to melee, ranged and magical damage on a normal target', () => {
    const dc = makeCalc({ gravitation: 10 });
    (dc as any).monster.data.type = 'normal';
    for (const t of [SkillType.MELEE, SkillType.RANGE, SkillType.MAGICAL]) {
      expect((dc as any).getDebuffMultiplier(t)).toBeCloseTo(1.1, 10);
    }
  });

  it('has no effect on boss monsters', () => {
    const dc = makeCalc({ gravitation: 10 });
    (dc as any).monster.data.type = 'boss';
    for (const t of [SkillType.MELEE, SkillType.RANGE, SkillType.MAGICAL]) {
      expect((dc as any).getDebuffMultiplier(t)).toBe(1);
    }
  });

  it('is a no-op when the debuff is off', () => {
    const dc = makeCalc({});
    (dc as any).monster.data.type = 'normal';
    expect((dc as any).getDebuffMultiplier(SkillType.MAGICAL)).toBe(1);
  });
});
