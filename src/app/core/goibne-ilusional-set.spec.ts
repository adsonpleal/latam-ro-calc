import { readFileSync } from 'node:fs';
import { createMainModel } from 'src/app/utils';
import { equipStatusOf, makeCalculator } from './__tests__/make-calculator';

/**
 * Conjunto Goibne Ilusional (declared on 19366 Elmo Goibne Ilusional).
 *
 * Reported anonymously: the set bonus never fires. The helm gated it on
 * `EQUIP[Illusion Goibne's Armor&&...]`, which matches partners by their English display
 * name — but the three partners were added by the LATAM import with a pt-BR name and no
 * English one, so `enName` is already "Armadura Goibne Ilusional" and the condition can
 * never match. Same failure mode as the Amicitia set: gate on ids, not on names.
 *
 * While the set was dead, two of the partners were also missing refine tiers of their own
 * (the armor's +9 DEF and the shoulder's element damage), so even the pieces read low.
 *
 * The pt-BR description is the source of truth (see CLAUDE.md):
 *   Elmo: VIT +3 / +7: VIT +5 adicional / +9: Pós-conjuração -12%
 *   Conjunto [Greva + Ombreira + Armadura]:
 *     HP máx. +15%, SP máx. +5%, VIT +5 adicional, DEF +5, DEFM +15,
 *     Resistência as propriedades Vento, Fogo, Água e Terra +10%
 *     Elmo, Armadura, Calçado e Capa refinados no +7 ou mais: HP máx. +10% adicional
 *     Soma dos refinos 36 ou mais: Conjuração fixa -0,7 segundos
 *     Soma dos refinos 40 ou mais: Pós-conjuração -20% adicional
 */

const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));

const HELM = 19366;
const ARMOR = 15348;
const SHOULDER = 20923;
const BOOTS = 22192;
const FULL_SET = [HELM, ARMOR, SHOULDER, BOOTS];

const SLOT_OF: Record<number, string> = {
  [HELM]: 'headUpper',
  [ARMOR]: 'armor',
  [SHOULDER]: 'garment',
  [BOOTS]: 'boot',
};

const ELEMENTS = ['wind', 'fire', 'water', 'earth'] as const;

/**
 * DEF granted by the scripts alone. `totalEquipStatus.def` also carries each piece's
 * printed DEF, which is not what this set is about.
 */
function scriptDef(pieces: number[], refine: number | Record<number, number>): number {
  return statsOf(pieces, refine)['def'] - pieces.reduce((total, id) => total + db[id].defense, 0);
}

/** Equip the listed pieces, each at `refine` (or at its own refine when given a map). */
function statsOf(pieces: number[], refine: number | Record<number, number>): Record<string, number> {
  const items: any = {};
  for (const id of pieces) items[id] = { ...db[id] };

  const model = createMainModel();
  model.level = 200;
  for (const id of pieces) {
    model[SLOT_OF[id]] = id;
    model[`${SLOT_OF[id]}Refine`] = typeof refine === 'number' ? refine : refine[id];
  }

  return equipStatusOf(makeCalculator(items), model);
}

