import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Calculator } from '../core/calculator';
import { CalculatorController } from '../core/calculator-controller';
import { SKILL_META } from '../skills';
import {
  CHAIN_LIGHTNING, CRIMSON_ROCK, DIAMOND_DUST, EARTH_STRAIN, JUDEX, KILLING_CLOUD, SOUL_EXPANSION,
} from '../skills/shared-skills';
import { createMainModel } from '../utils';
import { AbyssChaser } from './AbyssChaser';
import { AtkSkillModel, CharacterBase } from './_character-base.abstract';
import { ShadowChaser } from './ShadowChaser';
import { ClassIDEnum } from './_class-name';

/**
 * https://issues.latam-tools.com.br/t/YuCYWGJl6T71nXVIyoCd
 *
 * The Arco Híbrido (700132) buffs eight third-class spells and auto-casts them off ranged
 * physical hits. A Renegado reaches those spells by copying one with Mimetismo and casting
 * it himself, and bROWiki publishes which third-class skills that allows — all eight of
 * the bow's are on the list: https://browiki.org/wiki/Mimetismo#Habilidades
 *
 * This pins the pairing from both ends — the class offers each of the eight, and the bow's
 * own +10% reaches the one its arrow names — so the picker and the item data cannot drift
 * apart again. The arrow→skill pairs are read off the bow rather than restated.
 */
type JobCtor = new () => CharacterBase;

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const monsters = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));
const hpSpTable = JSON.parse(readFileSync('src/assets/demo/data/hp_sp_table.json', 'utf8'));

const HYBRID_BOW = 700132;

/** Skill id -> the arrow whose "Conjunto" block names it, straight off the bow's script. */
const ARROW_FOR_SKILL = new Map<number, number>(items[HYBRID_BOW].script.autoCast
  .map((rule: { skillId: number; chance: string[] }) =>
    [rule.skillId, Number(/EQUIP_ID\[(\d+)]/.exec(rule.chance[0])![1])]));

/**
 * The eight, each with the maximum level Mimetismo can copy it to, and the shared
 * definition the entry is built from. Onda Psíquica is the one the Renegado already
 * offered: it keeps the Renegado's own weapon clause (×2 with a rod or a book), so it is
 * written out in the job file and has no shared counterpart.
 */
const COPIED: { name: string; id: number; max: number; shared?: AtkSkillModel }[] = [
  { name: 'Soul Expansion', id: 2202, max: 5, shared: SOUL_EXPANSION },
  { name: 'Earth Strain', id: 2216, max: 5, shared: EARTH_STRAIN },
  { name: 'Crimson Rock', id: 2211, max: 5, shared: CRIMSON_ROCK },
  { name: 'Diamond Dust', id: 2447, max: 5, shared: DIAMOND_DUST },
  { name: 'Chain Lightning', id: 2214, max: 5, shared: CHAIN_LIGHTNING },
  { name: 'Psychic Wave', id: 2449, max: 5 },
  { name: 'Judex', id: 2038, max: 10, shared: JUDEX },
  { name: 'Killing Cloud', id: 2450, max: 5, shared: KILLING_CLOUD },
];

const CAST_FIELDS = ['fct', 'vct', 'acd', 'cd'] as const;
const unlearned = (Job: JobCtor): CharacterBase => {
  const cls = new Job();
  cls.setLearnSkills({ activeSkillIds: cls.activeSkills.map(() => 0), passiveSkillIds: cls.passiveSkills.map(() => 0) })
    .getSkillBonusAndName();

  return cls;
};

