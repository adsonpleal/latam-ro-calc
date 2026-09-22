import { describe, expect, it } from 'vitest';
import { AtkSkillModel, ClassIDEnum } from '../jobs';
import { createMainModel } from '../utils';
import { basicAttackDamageRanges, basicDpsBreakdown, buildAutoCastSimulation, effectiveBasicHitRate, extraHitOutcomeRate, fearBreezeExtraHits, fearBreezeOutcomes, VERIFIED_ITEM_AUTO_CASTS } from './auto-cast';
import { Calculator } from './calculator';
import { normalizeSavedModel } from './saved-model';
import { decodeBuild, encodeBuild } from './share-codec';

const solved = (damage = 1000) => ({
  skillTotalHit: 1,
  skillDpsInputMin: damage,
  skillDpsInputMax: damage,
  skillDpsInputCriDmg: damage,
  skillCriRateToMonster: 0,
  skillAccuracy: 100,
  skillCanCri: false,
  skillMinDamage: damage,
  skillMaxDamage: damage,
  skillMinDamageNoCri: damage,
  skillMaxDamageNoCri: damage,
  requireTxt: '',
});

const summary = {
  calc: { hitPerSecs: 4, hitRate: 90 },
  dmg: {
    accuracy: 90,
    criRateToMonster: 20,
    basicDps: 500,
    basicMinDamage: 100,
    basicMaxDamage: 120,
    criMaxDamage: 180,
  },
  monster: { hp: 10_000 },
};

describe('auto-cast probability', () => {
  it('resolves critical chance before normal hit chance', () => {
    expect(effectiveBasicHitRate(0, 90)).toBeCloseTo(90);
    expect(effectiveBasicHitRate(20, 90)).toBeCloseTo(92);
    expect(effectiveBasicHitRate(100, 5)).toBe(100);
  });

  it('clamps rates', () => {
    expect(effectiveBasicHitRate(-5, 150)).toBe(100);
    expect(effectiveBasicHitRate(150, 0)).toBe(100);
  });

  it('keeps the displayed CRIT above cap while using only the critical basic-attack outcome', () => {
    const capped = basicAttackDamageRanges({ basicMinDamage: 100, basicMaxDamage: 120, criMinDamage: 180, criMaxDamage: 180 }, 154);

    expect(capped).toEqual([{ kind: 'cri', label: 'crít.', min: 180, max: 180 }]);
  });

  it('explains the basic DPS as the same weighted critical mean used by Batalha', () => {
    const breakdown = basicDpsBreakdown({ min: 100, max: 200, criDmg: 300, criRate: 40, accuracy: 50, hitsPerSec: 2 });

    expect(breakdown).toMatchObject({
      avgBasicDamage: 150,
      criDmg: 300,
      criRate: 40,
      accuracy: 50,
      criPart: 120,
      noCriPart: 45,
      totalDamage: 165,
      hitsPerSec: 2,
    });
  });

  it('keeps each Fear Breeze arrow-count outcome separate when pricing extra hits', () => {
    const outcomes = fearBreezeOutcomes(5);

    expect(outcomes).toEqual([
      { totalHits: 2, chance: 0.12 },
      { totalHits: 3, chance: 0.09 },
      { totalHits: 4, chance: 0.06 },
      { totalHits: 5, chance: 0.03 },
    ]);
    expect(fearBreezeExtraHits(5)).toBeCloseTo(0.6);
    expect(extraHitOutcomeRate(1.79, outcomes)).toBeCloseTo(1.074);
  });
});

