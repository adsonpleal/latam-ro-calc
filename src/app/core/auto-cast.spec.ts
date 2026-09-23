import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { AtkSkillModel, ClassIDEnum, ShadowChaser } from '../jobs';
import { createMainModel } from '../utils';
import { basicAttackDamageRanges, basicDpsBreakdown, buildAutoCastSimulation, effectiveBasicHitRate, extraHitOutcomeRate, fearBreezeExtraHits, fearBreezeOutcomes } from './auto-cast';
import { Calculator } from './calculator';
import { normalizeSavedModel } from './saved-model';
import { decodeBuild, encodeBuild } from './share-codec';
import { ITEM_AUTO_CAST_SKILLS } from '../skills/item-auto-cast-skills';
import { ITEM_CLASS_AUTO_CAST_SKILLS } from '../skills/item-class-auto-cast-skills';
import { SKILL_ID_BY_NAME } from '../skills';

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
const ITEMS = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8')) as Record<string, any>;

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
  it('accounts for Esconjurar kills on ordinary undead and Lava Flow fixed ticks', () => {
    const price = (skillId: number, skillLevel: number, monster: Record<string, unknown>) => {
      const calc = {
        atkSkills: [], autoCastDefinitions: [],
        resolvedItemAutoCasts: [{
          key: `item-${skillId}`, itemId: 1, itemName: 'Item', skillId, skillLevel,
          chance: 10, trigger: 'physical-hit',
        }],
        status: {}, skillState: { learnedLevel: () => 0 },
        solveAutoCast: () => solved(100),
      } as unknown as Calculator;
      return buildAutoCastSimulation({ calc, model: createMainModel(), hasSelectedEffects: false,
        summary: { ...summary, monster: { hp: 10_000, ...monster } },
      }).sources[0].expectedDamagePerActivation;
    };
    expect(price(77, 5, { race: 'undead', type: 'normal' })).toBe(1090);
    expect(price(77, 5, { race: 'undead', type: 'boss' })).toBe(100);
    expect(price(77, 5, { race: 'plant', type: 'normal' })).toBe(100);
    expect(price(5006, 2, { race: 'plant', type: 'normal' })).toBe(12_100);
  });

  it('uses LATAM skill ratios, size-dependent hits and class-independent rune defaults', () => {
    const byName = new Map(ITEM_AUTO_CAST_SKILLS.map((entry) => [entry.name, entry]));
    const input = (level: number, size: 's' | 'm' | 'l' = 'm') => ({
      skillLevel: level, model: { level: 100 }, status: { totalStr: 90 },
      monster: { data: { size } }, skills: { learnedLevel: () => 0 },
    } as any);
    expect(byName.get('Fire Ball')!.formula(input(1))).toBe(160);
    expect(byName.get('Fire Ball')!.formula(input(10))).toBe(340);
    expect(byName.get('Spread Shot')!.formula(input(1))).toBe(230);
    expect(byName.get('Spread Shot')!.formula(input(10))).toBe(500);
    expect(byName.get('Sonic Blow')!.formula(input(1))).toBe(300);
    expect(byName.get('Thunderstorm')!.totalHit!(input(8))).toBe(8);
    expect(byName.get('Pierce')!.totalHit!(input(5, 's'))).toBe(1);
    expect(byName.get('Pierce')!.totalHit!(input(5, 'm'))).toBe(2);
    expect(byName.get('Pierce')!.totalHit!(input(5, 'l'))).toBe(3);
    expect(byName.get('Storm Blast')!.formula(input(1))).toBe(1500);
    expect(byName.get('Lava Flow')!.formula(input(2))).toBe(550);
  });

  it('resolves all 219 stored item rules even without native class skills', () => {
    const addedIds = new Set(ITEM_AUTO_CAST_SKILLS.map((skill) => SKILL_ID_BY_NAME[skill.name]));
    const promotedIds = new Set(ITEM_CLASS_AUTO_CAST_SKILLS.map((skill) => SKILL_ID_BY_NAME[skill.name]));
    const rules = Object.values(ITEMS).flatMap((item: any) =>
      (item.script?.autoCast ?? []).map((rule: any) => ({ rule, item })),
    );
    expect(rules).toHaveLength(219);
    expect(rules.filter(({ rule }) => addedIds.has(rule.skillId))).toHaveLength(64);
    expect(promotedIds.size).toBe(24);
    expect(rules.filter(({ rule }) => promotedIds.has(rule.skillId))).toHaveLength(64);

    for (const { rule, item } of rules) {
      const seen: AtkSkillModel[] = [];
      const calc = {
        atkSkills: [], autoCastDefinitions: [],
        resolvedItemAutoCasts: [{
          key: `item-${item.id}-${rule.skillId}`, itemId: item.id, itemName: item.name,
          skillId: rule.skillId, skillLevel: 1, chance: 10, trigger: 'physical-attack',
        }],
        status: {},
        skillState: { learnedLevel: () => 0, activeLevel: () => 0, isActive: () => false },
        solveAutoCast: (_selection: string, skill: AtkSkillModel) => {
          seen.push(skill);
          return solved();
        },
      } as unknown as Calculator;
      const result = buildAutoCastSimulation({ calc, model: createMainModel(), summary, hasSelectedEffects: false });
      expect(result.blockedSources, `item ${item.id}, skill ${rule.skillId}`).toEqual([]);
      expect(result.sources, `item ${item.id}, skill ${rule.skillId}`).toHaveLength(1);
      expect(SKILL_ID_BY_NAME[seen[0]?.name], `item ${item.id}`).toBe(rule.skillId);
    }
  });

  it('can price the VIT armor Soul Vulcan Strike outside Magus', () => {
    const calc = {
      atkSkills: [],
      autoCastDefinitions: [],
      resolvedItemAutoCasts: [{
        key: 'item-450597-0-5220', itemId: 450597, itemName: 'Armadura Desconhecida VIT',
        skillId: 5220, skillLevel: 1, chance: 10, trigger: 'physical-attack',
      }],
      status: {},
      skillState: { learnedLevel: () => 0, activeLevel: () => 0, isActive: () => false },
      solveAutoCast: (_selection: string, skill: AtkSkillModel) => {
        expect(skill.name).toBe('Soul Vulcan Strike');
        return solved();
      },
    } as unknown as Calculator;
    const result = buildAutoCastSimulation({ calc, model: createMainModel(), summary, hasSelectedEffects: false });
    expect(result.sources).toHaveLength(1);
    expect(result.sources[0].activationsPerSecond).toBeCloseTo(0.4);
    expect(result.blockedSources).toEqual([]);
  });

  it('keeps Terror Violeta 1185 as two independent rules', () => {
    expect(ITEMS[1185].script.autoCast.map((rule) => [rule.skillId, rule.skillLevel, rule.chance])).toEqual([
      [88, ['5'], ['5']],
      [83, ['3'], ['3']],
    ]);
  });

  it('prices each Terror Violeta proc from the same eligible attacks without merging chances', () => {
    const calc = {
      atkSkills: [],
      autoCastDefinitions: [],
      resolvedItemAutoCasts: [
        { key: 'item-1185-0-88', itemId: 1185, itemName: 'Terror Violeta', skillId: 88, skillLevel: 5, chance: 5, trigger: 'physical-hit' },
        { key: 'item-1185-1-83', itemId: 1185, itemName: 'Terror Violeta', skillId: 83, skillLevel: 3, chance: 3, trigger: 'physical-hit' },
      ],
      status: {},
      skillState: { learnedLevel: () => 0, activeLevel: () => 0, isActive: () => false },
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
      autoCastDefinitions: [],
      resolvedItemAutoCasts: [
        { key: 'item-1185-0-88', itemId: 1185, itemName: 'Terror Violeta', skillId: 88, skillLevel: 5, chance: 5, trigger: 'physical-hit' },
        { key: 'item-1185-1-83', itemId: 1185, itemName: 'Terror Violeta', skillId: 83, skillLevel: 3, chance: 3, trigger: 'physical-hit' },
      ],
      status: {},
      skillState: { learnedLevel: () => 0, activeLevel: () => 0, isActive: () => false },
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
      autoCastDefinitions: new ShadowChaser().autoCastDefinitions,
      resolvedItemAutoCasts: [],
      status: {},
      skillState: { learnedLevel: () => 0, activeLevel: () => 0, isActive: () => false },
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
      autoCastDefinitions: new ShadowChaser().autoCastDefinitions,
      resolvedItemAutoCasts: [],
      status: {},
      skillState: {
        learnedLevel: (name: string) => ({ Plagiarism: 10, Reproduce: 10 }[name] ?? 0),
        activeLevel: (name: string) => name === 'Shadow Spell' ? 10 : 0,
        isActive: () => false,
      },
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
