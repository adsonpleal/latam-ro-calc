import { describe, expect, it } from 'vitest';
import { Ranger, Windhawk } from '../jobs';
import { createMainModel } from '../utils';
import { buildAutoCastSimulation, fearBreezeExtraHits } from './auto-cast';
import { Calculator } from './calculator';

const summary = {
  calc: { hitPerSecs: 4, hitRate: 50 },
  dmg: {
    accuracy: 50, criRateToMonster: 0, basicDps: 400,
    basicMinDamage: 100, basicMaxDamage: 100, criMaxDamage: 140,
  },
  monster: { hp: 10_000 },
  weapon: { rangeType: 'range', typeName: 'bow' },
};

const solved = {
  skillTotalHit: 1, skillDpsInputMin: 1000, skillDpsInputMax: 1000,
  skillDpsInputCriDmg: 1000, skillCriRateToMonster: 0, skillAccuracy: 100,
  skillCanCri: false, skillMinDamage: 1000, skillMaxDamage: 1000,
  skillMinDamageNoCri: 1000, skillMaxDamageNoCri: 1000, requireTxt: '',
};

function preparedClass<T extends Ranger | Windhawk>(cls: T, active: Record<string, number>, passive: Record<string, number>): T {
  const activeSkillIds = cls.activeSkills.map((skill) => active[skill.name] ?? 0);
  const passiveSkillIds = cls.passiveSkills.map((skill) => passive[skill.name] ?? 0);
  cls.setLearnSkills({ activeSkillIds, passiveSkillIds }).getSkillBonusAndName();
  return cls;
}

function fakeCalculator(cls: Ranger | Windhawk, luk: number, con = 0): Calculator {
  return {
    atkSkills: cls.atkSkills,
    autoCastDefinitions: cls.autoCastDefinitions,
    resolvedItemAutoCasts: [],
    skillState: cls.skillState,
    status: { totalLuk: luk, totalCon: con },
    solveAutoCast: () => solved,
  } as unknown as Calculator;
}

describe('Ranger companion controls', () => {
  it('makes bird and Worg mutually exclusive through Windhawk, then allows both on Windhawk', () => {
    const ranger = new Ranger();
    const bird = ranger.activeSkills.find((skill) => skill.name === 'Falconry Mastery')!;
    const wug = ranger.activeSkills.find((skill) => skill.name === 'Wug Mastery')!;
    expect(bird.exclusiveGroup).toBe('ranger_companion');
    expect(wug.exclusiveGroup).toBe('ranger_companion');
    expect(bird.allowCoexistIn).toEqual(['Windhawk']);
    expect(wug.allowCoexistIn).toEqual(['Windhawk']);
  });

  it('offers the three auto-attack skills in Aprenda para ganhar bônus', () => {
    expect(new Ranger().passiveSkills.map((skill) => skill.name)).toEqual(expect.arrayContaining(['Blitz Beat', 'Wug Strike']));
    expect(new Windhawk().passiveSkills.map((skill) => skill.name)).toEqual(expect.arrayContaining(['Blitz Beat', 'Wug Strike', 'Hawk Rush']));
  });

  it('uses a level picker for Disparo Selvagem', () => {
    const fearBreeze = new Ranger().activeSkills.find((skill) => skill.name === 'Fear Breeze')!;

    expect(fearBreeze.inputType).toBe('dropdown');
    expect(fearBreeze.dropdown.map((option) => option.value)).toEqual([0, 5, 4, 3, 2, 1]);
  });
});

