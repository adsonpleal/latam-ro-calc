import { readFileSync } from 'node:fs';
import { RuneKnight } from 'src/app/jobs';
import { createMainModel } from 'src/app/utils';
import { Calculator } from './calculator';

/**
 * One accessory id whose bonuses depend on which hand it sits in — `POS[accLeft]` /
 * `POS[accRight]`.
 *
 * Reported anonymously (tracker Cuqd4OU0tGQ2D8dQvr0d): 490863 Moeda Lançável applied
 * nothing in either slot. Its record carried `script: {}` while the pt-BR description
 * states two different halves:
 *
 *   Equipado no acessório esquerdo:
 *     Dano físico a distância +7%.   Dano físico corpo a corpo +7%.
 *     Ao derrotar monstros com qualquer ataque: Regenera 100 de HP.
 *   Equipado no acessório direito:
 *     Dano mágico +7%.               Dano mágico de todas as propriedades +7%.
 *     Ao derrotar monstros com qualquer ataque: Regenera 20 de SP.
 *
 * The two "Regenera N ao derrotar" lines are DISPLAY ONLY — `hpRestoreOnKill` /
 * `spRestoreOnKill`, held to the sustain family's terms by healing-stats.spec.ts. The
 * side split is the point of the tests below: the wrong-side keys must stay at zero, or
 * the item pays both halves at once.
 */

const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));

const MOEDA = 490863;

const monster = {
  id: 1002, name: 'Poring', spawn: 'x',
  stats: { level: 1, health: 50, attack: { min: 7, max: 8 }, range: 1, defense: 0, magicDefense: 0, str: 1, int: 0, vit: 1, dex: 6, agi: 1, luk: 30, element: 1, elementName: 'Water', elementShortName: 'W1', race: 4, raceName: 'Plant', scale: 0, scaleName: 'Small', class: 0, criShield: 0, softDef: 0, mdef: 0, softMdef: 0, res: 0, mres: 0 },
  data: { def: 0, mdef: 0, criShield: 0, softDef: 0, res: 0, mres: 0 },
} as any;

function totals(slots: { left?: number; right?: number }): Record<string, number> {
  const items: any = { [MOEDA]: { ...db[MOEDA] } };

  const cls = new RuneKnight();
  cls.setLearnSkills({ activeSkillIds: [], passiveSkillIds: [] }).getSkillBonusAndName();
  const calc = new Calculator();
  calc
    .setMasterItems(items)
    .setHpSpTable([{ jobs: {}, baseHp: Array(251).fill(1000), baseSp: Array(251).fill(100) }] as any)
    .setClass(cls)
    .setMonster(monster);

  const model = createMainModel();
  model.level = 200;
  if (slots.left) { model.accLeft = slots.left; model.accLeftRefine = 0; }
  if (slots.right) { model.accRight = slots.right; model.accRightRefine = 0; }

  calc.loadItemFromModel(model).prepareAllItemBonus();
  return (calc as any).totalEquipStatus as Record<string, number>;
}

const LEFT_KEYS = ['range', 'melee', 'hpRestoreOnKill'];
const RIGHT_KEYS = ['matkPercent', 'm_my_element_all', 'spRestoreOnKill'];
const stat = (t: Record<string, number>, key: string) => t[key] ?? 0;

describe('Moeda Lançável 490863 — the bonuses now apply', () => {
  it('is not scriptless any more', () => {
    expect(Object.keys(db[MOEDA].script)).not.toEqual([]);
  });

  it('stays a both-sides accessory (subtype 517), not a side-locked one', () => {
    // 510/511 would confine the item to one dropdown; this id is offered in both, and
    // the side is decided by POS[...] on each clause instead.
    expect(db[MOEDA].itemSubTypeId).toBe(517);
  });
});

describe('Equipado no acessório esquerdo', () => {
  const left = totals({ left: MOEDA });

  it('pays the physical half', () => {
    expect(stat(left, 'range')).toBe(7);
    expect(stat(left, 'melee')).toBe(7);
    expect(stat(left, 'hpRestoreOnKill')).toBe(100);
  });

  it('pays none of the magic half', () => {
    for (const key of RIGHT_KEYS) expect(stat(left, key), key).toBe(0);
  });
});

describe('Equipado no acessório direito', () => {
  const right = totals({ right: MOEDA });

  it('pays the magic half', () => {
    expect(stat(right, 'matkPercent')).toBe(7);
    expect(stat(right, 'm_my_element_all')).toBe(7);
    expect(stat(right, 'spRestoreOnKill')).toBe(20);
  });

  it('pays none of the physical half', () => {
    for (const key of LEFT_KEYS) expect(stat(right, key), key).toBe(0);
  });
});

describe('One in each hand', () => {
  it('each copy pays only its own side — no double-dipping', () => {
    const both = totals({ left: MOEDA, right: MOEDA });

    expect(stat(both, 'range')).toBe(7);
    expect(stat(both, 'melee')).toBe(7);
    expect(stat(both, 'hpRestoreOnKill')).toBe(100);
    expect(stat(both, 'matkPercent')).toBe(7);
    expect(stat(both, 'm_my_element_all')).toBe(7);
    expect(stat(both, 'spRestoreOnKill')).toBe(20);
  });
});

describe('Wearing nothing', () => {
  it('leaves every key at zero', () => {
    const bare = totals({});
    for (const key of [...LEFT_KEYS, ...RIGHT_KEYS]) expect(stat(bare, key), key).toBe(0);
  });
});
