import { readFileSync } from 'node:fs';
import { RuneKnight } from 'src/app/jobs';
import { createMainModel } from 'src/app/utils';
import { Calculator } from './calculator';

const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));

// Set "Amicitia": Espinho Violeta (20940, garment) + Núcleo Concentrado (490159,
// accessory) + one of the four boosters (all headgear). Values are taken from the
// pt-BR in-game description (source of truth), cross-checked against divine-pride
// LATAM ("Combina com" tab, sets Amicitia1-4 and the six Violet_Halo_* two-piece sets).
//
// Booster ids (divine-pride set membership):
//   19241 Fones Amplificadores (Magical Booster K)  -> Amicitia1 (magic)
//   19245 Fones Danificados    (Crimson Booster)    -> Amicitia2 (ranged)
//   19085 Asas de Sigrún [1]    (Sigrun's Wing_)     -> Amicitia3 (melee)
//   18609 Venda Sombria [1]     (Dark Blinkers)      -> Amicitia4 (global cooldown)
//   5592  Asas de Sigrún        (Sigrun's Wing)      -> Violet_Halo two-piece only
//   5104  Venda Sombria         (Dark Blindfold)     -> Violet_Halo two-piece only

const monster = {
  id: 1002, name: 'Poring', spawn: 'x',
  stats: { level: 1, health: 50, attack: { min: 7, max: 8 }, range: 1, defense: 0, magicDefense: 0, str: 1, int: 0, vit: 1, dex: 6, agi: 1, luk: 30, element: 1, elementName: 'Water', elementShortName: 'W1', race: 4, raceName: 'Plant', scale: 0, scaleName: 'Small', class: 0, criShield: 0, softDef: 0, mdef: 0, softMdef: 0, res: 0, mres: 0 },
  data: { def: 0, mdef: 0, criShield: 0, softDef: 0, res: 0, mres: 0 },
} as any;

function totals(opts: { garmentRefine?: number; partnerId?: number | null; withCore?: boolean }): Record<string, number> {
  const { garmentRefine = 0, partnerId = null, withCore = true } = opts;
  const items: any = { 20940: { ...db['20940'], itemTypeId: 2, itemSubTypeId: 515 } };
  if (withCore) items[490159] = { ...db['490159'], itemTypeId: 2, itemSubTypeId: 517 };
  if (partnerId) items[partnerId] = { ...db[partnerId], itemTypeId: 2, itemSubTypeId: 512 };

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
  model.garment = 20940;
  model.garmentRefine = garmentRefine;
  if (withCore) model.accLeft = 490159;
  if (partnerId) { model.headUpper = partnerId; model.headUpperRefine = 0; }

  calc.loadItemFromModel(model).prepareAllItemBonus();
  return (calc as any).totalEquipStatus as Record<string, number>;
}

const stat = (key: string, opts: Parameters<typeof totals>[0]) => totals(opts)[key] ?? 0;

describe('Espinho Violeta 20940 — two-piece combos (no Núcleo)', () => {
  it('Fones Danificados (Crimson 19245): Dano físico a distância +14% → range 3(base)+14', () => {
    expect(stat('range', { partnerId: 19245, withCore: false })).toBe(17);
  });
  it('Asas de Sigrún [1] (19085): Dano crítico +14% → criDmg 3(base)+14', () => {
    expect(stat('criDmg', { partnerId: 19085, withCore: false })).toBe(17);
  });
  it('Asas de Sigrún non-slotted (5592) also fires the crit-dmg combo', () => {
    expect(stat('criDmg', { partnerId: 5592, withCore: false })).toBe(17);
  });
  it('Fones Amplificadores (Magical 19241): Conjuração variável -30% → vct 30', () => {
    expect(stat('vct', { partnerId: 19241, withCore: false })).toBe(30);
  });
  it('Venda Sombria [1] (18609): Pós-conjuração -6% → acd 6', () => {
    expect(stat('acd', { partnerId: 18609, withCore: false })).toBe(6);
  });
  it('Venda Sombria non-slotted (5104) also fires the cast-delay combo', () => {
    expect(stat('acd', { partnerId: 5104, withCore: false })).toBe(6);
  });
  it('no combo without a partner: range/criDmg stay at base 3, acd/vct at 0', () => {
    const t = totals({ withCore: false });
    expect(t['range']).toBe(3);
    expect(t['criDmg']).toBe(3);
    expect(t['acd']).toBe(0);
    expect(t['vct']).toBe(0);
  });
});