describe('Ranger auto-cast sources', () => {
  it('maps Disparo Selvagem totals as N - 1 additional arrows', () => {
    expect([0, 1, 2, 3, 4, 5].map(fearBreezeExtraHits)).toEqual([0, 0.12, 0.12, 0.3, 0.48, 0.6]);
  });

  it('shows Disparo Selvagem separately without creating extra auto-cast triggers', () => {
    const cls = preparedClass(new Ranger(), { 'Fear Breeze': 5 }, {});
    const result = buildAutoCastSimulation({ calc: fakeCalculator(cls, 30), model: createMainModel(), summary, hasSelectedEffects: false });
    expect(result.basicHitsPerAttack).toBe(1);
    expect(result.basicHitsPerSecond).toBe(4);
    expect(result.basicAttackDps).toBe(400);
    const fearBreeze = result.sources.find((source) => source.source.skillId === 2234)!;
    expect(fearBreeze.source.chance).toBe(30);
    expect(fearBreeze.dps).toBeCloseTo(240);
    expect(result.totalDps).toBeCloseTo(640);
    expect(result.eligibleAttacksPerSecond).toBe(2); // still the 4 primary attacks × 50% hit
  });

  it('shows blocked placeholders for missing learned skills and companions', () => {
    const cls = preparedClass(new Windhawk(), {}, {});
    const result = buildAutoCastSimulation({ calc: fakeCalculator(cls, 30, 60), model: createMainModel(), summary, hasSelectedEffects: false });
    expect(result.sources).toHaveLength(0);
    expect(result.blockedSources.map((source) => [source.name, source.reason])).toEqual([
      ['Ataque Aéreo', 'Aprenda Ataque Aéreo · Ative Adestrar Ave'],
      ['Investida de Worg', 'Aprenda Investida de Worg · Ative Adestrar Worg'],
      ['Mergulho Aéreo', 'Aprenda Mergulho Aéreo · Ative Adestrar Ave'],
      ['Disparo Selvagem', 'Selecione o nível de Disparo Selvagem'],
    ]);
  });

  it('uses successful ranged hits for Ataque Aéreo and the SOR ÷ 3 chance', () => {
    const cls = preparedClass(new Ranger(), { 'Falconry Mastery': 1 }, { 'Blitz Beat': 5 });
    const model = createMainModel(); model.jobLevel = 50;
    const result = buildAutoCastSimulation({ calc: fakeCalculator(cls, 30), model, summary, hasSelectedEffects: false });
    const blitz = result.sources.find((source) => source.source.skillId === 129)!;
    expect(blitz.source.chance).toBe(10);
    expect(blitz.source.chanceBreakdown).toEqual([
      { label: 'SOR total', value: '30' },
      { label: 'Fórmula', value: '⌊SOR ÷ 3⌋ = 10%' },
    ]);
    expect(blitz.activationsPerSecond).toBeCloseTo(4 * 0.5 * 0.1);
    expect(blitz.source.skillData?.totalHit).toBe(5);
  });

  it('uses every attack attempt for Investida de Worg, including misses', () => {
    const cls = preparedClass(new Ranger(), { 'Wug Mastery': 1 }, { 'Wug Strike': 5, 'Wug Teeth': 10 });
    const result = buildAutoCastSimulation({ calc: fakeCalculator(cls, 30), model: createMainModel(), summary, hasSelectedEffects: false });
    const wug = result.sources.find((source) => source.source.skillId === 2243)!;
    expect(wug.source.chance).toBe(10);
    expect(wug.source.chanceBreakdown?.at(-1)).toEqual({ label: 'Regra', value: 'Pode ativar mesmo se o ataque errar' });
    expect(wug.activationsPerSecond).toBeCloseTo(4 * 0.1);
  });

  it('applies Mergulho Aéreo chance = CON/3 + CON/5 × Amigo da Natureza/5', () => {
    const cls = preparedClass(new Windhawk(), { 'Falconry Mastery': 1 }, { 'Hawk Rush': 5, 'Nature Friendly': 5 });
    const result = buildAutoCastSimulation({ calc: fakeCalculator(cls, 30, 60), model: createMainModel(), summary, hasSelectedEffects: false });
    const hawk = result.sources.find((source) => source.source.skillId === 5326)!;
    expect(hawk.source.chance).toBe(32);
    expect(hawk.source.chanceBreakdown?.at(-1)).toEqual({ label: 'Chance final', value: '32%' });
    expect(hawk.activationsPerSecond).toBeCloseTo(4 * 0.5 * 0.32);
  });
});

describe('Ranger auto-cast damage formulas', () => {
  it('implements Ataque Aéreo damage per flight', () => {
    const cls = preparedClass(new Ranger(), {}, { 'Steel Crow': 10 });
    const skill = cls.atkSkills.find((entry) => entry.name === 'Blitz Beat')!;
    const damage = skill.customFormula!({
      skillLevel: 5,
      status: { totalAgi: 100, totalDex: 80 },
      skills: cls.skillState,
    } as any);
    expect(damage).toBe(((50 + 8 + 50) * 2 + 60) * 5);
  });

  it('implements Investida de Worg as 200% per level', () => {
    const skill = new Ranger().atkSkills.find((entry) => entry.name === 'Wug Strike')!;
    expect(skill.formula({ skillLevel: 1 } as any)).toBe(200);
    expect(skill.formula({ skillLevel: 5 } as any)).toBe(1000);
  });

  it('adds Presas Afiadas as mastery damage only to Worg skills', () => {
    const cls = preparedClass(new Ranger(), {}, { 'Wug Teeth': 10 });
    expect(cls.getMasteryAtk({ skillName: 'Wug Strike', monster: { race: 'formless' } } as any)).toBe(300);
    expect(cls.getMasteryAtk({ skillName: 'Aimed Bolt', monster: { race: 'formless' } } as any)).toBe(0);
  });
});
