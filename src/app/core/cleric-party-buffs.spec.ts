import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { JobBuffs } from '../constants/job-buffs';
import { ArchBishop } from '../jobs/ArchBishop';
import { Cardinal } from '../jobs/Cardinal';
import { collectBuffBonuses } from './calculator-controller';
import { DamageCalculator } from './damage-calculator';
import { HpSpCalculator } from './hp-sp-calculator';

const names = ['Argutus Telum', 'Argutus Vita', 'Presens Acies', 'Laudaagnus', 'Lauda Ramus'];
const defs = names.map((name) => JobBuffs.find((buff) => buff.name === name)!);
const hpSpTable = JSON.parse(readFileSync('src/assets/demo/data/hp_sp_table.json', 'utf8'));

function selfBonus(cls: ArchBishop, levels: Record<string, number>, learned: Record<string, number> = {}) {
  return cls.setLearnSkills({
    activeSkillIds: cls.activeSkills.map((skill) => levels[skill.name] ?? 0),
    passiveSkillIds: cls.passiveSkills.map((skill) => learned[skill.name] ?? 0),
  }).getSkillBonusAndName();
}

function defense(bonus: Record<string, number>) {
  const calc: any = new DamageCalculator();
  calc.monster = { data: { def: 0, softDef: 0, res: 500, mdef: 0, softMDef: 0, mres: 500 }, race: 'formless', type: 'normal' };
  calc.totalBonus = { monster_res: 0, monster_mres: 0, p_pene_race_all: 0, p_pene_class_all: 0, m_pene_race_all: 0, m_pene_class_all: 0, pene_res: 0, pene_mres: 0, ...bonus };
  return { physical: calc.getPhisicalDefData().resReduction, magical: calc.getMagicalDefData().mresReduction };
}

describe('Ted — cleric support buffs', () => {
  it.each([
    ['Argutus Telum', 'pene_res', [5, 10, 15, 20, 25]],
    ['Argutus Vita', 'pene_mres', [5, 10, 15, 20, 25]],
    ['Presens Acies', 'cRate', [2, 4, 6, 8, 10]],
    ['Laudaagnus', 'hpPercent', [4, 6, 8, 10]],
    ['Lauda Ramus', 'criDmg', [5, 10, 15, 20]],
  ] as const)('%s offers the client/bROWiki level table', (name, key, amounts) => {
    const def = defs.find((buff) => buff.name === name)!;
    expect(def.inputType).toBe('dropdown');
    expect(def.dropdown.find((option) => !option.isUse)?.value).toBe(0);
    for (const [i, amount] of amounts.entries()) {
      expect(def.dropdown.find((option) => option.value === i + 1)?.bonus).toEqual({ [key]: amount });
    }
  });

  it('Argutus affects the corresponding defense and stacks with gear up to the 50% cap', () => {
    const party = collectBuffBonuses(defs, [1, 3, 0, 0, 0], new Set()).equipAtk;
    const telum = defense(party['Argutus Telum']);
    const vita = defense(party['Argutus Vita']);
    expect(telum.physical).toBeCloseTo(1 - 0.8 * 475 / 875, 10);
    expect(telum.magical).toBeCloseTo(1 - 0.8 * 500 / 900, 10);
    expect(vita.magical).toBeCloseTo(1 - 0.8 * 425 / 825, 10);
    expect(vita.physical).toBeCloseTo(1 - 0.8 * 500 / 900, 10);
    expect(defense({ pene_res: 70, pene_mres: 70 })).toEqual(defense({ pene_res: 50, pene_mres: 50 }));
  });

  it('keeps Presens Acies T.CRIT separate from Lauda Ramus critical damage', () => {
    const party = collectBuffBonuses(defs, [0, 0, 3, 0, 4], new Set()).equipAtk;
    const calc: any = new DamageCalculator();
    calc.model = { crt: 0, pow: 0, spl: 0, con: 0 };
    calc.totalBonus = { pAtk: 0, sMatk: 0, cRate: 0, ...party['Presens Acies'], ...party['Lauda Ramus'] };
    expect(calc.criMultiplier).toBeCloseTo(1.46, 10);
    expect(calc.totalBonus.criDmg).toBe(20);
  });

  it('activates both Laudas for Arcebispo and inherits them with Argutus/Presens on Cardeal', () => {
    const ab = selfBonus(new ArchBishop(), { Laudaagnus: 4, 'Lauda Ramus': 2 });
    expect(ab.equipAtks).toMatchObject({ Laudaagnus: { hpPercent: 10 }, 'Lauda Ramus': { criDmg: 10 } });
    const card = selfBonus(new Cardinal(), Object.fromEntries(names.map((name) => [name, name.startsWith('Lauda') ? 4 : 5])));
    expect(card.equipAtks).toMatchObject({
      'Argutus Telum': { pene_res: 25 }, 'Argutus Vita': { pene_mres: 25 },
      'Presens Acies': { cRate: 10 }, Laudaagnus: { hpPercent: 10 }, 'Lauda Ramus': { criDmg: 20 },
    });
    expect(collectBuffBonuses(defs, [5, 5, 5, 4, 4], card.activeSkillNames).equipAtk).toEqual({});
  });

  it('learning Lauda Agnus leaves it off; casting it increases HP without changing SP', () => {
    const learned = selfBonus(new ArchBishop(), {}, { Laudaagnus: 4 });
    expect(learned.equipAtks.Laudaagnus).toBeUndefined();
    const bonus = collectBuffBonuses(defs, [0, 0, 0, 4, 0], new Set()).equipAtk.Laudaagnus;
    const hp = (extra: Record<string, number>) => new HpSpCalculator().setHpSpTable(hpSpTable).setClass(new Cardinal())
      .setAllInfo({ model: { level: 240 }, status: { totalVit: 100, totalInt: 100 }, totalBonus: { hp: 0, sp: 0, ...extra }, equipmentBonus: {} } as any)
      .calculate().getTotalSummary();
    const before = hp({});
    const after = hp(bonus);
    expect(before.maxHp).toBeGreaterThan(0);
    expect(after.maxHp).toBe(before.maxHp + Math.floor(before.maxHp * 0.1));
    expect(after.maxSp).toBe(before.maxSp);
  });
});
