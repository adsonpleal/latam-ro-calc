import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ElementType } from '../constants/element-type.const';
import { Calculator } from '../core/calculator';
import { CalculatorController } from '../core/calculator-controller';
import { resolveSkillMeta } from '../skills';
import { createMainModel } from '../utils/create-main-model';
import { Kagerou } from './Kagerou';
import { Ninja } from './Ninja';
import { Oboro } from './Oboro';
import { Shinkiro } from './Shinkiro';
import { Shiranui } from './Shiranui';
import { CharacterBase } from './_character-base.abstract';

/**
 * Arremessar Amuleto (KO_KAIHOU, 3019) — board card NpeWdgjy7auaOtlKXXux, "não consigo
 * testar o dano de arremessar amuleto". It was absent from the catalog altogether, so the
 * Kagerou and the Oboro had no way to pick it.
 *
 * The ratio has no client table behind it (the description publishes no ATQM column), so
 * what this pins is the two sources that do publish one and agree — bROWiki's
 * `ATQM = {ATQM × [(200 × número de amuletos) × (Nv. de base ÷ 100)]}%` and rAthena's
 * `skillratio += -100 + 200 * sd->spiritcharm` + `RE_LVL_DMOD(100)` — at the ten-charm
 * stack the engine's Amuleto toggles stand for. See shared-skills.ts for the whole note.
 */

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const monsters = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));
const hpSpTable = JSON.parse(readFileSync('src/assets/demo/data/hp_sp_table.json', 'utf8'));

/** The four Amuleto toggles and the property each one makes the skill throw. */
const CHARMS: [string, number, ElementType][] = [
  ['_Charm_Fire', 10, ElementType.Fire],
  ['_Charm_Earth', 20, ElementType.Earth],
  ['_Charm_Ice', 30, ElementType.Water],
  ['_Charm_Wind', 40, ElementType.Wind],
];

/** A Neutral-property target, so the elemental multiplier never hides a wrong element. */
const TARGET = monsters['20573'];

function solve(cls: CharacterBase, charm: string | null, baseLevel = 200) {
  const bonuses = cls
    .setLearnSkills({
      activeSkillIds: cls.activeSkills.map((skill) => {
        const match = CHARMS.find(([name]) => name === skill.name && name === charm);
        return match ? match[1] : 0;
      }),
      passiveSkillIds: cls.passiveSkills.map(() => 0),
    })
    .getSkillBonusAndName();
  const model = {
    ...createMainModel(),
    class: cls.classId,
    level: baseLevel,
    jobLevel: 50,
    int: 100,
    spl: 50,
    selectedAtkSkill: 'Release Ninja Spell==1',
  };
  const calc = new Calculator().setMasterItems(items).setHpSpTable(hpSpTable).setClass(cls);
  calc.loadItemFromModel(model);
  new CalculatorController().runChain(calc, {
    monster: TARGET, ...bonuses, buffEquips: {}, buffMasterys: {}, consumeData: [],
    aspdPotion: undefined, extraOptionScripts: [], selectedAtkSkill: model.selectedAtkSkill,
    selectedChances: [], usedHpL: false,
  } as any);

  return (calc as any).damageSummary;
}

describe('Arremessar Amuleto', () => {
  it('is offered to the Kagerou, the Oboro and their 4th classes, under its pt-BR name', () => {
    expect(resolveSkillMeta('Release Ninja Spell')).toMatchObject({ id: 3019, label: 'Arremessar Amuleto' });

    for (const cls of [new Kagerou(), new Oboro(), new Shinkiro(), new Shiranui()]) {
      const skill = cls.getAtkSkills().find((entry) => entry.name === 'Release Ninja Spell');
      expect(skill, cls.constructor.name).toBeDefined();
      expect(skill!.value).toBe('Release Ninja Spell==1');
      expect(skill!.isMatk, cls.constructor.name).toBe(true);
    }
  });

  it('is not offered to the Ninja, which does not learn it in game', () => {
    expect(new Ninja().getAtkSkills().some((entry) => entry.name === 'Release Ninja Spell')).toBe(false);
  });

  it('asks for a summoned Amuleto and deals nothing without one', () => {
    const summary = solve(new Kagerou(), null);

    // The engine's blocked-skill sentinel: no ratio and no hit (`zeroSkillDmg`), which is
    // what "Requer:" renders from instead of a damage number.
    expect(summary.requireTxt).toBe('Amuleto invocado');
    expect(summary.baseSkillDamage).toBe(0);
    expect(summary.skillTotalHit).toBe(0);
  });

  it('throws the ten-charm stack: 200 × 10 × (nível de base ÷ 100)', () => {
    // 2000% at base 100, and the base-level factor on top of it. The engine truncates the
    // ratio as the server does, which is why 2000 × 1.75 is pinned rather than rounded.
    for (const [baseLevel, ratio] of [[100, 2000], [175, 3500], [200, 4000]]) {
      const summary = solve(new Kagerou(), '_Charm_Fire', baseLevel);
      expect(summary.baseSkillDamage, `base ${baseLevel}`).toBe(ratio);
      expect(summary.skillMinDamage, `base ${baseLevel}`).toBeGreaterThan(0);
    }
  });

  it('takes the property of the Amuleto that is out', () => {
    for (const [charm, , element] of CHARMS) {
      expect(solve(new Kagerou(), charm).skillPropertyAtk, charm).toBe(element);
      expect(solve(new Oboro(), charm).skillPropertyAtk, charm).toBe(element);
    }
  });

  it('gives the Oboro the same number as the Kagerou — the pair shares the skill', () => {
    const kagerou = solve(new Kagerou(), '_Charm_Wind');
    const oboro = solve(new Oboro(), '_Charm_Wind');

    expect(oboro.baseSkillDamage).toBe(kagerou.baseSkillDamage);
    expect(oboro.skillPropertyAtk).toBe(kagerou.skillPropertyAtk);
  });
});
