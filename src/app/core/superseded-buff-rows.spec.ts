/**
 * A buff declared both in the shared `JobBuffs` list and in a class's own active skills is
 * offered to that class twice: the view model builds the two lists independently and filters
 * neither against the other. Where the second control lands depends on `isDebuff` — under
 * "Buffs" for a buff, at the other end of "Debuffs no monstro" for a debuff — and both halves
 * were reported:
 *
 *   card ILA1aEHJlA3co9iD6zEQ (Reagan*)  "nas habilidades > debuffs no monstro o cometa
 *                                         aparece duas vezes, uma no comeco e outra no final"
 *   card v8ColE3Z8QamyuHAmWTM (Adson)    "Buffs da classe devem aparece em Habilidades e
 *                                         efeitos ativos. E não devem ficar duplicadas em
 *                                         Buffs. Um outro exemplo é o Poema de Bragi, ele
 *                                         aparece no maestro duplicado."
 *
 * `supersededBuffNames` answers which shared rows drop out for a class, and the class row is
 * the survivor. buff-panel-duplicate-rows.spec.ts holds every class's whole panel to the
 * result; this spec is about the rule itself and about the bonus behind it, which has to stay
 * a single application however the two controls are set.
 */
import { describe, expect, it } from 'vitest';
import { JobBuffs } from 'src/app/constants/job-buffs';
import { collectBuffBonuses, supersededBuffNames } from 'src/app/core/calculator-controller';
import { jobBuffEntry } from 'src/app/core/__tests__/job-buff-bonus';
import { equipStatusOf, makeCalculator } from 'src/app/core/__tests__/make-calculator';
import { CLASS_CTOR_BY_ID } from 'src/app/jobs/_class-list';
import { CharacterBase } from 'src/app/jobs/_character-base.abstract';
import { createMainModel } from 'src/app/utils';

const HIGH_WIZARD = 4010;
const WARLOCK = 6;
const ARCH_MAGE = 4255;
const GUILLOTINE_CROSS = 5;
const INQUISITOR = 4262;
const TROUBADOUR = 4263;
const SNIPER = 4012;
const CARDINAL = 4256;
const TAEKWONDO = 4046;

const supersededFor = (classId: number) =>
  [...supersededBuffNames(JobBuffs, new CLASS_CTOR_BY_ID[classId]().activeSkills)].sort();

describe('which shared rows a class loses', () => {
  it('hides exactly the ones it casts itself', () => {
    // Declared on the Warlock's own 3rd-class list, so the Magus inherits it.
    expect(supersededFor(WARLOCK)).toEqual(['Comet Amp']);
    expect(supersededFor(ARCH_MAGE)).toEqual(['Comet Amp']);
    expect(supersededFor(GUILLOTINE_CROSS)).toEqual(['Dark Claw']);
    expect(supersededFor(INQUISITOR)).toEqual(['Oleum Sanctum']);
    // The card's two examples: Concentrar comes down the Arqueiro line to the Maestro, whose
    // own songs cover two of the three shared ones (Sinfonia dos Ventos is in the table below).
    expect(supersededFor(TROUBADOUR)).toEqual(["Bragi's Poem", 'Improve Concentration', 'Swing Dance']);
    expect(supersededFor(SNIPER)).toEqual(['Improve Concentration']);
    expect(supersededFor(CARDINAL)).toEqual([
      'Argutus Telum', 'Argutus Vita', 'Gloria', 'Lauda Ramus', 'Laudaagnus', 'Presens Acies', 'Sacramentum',
    ]);
  });

  it('takes nothing away from a class that only receives buffs', () => {
    // The Taekwondo casts none of the shared list, so its "Buffs" section is the whole of it.
    expect(supersededFor(TAEKWONDO)).toEqual([]);
  });

  /**
   * Name alone is not enough, and this is the case that proves it. The Bruxo's own
   * Amplificação Mística row offers Nv 10 only; the shared row offers Nv 5 and Nv 10. Hiding
   * the shared row on the strength of the matching name would take Nv 5 away from a player
   * who has it — so the rule asks whether the class row can grant everything the shared one
   * could, and here it cannot. Both rows stay up, and buff-panel-duplicate-rows.spec.ts
   * lists the six pairs in that position with what each disagrees about.
   */
  it('keeps a shared row whose options the class row cannot all grant', () => {
    expect(supersededFor(HIGH_WIZARD)).toEqual([]);

    const shared = jobBuffEntry('Mystical Amplification');
    const classRow = new CLASS_CTOR_BY_ID[HIGH_WIZARD]().activeSkills
      .find((skill) => skill.name === 'Mystical Amplification')!;

    expect(shared.dropdown.map((option) => option.bonus?.mysticAmp).filter(Boolean).sort()).toEqual([25, 50]);
    expect(classRow.dropdown.map((option) => option.bonus?.mysticAmp).filter(Boolean)).toEqual([50]);
  });
});

