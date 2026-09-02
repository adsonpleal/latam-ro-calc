import { createMainModel } from 'src/app/utils';
import { equipStatusOf, makeCalculator } from './__tests__/make-calculator';
import { ITEM_DB } from './__tests__/worn-bonus';

/**
 * The Sombras do Esconderijo (24126-24131) and do Furto (24144-24149).
 *
 * Both families arrived with the 01/09/2026 client update, and the 0.1.97-beta release
 * note said all of them had been picked up. Only four had: the Malha (24126/24144) and
 * the Manopla (24129/24147). The other eight got a pt-BR name in latam-items.json and no
 * record here, so they reached no dropdown at all.
 *
 * Every one of the eight carries the same line — "HP máx. +10 por refino" — which is the
 * `hp: ["1---10"]` the two Malhas already hold. The rest of each description is the
 * [Esconderijo] / [Furto] SP cost (+50, then -5 per refine) and "Habilita [X] nv.1";
 * the engine models damage dealt and has no SP-cost stage, so those stay out, exactly as
 * on the four siblings that predate this.
 */

/** "Posição:" in the description -> the calc's shadow slot, subtype and model field. */
const SLOTS = {
  armor: { itemSubTypeId: 526, location: 'Armor', field: 'shadowArmor' },
  weapon: { itemSubTypeId: 280, location: 'Weapon', field: 'shadowWeapon' },
  shoes: { itemSubTypeId: 528, location: 'Shoes', field: 'shadowBoot' },
  shield: { itemSubTypeId: 527, location: 'Shield', field: 'shadowShield' },
  earring: { itemSubTypeId: 529, location: 'AccessoryRight', field: 'shadowEarring' },
  pendant: { itemSubTypeId: 530, location: 'AccessoryLeft', field: 'shadowPendant' },
} as const;

type Slot = keyof typeof SLOTS;

const HIDING: [Slot, number][] = [
  ['armor', 24126], ['shoes', 24127], ['shield', 24128],
  ['weapon', 24129], ['earring', 24130], ['pendant', 24131],
];
const STEAL: [Slot, number][] = [
  ['armor', 24144], ['shoes', 24145], ['shield', 24146],
  ['weapon', 24147], ['earring', 24148], ['pendant', 24149],
];
const ALL = [...HIDING, ...STEAL];
/** The eight the 01/09/2026 update left out. */
const ADDED = [24127, 24128, 24130, 24131, 24145, 24146, 24148, 24149];

/** Equip one shadow piece at `refine` and read the summed bonus back. */
function worn(slot: Slot, id: number, refine: number): Record<string, number> {
  const { field } = SLOTS[slot];
  const model: any = createMainModel();
  model.level = 200;
  model[field] = id;
  model[`${field}Refine`] = refine;

  return equipStatusOf(makeCalculator({ [id]: ITEM_DB[id] }), model);
}

describe('Both shadow families are complete', () => {
  it.each(ALL)('has a record for the %s piece (%i)', (_slot, id) => {
    expect(ITEM_DB[id], `${id} missing from item.json`).toBeDefined();
  });

  it.each(ALL)('routes the %s piece (%i) to its shadow slot', (slot, id) => {
    const r = ITEM_DB[id];
    expect(r.itemTypeId).toBe(10);
    expect(r.itemSubTypeId).toBe(SLOTS[slot].itemSubTypeId);
    expect(r.location).toBe(SLOTS[slot].location);
    expect(r.slots).toBe(0);
    expect(r.weight).toBe(0);
    expect(r.requiredLevel).toBe(1);
  });
});

describe('HP máx. +10 por refino', () => {
  it.each(ADDED)('%i carries hp 1---10, like the Malha siblings', (id) => {
    expect(ITEM_DB[id].script).toEqual({ hp: ['1---10'] });
  });

  it('matches the two pieces that were already in the DB', () => {
    expect(ITEM_DB[24126].script.hp).toEqual(['1---10']);
    expect(ITEM_DB[24144].script.hp).toEqual(['1---10']);
  });

  it.each(ADDED.map((id) => [ALL.find(([, i]) => i === id)![0], id] as const))(
    'scales through the engine on the %s slot (%i)',
    (slot, id) => {
      expect(worn(slot, id, 0)['hp'] ?? 0).toBe(0);
      expect(worn(slot, id, 7)['hp']).toBe(70);
      expect(worn(slot, id, 10)['hp']).toBe(100);
    },
  );

  it('leaves the [Esconderijo]/[Furto] SP-cost lines unencoded — no SP-cost stage exists', () => {
    for (const id of ADDED) expect(Object.keys(ITEM_DB[id].script)).toEqual(['hp']);
  });
});
