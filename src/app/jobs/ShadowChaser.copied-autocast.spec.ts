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

describe.each([ShadowChaser, AbyssChaser])('%s copied autocasts', (Job) => {
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

  it('requires both a learned copy skill and active Desejo das Sombras', () => {
    expect(simulate(new Job(), 'plagiarism', 85, 0).sources).toEqual([]);
    const unlearned = simulate(new Job(), 'reproduce', 85, 10, 0);
    expect(unlearned.slots).toEqual([]);
    expect(unlearned.sources).toEqual([]);
  });

  it.each([[1, 3, 9], [5, 5, 25], [10, 5, 25]])('casts Esfera d\'Água at a valid level with Desejo das Sombras %i', (shadow, level, hits) => {
    const result = simulate(new Job(), 'plagiarism', 86, shadow);
    const proc = result.sources.find(({ source }) => source.slot === 'plagiarism')!;
    expect(proc.source.skillLevel).toBe(level);
    expect(proc.summary.skillTotalHit).toBe(hits);
    expect(proc.dps).toBeGreaterThan(0);
  });
});
