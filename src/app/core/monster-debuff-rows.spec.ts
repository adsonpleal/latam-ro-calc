import { describe, expect, it } from 'vitest';
import { JobBuffs } from 'src/app/constants/job-buffs';
import { collectBuffBonuses, supersededDebuffNames } from 'src/app/core/calculator-controller';
import { equipStatusOf, makeCalculator } from 'src/app/core/__tests__/make-calculator';
import { CLASS_CTOR_BY_ID } from 'src/app/jobs/_class-list';
import { resolveSkillMeta } from 'src/app/skills';
import { createMainModel } from 'src/app/utils';

/**
 * "Debuffs no monstro" is fed by two catalogs — the shared `JobBuffs` rows (a party member
 * casts the debuff on you) and the selected class's own active rows (you cast it) — and the
 * two name the same debuff identically. Card ILA1aEHJlA3co9iD6zEQ, reported by Reagan*:
 * "nas habilidades > debuffs no monstro o cometa aparece duas vezes, uma no comeco e outra
 * no final", because the panel ran one loop over each list.
 *
 * The bonus was never counted twice: `collectBuffBonuses` already drops a shared row whose
 * name is an active skill, so Cometa was and is a single 50%. The duplicate was the control.
 */

const HIGH_WIZARD = 4010;
const WARLOCK = 6;
const ARCH_MAGE = 4255;
const GUILLOTINE_CROSS = 5;
const INQUISITOR = 4262;
const COMET_AMP = 'Comet Amp';

/** The rows the panel renders under "Debuffs no monstro", in render order. */
function monsterDebuffRows(classId: number) {
  const cls = new CLASS_CTOR_BY_ID[classId]();
  const superseded = supersededDebuffNames(JobBuffs, cls.activeSkills);

  return [
    // A buff row keeps its own curated label; an active row takes the pt-BR skill name.
    ...JobBuffs.filter((buff) => buff.isDebuff && !superseded.has(buff.name)).map((buff) => ({ name: buff.name, label: buff.label })),
    ...cls.activeSkills.filter((skill) => skill.isDebuff).map((skill) => ({ name: skill.name, label: resolveSkillMeta(skill.name)?.label ?? skill.label })),
  ];
}

/**
 * The `comet` bonus the engine ends up with, through the real collection path.
 * `classRow`/`sharedRow` are the two controls the panel used to show side by side.
 *
 * Reading it off the two bonus maps by hand would prove nothing: they are accumulated by
 * two separate summing loops, which is exactly why a double count was conceivable.
 */
function cometBonus(classId: number, selection: { classRow?: boolean; sharedRow?: boolean }) {
  const cls = new CLASS_CTOR_BY_ID[classId]();
  // makeCalculator relearns the class with no skills, so the selection is applied after it.
  const calc = makeCalculator({}, cls);
  const { equipAtks, activeSkillNames } = cls.setLearnSkills({
    activeSkillIds: cls.activeSkills.map((skill) => (selection.classRow && skill.name === COMET_AMP ? 1 : 0)),
    passiveSkillIds: cls.passiveSkills.map(() => 0),
  }).getSkillBonusAndName();

  const selectedBuffValues = JobBuffs.map((buff) => (selection.sharedRow && buff.name === COMET_AMP ? 1 : 0));
  calc.setEquipAtkSkillAtk(equipAtks)
    .setBuffBonus({ masteryAtk: {}, equipAtk: collectBuffBonuses(JobBuffs, selectedBuffValues, activeSkillNames).equipAtk });

  return equipStatusOf(calc, createMainModel())['comet'] ?? 0;
}

describe('the monster-debuff list offers one control per debuff', () => {
  it('names no debuff twice, for any class', () => {
    for (const classId of Object.keys(CLASS_CTOR_BY_ID).map(Number)) {
      const names = monsterDebuffRows(classId).map((row) => row.name);

      expect(new Set(names).size, `${classId} repeats a debuff: ${names.join(', ')}`).toBe(names.length);
    }
  });

  // What Reagan* actually saw: two rows reading "Cometa", one at each end of the section.
  it('shows no label twice either, for any class', () => {
    for (const classId of Object.keys(CLASS_CTOR_BY_ID).map(Number)) {
      const labels = monsterDebuffRows(classId).map((row) => row.label);

      expect(new Set(labels).size, `${classId} repeats a label: ${labels.join(', ')}`).toBe(labels.length);
    }
  });

  it('hides the shared row only for the classes that cast the debuff themselves', () => {
    expect([...supersededDebuffNames(JobBuffs, new CLASS_CTOR_BY_ID[WARLOCK]().activeSkills)]).toEqual([COMET_AMP]);
    // Declared on the Warlock's own 3rd-class list, so the Magus inherits it.
    expect([...supersededDebuffNames(JobBuffs, new CLASS_CTOR_BY_ID[ARCH_MAGE]().activeSkills)]).toEqual([COMET_AMP]);
    expect([...supersededDebuffNames(JobBuffs, new CLASS_CTOR_BY_ID[HIGH_WIZARD]().activeSkills)]).toEqual([]);
    // The two other pairs that collided in the same section.
    expect([...supersededDebuffNames(JobBuffs, new CLASS_CTOR_BY_ID[GUILLOTINE_CROSS]().activeSkills)]).toEqual(['Dark Claw']);
    expect([...supersededDebuffNames(JobBuffs, new CLASS_CTOR_BY_ID[INQUISITOR]().activeSkills)]).toEqual(['Oleum Sanctum']);
  });

  it('keeps Cometa at a single 50% — the Warlock casting it and anyone receiving it', () => {
    // Client description of Cometa (skill 2213): "[Vício Mágico] ... reduz a resistência aos
    // ataques de todas as propriedades em 50%", i.e. a x1,5 on the damage, never x2.
    expect(cometBonus(WARLOCK, { classRow: true })).toBe(50);
    expect(cometBonus(WARLOCK, { sharedRow: true })).toBe(50);
    expect(cometBonus(WARLOCK, { classRow: true, sharedRow: true })).toBe(50);
    expect(cometBonus(HIGH_WIZARD, { sharedRow: true })).toBe(50);
    expect(cometBonus(WARLOCK, {})).toBe(0);
  });
});
