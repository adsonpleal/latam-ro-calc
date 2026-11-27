import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CalculatorController } from '../core/calculator-controller';
import { makeCalculator } from '../core/__tests__/make-calculator';
import { SKILL_META } from '../skills';
import { createMainModel } from '../utils';
import { CharacterBase } from './_character-base.abstract';
import { Minstrel, Ranger, ShadowChaser, Troubadour, Trouvere, Wanderer } from './index';

/**
 * Which classes may switch Ilimitar on, and at which levels.
 *
 * Tracker 07U7lMEjHBdbQ1AH8aP3: a Maestro/Diva player could not find the buff in the panel
 * even though Colar Consagrado: Amizade (491112) grants it to them.
 *
 * The level table is the skill's own client description (id 5002, "Nível l Dano físico a
 * distância": x1,5 / x2,0 / x2,5 / x3,0 / x3,5, i.e. `range` 150 … 350).
 *
 * Ranger learns the skill and Shadow Chaser copies it, so both keep all five levels. The
 * bard/dancer fourth jobs — Maestro (Troubadour) and Diva (Trouvere) — learn it from nobody
 * and receive it only through the necklace's Conjunto clause in `latam-items.json`, "Ao usar
 * [Atirar Rosas], 3% de chance de ativar o efeito de [Ilimitar] nv.3", so nv.3 is the only
 * level a build of theirs can hold. The third jobs under them (Trovador and Musa) neither
 * learn it nor can wear the item — it asks for base level 210 — so the row must not reach
 * them, and `Troubadour extends Minstrel` makes that worth asserting.
 */

const ITEMS = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const MONSTERS = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));
/**
 * "Dummy - Médio": resists nothing, so a ranged bonus arrives whole. `makeCalculator`'s own
 * INERT_MONSTER is not usable here — it carries its element under `stats` only, and the full
 * `runChain` damage pass reads `monster.elementName` at the top level.
 */
const DUMMY = 21065;
/** The real table: `makeCalculator`'s synthetic one has no rows for these jobs, and the HP
 *  pass then logs a caught "cannot read baseHp" for every build it is handed. */
const HP_SP_TABLE = JSON.parse(readFileSync('src/assets/demo/data/hp_sp_table.json', 'utf8'));

const ROW = 'No Limits';
/** The Conjunto weapon each class can actually equip — `usableClass` locks one to each. */
const WEAPON = { Troubadour: 570019, Trouvere: 580019 } as const;
const NECKLACE = 491112;

const FULL_TABLE = [[1, 150], [2, 200], [3, 250], [4, 300], [5, 350]];

const FOURTH = [
  { name: 'Troubadour', make: () => new Troubadour(), weapon: WEAPON.Troubadour },
  { name: 'Trouvere', make: () => new Trouvere(), weapon: WEAPON.Trouvere },
];

/** The Ilimitar row's usable options as [level, range], lowest level first. */
function tableOf(cls: CharacterBase): [number, number][] | undefined {
  return cls.activeSkills
    .find((skill) => skill.name === ROW)
    ?.dropdown.filter((option) => option.isUse)
    .map((option) => [option.value, option.bonus.range] as [number, number])
    .sort((a, b) => a[0] - b[0]);
}

/** What the catalog hands the engine with Ilimitar switched to `level` (0 = off). */
function useIlimitar(cls: CharacterBase, level: number) {
  const rows = cls.activeSkills;
  const index = rows.findIndex((skill) => skill.name === ROW);
  const activeSkillIds = rows.map((_, position) => (position === index ? level : 0));

  return cls.setLearnSkills({ activeSkillIds, passiveSkillIds: [] }).getSkillBonusAndName();
}

/** `totalEquipStatus.range` for a level-250 build holding its Conjunto weapon and the necklace. */
function rangeBonusOf(cls: CharacterBase, weapon: number, level: number): number {
  const calc = makeCalculator(ITEMS, cls).setHpSpTable(HP_SP_TABLE);
  const { equipAtks, masteryAtks, activeSkillNames, learnedSkillMap } = useIlimitar(cls, level);
  const model = Object.assign(createMainModel(), {
    level: 250, jobLevel: 50, weapon, weaponRefine: 10, accLeft: NECKLACE,
  });

  calc.loadItemFromModel(model);
  new CalculatorController().runChain(calc, {
    monster: MONSTERS[DUMMY], equipAtks, masteryAtks, buffEquips: {}, buffMasterys: {},
    consumeData: [], aspdPotion: 0, extraOptionScripts: [], activeSkillNames, learnedSkillMap,
    selectedAtkSkill: '', selectedChances: [], usedHpL: false,
  } as any);

  return (calc as any).totalEquipStatus.range ?? 0;
}

describe('Ilimitar availability', () => {
  it('is skill 5002, which is what the panel labels Ilimitar', () => {
    expect(SKILL_META[ROW]).toMatchObject({ id: 5002, label: 'Ilimitar' });
  });

  it.each([
    { name: 'Ranger', make: () => new Ranger() },
    { name: 'Shadow Chaser', make: () => new ShadowChaser() },
  ])('$name keeps the whole client table', ({ make }) => {
    expect(tableOf(make())).toEqual(FULL_TABLE);
  });

  it.each(FOURTH)('$name offers the nv.3 the necklace grants and no other level', ({ make }) => {
    expect(tableOf(make())).toEqual([[3, 250]]);
  });

  it.each([
    { name: 'Minstrel', make: () => new Minstrel() },
    { name: 'Wanderer', make: () => new Wanderer() },
  ])('$name is not offered the row at all', ({ make }) => {
    expect(tableOf(make())).toBeUndefined();
  });

  it.each(FOURTH)('$name turning Ilimitar nv.3 on adds 250% to ranged damage', ({ make, weapon }) => {
    const off = rangeBonusOf(make(), weapon, 0);

    expect(rangeBonusOf(make(), weapon, 3)).toBe(off + 250);
  });

  it.each(FOURTH)('$name reports Ilimitar as used so the class hooks can see it', ({ make }) => {
    const { activeSkillNames, equipAtks } = useIlimitar(make(), 3);

    expect(activeSkillNames.has(ROW)).toBe(true);
    expect(equipAtks[ROW]).toEqual({ range: 250 });
    expect(useIlimitar(make(), 0).activeSkillNames.has(ROW)).toBe(false);
  });

  // The row is appended after the job catalog, so a build saved before it existed carries one
  // fewer active skill. Without this tolerance every such save would have its whole positional
  // array discarded (calculator-session.ts reads activeSkillMap[name] ?? positional ?? 0).
  it.each(FOURTH)('$name still accepts a positional save made before the row existed', ({ make }) => {
    const cls = make();
    const current = cls.activeSkills.length;

    expect(cls.matchesSavedSkillCount('active', current)).toBe(true);
    expect(cls.matchesSavedSkillCount('active', current - 1)).toBe(true);
    expect(cls.matchesSavedSkillCount('active', current - 2)).toBe(false);
  });
});
