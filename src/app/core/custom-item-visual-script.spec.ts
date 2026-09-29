import { describe, expect, it } from 'vitest';
import { compileVisualItemRule, readVisualItemRule, VisualCondition, VisualItemRule } from './custom-item-visual-script';
import { CUSTOM_ITEM_MIN_ID, validateCustomItems, validateScript } from './custom-items';
import { makeCalculator } from './__tests__/make-calculator';
import { createMainModel } from '../utils/create-main-model';
import { ItemTypeEnum } from '../constants/item-type.enum';

const ARMOR = CUSTOM_ITEM_MIN_ID + 51;
const WEAPON = ARMOR + 1;
const AMMO = ARMOR + 2;
const PARTNER = ARMOR + 3;
const definitions = validateCustomItems([
  { id: ARMOR, name: 'Armadura', kind: 'armor', isRefinable: true, canGrade: true, script: {} },
  { id: WEAPON, name: 'Espada', kind: 'weapon', itemSubTypeId: 257, itemLevel: 4, script: {} },
  { id: AMMO, name: 'Flecha', kind: 'ammo', itemSubTypeId: 1024, script: {} },
  { id: PARTNER, name: 'Acessório', kind: 'accessory', script: {} },
]).items;
const items = Object.fromEntries(definitions.map((item) => [item.id, item]));
function calculator(refine = 7, grade = 'B') {
  const model = { ...createMainModel(), armor: ARMOR, armorRefine: refine, armorGrade: grade,
    weapon: WEAPON, ammo: AMMO, accLeft: PARTNER, str: 100, level: 150 };
  return makeCalculator(items).loadItemFromModel(model)
    .setWeapon({ itemId: WEAPON, refine: 0 })
    .setLearnedSkills(new Map([['Severe Rainstorm', 5]]))
    .setUsedSkillNames(new Set(['Acid Demonstration']));
}
const rule = (conditions: VisualCondition[], value = 10): VisualItemRule => ({ key: 'atk', value, conditions });