describe('Conjunto Goibne Ilusional', () => {
  it('is wired to partners that all exist in the db', () => {
    for (const id of FULL_SET) expect(db[id], `item ${id}`).toBeDefined();
  });

  it('gates the set on partner ids, not on display names', () => {
    // The partners carry a pt-BR name in item.json, so there is no English name to match.
    const encoded = JSON.stringify(db[HELM].script);

    expect(encoded).not.toContain('EQUIP[');
    for (const id of [ARMOR, SHOULDER, BOOTS]) expect(encoded, `partner ${id}`).toContain(String(id));
  });

  it('reproduces the report: the whole set worn, the set bonus applies', () => {
    const bonus = statsOf(FULL_SET, 0);

    expect(bonus['hpPercent']).toBe(15 + 10 + 5); // set 15% + armor 10% + boots 5%
    expect(bonus['spPercent']).toBe(5 + 5); // set 5% + boots 5%
    expect(scriptDef(FULL_SET, 0)).toBe(5);
    expect(bonus['mdef']).toBe(3 + 15); // helm's own 3 + set 15
    expect(bonus['vit']).toBe(3 + 5 + 1); // helm 3 + set 5 + shoulder 1
    for (const ele of ELEMENTS) expect(bonus[`subele_${ele}`], ele).toBe(10);
  });

  it('grants nothing from the set while a piece is missing', () => {
    for (const missing of [ARMOR, SHOULDER, BOOTS]) {
      const worn = FULL_SET.filter((id) => id !== missing);
      const bonus = statsOf(worn, 0);

      expect(scriptDef(worn, 0), `without ${missing}`).toBe(0);
      expect(bonus['subele_wind'], `without ${missing}`).toBe(0);
      expect(bonus['spPercent'], `without ${missing}`).toBe(worn.includes(BOOTS) ? 5 : 0);
    }
  });

  it('does not fire from the helm alone', () => {
    const bonus = statsOf([HELM], 0);

    expect(bonus['vit']).toBe(3);
    expect(scriptDef([HELM], 0)).toBe(0);
    expect(bonus['hpPercent']).toBe(0);
    expect(bonus['subele_wind']).toBe(0);
  });

  it('adds the extra 10% HP only when every one of the four pieces is +7', () => {
    const at = (refine: Record<number, number>) => statsOf(FULL_SET, refine)['hpPercent'];
    const base = 15 + 10 + 5;

    expect(at({ [HELM]: 7, [ARMOR]: 7, [SHOULDER]: 7, [BOOTS]: 7 })).toBe(base + 10);
    expect(at({ [HELM]: 7, [ARMOR]: 7, [SHOULDER]: 7, [BOOTS]: 6 })).toBe(base);
    expect(at({ [HELM]: 6, [ARMOR]: 9, [SHOULDER]: 9, [BOOTS]: 9 })).toBe(base);
    // A high sum does not stand in for the per-piece floor: 0+10+10+10 = 30 summed.
    expect(at({ [HELM]: 0, [ARMOR]: 10, [SHOULDER]: 10, [BOOTS]: 10 })).toBe(base);
  });

  it('cuts fixed cast by 0,7s once the refines sum to 36', () => {
    expect(statsOf(FULL_SET, { [HELM]: 9, [ARMOR]: 9, [SHOULDER]: 9, [BOOTS]: 8 })['fct']).toBe(0);
    expect(statsOf(FULL_SET, 9)['fct']).toBe(0.7); // 9 x 4 = 36
  });

  it('adds the set\'s 20% after-cast only once the refines sum to 40', () => {
    // The helm's own -12% needs +9; the set's -20% needs 40 summed.
    expect(statsOf(FULL_SET, { [HELM]: 9, [ARMOR]: 9, [SHOULDER]: 9, [BOOTS]: 9 })['acd']).toBe(12);
    expect(statsOf(FULL_SET, 10)['acd']).toBe(12 + 20);
  });

  it('keeps the helm\'s own refine tiers working without the set', () => {
    expect(statsOf([HELM], 7)['vit']).toBe(3 + 5);
    expect(statsOf([HELM], 9)['acd']).toBe(12);
    expect(statsOf([HELM], 6)['acd']).toBe(0);
  });

  describe('partner pieces', () => {
    it('gives the armor 150 DEF at +9 (50 at +7, then 100 more)', () => {
      expect(scriptDef([ARMOR], 6)).toBe(0);
      expect(scriptDef([ARMOR], 7)).toBe(50);
      expect(scriptDef([ARMOR], 9)).toBe(50 + 100);
      expect(statsOf([ARMOR], 9)['hpPercent']).toBe(10);
    });

    it('gives the shoulder +15% physical damage vs the four elements at +9', () => {
      for (const ele of ELEMENTS) {
        expect(statsOf([SHOULDER], 6)[`p_element_${ele}`], ele).toBe(0);
        expect(statsOf([SHOULDER], 7)[`p_element_${ele}`], ele).toBe(5);
        expect(statsOf([SHOULDER], 9)[`p_element_${ele}`], ele).toBe(5 + 10);
      }
      expect(statsOf([SHOULDER], 9)['vit']).toBe(1);
    });

    it('keeps the boots\' own refine tiers', () => {
      expect(statsOf([BOOTS], 7)['vct']).toBe(5);
      expect(statsOf([BOOTS], 9)['range']).toBe(10);
      expect(statsOf([BOOTS], 9)['hpPercent']).toBe(5);
    });

    it('declares the set on the helm only, so it cannot double up', () => {
      for (const id of [ARMOR, SHOULDER, BOOTS]) {
        const encoded = JSON.stringify(db[id].script);
        expect(encoded, `item ${id}`).not.toContain(String(HELM));
      }
    });
  });
});
