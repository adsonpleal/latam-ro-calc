import { RuneKnight } from 'src/app/jobs';
import { Calculator } from '../calculator';

/**
 * Shared harness for the item/set specs in this folder.
 *
 * They all want the same thing: a Calculator holding a handful of items, wired to a class
 * and a target, so `totalEquipStatus` can be read back. Before this, each spec re-inlined
 * the same ~15-line chain plus a 300-character monster literal.
 *
 * The class and target are deliberately inert — RuneKnight with no skills learned, and a
 * Poring with zero DEF/MDEF/resistances — so whatever a spec asserts comes from the items
 * under test and nothing else. A spec that needs a real class or target should build its
 * own rather than bend this one.
 */

/** Zeroed-out target: contributes nothing to any bonus a spec might read. */
export const INERT_MONSTER = {
  id: 1002, name: 'Poring', spawn: 'x',
  stats: {
    level: 1, health: 50, attack: { min: 7, max: 8 }, range: 1, defense: 0, magicDefense: 0,
    str: 1, int: 0, vit: 1, dex: 6, agi: 1, luk: 30,
    element: 1, elementName: 'Water', elementShortName: 'W1',
    race: 4, raceName: 'Plant', scale: 0, scaleName: 'Small', class: 0,
    criShield: 0, softDef: 0, mdef: 0, softMdef: 0, res: 0, mres: 0,
  },
  data: { def: 0, mdef: 0, criShield: 0, softDef: 0, res: 0, mres: 0 },
} as any;

/** A Calculator loaded with `items`, ready for loadItemFromModel(). */
export function makeCalculator(items: Record<number | string, any>): Calculator {
  const cls = new RuneKnight();
  cls.setLearnSkills({ activeSkillIds: [], passiveSkillIds: [] }).getSkillBonusAndName();

  return new Calculator()
    .setMasterItems(items as any)
    .setHpSpTable([{ jobs: {}, baseHp: Array(251).fill(1000), baseSp: Array(251).fill(100) }] as any)
    .setClass(cls)
    .setMonster(INERT_MONSTER);
}

/** Run the model through the engine and hand back the summed equipment bonus. */
export function equipStatusOf(calc: Calculator, model: any): Record<string, number> {
  calc.loadItemFromModel(model).prepareAllItemBonus();

  return (calc as any).totalEquipStatus as Record<string, number>;
}