describe('custom item visual script', () => {
  it('requires both refine and grade, including threshold boundaries and negative bonuses', () => {
    for (const value of [10, -10]) {
      const result = compileVisualItemRule(rule([{ kind: 'refine', value: 7 }, { kind: 'grade', value: 'B' }], value));
      expect(result.errors).toEqual([]);
      expect(validateScript({ atk: [result.expression!] })).toEqual([]);
      for (const [refine, grade, expected] of [[6, 'B', 0], [7, 'C', 0], [7, 'B', value], [8, 'A', value]] as const) {
        expect(calculator(refine, grade).evaluateItemRule(ItemTypeEnum.armor, result.expression!, refine).value).toBe(expected);
      }
    }
  });

  const gates: VisualCondition[] = [
    { kind: 'refine', value: 7 }, { kind: 'grade', value: 'B' }, { kind: 'level', value: 100 },
    { kind: 'equip', value: PARTNER }, { kind: 'class', value: 'RuneKnight' },
    { kind: 'skill', value: 2418, extra: 5 }, { kind: 'activeSkill', value: 490 },
    { kind: 'loyalty', value: 4 }, { kind: 'weaponType', value: 'sword' },
    { kind: 'ammoType', value: 1024 }, { kind: 'position', value: 'armor' },
    { kind: 'spawn', value: 'x' }, { kind: 'until', value: '2099-12-31' },
  ];
  it('evaluates every pair of supported gates independently of the order they were added', () => {
    const calc = calculator();
    for (const first of gates) for (const second of gates) {
      if (first.kind === second.kind) continue;
      const result = compileVisualItemRule(rule([first, second]));
      expect(result.errors, `${first.kind} + ${second.kind}`).toEqual([]);
      expect(calc.evaluateItemRule(ItemTypeEnum.armor, result.expression!, 7).value, result.expression).toBe(10);
    }
  });

  it('combines gates with refine scaling, attribute scaling, or an attribute threshold', () => {
    const calc = calculator();
    const tails: [VisualCondition, number][] = [
      [{ kind: 'refineStep', value: 2 }, 30],
      [{ kind: 'stat', value: 'str', extra: 10 }, 100],
      [{ kind: 'statMin', value: 'str', extra: 80 }, 10],
    ];
    for (const gate of gates) for (const [tail, expected] of tails) {
      const result = compileVisualItemRule(rule([tail, gate]));
      expect(result.errors).toEqual([]);
      expect(validateScript({ atk: [result.expression!] }), result.expression).toEqual([]);
      expect(calc.evaluateItemRule(ItemTypeEnum.armor, result.expression!, 7).value, result.expression).toBe(expected);
    }
  });

  it('requires all equipped-item conditions instead of overwriting a previous one', () => {
    const result = compileVisualItemRule(rule([{ kind: 'equip', value: PARTNER }, { kind: 'equip', value: WEAPON }]));
    expect(calculator().evaluateItemRule(ItemTypeEnum.armor, result.expression!, 7).value).toBe(10);
    const missing = compileVisualItemRule(rule([{ kind: 'equip', value: PARTNER }, { kind: 'equip', value: 999999 }]));
    expect(calculator().evaluateItemRule(ItemTypeEnum.armor, missing.expression!, 7).value).toBe(0);
  });

  it('requires every gate in a complete condition chain', () => {
    const calc = calculator();
    const result = compileVisualItemRule(rule(gates));
    expect(calc.evaluateItemRule(ItemTypeEnum.armor, result.expression!, 7).value).toBe(10);
    const failingValues: Partial<Record<VisualCondition['kind'], string | number>> = {
      refine: 8, grade: 'A', level: 151, equip: 999999, class: 'Mechanic', activeSkill: 2008,
      weaponType: 'bow', ammoType: 1025, position: 'weapon', spawn: 'another_map', until: '2000-01-01',
    };
    for (const [kind, value] of Object.entries(failingValues)) {
      const changed = gates.map((gate) => gate.kind === kind ? { ...gate, value } : gate);
      const failed = compileVisualItemRule(rule(changed));
      expect(failed.errors).toEqual([]);
      expect(calc.evaluateItemRule(ItemTypeEnum.armor, failed.expression!, 7).value, kind).toBe(0);
    }
    const learned = compileVisualItemRule(rule(gates.map((gate) => gate.kind === 'skill' ? { ...gate, extra: 6 } : gate)));
    expect(calc.evaluateItemRule(ItemTypeEnum.armor, learned.expression!, 7).value).toBe(0);
  });

  it.each(['10', '7===5', 'GRADE[me==B]REFINE[7]===-10', 'REFINE[7]2---5', 'str:10---2',
    'SKILL_ID2[2418==5]GRADE[me==B]7===10', `EQUIP_ID[${WEAPON}&&${PARTNER}]10`])('round trips %s without normalizing untouched scripts', (expression) => {
    const parsed = readVisualItemRule('atk', expression);
    expect(parsed.readOnly).not.toBe(true);
    expect(compileVisualItemRule(parsed)).toEqual({ expression, errors: [] });
  });

  it.each(['GRADE[me==A]REFINE[weapon,headUpper==2]---5', 'EQUIP_ID[1101||1102]10', 'level:1(1-125)---1',
    'SKILL_ID[4==2]---1', 'USED[Mage||Archer]5', 'SKILL_ID[2418==5]GRADE[me==B]10'])('preserves advanced expression %s as read-only', (expression) => {
    const parsed = readVisualItemRule('atk', expression);
    expect(parsed.readOnly).toBe(true);
    expect(compileVisualItemRule(parsed)).toEqual({ expression, errors: [] });
  });

  it('rejects unfinished conditions and combinations the engine cannot calculate faithfully', () => {
    for (const conditions of [
      [{ kind: 'refine', value: null }],
      [{ kind: 'refineStep', value: 0 }],
      [{ kind: 'skill', value: 2418, extra: null }],
      [{ kind: 'refineStep', value: 2 }, { kind: 'stat', value: 'str', extra: 10 }],
      [{ kind: 'level', value: 100 }, { kind: 'level', value: 150 }],
      [{ kind: 'until', value: '2026-02-30' }],
    ] as VisualCondition[][]) {
      const result = compileVisualItemRule(rule(conditions));
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.expression).toBeUndefined();
    }
  });
});
