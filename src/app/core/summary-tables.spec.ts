import { describe, expect, it } from 'vitest';
import {
  buildAtkTypeTable,
  buildElementTable,
  buildMonsterTypeTables,
  buildRaceTables,
  buildSizeTable,
  buildSkillMultiplierTable,
} from './summary-tables';

const row = (rows: any[], name: string) => rows.find((r) => r.name === name);

describe('buildElementTable', () => {
  it('adds the per-element bonus to the all-element bonus and localises the label', () => {
    const table = buildElementTable({ p_element_all: 5, m_element_all: 2, m_my_element_all: 1, p_element_fire: 10, m_my_element_fire: 4 });
    expect(table).toHaveLength(10);

    const fire = row(table, 'Fire');
    expect(fire.displayName).toBe('Fogo'); // pt-BR
    expect(fire.physicalElementToMonster).toBe(15); // 5 + 10
    expect(fire.magicalElementToMonster).toBe(2); // 2 + 0
    expect(fire.myElement).toBe(5); // 1 + 4

    // an element with no specific bonus just gets the all-element value
    expect(row(table, 'Water').physicalElementToMonster).toBe(5);
  });

  it('surfaces target elemental-resistance reductions in their own column (not my-element)', () => {
    // Infecção lowers the target's Poison resistance, Oratio its Holy resistance. They live
    // in elementResistReduction and must NOT bleed into myElement (m_my_element damage %).
    const table = buildElementTable({ infection: 25, oratio: 20, m_my_element_poison: 5 });
    expect(row(table, 'Poison')).toMatchObject({ elementResistReduction: 25, myElement: 5 });
    expect(row(table, 'Holy')).toMatchObject({ elementResistReduction: 20, myElement: 0 });
    expect(row(table, 'Fire').elementResistReduction).toBe(0); // elements with no mapped reduction
  });

  it('stacks both Poison debuffs (Infecção + Intoxicação) in the reduction column', () => {
    const table = buildElementTable({ infection: 25, intoxication: 25 });
    expect(row(table, 'Poison').elementResistReduction).toBe(50); // 25 (Infecção) + 25 (Intoxicação)
  });

  it('surfaces Geladinho (Bitter Cold) as a Water resistance reduction', () => {
    const table = buildElementTable({ bitterCold: 15 });
    expect(row(table, 'Water').elementResistReduction).toBe(15); // Jack Frost Nova's debuff
    expect(row(table, 'Poison').elementResistReduction).toBe(0); // scoped to Water only
  });
});

describe('buildRaceTables', () => {
  it('builds both the race and race-penetration tables', () => {
    const { raceTable, peneRaceTable } = buildRaceTables({ p_race_all: 2, p_race_demon: 8, p_pene_race_demon: 3 });
    expect(raceTable).toHaveLength(10);
    expect(row(raceTable, 'Demon').displayName).toBe('Demônio');
    expect(row(raceTable, 'Demon').physical).toBe(10); // 2 + 8
    expect(row(peneRaceTable, 'Demon').physical).toBe(3); // 0 + 3
  });
});

describe('buildSizeTable', () => {
  it('localises sizes and sums the size bonus', () => {
    const table = buildSizeTable({ p_size_all: 1, p_size_l: 4 });
    expect(table.map((r) => r.name)).toEqual(['Small', 'Medium', 'Large']);
    expect(row(table, 'Large').displayName).toBe('Grande');
    expect(row(table, 'Large').physical).toBe(5);
  });
});

describe('buildMonsterTypeTables', () => {
  it('builds boss/normal class tables with penetration', () => {
    const { classTable, peneClassTable } = buildMonsterTypeTables({ p_class_all: 1, p_class_boss: 9, p_pene_class_boss: 2 });
    expect(classTable.map((r) => r.name)).toEqual(['Boss', 'Normal']);
    expect(row(classTable, 'Boss').displayName).toBe('Chefe');
    expect(row(classTable, 'Boss').physical).toBe(10);
    expect(row(peneClassTable, 'Boss').physical).toBe(2);
  });
});

describe('buildAtkTypeTable', () => {
  it('reads melee/range/matk percentages with pt-BR labels', () => {
    const table = buildAtkTypeTable({ melee: 10, range: 20, matkPercent: 30 });
    expect(table).toEqual([
      { name: 'Melee', displayName: 'Corpo a corpo', value: 10 },
      { name: 'Range', displayName: 'À distância', value: 20 },
      { name: 'MATK', displayName: 'MATK', value: 30 },
    ]);
  });

  it('defaults missing values to 0', () => {
    expect(buildAtkTypeTable({}).map((r) => r.value)).toEqual([0, 0, 0]);
  });
});

describe('buildSkillMultiplierTable', () => {
  const noResolve = () => undefined;

  it('treats capitalised attrs as skill multipliers', () => {
    const table = buildSkillMultiplierTable({ 'Cross Impact': 500, someLowercaseAttr: 1 }, noResolve);
    expect(table).toEqual([{ name: 'Cross Impact', value: 500 }]);
  });

  it('folds cd__<skill> deltas into the matching skill row', () => {
    const table = buildSkillMultiplierTable({ 'Cross Impact': 500, 'cd__Cross Impact': 2 }, noResolve);
    expect(table).toEqual([{ name: 'Cross Impact', value: 500, cd: '-2' }]);
  });

  it('formats a negative cooldown delta as a bonus (+)', () => {
    const table = buildSkillMultiplierTable({ 'cd__Cross Impact': -3 }, noResolve);
    expect(row(table, 'Cross Impact').cd).toBe('+3');
  });

  it('overlays the pt-BR name and icon when the skill resolves', () => {
    const resolve = (name: string) => (name === 'Cross Impact' ? { id: 42, name: 'Impacto Cruzado' } : undefined);
    const table = buildSkillMultiplierTable({ 'Cross Impact': 500 }, resolve);
    expect(table[0]).toMatchObject({ name: 'Cross Impact', displayName: 'Impacto Cruzado', icon: 42 });
  });

  it('attaches the compared build value and unions compare-only skills', () => {
    const table = buildSkillMultiplierTable({ 'Cross Impact': 500 }, noResolve, { 'Cross Impact': 700, 'Rolling Cutter': 300 });
    expect(row(table, 'Cross Impact')).toMatchObject({ value: 500, value2: 700 });
    // a skill only the compared build grants still gets a row (main value absent, compare value set)
    expect(row(table, 'Rolling Cutter')).toMatchObject({ value2: 300 });
    expect(row(table, 'Rolling Cutter').value).toBeUndefined();
  });
});

describe('compare (*2) columns', () => {
  it('buildElementTable attaches per-field compared values', () => {
    const table = buildElementTable({ p_element_fire: 10 }, { p_element_fire: 25 });
    expect(row(table, 'Fire')).toMatchObject({ physicalElementToMonster: 10, physicalElementToMonster2: 25 });
    // no compare arg -> no *2 keys
    expect(row(buildElementTable({ p_element_fire: 10 }), 'Fire').physicalElementToMonster2).toBeUndefined();
  });

  it('buildRaceTables and buildAtkTypeTable attach compared values', () => {
    const { raceTable } = buildRaceTables({ p_race_demon: 8 }, { p_race_demon: 12 });
    expect(row(raceTable, 'Demon')).toMatchObject({ physical: 8, physical2: 12 });

    const atk = buildAtkTypeTable({ melee: 10 }, { melee: 40 });
    expect(atk[0]).toMatchObject({ value: 10, value2: 40 });
  });
});