describe('verified item auto-casts', () => {
  it('keeps Terror Violeta 1185 as two independent rules', () => {
    expect(VERIFIED_ITEM_AUTO_CASTS[1185].map((rule) => [rule.skillId, rule.skillLevel, rule.chance, rule.roll])).toEqual([
      [88, 5, 5, 'independent'],
      [83, 3, 3, 'independent'],
    ]);
  });

  it('prices each Terror Violeta proc from the same eligible attacks without merging chances', () => {
    const calc = {
      atkSkills: [],
      skillState: { learnedLevel: () => 0, activeLevel: () => 0, isActive: () => false },
      equippedItems: [{ id: 1185, name: 'Terror Violeta' }],
      solveAutoCast: () => solved(),
    } as unknown as Calculator;
    const result = buildAutoCastSimulation({ calc, model: createMainModel(), summary, hasSelectedEffects: false });

    expect(result.effectiveHitRate).toBeCloseTo(92);
    expect(result.eligibleAttacksPerSecond).toBeCloseTo(3.68);
    expect(result.sources.map((source) => source.activationsPerSecond)).toEqual([
      expect.closeTo(0.184),
      expect.closeTo(0.1104),
    ]);
    expect(result.autoCastDps).toBeCloseTo(294.4);
    expect(result.totalDps).toBeCloseTo(794.4);
    expect(result.timeToKillSeconds).toBeCloseTo(10_000 / 794.4);
  });

  it('shows only the critical outcome for an auto-cast at or above 100% CRIT', () => {
    const calc = {
      atkSkills: [],
      skillState: { learnedLevel: () => 0, activeLevel: () => 0, isActive: () => false },
      equippedItems: [{ id: 1185, name: 'Terror Violeta' }],
      solveAutoCast: () => ({
        ...solved(), skillCanCri: true, skillCriRateToMonster: 154,
        skillMinDamage: 180, skillMaxDamage: 180,
        skillMinDamageNoCri: 100, skillMaxDamageNoCri: 120,
      }),
    } as unknown as Calculator;
    const cappedSummary = { ...summary, dmg: { ...summary.dmg, criRateToMonster: 154, criMinDamage: 180 } };
    const result = buildAutoCastSimulation({ calc, model: createMainModel(), summary: cappedSummary, hasSelectedEffects: false });

    expect(result.criticalRate).toBe(154);
    expect(result.effectiveHitRate).toBe(100);
    expect(result.sources[0].criticalRate).toBe(154);
    expect(result.sources[0].damageRanges).toEqual([{ kind: 'cri', label: 'crít.', min: 180, max: 180 }]);
  });
});

describe('configurable auto-casts', () => {
  const skill = (name: string): AtkSkillModel => ({
    name: name as any, label: name, value: `${name}==10`, isMatk: true,
    acd: 0, fct: 0, vct: 0, cd: 0, formula: () => 100,
  });

  it('shows a blocked Desejo das Sombras tile until its level is selected', () => {
    const model = createMainModel();
    model.class = ClassIDEnum.ShadowChaser;
    const calc = {
      atkSkills: [skill('Psychic Wave')],
      skillState: { learnedLevel: () => 0, activeLevel: () => 0, isActive: () => false },
      equippedItems: [],
      solveAutoCast: () => solved(),
    } as unknown as Calculator;

    const result = buildAutoCastSimulation({ calc, model, summary, hasSelectedEffects: false });
    expect(result.blockedSources).toContainEqual({
      key: 'config-shadow-spell', name: 'Desejo das Sombras', icon: 2286,
      reason: 'Selecione o nível em Habilidades',
    });
  });

  it('keeps Plágio and Mimetismo as independent Desejo das Sombras slots', () => {
    const model = createMainModel();
    model.activeSkillMap['Shadow Spell'] = 10;
    model.passiveSkillMap['Plagiarism'] = 10;
    model.passiveSkillMap['Reproduce'] = 10;
    model.autoCastSelections = { plagiarism: 19, reproduce: 2213 };
    const calc = {
      atkSkills: [skill('Fire Bolt'), skill('Comet')],
      skillState: {
        learnedLevel: (name: string) => ({ Plagiarism: 10, Reproduce: 10 }[name] ?? 0),
        activeLevel: (name: string) => name === 'Shadow Spell' ? 10 : 0,
        isActive: () => false,
      },
      equippedItems: [],
      solveAutoCast: () => solved(2000),
    } as unknown as Calculator;

    const result = buildAutoCastSimulation({ calc, model, summary, hasSelectedEffects: false });
    expect(result.slots.map((slot) => slot.key)).toEqual(['plagiarism', 'reproduce']);
    expect(result.sources.map((source) => [source.source.slot, source.source.chance, source.source.skillLevel])).toEqual([
      ['plagiarism', 15, 7],
      ['reproduce', 15, 7],
    ]);
  });

  it('persists independent slot ids through saved-model normalization', () => {
    const normalized = normalizeSavedModel({ autoCastSelections: { plagiarism: 19, reproduce: 2213 } });
    expect(normalized.autoCastSelections).toEqual({ plagiarism: 19, reproduce: 2213 });
  });

  it('round-trips slot ids through a share token', () => {
    const token = encodeBuild({ class: 4079, level: 200, jobLevel: 70, autoCastSelections: { plagiarism: 19, reproduce: 2213 } });
    expect(decodeBuild(token)?.autoCastSelections).toEqual({ plagiarism: 19, reproduce: 2213 });
  });
});
