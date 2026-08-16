import { readFileSync } from 'node:fs';
import { EnchantTable } from 'src/app/constants/enchant_item/_enchant_table';
import { RuneKnight } from 'src/app/jobs';
import { createMainModel } from 'src/app/utils';
import { Calculator } from '../calculator';

/**
 * The August 2026 tracker backlog, one describe per card.
 *
 * Every number here comes from the item's own pt-BR description, except the two enchant
 * pools, whose tables the client does not ship — those are browiki's
 * (Equipamento Excelion and Cavernas Ilusionais), cited where they are used.
 */

const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));

const WEAPON = 1201; // Knife [3] — inert host so the calculator has something equipped

const monster = {
  id: 1002, name: 'Poring', spawn: 'x',
  stats: { level: 1, health: 50, attack: { min: 7, max: 8 }, range: 1, defense: 0, magicDefense: 0, str: 1, int: 0, vit: 1, dex: 6, agi: 1, luk: 30, element: 1, elementName: 'Water', elementShortName: 'W1', race: 4, raceName: 'Plant', scale: 0, scaleName: 'Small', class: 0, criShield: 0, softDef: 0, mdef: 0, softMdef: 0, res: 0, mres: 0 },
  data: { def: 0, mdef: 0, criShield: 0, softDef: 0, res: 0, mres: 0 },
} as any;

type Slots = Partial<Record<'headLower' | 'accLeft' | 'accRight' | 'shield' | 'boot', number>>;

function totals(equip: Slots, opts: { level?: number; str?: number; luk?: number; } = {}): Record<string, number> {
  const { level = 200, str = 1, luk = 1 } = opts;

  const items: any = { [WEAPON]: { ...db[WEAPON], itemTypeId: 1, itemSubTypeId: 256 } };
  for (const id of Object.values(equip)) items[id] = { ...db[id] };

  const cls = new RuneKnight();
  cls.setLearnSkills({ activeSkillIds: [], passiveSkillIds: [] }).getSkillBonusAndName();
  const calc = new Calculator();
  calc
    .setMasterItems(items)
    .setHpSpTable([{ jobs: {}, baseHp: Array(251).fill(1000), baseSp: Array(251).fill(100) }] as any)
    .setClass(cls)
    .setMonster(monster);

  const model = createMainModel();
  model.level = level;
  model.str = str;
  model.luk = luk;
  model.weapon = WEAPON;
  Object.assign(model, equip);

  calc.loadItemFromModel(model).prepareAllItemBonus();

  return (calc as any).totalEquipStatus as Record<string, number>;
}

const enchantsOf = (aegisName: string) => EnchantTable.find((row) => row.name === aegisName)?.enchants;

describe('Carta Mosca Caçadora (4115) reaches the weapon-card list', () => {
  it('sits at the weapon card position', () => {
    // CardPosition.Weapon is 0. The record carried 2 — the Aegis right-hand bitmask — which
    // matches no branch of the card router, so the card landed in no picker at all.
    expect(db[4115].itemTypeId).toBe(6);
    expect(db[4115].compositionPos).toBe(0);
  });
});

describe('Amuleto Oriental (490150) and Ocidental (490151)', () => {
  it('are in the database, one per accessory side', () => {
    expect(db[490150].itemSubTypeId).toBe(511); // Aces. Esquerdo
    expect(db[490151].itemSubTypeId).toBe(510); // Aces. Direito
    expect(db[490150].slots).toBe(1);
    expect(db[490151].slots).toBe(1);
  });

  it('each grants "Dano físico e mágico +5%"', () => {
    const left = totals({ accLeft: 490150 });
    expect(left['atkPercent']).toBe(5);
    expect(left['matkPercent']).toBe(5);

    const right = totals({ accRight: 490151 });
    expect(right['atkPercent']).toBe(5);
    expect(right['matkPercent']).toBe(5);
  });

  it('stacks when both sides are worn', () => {
    const both = totals({ accLeft: 490150, accRight: 490151 });
    expect(both['atkPercent']).toBe(10);
    expect(both['matkPercent']).toBe(10);
  });
});

describe('Cachecol Físico de Schmidt (420748) — the set clauses', () => {
  const BRASAO_STR = 32228;
  const BRASAO_LUK = 32230;

  it('nullifies the weapon size penalty with the Brasão FOR at base FOR 125', () => {
    expect(totals({ headLower: 420748, accLeft: BRASAO_STR }, { str: 125 })['ignore_size_penalty']).toBe(1);
  });

  it('does not nullify it below FOR 125, nor without the Brasão', () => {
    expect(totals({ headLower: 420748, accLeft: BRASAO_STR }, { str: 124 })['ignore_size_penalty'] ?? 0).toBe(0);
    expect(totals({ headLower: 420748 }, { str: 200 })['ignore_size_penalty'] ?? 0).toBe(0);
  });

  it('keeps the flat halves of the two sets — perfect hit +25 (FOR) and ATQ +25 (SOR)', () => {
    // perfectHit starts at the engine's DEFAULT_PERFECT_HIT of 5.
    expect(totals({ headLower: 420748, accLeft: BRASAO_STR })['perfectHit']).toBe(30);
    expect(totals({ headLower: 420748, accLeft: BRASAO_LUK })['atk']).toBe(25);
  });

  it('adds melee +10% with the Brasão SOR at base SOR 125', () => {
    expect(totals({ headLower: 420748, accLeft: BRASAO_LUK }, { luk: 125 })['melee']).toBe(10);
    expect(totals({ headLower: 420748, accLeft: BRASAO_LUK }, { luk: 124 })['melee'] ?? 0).toBe(0);
  });
});

