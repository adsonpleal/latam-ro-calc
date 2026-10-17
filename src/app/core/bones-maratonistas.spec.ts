import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ArchBishop, Cardinal, CharacterBase, Doram, Genetic, GuillotineCross, Kagerou,
  Mechanic, Minstrel, Ranger, Rebellion, RoyalGuard, RuneKnight, ShadowChaser,
  Sorcerer, SoulReaper, StarEmperor, SuperNovice, Sura, Wanderer, Warlock,
} from '../jobs';
import { createMainModel } from '../utils';
import { makeCalculator } from './__tests__/make-calculator';
import { buildAutoCastSimulation } from './auto-cast';

// ROpOgUyC0m6w1Pv5lBkP. Numbers and conditions come from each LATAM description.
const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const monster = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'))[1038];
const family: Array<[number, new () => CharacterBase, string, number]> = [
  [19189, Mechanic, 'atk', 10], [19190, Genetic, 'atk', 10],
  [19191, GuillotineCross, 'atk', 10], [19192, ShadowChaser, 'matk', 10],
  [19193, Warlock, 'matk', 10], [19194, Sorcerer, 'matk', 10],
  [19195, RuneKnight, 'atk', 10], [19196, RoyalGuard, 'atk', 10],
  [19197, ArchBishop, 'matk', 10], [19198, Sura, 'atk', 10],
  [19199, Ranger, 'atk', 10], [19200, Minstrel, 'atk', 10],
  [19201, Wanderer, 'atk', 10], [19202, Rebellion, 'atk', 10],
  [19203, Kagerou, 'atk', 10], [19204, SuperNovice, 'atk', 10],
  [19205, Doram, 'atk', 5], [19396, StarEmperor, 'atk', 10],
  [19397, SoulReaper, 'matk', 10],
];

function prepare(id: number, refine: number, cls: CharacterBase = new RuneKnight(),
  learned: Record<string, number> = {}, active: Record<string, number> = {},
  overrides: Record<string, unknown> = {}, db = items) {
  const calc = makeCalculator(db, cls);
  const skills = cls.setLearnSkills({
    passiveSkillIds: cls.passiveSkills.map((skill) => learned[skill.name] ?? 0),
    activeSkillIds: cls.activeSkills.map((skill) => active[skill.name] ?? 0),
  }).getSkillBonusAndName();
  const model = { ...createMainModel(), level: 150, int: 100, str: 100, dex: 100,
    headUpper: id, headUpperRefine: refine, ...overrides };
  calc.setLearnedSkills(skills.learnedSkillMap).setUsedSkillNames(skills.activeSkillNames)
    .setEquipAtkSkillAtk(skills.equipAtks).setMasterySkillAtk(skills.masteryAtks)
    .setModel(model).loadItemFromModel(model).prepareAllItemBonus();
  return { calc, model, bonus: (calc as any).totalEquipStatus as Record<string, number> };
}

