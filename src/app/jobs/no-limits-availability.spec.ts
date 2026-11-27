import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Calculator } from '../core/calculator';
import { CalculatorController } from '../core/calculator-controller';
import { SKILL_META } from '../skills';
import { createMainModel } from '../utils';
import { CharacterBase } from './_character-base.abstract';
import { Minstrel, Ranger, ShadowChaser, Troubadour, Trouvere, Wanderer } from './index';

/**
 * Which classes may switch Ilimitar on, and at which levels.
 *
 * Tracker 07U7lMEjHBdbQ1AH8aP3: a Maestro/Diva player could not find the buff in the
 * panel even though Colar Consagrado: Amizade (491112) grants it to them.
 *
 * The level table is the skill's own client description (id 5002, "Nível l Dano físico a
 * distância": x1,5 / x2,0 / x2,5 / x3,0 / x3,5, i.e. `range` 150 … 350).
 *
 * Ranger learns the skill and Shadow Chaser copies it, so both keep all five levels. The
 * bard/dancer fourth jobs — Maestro (Troubadour) and Diva (Trouvere) — learn it from nobody
 * and receive it only through the necklace's "Ao usar [Atirar Rosas], 3% de chance de ativar
 * o efeito de [Ilimitar] nv.3" clause, so nv.3 is the only level a build of theirs can hold.
 * The third jobs under them (Trovador and Musa) neither learn it nor can wear the item — it
 * asks for base level 210 — so the row must not reach them.
 */

const ITEMS = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const MONSTERS = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));
const HP_SP_TABLE = JSON.parse(readFileSync('src/assets/demo/data/hp_sp_table.json', 'utf8'));

/** "Dummy - Médio": resists nothing, so a ranged bonus arrives whole. */
const DUMMY = 21065;
/** Açoite Vivatus Fides (whip) — the Conjunto weapon the Ilimitar clause names. */
const WHIP = 580019;
const NECKLACE = 491112;

const FULL_TABLE = [[1, 150], [2, 200], [3, 250], [4, 300], [5, 350]];

/** The Ilimitar row's usable options as [level, range], lowest level first. */
function tableOf(cls: CharacterBase): [number, number][] | undefined {
  const row = cls.activeSkills.find((skill) => skill.name === 'No Limits');

  return row?.dropdown
    .filter((option) => option.isUse)
    .map((option) => [option.value, option.bonus.range] as [number, number])
    .sort((a, b) => a[0] - b[0]);
}

/** The engine's own view of the panel: what the catalog hands over with Ilimitar on `level`. */
function useIlimitar(cls: CharacterBase, level: number) {
  const index = cls.activeSkills.findIndex((skill) => skill.name === 'No Limits');
  const activeSkillIds = cls.activeSkills.map((_, position) => (position === index ? level : 0));

  return cls.setLearnSkills({ activeSkillIds, passiveSkillIds: [] }).getSkillBonusAndName();
}

/** A level-250 Trovador holding the whip and the necklace, with Ilimitar on `level` (0 = off). */
function rangeBonusOf(cls: CharacterBase, level: number): number {
  const { equipAtks, masteryAtks, activeSkillNames, learnedSkillMap } = useIlimitar(cls, level);
  const model = Object.assign(createMainModel(), {
    level: 250, jobLevel: 50, weapon: WHIP, weaponRefine: 10, accLeft: NECKLACE,
  });
  const calc = new Calculator().setMasterItems(ITEMS).setHpSpTable(HP_SP_TABLE).setClass(cls);
  calc.loadItemFromModel(model);
  new CalculatorController().runChain(calc, {
    monster: MONSTERS[DUMMY], equipAtks, masteryAtks, buffEquips: {}, buffMasterys: {},
    consumeData: [], aspdPotion: 0, extraOptionScripts: [], activeSkillNames, learnedSkillMap,
    selectedAtkSkill: '', selectedChances: [], usedHpL: false,
  } as any);

  return (calc as any).totalEquipStatus.range ?? 0;
}

describe('Ilimitar availability', () => {
  it('is skill 5002 and reads as Ilimitar in the panel', () => {
    expect(SKILL_META['No Limits']).toMatchObject({ id: 5002, label: 'Ilimitar' });
  });

  it.each([['Ranger', new Ranger()], ['Shadow Chaser', new ShadowChaser()]] as const)(
    '%s keeps the whole client table', (_name, cls) => {
      expect(tableOf(cls)).toEqual(FULL_TABLE);
    });

  it.each([['Troubadour', new Troubadour()], ['Trouvere', new Trouvere()]] as const)(
    '%s offers the nv.3 the necklace grants and no other level', (_name, cls) => {
      expect(tableOf(cls)).toEqual([[3, 250]]);
    });

  it.each([['Minstrel', new Minstrel()], ['Wanderer', new Wanderer()]] as const)(
    '%s is not offered the row at all', (_name, cls) => {
      expect(tableOf(cls)).toBeUndefined();
    });

  it.each([['Troubadour', () => new Troubadour()], ['Trouvere', () => new Trouvere()]] as const)(
    '%s turning Ilimitar nv.3 on adds its 250%% to ranged damage', (_name, make) => {
      const off = rangeBonusOf(make(), 0);
      expect(rangeBonusOf(make(), 3)).toBe(off + 250);
    });

  it.each([['Troubadour', () => new Troubadour()], ['Trouvere', () => new Trouvere()]] as const)(
    '%s reports Ilimitar as used so the class hooks can see it', (_name, make) => {
      const { activeSkillNames, equipAtks } = useIlimitar(make(), 3);
      expect(activeSkillNames.has('No Limits')).toBe(true);
      expect(equipAtks['No Limits']).toEqual({ range: 250 });
      expect(useIlimitar(make(), 0).activeSkillNames.has('No Limits')).toBe(false);
    });
});
