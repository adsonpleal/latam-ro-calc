import { readFileSync } from 'node:fs';
import { RuneKnight } from 'src/app/jobs';
import { createMainModel } from 'src/app/utils';
import { Calculator } from './calculator';

/**
 * The two Cat_FF_Hat headgears and their refine-gated fixed-cast tiers.
 *
 * Reported by Voilá (tracker s0Ii4JIs004fjdc5hFYJ): Gorro Felino Mágico was giving 0,2s
 * of fixed-cast reduction at +13 instead of the 0,5s the item promises. Its record held
 * only the first of the two tiers the pt-BR description states:
 *
 *   400759 Gorro Felino Mágico
 *     Refino +7 ou mais:  Conjuração fixa -0,2 segundos.
 *     Refino +13 ou mais: Conjuração fixa -0,3 segundos ADICIONAL.   <- was missing
 *
 * "Adicional" is the word that decides it: the tiers add, they do not replace, which is
 * how every other multi-tier `fct` record in item.json is written (22171, 22238, 29541,
 * 310111). The twin below is asserted alongside precisely because it is NOT that shape —
 * its description carries a single +13 clause — so an edit cannot smear one onto the other.
 *
 *   400758 Gorro Felino Poderoso
 *     Refino +13 ou mais: Conjuração fixa -0,3 segundos.
 */

const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));

const MAGICO = 400759;
const PODEROSO = 400758;

const monster = {
  id: 1002, name: 'Poring', spawn: 'x',
  stats: { level: 1, health: 50, attack: { min: 7, max: 8 }, range: 1, defense: 0, magicDefense: 0, str: 1, int: 0, vit: 1, dex: 6, agi: 1, luk: 30, element: 1, elementName: 'Water', elementShortName: 'W1', race: 4, raceName: 'Plant', scale: 0, scaleName: 'Small', class: 0, criShield: 0, softDef: 0, mdef: 0, softMdef: 0, res: 0, mres: 0 },
  data: { def: 0, mdef: 0, criShield: 0, softDef: 0, res: 0, mres: 0 },
} as any;

function totals(hatId: number, refine: number): Record<string, number> {
  const items: any = { [hatId]: { ...db[hatId] } };

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
  model.headUpper = hatId;
  model.headUpperRefine = refine;

  calc.loadItemFromModel(model).prepareAllItemBonus();
  return (calc as any).totalEquipStatus as Record<string, number>;
}

const fct = (hatId: number, refine: number) => totals(hatId, refine)['fct'] ?? 0;

describe('Gorro Felino Mágico 400759 — the +7 and +13 fixed-cast tiers add up', () => {
  it('gives nothing below +7', () => {
    expect(fct(MAGICO, 0)).toBe(0);
    expect(fct(MAGICO, 6)).toBe(0);
  });

  it('gives 0,2 from +7 up to +12', () => {
    expect(fct(MAGICO, 7)).toBe(0.2);
    expect(fct(MAGICO, 12)).toBe(0.2);
  });

  it('gives 0,5 from +13 — the reported bug', () => {
    expect(fct(MAGICO, 13)).toBe(0.5);
    expect(fct(MAGICO, 15)).toBe(0.5);
  });

  it('keeps the rest of the refine tiers intact', () => {
    const at13 = totals(MAGICO, 13);
    expect(at13['matk']).toBe(90); // "A cada 2 refinos: ATQM +15" -> floor(13/2) * 15
    expect(at13['vct']).toBe(15); // +7 ou mais
    expect(at13['m_my_element_all']).toBe(20); // +9 ou mais
    expect(at13['m_size_all']).toBe(20); // +11 ou mais
  });
});

describe('Gorro Felino Poderoso 400758 — a single +13 tier, not two', () => {
  it('gives nothing below +13', () => {
    expect(fct(PODEROSO, 12)).toBe(0);
  });

  it('gives 0,3 at +13 and no more', () => {
    expect(fct(PODEROSO, 13)).toBe(0.3);
    expect(fct(PODEROSO, 15)).toBe(0.3);
  });
});