describe('Bonés Maratonistas: all 19 client records', () => {
  it.each(family)('%i keeps its base refine ladder and percentage speed', (id, Job, key, step) => {
    for (const refine of [0, 1, 2, 3, 7, 8, 10, 11]) {
      const { bonus } = prepare(id, refine, new Job());
      expect(bonus[key], `${id} +${refine}`).toBe(Math.floor(refine / 2) * step + (id === 19204 && refine >= 11 ? 20 : 0));
      expect(bonus[id === 19397 ? 'vct' : 'aspdPercent']).toBe(Math.floor(refine / 3) * 2);
    }
  });

  it('scales Mecânico critical damage by learned Força Violenta, even when inactive', () => {
    for (const [refine, level, expected] of [[7, 5, 0], [8, 0, 0], [8, 1, 5], [11, 5, 25]]) {
      expect(prepare(19189, refine, new Mechanic(), { 'Power Thrust': level }).bonus.criDmg).toBe(expected);
    }
  });

  it('registers Arcano cooldown scaling and the Bastão da Destruição casting penalty', () => {
    for (const [refine, thor, meteor, expected] of [[7, 10, 10, 0], [8, 0, 0, 0], [8, 3, 4, 3.5], [11, 10, 10, 10]]) {
      expect(prepare(19193, refine, new Warlock(), { 'Lord of Vermilion': thor, 'Meteor Storm': meteor }).bonus.cd__2217).toBe(expected);
    }
    expect(prepare(19193, 10).bonus.fctPercent__366).toBe(0);
    expect(prepare(19193, 11).bonus.fctPercent__366).toBe(50);
    expect(prepare(19193, 10, new Warlock(), {}, {}, { weapon: 2000 }).bonus.fctPercent__366).toBe(-50);
    expect(prepare(19193, 11, new Warlock(), {}, {}, { weapon: 2000 }).bonus.fctPercent__366).toBe(0);
  });

  it('applies Lutador SP cost and the LATAM +50% damage, with independent refine gates', () => {
    for (const [refine, learned, cost, damage] of [[7, 10, 0, 0], [8, 0, 0, 0], [8, 3, -3, 0], [10, 10, -10, 0], [11, 10, -10, 50]]) {
      const { bonus } = prepare(19198, refine, new Sura(), { 'Raging Trifecta Blow': learned });
      expect(bonus.spCost__2336).toBe(cost);
      expect(bonus['2336']).toBe(damage);
    }
  });

  it('reduces Lançar Míssil by 0.5 seconds per learned Mina do Justiceiro', () => {
    expect(prepare(19202, 7, new Rebellion(), { 'Gunslinger Mine': 10 }).bonus.cd__2566).toBe(0);
    expect(prepare(19202, 8, new Rebellion(), { 'Gunslinger Mine': 3 }).bonus.cd__2566).toBe(1.5);
    expect(prepare(19202, 8, new Rebellion(), { 'Gunslinger Mine': 10 }).bonus.cd__2566).toBe(5);
  });

  it('resolves all three Doram cooldowns from the real class controls, including Camarão Fresquinho', () => {
    const learned = { 'Catnip Meteor': 5, 'Lunatic Carrot Beat': 5, 'Frash Shrimp': 5 };
    for (const [refine, expected] of [[7, [0, 0, 0]], [8, [40, 20, 20]]] as const) {
      const { bonus } = prepare(19205, refine, new Doram(), learned);
      expect([bonus.cd__5048, bonus.cd__5046, bonus.cd__5051]).toEqual(expected);
      expect(bonus.aspd).toBe(0);
    }
    const { bonus } = prepare(19205, 8, new Doram());
    expect([bonus.cd__5048, bonus.cd__5046, bonus.cd__5051]).toEqual([0, 0, 0]);
  });

  it.each([[19396, StarEmperor, 'Chute Solar', ['2592']], [19397, SoulReaper, 'Esma', ['2602', '2604']]] as const)(
    '%i exposes a ten-second opt-in damage effect after using its trigger skill', (id, Job, trigger, keys) => {
      expect(prepare(id, 10, new Job()).calc.chanceList).toEqual([]);
      const { calc, bonus } = prepare(id, 11, new Job());
      const effect = calc.chanceList.find((entry) => entry.itemId === id)!;
      expect(effect.label2).toContain(`Ao usar ${trigger} · 10 segundos`);
      for (const key of keys) {
        expect(bonus[key] ?? 0).toBe(0);
        expect(effect.bonus[key]).toBe(30);
      }
    },
  );

  it.each([19189, 19195])('%i grants Ataque Duplo only at +11', (id) => {
    expect(prepare(id, 10).calc.getGrantedSkillLevel(48)).toBe(0);
    expect(prepare(id, 11).calc.getGrantedSkillLevel(48)).toBe(5);
  });

  it('represents Rúnico weapon indestructibility without changing damage bonuses', () => {
    expect(prepare(19195, 10).bonus.unbreakableWeapon).toBe(0);
    expect(prepare(19195, 11).bonus.unbreakableWeapon).toBe(1);
  });

  it.each([[19190, Genetic, 'Cart Tornado', 2476, 2, 5], [19197, ArchBishop, 'Adoramus', 2040, 5, 10],
    [19200, Minstrel, 'Reverberation', 2414, 2, 5], [19201, Wanderer, 'Reverberation', 2414, 2, 5]] as const)(
    '%i uses the real learned-level picker for its damage autocast', (id, Job, name, skillId, minimum, max) => {
      expect(prepare(id, 10, new Job(), { [name]: max }).calc.resolvedItemAutoCasts).toEqual([]);
      for (const learned of [0, 1, max]) {
        expect(prepare(id, 11, new Job(), { [name]: learned }).calc.resolvedItemAutoCasts).toContainEqual(
          expect.objectContaining({ skillId, chance: 5, skillLevel: Math.max(minimum, learned) }),
        );
      }
    },
  );

  it('keeps Amplificação Mística outside damage autocasts', () => {
    expect(prepare(19192, 11, new ShadowChaser()).calc.resolvedItemAutoCasts).toEqual([]);
  });
});

function simulate(id: number, refine: number, Job: new () => CharacterBase, learned = {}, active = {}, db = items, ranged = false) {
  const prepared = prepare(id, refine, new Job(), learned, active, {}, db);
  const { calc, model } = prepared;
  calc.setHpSpTable([{ jobs: { [new Job().className]: true }, baseHp: Array(251).fill(20000), baseSp: Array(251).fill(1500) }] as any)
    .setMonster(monster).calcAllAtk();
  const result = buildAutoCastSimulation({ calc, model, hasSelectedEffects: false, summary: {
    calc: { hitPerSecs: 4 }, dmg: { accuracy: 100, criRateToMonster: 0, basicDps: 400 },
    weapon: { rangeType: ranged ? 'range' : 'melee' }, monster: { hp: 10000 },
  } });
  return { ...prepared, result };
}