describe('Escudo Excelion (28941) — LATAM effects, not the Thai record', () => {
  it('gives variable cast -10% at any level', () => {
    expect(totals({ shield: 28941 }, { level: 100 })['vct']).toBe(10);
  });

  it('gives after-cast delay -5% only from base level 130', () => {
    expect(totals({ shield: 28941 }, { level: 130 })['acd']).toBe(5);
    expect(totals({ shield: 28941 }, { level: 129 })['acd'] ?? 0).toBe(0);
  });

  it('no longer carries the Thai item\'s MDEF and HP/SP percentages', () => {
    const bonus = totals({ shield: 28941 }, { level: 200 });
    expect(bonus['mdef'] ?? 0).toBe(0);
    expect(bonus['hpPercent'] ?? 0).toBe(0);
    expect(bonus['spPercent'] ?? 0).toBe(0);
  });

  it('carries the LATAM DEF and weight', () => {
    expect(db[28941].defense).toBe(50);
    expect(db[28941].weight).toBe(100);
  });
});

describe('Excelion diagrams reach the shield and the boot', () => {
  // browiki, Equipamento Excelion: the four pieces take 3 diagrams each, but A-ESQV is
  // the Colete's and the Motor's alone, and A-FOR / A-INT only the Colete's.
  const shieldAndBoot = ['Reactor_A_DEF', 'Reactor_A_ATK', 'Reactor_A_MATK', 'Reactor_A_MHP', 'Reactor_A_MSP', 'Reactor_A_ASPD'];

  it.each(['Excelion_Shield', 'Excelion_Boots'])('offers three diagram slots on %s', (aegisName) => {
    const enchants = enchantsOf(aegisName);

    expect(enchants).toBeDefined();
    expect(enchants[0]).toBeNull();
    for (const slot of enchants.slice(1)) expect(slot).toEqual(shieldAndBoot);
  });

  it('keeps A-ESQV off the shield and the boot, and on the Colete and the Motor', () => {
    for (const aegisName of ['Excelion_Shield', 'Excelion_Boots']) {
      expect(enchantsOf(aegisName)[1]).not.toContain('Reactor_A_AVOI');
    }
    for (const aegisName of ['Excelion_Suit', 'Excelion_Wing']) {
      expect(enchantsOf(aegisName)[1]).toContain('Reactor_A_AVOI');
    }
  });

  it('keeps A-FOR and A-INT to the Colete', () => {
    expect(enchantsOf('Excelion_Suit')[1]).toContain('Reactor_A_STR');
    expect(enchantsOf('Excelion_Wing')[1]).not.toContain('Reactor_A_STR');
  });
});

describe('Illusion Caverns equipment enchants', () => {
  // browiki, Cavernas Ilusionais § Encantamentos Ilusionais: both slots roll off one table,
  // and equipment rolls FOR/VIT/INT/SOR — AGI and DES are the accessory table's.
  const ilEquipment = [
    'Headband_Of_Power_IL', 'Apple_Of_Archer_IL', 'Fancy_Flower_IL', 'Goibne_Helmet_IL',
    'Herald_Of_GOD_IL', 'Morpheus_Hood_IL', 'Boots_IL', 'Shoes_IL', 'Muffler_IL',
    'Siver_Guard_IL', 'Sprint_Mail_IL', 'Sprint_Shoes_IL',
  ];

  it.each(ilEquipment)('rolls both slots of %s off the same pool', (aegisName) => {
    const enchants = enchantsOf(aegisName);

    expect(enchants).toBeDefined();
    expect(enchants[2]).toBe(enchants[3]);
  });

  it.each(ilEquipment)('offers FOR, VIT, INT and SOR in both slots of %s — but not AGI or DES', (aegisName) => {
    for (const slot of enchantsOf(aegisName).slice(2)) {
      expect(slot).toEqual(expect.arrayContaining(['Strength1', 'Strength4', 'Vitality1', 'Inteligence1', 'Luck1']));
      expect(slot).not.toContain('Agility1');
      expect(slot).not.toContain('Dexterity1');
    }
  });

  it('leaves the accessories rolling the accessory table, AGI and DES included', () => {
    for (const aegisName of ['Sprint_Glove_IL', 'Sprint_Ring_IL']) {
      expect(enchantsOf(aegisName)[2]).toContain('Agility1');
      expect(enchantsOf(aegisName)[2]).toContain('Dexterity1');
    }
  });
});