describe('Amicitia1 — Espinho Violeta + Núcleo + Fones Amplificadores (19241)', () => {
  it('magic dmg all-element: +5 at any refine, +5 more at garment +9', () => {
    expect(stat('m_my_element_all', { partnerId: 19241, garmentRefine: 0 })).toBe(5);
    expect(stat('m_my_element_all', { partnerId: 19241, garmentRefine: 9 })).toBe(10);
  });
  it('magic dmg vs boss: +15 only at garment +7', () => {
    expect(stat('m_class_boss', { partnerId: 19241, garmentRefine: 0 })).toBe(0);
    expect(stat('m_class_boss', { partnerId: 19241, garmentRefine: 7 })).toBe(15);
  });
  it('does NOT fire without the booster', () => {
    expect(stat('m_my_element_all', { partnerId: null, garmentRefine: 9 })).toBe(0);
  });
});

describe('Amicitia2 — Espinho Violeta + Núcleo + Fones Danificados (19245)', () => {
  it('crit rate: base 10 (Núcleo) at +0, 20 at garment +7 (combo +10)', () => {
    expect(stat('cri', { partnerId: 19245, garmentRefine: 0 })).toBe(10);
    expect(stat('cri', { partnerId: 19245, garmentRefine: 7 })).toBe(20);
  });
  it('crit-rate combo needs the booster: only base 10 at +7 without it', () => {
    expect(stat('cri', { partnerId: null, garmentRefine: 7 })).toBe(10);
  });
});

describe('Amicitia3 — Espinho Violeta + Núcleo + Asas de Sigrún [1] (19085)', () => {
  it('melee: +5 base, +10 more at garment +9 (total 15)', () => {
    expect(stat('melee', { partnerId: 19085, garmentRefine: 0 })).toBe(5);
    expect(stat('melee', { partnerId: 19085, garmentRefine: 9 })).toBe(15);
  });
  it('perfect hit: +10 only at garment +7 (over the base perfect-hit of 5)', () => {
    expect(stat('perfectHit', { partnerId: 19085, garmentRefine: 0 })).toBe(5);
    expect(stat('perfectHit', { partnerId: 19085, garmentRefine: 7 })).toBe(15);
  });
  it('does NOT fire without the booster (melee 0, perfect hit stays at base 5)', () => {
    expect(stat('melee', { partnerId: null, garmentRefine: 9 })).toBe(0);
    expect(stat('perfectHit', { partnerId: null, garmentRefine: 9 })).toBe(5);
  });
});

describe('Amicitia4 — Espinho Violeta + Núcleo + Venda Sombria [1] (18609)', () => {
  it('phys dmg vs boss: +15 only at garment +7', () => {
    expect(stat('p_class_boss', { partnerId: 18609, garmentRefine: 0 })).toBe(0);
    expect(stat('p_class_boss', { partnerId: 18609, garmentRefine: 7 })).toBe(15);
  });
  it('fixed cast: -0.2s only at garment +9', () => {
    expect(stat('fct', { partnerId: 18609, garmentRefine: 0 })).toBe(0);
    expect(stat('fct', { partnerId: 18609, garmentRefine: 9 })).toBe(0.2);
  });
  it('cast delay: Núcleo combo -5 + Espinho combo -6 = 11 at garment +0', () => {
    expect(stat('acd', { partnerId: 18609, garmentRefine: 0 })).toBe(11);
  });
});
