import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Sorcerer } from 'src/app/jobs';
import { createMainModel } from 'src/app/utils';
import { equipStatusOf, makeCalculator } from './make-calculator';

const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const STONE = 311012;
const WORN_STONE = 1000673;
const PER_LEVEL = 2;

/**
 * Two percentage points per level, and the LATAM client text that says one is wrong.
 *
 * Tracker qrUOc0bhj58apCkSJ71j (Batuta) read 10% off the "Bônus de Equip" window with
 * Pó de Diamante at its maximum level 5. Every other region's client text says 2% as
 * well (iRO, GGH, idRO, kROM/kROS, cRO, twRO, vnRO, thROG), the server script
 * divine-pride publishes for 311012 is `-2*getskilllv("SO_DIAMONDDUST")`, and the Thai
 * text this record still carries reads 2%. Only the LATAM tables — pt-BR, es and en
 * alike — print 1%, and tracker M7WlH6ZDKwybneXuXQ36 took that at face value and
 * halved the bonus (a12377e3); this is the revert.
 *
 * The text is not patched: latam-items*.json mirrors the client dump and the app reads
 * name and description from it at runtime (docs/item-json.md), so the UI keeps showing
 * the client's 1% until Gravity fixes it.
 */
function variableCastReduction(level: number, stone = STONE, worn = true): number {
  const cls = new Sorcerer();
  const calc = makeCalculator({ [stone]: db[stone] }, cls);
  const passiveSkillIds = cls.passiveSkills.map((skill) => skill.name === 'Diamond Dust' ? level : 0);
  const { learnedSkillMap } = cls.setLearnSkills({ activeSkillIds: [], passiveSkillIds }).getSkillBonusAndName();
  calc.setLearnedSkills(learnedSkillMap);

  const model = createMainModel();
  if (worn) model.costumeEnchantMiddle = stone;

  return equipStatusOf(calc, model).vct;
}

// Both ids: the enchant as it sits on a costume, and the stone the player wears.
describe.each([STONE, WORN_STONE])('Feiticeiro (Meio) variable cast reduction (%i)', (stone) => {
  // Level 5 is the maximum the client gives Pó de Diamante, so the last case is
  // the 10% the reporter read off the "Bônus de Equip" window.
  it.each([0, 1, 2, 3, 4, 5])('reduces variable cast by two percentage points per level (Pó de Diamante %i)', (level) => {
    expect(variableCastReduction(level, stone)).toBe(level * PER_LEVEL);
  });

  it('grants no reduction without the stone equipped', () => {
    expect(variableCastReduction(5, stone, false)).toBe(0);
  });
});
