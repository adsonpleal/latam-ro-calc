import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { JobBuffs } from 'src/app/constants/job-buffs';
import { Calculator } from 'src/app/core/calculator';
import { CalculatorController, collectBuffBonuses, supersededDebuffNames } from 'src/app/core/calculator-controller';
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

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const monsters = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));
const hpSpTable = JSON.parse(readFileSync('src/assets/demo/data/hp_sp_table.json', 'utf8'));

const NEUTRAL_LV1 = '21077';
const WARLOCK = 6;
const HIGH_WIZARD = 4010;
const COMET_AMP = 'Comet Amp';

/** A buff row shows its own curated label; an active row takes the pt-BR skill name. */
const buffRowLabel = (row: { name: string; label: string }) => row.label;
const activeRowLabel = (row: { name: string; label: string }) => resolveSkillMeta(row.name)?.label ?? row.label;

/** The rows the panel renders under "Debuffs no monstro", in render order. */
function monsterDebuffRows(classId: number) {
  const cls = new CLASS_CTOR_BY_ID[classId]();
  const superseded = supersededDebuffNames(JobBuffs, cls.activeSkills);

  return [
    ...JobBuffs.filter((buff) => buff.isDebuff && !superseded.has(buff.name)).map((buff) => ({ name: buff.name, label: buffRowLabel(buff) })),
    ...cls.activeSkills.filter((skill) => skill.isDebuff).map((skill) => ({ name: skill.name, label: activeRowLabel(skill) })),
  ];
}

/**
 * The `comet` bonus the engine ends up with, through the real buff-collection path.
 * `classRow`/`sharedRow` are the two controls the panel used to show side by side.
 */
function cometBonus(classId: number, selection: { classRow?: boolean; sharedRow?: boolean }) {
  const cls: any = new CLASS_CTOR_BY_ID[classId]();
  const activeIndex = cls.activeSkills.findIndex((skill: { name: string }) => skill.name === COMET_AMP);
  cls.setLearnSkills({
    activeSkillIds: cls.activeSkills.map((_: unknown, i: number) => (selection.classRow && i === activeIndex ? 1 : 0)),
    passiveSkillIds: cls.passiveSkills.map(() => 0),
  });
  const { equipAtks, masteryAtks, activeSkillNames, learnedSkillMap } = cls.getSkillBonusAndName();

  const buffIndex = JobBuffs.findIndex((buff) => buff.name === COMET_AMP);
  const selectedBuffValues = JobBuffs.map((_, i) => (selection.sharedRow && i === buffIndex ? 1 : 0));
  const { equipAtk: buffEquips } = collectBuffBonuses(JobBuffs as any, selectedBuffValues, activeSkillNames);

  const model: any = createMainModel();
  model.class = cls.classId;
  model.level = 250;
  model.jobLevel = 1;
  model.int = 130;

  const calc = new Calculator().setMasterItems(items).setHpSpTable(hpSpTable).setClass(cls);
  calc.loadItemFromModel(model);
  new CalculatorController().runChain(calc, {
    monster: monsters[NEUTRAL_LV1], equipAtks, masteryAtks, buffEquips, buffMasterys: {}, consumeData: [],
    aspdPotion: undefined, extraOptionScripts: [], activeSkillNames, learnedSkillMap,
    selectedAtkSkill: undefined, selectedChances: [], usedHpL: false,
  } as any);

  return (calc as any).totalEquipStatus['comet'] ?? 0;
}

describe('the monster-debuff list offers one control per debuff', () => {
  it('names no debuff twice, for any class', () => {
    for (const classId of Object.keys(CLASS_CTOR_BY_ID).map(Number)) {
      const rows = monsterDebuffRows(classId);
      const names = rows.map((row) => row.name);

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
    // The Warlock's own 3rd-class list, so the Magus inherits it; the Bruxo does not have it.
    expect([...supersededDebuffNames(JobBuffs, new CLASS_CTOR_BY_ID[4255]().activeSkills)]).toEqual([COMET_AMP]);
    expect([...supersededDebuffNames(JobBuffs, new CLASS_CTOR_BY_ID[HIGH_WIZARD]().activeSkills)]).toEqual([]);
    // The two other pairs that collided in the same section.
    expect([...supersededDebuffNames(JobBuffs, new CLASS_CTOR_BY_ID[5]().activeSkills)]).toEqual(['Dark Claw']);
    expect([...supersededDebuffNames(JobBuffs, new CLASS_CTOR_BY_ID[4262]().activeSkills)]).toEqual(['Oleum Sanctum']);
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
