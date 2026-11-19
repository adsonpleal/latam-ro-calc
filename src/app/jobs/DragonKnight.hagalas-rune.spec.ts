import { readFileSync } from 'node:fs';
import { Calculator } from 'src/app/core/calculator';
import { createMainModel } from 'src/app/utils';
import { DragonKnight } from './DragonKnight';

/**
 * Runa Hagalaz / Escamas Rochosas (RK_STONEHARDSKIN) — card GVAHJDNzUi8u5W3llx4V asked for
 * the buff so a Cavaleiro Draconiano can close a DEF/DEFM build. It is declared on the Rune
 * Knight beside the other three runestones, so the Dragon Knight inherits it; the tests
 * below drive the Dragon Knight precisely to hold that inheritance.
 *
 * The LATAM client's own text for item 12733 names both inputs and no divisor:
 *
 *   "Drena 20% do HP máx.
 *    Bônus de DEF e DEFM de acordo com o nível de [Perícia em Runas] e o nível de classe
 *    do usuário."
 *
 * The ÷ 4 comes from the two official wikis, which agree:
 *   browiki (Escamas Rochosas): "DEF e DEFM = [(Nível de Classe × Perícia em Runas) ÷ 4]"
 *   irowiki (Rune): "(JobLv × RuneMastery_Lv) ÷ 4", 15 minutes
 *
 * Floored, as the server int-casts. "Nível de classe" is the job level (the app's own
 * `cis.jobLevel` label), not the base level.
 *
 * What the rune costs and does to an attacker — 20% of max HP drained on cast, a 30% chance
 * to break the weapon of whoever hits you, ATQ −25% on normal monsters — is deliberately not
 * modelled: the drain takes current HP (the "HP Atual" control already stands for that) and
 * the rest lands on the opponent's side of a fight this calculator does not simulate.
 */

const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const hpSpTable = JSON.parse(readFileSync('src/assets/demo/data/hp_sp_table.json', 'utf8'));
// A real target: the damage comparison at the bottom runs the full pass, which reads the
// monster's element, so the zeroed literal the other rune specs use would not do here.
const monster = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'))[1038];

const WEAPON = 1201; // Knife [3] — inert host, the rune does not care about the weapon

/** A fully solved Dragon Knight, bare but for the knife, so the only hard DEF/DEFM on the
 *  sheet is whatever the rune grants. */
function solve(opts: { runeActive: boolean; jobLevel?: number; runeMastery?: number; withDamage?: boolean }) {
  const { runeActive, jobLevel = 50, runeMastery = 10, withDamage = false } = opts;

  const cls = new DragonKnight();
  const activeList = (cls as any)._activeSkillList as { name: string }[];
  const passiveList = (cls as any)._passiveSkillList as { name: string }[];
  const activeSkillIds = activeList.map((skill) => (skill.name === 'Hagalas Runestone' && runeActive ? 1 : 0));
  const passiveSkillIds = passiveList.map((skill) => (skill.name === 'Rune Mastery' ? runeMastery : 0));
  cls.setLearnSkills({ activeSkillIds, passiveSkillIds }).getSkillBonusAndName();

  const calc = new Calculator();
  calc
    .setMasterItems({ [WEAPON]: { ...db[WEAPON], itemTypeId: 1, itemSubTypeId: 256 } } as any)
    .setHpSpTable(hpSpTable)
    .setClass(cls)
    .setMonster(monster);

  const model = createMainModel();
  model.level = 200;
  model.jobLevel = jobLevel;
  model.str = 100;
  model.weapon = WEAPON;

  calc.loadItemFromModel(model).prepareAllItemBonus().calcAllAtk().calcAllDefs();
  // The defences are solved above; only the comparison that has to prove the damage did
  // not move pays for the damage pass.
  if (withDamage) calc.calculateHpSp({ isUseHpL: false }).calculateAllDamages('');

  return calc;
}

const defenses = (opts: Parameters<typeof solve>[0]) => {
  const { def, mdef } = (solve(opts) as any).defenses as { def: number; mdef: number };
  return { def, mdef };
};

describe('Runa Hagalaz — Escamas Rochosas', () => {
  it('is offered to the Cavaleiro Draconiano, inherited from the Cavaleiro Rúnico', () => {
    const rows = (new DragonKnight() as any)._activeSkillList as { name: string; label: string }[];
    const hagalas = rows.filter((row) => row.name === 'Hagalas Runestone');

    expect(hagalas).toHaveLength(1);
    expect(hagalas[0].label).toBe('Rune: Hagalas');
  });

  // Job level × Perícia em Runas ÷ 4, truncated. The quarters are deliberate: 7 and 9
  // land on ,5, which rounding would read as 88 and 113. Mastery 0 is the Rune Knight who
  // never learned the skill — in game the rune is tradeable, and it grants him nothing.
  it.each([
    [50, 10, 125], // the 4th-job job cap at Perícia em Runas 10
    [50, 7, 87], // 87,5
    [50, 9, 112], // 112,5
    [50, 1, 12], // 12,5
    [20, 10, 50],
    [1, 10, 2],
    [50, 0, 0],
  ])('at job level %i with Perícia em Runas %i grants DEF and DEFM %i', (jobLevel, runeMastery, expected) => {
    expect(defenses({ runeActive: true, jobLevel, runeMastery })).toEqual({ def: expected, mdef: expected });
  });

  it('grants nothing while the rune is off', () => {
    expect(defenses({ runeActive: false })).toEqual({ def: 0, mdef: 0 });
  });

  it('attributes both numbers to the rune in the DEF breakdown, once', () => {
    // The row is attribution only: the summation that builds the sheet ran before
    // setAdditionalBonus, so a second bonus pass re-reads it as 125 rather than 250.
    const calc = solve({ runeActive: true }) as any;
    expect(calc.getItemSummary()['Hagalas Runestone']).toEqual({ def: 125, mdef: 125 });

    calc.prepareAllItemBonus().calcAllAtk().calcAllDefs();
    expect(calc.defenses.def).toBe(125);
    expect(calc.getItemSummary()['Hagalas Runestone']).toEqual({ def: 125, mdef: 125 });

    expect((solve({ runeActive: false }) as any).getItemSummary()['Hagalas Runestone']).toBeUndefined();
  });

  it('leaves the build\'s own damage untouched — it is defence, not DPS', () => {
    // No formula in the engine reads the player's own DEF/DEFM: they feed the status panel
    // and, via getAsPlayerTarget, the profile of a build saved as a PVP target. So the rune
    // must move the sheet's defences without moving a single damage figure.
    const on = solve({ runeActive: true, withDamage: true }).getTotalSummary();
    const off = solve({ runeActive: false, withDamage: true }).getTotalSummary();

    expect(on.dmg).toEqual(off.dmg);
    expect(on.calc.def).toBe(125);
    expect(off.calc.def).toBe(0);
  });
});