function solve(Job: JobCtor, skill: string, ammo?: number) {
  const cls = new Job();
  const { equipAtks, masteryAtks, activeSkillNames, learnedSkillMap } = cls
    .setLearnSkills({ activeSkillIds: cls.activeSkills.map(() => 0), passiveSkillIds: cls.passiveSkills.map(() => 0) })
    .getSkillBonusAndName();
  const model = Object.assign(createMainModel(), {
    class: Job === AbyssChaser ? ClassIDEnum.AbyssChaser : ClassIDEnum.ShadowChaser,
    level: 200, jobLevel: 70, int: 130, dex: 100, agi: 100,
    weapon: HYBRID_BOW, selectedAtkSkill: skill, ammo,
  });
  const calc = new Calculator().setMasterItems(items).setHpSpTable(hpSpTable).setClass(cls);
  calc.loadItemFromModel(model);
  new CalculatorController().runChain(calc, {
    monster: monsters[21067], equipAtks, masteryAtks, buffEquips: {}, buffMasterys: {},
    consumeData: [], aspdPotion: 0, extraOptionScripts: [], activeSkillNames, learnedSkillMap,
    selectedAtkSkill: skill, selectedChances: [], usedHpL: false,
  });

  return { damage: calc.getTotalSummary().dmg, bonus: calc.totalEquipStatus };
}

describe.each([
  { name: 'Renegado', Job: ShadowChaser },
  { name: 'Mandraque', Job: AbyssChaser },
])('$name — third-class spells copied with Mimetismo', ({ Job }) => {
  const offered = unlearned(Job).atkSkills;
  const entryFor = (name: string) => offered.filter((skill) => skill.name === name);

  it('offers every spell the Arco Híbrido names, at every level Mimetismo can copy', () => {
    for (const { name, id, max } of COPIED) {
      expect(entryFor(name), name).toHaveLength(1);
      expect(SKILL_META[name].id, name).toBe(id);
      // Mimetismo's level caps the copy, so every level has to be pickable on its own.
      expect(entryFor(name)[0].levelList?.map(({ value }) => value), name)
        .toEqual(Array.from({ length: max }, (unused, index) => `${name}==${index + 1}`));
    }
  });

  /**
   * A class entry wins over the shared definition in `skillForId` (core/auto-cast.ts), so
   * these entries are now what the bow's own auto-cast of the same id resolves to. Keeping
   * them spread from the shared constant is what stops the picker and the proc printing
   * two different numbers for one spell; only cast and delay may differ, because the
   * shared definitions zero those for procs. The client's own values are checked per level
   * by skills/skill-delay.spec.ts — here it is just that nothing else was overridden.
   */
  it('changes nothing but cast and delay against the shared definition', () => {
    for (const { name, shared } of COPIED) {
      if (!shared) continue;
      const ours: Partial<AtkSkillModel> = { ...entryFor(name)[0] };
      const theirs: Partial<AtkSkillModel> = { ...shared };
      for (const field of CAST_FIELDS) {
        expect(ours[field], `${name} ${field}`).not.toEqual(undefined);
        delete ours[field];
        delete theirs[field];
      }
      expect(ours, name).toEqual(theirs);
    }
  });

  it('calculates magic damage for each of them with the bow equipped', () => {
    for (const { name, max } of COPIED) {
      const { damage } = solve(Job, `${name}==${max}`);
      expect(damage.baseSkillDamage, name).toBeGreaterThan(0);
      expect(damage.skillMaxDamage, name).toBeGreaterThan(0);
    }
  });

  it("lets each arrow's +10% reach the spell its own Conjunto block names", () => {
    expect(ARROW_FOR_SKILL.size).toBe(COPIED.length);
    for (const { name, id, max } of COPIED) {
      const ammo = ARROW_FOR_SKILL.get(id)!;
      const equipped = solve(Job, `${name}==${max}`, ammo);
      expect(equipped.bonus[String(id)] ?? 0, name).toBe(10);
      expect(equipped.damage.skillBonusFromEquipment, name).toBe(10);
      // One arrow, one spell: any other arrow leaves this one alone.
      const otherArrow = [...ARROW_FOR_SKILL.values()].find((value) => value !== ammo)!;
      expect(solve(Job, `${name}==${max}`, otherArrow).damage.skillBonusFromEquipment, name).toBe(0);
    }
  });
});
