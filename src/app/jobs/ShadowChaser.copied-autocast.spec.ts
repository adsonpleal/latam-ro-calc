import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildAutoCastSimulation } from '../core/auto-cast';
import { Calculator } from '../core/calculator';
import { CalculatorController } from '../core/calculator-controller';
import { AutoCastSlotKey } from '../models/auto-cast.model';
import { createMainModel } from '../utils';
import { AbyssChaser } from './AbyssChaser';
import { ShadowChaser } from './ShadowChaser';
import { ClassIDEnum } from './_class-name';

// https://issues.latam-tools.com.br/t/ejePiWtWLkOnMatc3IzQ
// https://browiki.org/wiki/Plágio and https://browiki.org/wiki/Mimetismo
// Copyable magic already supported by the engine; Barreira de Fogo and Curar stay out.
const addedSpells = [
  { id: 85, name: 'Ira de Thor' },
  { id: 17, name: 'Bolas de Fogo' },
  { id: 15, name: 'Rajada Congelante' },
  { id: 13, name: 'Espíritos Anciões' },
  { id: 11, name: 'Ataque Espiritual' },
  { id: 21, name: 'Tempestade de Raios' },
  { id: 80, name: 'Coluna de Fogo' },
  { id: 81, name: 'Supernova' },
  { id: 86, name: "Esfera d'Água" },
];
const monsters = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));
const monster = { ...monsters[21067], id: 21067 }; // Neutral training dummy.
const slots: AutoCastSlotKey[] = ['plagiarism', 'reproduce'];

function simulate(cls: ShadowChaser, slot: AutoCastSlotKey, skillId: number, shadowLevel = 10, copyLevel = 10) {
  const model = createMainModel();
  Object.assign(model, {
    class: cls instanceof AbyssChaser ? ClassIDEnum.AbyssChaser : ClassIDEnum.ShadowChaser,
    level: 200, jobLevel: 70, int: 130, dex: 100, agi: 100,
    autoCastSelections: { [slot]: skillId },
  });
  const { equipAtks, masteryAtks, activeSkillNames, learnedSkillMap } = cls
    .setLearnSkills({
      activeSkillIds: cls.activeSkills.map(({ name }) => name === 'Shadow Spell' ? shadowLevel : 0),
      passiveSkillIds: cls.passiveSkills.map(({ name }) => ['Plagiarism', 'Reproduce'].includes(name) ? copyLevel : 0),
    })
    .getSkillBonusAndName();
  const calc = new Calculator()
    .setMasterItems({})
    .setHpSpTable([{ jobs: { [cls.className]: true }, baseHp: Array(251).fill(20000), baseSp: Array(251).fill(1500) }] as any)
    .setClass(cls)
    .setMonster(monster)
    .loadItemFromModel(model);
  new CalculatorController().runChain(calc, {
    monster, equipAtks, masteryAtks, activeSkillNames, learnedSkillMap,
    buffEquips: {}, buffMasterys: {}, consumeData: [], aspdPotion: 0,
    extraOptionScripts: [], selectedAtkSkill: '', selectedChances: [], usedHpL: false,
  });
  return buildAutoCastSimulation({ calc, model, summary: calc.getTotalSummary(), hasSelectedEffects: false });
}

describe.each([ShadowChaser, AbyssChaser].map((Job) => ({ name: Job.name, Job })))('$name copied autocasts', ({ Job }) => {
  it.each(slots)('offers and calculates all nine existing spells through %s', (slot) => {
    for (const { id, name } of addedSpells) {
      const result = simulate(new Job(), slot, id);
      expect(result.slots.find(({ key }) => key === slot)?.options).toContainEqual({ label: name, value: id, icon: id });
      const proc = result.sources.find(({ source }) => source.slot === slot);
      expect(proc, name).toBeDefined();
      expect(proc!.name).toBe(name);
      expect(proc!.source).toMatchObject({ skillId: id, skillLevel: id === 86 ? 5 : 7, chance: 15, trigger: 'physical-hit' });
      expect(Number.isFinite(proc!.dps), name).toBe(true);
      expect(proc!.dps, name).toBeGreaterThan(0);
    }
  });

  it.each(slots)('rejects excluded, physical, hybrid and non-copyable spells in %s', (slot) => {
    // Fire Wall, Heal, Bash, Grand Cross, Napalm Vulcan (transclass), Abyss Square (4th).
    for (const id of [18, 28, 5, 254, 400, 5321]) {
      const result = simulate(new Job(), slot, id);
      expect(result.slots.find(({ key }) => key === slot)?.options.some(({ value }) => value === id)).toBe(false);
      expect(result.sources.filter(({ source }) => source.slot === slot)).toEqual([]);
    }
  });

  it.each(slots)('rejects third-class spells, including saved selections, in %s', (slot) => {
    // https://browiki.org/wiki/Desejo_das_Sombras#Notas
    // These were previously allowed through Mimetismo despite being ineligible for Shadow Spell.
    for (const id of [2213, 2211, 2204, 2202, 2214, 2216, 2203, 2212, 2210, 2449]) {
      const result = simulate(new Job(), slot, id);
      expect(result.slots.find(({ key }) => key === slot)?.options.some(({ value }) => value === id), `skill ${id}`).toBe(false);
      expect(result.sources.filter(({ source }) => source.slot === slot), `skill ${id}`).toEqual([]);
    }
  });

  it.each(slots)('caps Ira de Thor by the copied level and Desejo das Sombras in %s', (slot) => {
    for (const [shadow, copied, expected] of [[10, 1, 1], [10, 5, 5], [10, 7, 7], [10, 10, 7], [1, 10, 3]]) {
      const result = simulate(new Job(), slot, 85, shadow, copied);
      const proc = result.sources.find(({ source }) => source.slot === slot)!;
      expect(proc.source.skillLevel, `Desejo ${shadow}, copied ${copied}`).toBe(expected);
      expect(proc.dps).toBeGreaterThan(0);
    }
  });

  it.each([0, 10])('keeps Gemini Lumen as its own effect with Desejo das Sombras %i', (shadow) => {
    const result = simulate(new Job(), 'reproduce', 2054, shadow, 5);
    const procs = result.sources.filter(({ source }) => source.slot === 'reproduce');
    expect(procs).toHaveLength(2);
    expect(procs.map(({ source }) => source.skillData?.isMatk)).toEqual([false, true]);
    for (const proc of procs) {
      expect(proc.source).toMatchObject({ skillLevel: 5, chance: 20, trigger: 'melee-physical-hit' });
      expect(proc.dps).toBeGreaterThan(0);
    }
  });

  it('requires both a learned copy skill and active Desejo das Sombras', () => {
    expect(simulate(new Job(), 'plagiarism', 85, 0).sources).toEqual([]);
    const unlearned = simulate(new Job(), 'reproduce', 85, 10, 0);
    expect(unlearned.slots).toEqual([]);
    expect(unlearned.sources).toEqual([]);
  });

  it.each(slots)('caps Esfera d\'Água by all three level limits in %s', (slot) => {
    for (const [shadow, copied, level, hits] of [[10, 1, 1, 1], [10, 2, 2, 9], [1, 10, 3, 9], [5, 10, 5, 25], [10, 10, 5, 25]]) {
      const result = simulate(new Job(), slot, 86, shadow, copied);
      const proc = result.sources.find(({ source }) => source.slot === slot)!;
      expect(proc.source.skillLevel).toBe(level);
      expect(proc.summary.skillTotalHit).toBe(hits);
      expect(proc.dps).toBeGreaterThan(0);
    }
  });
});