describe('Sagrado: Gemini Lumen and Adoramus damage integration', () => {
  // https://browiki.org/wiki/Gemini_Lumen: independent rolls, melee-hit trigger.
  it.each([ArchBishop, Cardinal])('supports both lights and Adoramus on %s', (Job) => {
    const { result } = simulate(19197, 11, Job, { 'Mace Mastery': 10, Adoramus: 8 }, { 'Duple Light': 10 });
    const lights = result.sources.filter((s) => s.source.skillId === 2054);
    expect(lights).toHaveLength(2);
    expect(lights.map((s) => s.name)).toEqual(['Gemini Lumen (luz física)', 'Gemini Lumen (luz mágica)']);
    expect(lights.map((s) => s.source.chance)).toEqual([30, 30]);
    expect(lights.every((s) => s.expectedDamagePerActivation > 0)).toBe(true);
    expect(result.sources).toContainEqual(expect.objectContaining({ source: expect.objectContaining({ skillId: 2040, skillLevel: 8, chance: 5 }) }));
    expect(result.blockedSources.map((source) => source.key)).toEqual(Job === Cardinal ? ['petitio'] : []);
  });

  it('applies the +100% Sagrado skill bonus to both physical and magical light damage', () => {
    const baselineItems = structuredClone(items);
    delete baselineItems[19197].script['2054'];
    const base = simulate(19197, 8, ArchBishop, { 'Mace Mastery': 10 }, { 'Duple Light': 10 }, baselineItems).result;
    const boosted = simulate(19197, 8, ArchBishop, { 'Mace Mastery': 10 }, { 'Duple Light': 10 }).result;
    for (let index = 0; index < 2; index++) {
      expect(boosted.sources[index].expectedDamagePerActivation).toBeCloseTo(base.sources[index].expectedDamagePerActivation * 2, -1);
    }
  });

  it('requires Gemini Lumen to be active and a successful melee attack for the lights', () => {
    expect(simulate(19197, 8, ArchBishop).result.sources).toEqual([]);
    const ranged = simulate(19197, 11, ArchBishop, {}, { 'Duple Light': 10 }, items, true).result;
    expect(ranged.sources.map((s) => s.source.skillId)).toEqual([2040]);
    const level1 = simulate(19197, 8, ArchBishop, {}, { 'Duple Light': 1 }).result;
    expect(level1.sources.map((s) => s.source.chance)).toEqual([12, 12]);
  });
});

describe('Maratonista temporary damage states', () => {
  it.each([[19396, StarEmperor, ['Solar Explosion']], [19397, SoulReaper, ['Espa', 'Eswhoo']]] as const)(
    '%i changes damage only while its ten-second effect is selected', (id, Job, skills) => {
      const { calc } = simulate(id, 11, Job);
      const effect = calc.chanceList.find((entry) => entry.itemId === id)!;
      for (const name of skills) {
        const skill = calc.atkSkills.find((entry) => entry.name === name)!;
        const value = `${name}==10`;
        const off = calc.setSelectedChances([]).solveAutoCast(value, skill).skillMaxDamage;
        const on = calc.setSelectedChances([effect.name]).solveAutoCast(value, skill).skillMaxDamage;
        const restored = calc.setSelectedChances([]).solveAutoCast(value, skill).skillMaxDamage;
        expect(on).toBeGreaterThan(off);
        expect(on).toBeCloseTo(off * 1.3, -1);
        expect(restored).toBe(off);
      }
    },
  );
});

describe('equipment-granted Ataque Duplo', () => {
  // Client: 7% per level; items work with any weapon and use the higher learned level.
  // https://browiki.org/wiki/Ataque_Duplo
  it.each([[19189, Mechanic], [19195, RuneKnight]] as const)('%i adds an extra basic hit without duplicating autocast rolls', (id, Job) => {
    const { result } = simulate(id, 11, Job);
    const extra = result.sources.find((s) => s.source.skillId === 48)!;
    expect(extra.source.chance).toBe(35);
    expect(extra.dps).toBe(140);
    expect(result.eligibleAttacksPerSecond).toBe(4);
    expect(simulate(id, 10, Job).result.sources.some((s) => s.source.skillId === 48)).toBe(false);
  });

  it('uses the higher learned level when an item grants Ataque Duplo', () => {
    const { result } = simulate(19189, 11, SuperNovice, { 'Double Attack': 10 });
    expect(result.sources.find((s) => s.source.skillId === 48)?.source.chance).toBe(70);
  });
});
