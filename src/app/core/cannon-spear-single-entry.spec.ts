/**
 * Disparo Perfurante is one skill, with one ratio — reported by Cctavio, who found it
 * listed twice in the rotation picker with a different damage on each row.
 *
 * The catalog carried two `name: 'Cannon Spear'` entries: `Cannon Spear==5` at 50% per
 * level and `[Improved] Cannon Spear==5` at 120%. Only the second matches the client's own
 * table for skill 2307, so the two were not a choice the player had — one was the
 * pre-rebalance ratio left behind. They are now a single entry carrying 120%, with the
 * retired value kept in `values` so builds saved against it still resolve.
 *
 * What this spec holds, in order: the ratio against the client table, that the picker
 * offers Disparo Perfurante exactly once, and that a share link or saved simulation naming
 * `[Improved] Cannon Spear==5` still decodes to the same rotation and still computes the
 * same damage it did when that value had an entry of its own.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ImperialGuard, RoyalGuard } from '../jobs';
import { AtkSkillFormulaInput, AtkSkillModel, CharacterBase } from '../jobs/_character-base.abstract';
import { createMainModel } from '../utils';
import { INERT_MONSTER, makeCalculator } from './__tests__/make-calculator';
import { decodeBuild, encodeBuild } from './share-codec';
import { findRotationSkill, pruneRotationForClass } from './rotation';

const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));

const prepared = (cls: CharacterBase): CharacterBase => {
  cls.setLearnSkills({ activeSkillIds: cls.activeSkills.map(() => 0), passiveSkillIds: cls.passiveSkills.map(() => 0) })
    .getSkillBonusAndName();

  return cls;
};

const cannonSpears = (cls: CharacterBase): AtkSkillModel[] =>
  (prepared(cls).getAtkSkills('current') as AtkSkillModel[]).filter((skill) => skill.name === 'Cannon Spear');

/** Base level 100 and FOR 0, which is the shape the client's own table describes. */
const bareInput = (skillLevel: number): AtkSkillFormulaInput =>
  ({ skillLevel, model: { level: 100 }, status: { totalStr: 0 } } as unknown as AtkSkillFormulaInput);

describe('the Disparo Perfurante entry', () => {
  it('is a single row for both the Royal Guard and the Imperial Guard', () => {
    expect(cannonSpears(new RoyalGuard()).map((skill) => skill.value)).toEqual(['Cannon Spear==5']);
    expect(cannonSpears(new ImperialGuard()).map((skill) => skill.value)).toEqual(['Cannon Spear==5']);
  });

  /**
   * Written out rather than read with `clientRatioTable`: this description heads its table
   * "Nivel l ATQ l Área", unaccented, and the shared parser only knows "Nível". Fixing the
   * parser would pull dozens of other skills into `skill-ratio-client-table.spec.ts` at
   * once, which is its own job — the five rows below are that description verbatim.
   */
  it('matches the client table at every level — 120% per level + (FOR x level)%', () => {
    const [skill] = cannonSpears(new RoyalGuard());

    for (const [level, ratio] of [[1, 120], [2, 240], [3, 360], [4, 480], [5, 600]]) {
      expect(skill.formula(bareInput(level)), `Nv${level}`).toBe(ratio);
    }
  });

  it('adds FOR once per level on top of that ratio', () => {
    const [skill] = cannonSpears(new RoyalGuard());
    const withStr = { ...bareInput(5), status: { totalStr: 300 } } as AtkSkillFormulaInput;

    // Nv5: 600% + (300 x 5)% — the client's own "600% + (FOR x 5)%".
    expect(skill.formula(withStr)).toBe(5 * (120 + 300));
  });
});

describe('a build saved against the retired value', () => {
  const ROTATION = ['[Improved] Cannon Spear==5', 'Over Brand==5'];

  it('survives the share round trip and the class prune unchanged', () => {
    const preset = { ...createMainModel(), class: new RoyalGuard().classNameSet, rotation: ROTATION, selectedAtkSkill: '[Improved] Cannon Spear==5' };
    const decoded = decodeBuild(encodeBuild(preset));

    expect(decoded?.rotation).toEqual(ROTATION);
    expect(pruneRotationForClass(decoded!.rotation, prepared(new RoyalGuard()).getAtkSkills('current'))).toEqual(ROTATION);
  });

  it('resolves to the surviving entry rather than to nothing', () => {
    const skills = prepared(new RoyalGuard()).getAtkSkills('current');

    expect(findRotationSkill(skills, '[Improved] Cannon Spear==5')?.value).toBe('Cannon Spear==5');
  });

  it('computes exactly what it computed when it had an entry of its own', () => {
    const damageFor = (skillValue: string) => {
      const cls = prepared(new RoyalGuard());
      const calc = makeCalculator(db, cls)
        .setMonster({ ...INERT_MONSTER, stats: { ...INERT_MONSTER.stats, elementName: 'Water 1' } });
      const model = { ...createMainModel(), class: cls.classNameSet, level: 200, str: 200 };
      calc.setModel(model).loadItemFromModel(model).prepareAllItemBonus().calcAllAtk().calculateAllDamages(skillValue);

      return (calc as any).damageSummary;
    };

    const retired = damageFor('[Improved] Cannon Spear==5');
    expect(retired.skillMaxDamage).toBeGreaterThan(0);
    expect(retired.skillMaxDamage).toBe(damageFor('Cannon Spear==5').skillMaxDamage);
    expect(retired.skillMinDamage).toBe(damageFor('Cannon Spear==5').skillMinDamage);
  });
});
