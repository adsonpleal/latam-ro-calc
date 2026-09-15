import { describe, expect, it } from 'vitest';
import { SLOTS_BY_KEY } from 'src/app/app-config/equipment-slots';
import { ExtraOptionTable } from 'src/app/constants/extra-option-table';
import { ItemTypeEnum } from 'src/app/constants/item-type.enum';
import { SuperNovice } from 'src/app/jobs';
import { ITEM_DB, wornBonus } from './__tests__/worn-bonus';
import { deriveSlot } from './equipment-slot-derivation';

/**
 * The six Armaduras Desconhecidas (450595-450600) and their two sets.
 *
 * They reached latam-items.json with the 0.1.129 ragassets sync but never got an item.json
 * record, so the armor picker had nothing to offer while the boots and capes of the same
 * family were already there.
 *
 * Shape follows the Temporal armors: own lines at +7/+9/+11, a pair with the Bota
 * Desconhecida whose "Soma dos refinos da Armadura e Bota for 21 ou mais" is
 * `REFINE[armor,boot==21]`, and a three-piece set with a lower headgear and the cape.
 * The description calls the cape "Manto Desconhecido X"; the client names it "Capa
 * Desconhecida X" (Airboat_Manteau_*_LT), so the partner is resolved by aegisName.
 *
 * The VIT armor's three autocasts (Espíritos Ancestrais, Escudo Mágico, Telecinesia) have
 * no key and are left out.
 */

const SETS = {
  FOR: { armor: 450595, boot: 470071, cape: 480926, lower: 420031 }, // Máscara Azulada
  AGI: { armor: 450596, boot: 470076, cape: 480927, lower: 19240 }, // Injeção
  VIT: { armor: 450597, boot: 470073, cape: 480928, lower: 420003 }, // CD Antiquado
  INT: { armor: 450598, boot: 470074, cape: 480929, lower: 420003 }, // CD Antiquado
  DES: { armor: 450599, boot: 470072, cape: 480930, lower: 420030 }, // Pena de Águia
  SOR: { armor: 450600, boot: 470077, cape: 480931, lower: 420076 }, // Coleira de Espinhos
} as const;

type Piece = { armor: number; armorRefine?: number; boot?: number; bootRefine?: number; cape?: number; garmentRefine?: number; lower?: number };

const worn = (p: Piece) =>
  wornBonus({
    armor: p.armor,
    armorRefine: p.armorRefine ?? 0,
    boot: p.boot,
    bootRefine: p.bootRefine,
    garment: p.cape,
    garmentRefine: p.garmentRefine,
    headLower: p.lower,
    cls: new SuperNovice(),
  });

const stat = (t: Record<string, number>, key: string) => t[key] ?? 0;

describe('Armaduras Desconhecidas — structural fields', () => {
  it.each(Object.entries(SETS))('%s is an armor with one card slot and two random options', (_stat, { armor }) => {
    const r = ITEM_DB[armor];
    expect(r, `${armor} missing from item.json`).toBeDefined();
    expect([r.itemTypeId, r.itemSubTypeId, r.location, r.slots, r.defense]).toEqual([2, 513, 'Armor', 1, 120]);
    expect(r.usableClass).toEqual(['all']);
    expect(ExtraOptionTable[r.aegisName]).toBe(2);
    const slot = deriveSlot({ descriptor: SLOTS_BY_KEY.get(ItemTypeEnum.armor)!, item: r, mapEnchant: new Map(), refineList: [], shadowRefineList: [] });
    expect(slot.optionSlots).toBe(2);
  });
});

describe('The refine lines shared by the physical four', () => {
  it.each(['FOR', 'AGI', 'DES', 'SOR'] as const)('%s: ATQ +50, DEF pierce at +7, race at +9, element at +11', (key) => {
    const { armor } = SETS[key];
    const at6 = worn({ armor, armorRefine: 6 });
    const at11 = worn({ armor, armorRefine: 11 });

    expect(stat(at6, 'atk')).toBe(50);
    expect(stat(at6, 'p_pene_race_formless')).toBe(0);
    for (const k of ['p_pene_race_formless', 'p_pene_race_demihuman']) expect(stat(at11, k)).toBe(30);
    for (const k of ['p_race_formless', 'p_race_demihuman', 'p_element_neutral', 'p_element_fire']) expect(stat(at11, k)).toBe(10);
    expect(stat(at11, 'm_pene_race_formless')).toBe(0);
  });

  it('VIT pierces and boosts both physical and magic', () => {
    const at11 = worn({ armor: 450597, armorRefine: 11 });
    for (const k of ['atk', 'matk']) expect(stat(at11, k)).toBe(50);
    for (const k of ['p_pene_race_demihuman', 'm_pene_race_demihuman']) expect(stat(at11, k)).toBe(30);
    for (const k of ['p_element_fire', 'm_element_fire']) expect(stat(at11, k)).toBe(10);
    expect(stat(at11, 'aspdPercent')).toBe(6); // floor(11/3) * 2
  });

  it('INT is magic only', () => {
    const at11 = worn({ armor: 450598, armorRefine: 11 });
    expect(stat(at11, 'matk')).toBe(50);
    expect(stat(at11, 'matkPercent')).toBe(6);
    expect(stat(at11, 'm_pene_race_formless')).toBe(30);
    expect(stat(at11, 'atk')).toBe(0);
    expect(stat(at11, 'p_pene_race_formless')).toBe(0);
  });
});