/**
 * The bonus, through the real collection path. Reading it off the two bonus maps by hand
 * would prove nothing: the class's `equipAtks` and the buffs' `equipAtk` are accumulated by
 * two separate summing loops under the same key, which is exactly why a double count was
 * conceivable — and why this measures the engine's own total instead.
 *
 * `classRow`/`sharedRow` are the two controls the panel used to show side by side.
 */
function equipBonusOf(classId: number, buffName: string, selection: { classRow?: boolean; sharedRow?: boolean }) {
  const cls = new CLASS_CTOR_BY_ID[classId]() as CharacterBase;
  // makeCalculator relearns the class with no skills, so the selection is applied after it.
  const calc = makeCalculator({}, cls);
  // The highest level either side offers. The two dropdowns are sorted the opposite way —
  // a class row descends, a shared row ascends — so "the first usable option" would compare
  // Nv 10 against Nv 1.
  const on = (dropdown?: { value: any; isUse?: boolean }[]) =>
    Math.max(0, ...(dropdown ?? []).filter((option) => option.isUse).map((option) => Number(option.value)));
  // A class that only receives the buff has no row of its own, which is a case worth
  // measuring: it is every other class in the game.
  const classDropdown = cls.activeSkills.find((skill) => skill.name === buffName)?.dropdown;
  const sharedDropdown = jobBuffEntry(buffName).dropdown;

  const { equipAtks, activeSkillNames } = cls.setLearnSkills({
    activeSkillIds: cls.activeSkills.map((skill) => (selection.classRow && skill.name === buffName ? on(classDropdown) : 0)),
    passiveSkillIds: cls.passiveSkills.map(() => 0),
  }).getSkillBonusAndName();

  const selectedBuffValues = JobBuffs.map((buff) => (selection.sharedRow && buff.name === buffName ? on(sharedDropdown) : 0));
  calc.setEquipAtkSkillAtk(equipAtks)
    .setBuffBonus({ masteryAtk: {}, equipAtk: collectBuffBonuses(JobBuffs, selectedBuffValues, activeSkillNames).equipAtk });

  return equipStatusOf(calc, createMainModel());
}

describe('the bonus behind the two controls', () => {
  // Client description of Cometa (skill 2213): "[Vício Mágico] ... reduz a resistência aos
  // ataques de todas as propriedades em 50%", i.e. a x1,5 on the damage, never x2.
  it('keeps Cometa at a single 50% — the Warlock casting it and anyone receiving it', () => {
    expect(equipBonusOf(WARLOCK, 'Comet Amp', { classRow: true })['comet']).toBe(50);
    expect(equipBonusOf(WARLOCK, 'Comet Amp', { sharedRow: true })['comet']).toBe(50);
    expect(equipBonusOf(WARLOCK, 'Comet Amp', { classRow: true, sharedRow: true })['comet']).toBe(50);
    expect(equipBonusOf(HIGH_WIZARD, 'Comet Amp', { sharedRow: true })['comet']).toBe(50);
    expect(equipBonusOf(WARLOCK, 'Comet Amp', {})['comet'] ?? 0).toBe(0);
  });

  // The skill this card is named after: DES e AGI +12% at Nv 10 for the Maestro, not +24%.
  it('keeps Concentrar at a single +12% for the Maestro', () => {
    expect(equipBonusOf(TROUBADOUR, 'Improve Concentration', { classRow: true })['agiBoost']).toBe(12);
    expect(equipBonusOf(TROUBADOUR, 'Improve Concentration', { sharedRow: true })['agiBoost']).toBe(12);
    expect(equipBonusOf(TROUBADOUR, 'Improve Concentration', { classRow: true, sharedRow: true })['dexBoost']).toBe(12);
  });

  /**
   * The same measurement over every colliding pair in the catalog, because the rule is the
   * catalog's and not these two buffs'. With both controls on, the engine must end up with
   * exactly what the class row alone grants — any key that doubled would show here.
   */
  it('never counts a buff twice, for any of them', () => {
    const casters = new Map<string, number>();
    for (const [classId, Ctor] of Object.entries(CLASS_CTOR_BY_ID)) {
      for (const name of supersededBuffNames(JobBuffs, new Ctor().activeSkills)) {
        if (!casters.has(name)) casters.set(name, Number(classId));
      }
    }
    // Every shared row some class also casts. A new collision has to be looked at rather
    // than silently joining the sweep.
    expect(casters.size).toBe(21);

    for (const [name, classId] of casters) {
      const classOnly = equipBonusOf(classId, name, { classRow: true });

      expect(equipBonusOf(classId, name, { classRow: true, sharedRow: true }), `${name} on class ${classId}`).toEqual(classOnly);
    }
  });
});