describe('Conjunto [Bota Desconhecida]', () => {
  it('FOR: Dano físico +10% with the right boot only', () => {
    const alone = worn({ armor: 450595, armorRefine: 9 });
    expect(stat(worn({ armor: 450595, armorRefine: 9, boot: 470071 }), 'atkPercent') - stat(alone, 'atkPercent')).toBe(10);
    expect(stat(worn({ armor: 450595, armorRefine: 9, boot: 470073 }), 'atkPercent')).toBe(stat(alone, 'atkPercent'));
  });

  it('AGI: Velocidade de ataque +1', () => expect(stat(worn({ armor: 450596, boot: 470076 }), 'aspd')).toBe(1));

  it.each(['FOR', 'AGI', 'VIT', 'INT', 'SOR'] as const)('%s: Conjuração fixa -0,5s once armor + boot reach 21', (key) => {
    const { armor, boot } = SETS[key];
    expect(stat(worn({ armor, armorRefine: 11, boot, bootRefine: 9 }), 'fct')).toBe(0);
    expect(stat(worn({ armor, armorRefine: 11, boot, bootRefine: 10 }), 'fct')).toBe(0.5);
  });

  it('DES trades the fixed-cast cut for Precisão perfeita +30', () => {
    const below = worn({ armor: 450599, armorRefine: 11, boot: 470072, bootRefine: 9 });
    const at21 = worn({ armor: 450599, armorRefine: 11, boot: 470072, bootRefine: 10 });
    expect(stat(at21, 'perfectHit') - stat(below, 'perfectHit')).toBe(30);
    expect(stat(at21, 'fct')).toBe(0);
  });

  it('adds the extra 20% pierce at 21, on DEFM too for the magic armors', () => {
    expect(stat(worn({ armor: 450595, armorRefine: 11, boot: 470071, bootRefine: 10 }), 'p_pene_race_demihuman')).toBe(50);
    expect(stat(worn({ armor: 450598, armorRefine: 11, boot: 470074, bootRefine: 10 }), 'm_pene_race_demihuman')).toBe(50);
  });
});

describe('Conjunto [headgear] [Manto Desconhecido]', () => {
  it('needs both the headgear and the cape', () => {
    const { armor, cape, lower } = SETS.FOR;
    const base = stat(worn({ armor }), 'atkPercent');
    expect(stat(worn({ armor, cape }), 'atkPercent')).toBe(base);
    expect(stat(worn({ armor, lower }), 'atkPercent')).toBe(base);
    expect(stat(worn({ armor, cape, lower }), 'atkPercent') - base).toBe(5);
  });

  it('FOR: the refine-sum tiers at 14, 18 and 22', () => {
    const { armor, cape, lower } = SETS.FOR;
    const at = (armorRefine: number, garmentRefine: number) => worn({ armor, armorRefine, cape, garmentRefine, lower });

    // The armor's ATQ has no refine step, so raising it from 13 to 14 total is the tier alone.
    expect(stat(at(8, 6), 'atk') - stat(at(7, 6), 'atk')).toBe(80);
    expect(stat(at(9, 8), 'pAtk')).toBe(0);
    expect(stat(at(9, 9), 'pAtk')).toBe(5);
    expect(stat(at(9, 9), 'acd')).toBe(7);
    // Máscara Azulada carries a melee bonus of its own, so the tier is read as a step.
    expect(stat(at(11, 11), 'melee') - stat(at(11, 10), 'melee')).toBe(10);
  });

  it('INT: Conjuração variável -10% on the set, the 18 tier adds S.ATQM and all-element magic', () => {
    const { armor, cape, lower } = SETS.INT;
    const plain = worn({ armor, cape, lower });
    const at18 = worn({ armor, armorRefine: 9, cape, garmentRefine: 9, lower });
    expect(stat(worn({ armor, cape }), 'vct')).toBe(0);
    expect(stat(plain, 'vct')).toBe(10);
    expect(stat(plain, 'sMatk')).toBe(0);
    expect(stat(at18, 'sMatk')).toBe(5);
    // CD Antiquado carries its own element bonus, so the tier is read as a step.
    const at17 = worn({ armor, armorRefine: 9, cape, garmentRefine: 8, lower });
    expect(stat(at18, 'm_my_element_all') - stat(at17, 'm_my_element_all')).toBe(10);
  });

  it('SOR: T.CRÍT +5 and Dano crítico +12% at 18', () => {
    const { armor, cape, lower } = SETS.SOR;
    const at18 = worn({ armor, armorRefine: 9, cape, garmentRefine: 9, lower });
    expect(stat(at18, 'cRate')).toBe(5);
    expect(stat(at18, 'criDmg') - stat(worn({ armor, armorRefine: 9, cape, garmentRefine: 8, lower }), 'criDmg')).toBe(12);
    expect(stat(at18, 'p_size_all') - stat(worn({ armor, armorRefine: 9, cape, garmentRefine: 9 }), 'p_size_all')).toBe(10);
  });
});
