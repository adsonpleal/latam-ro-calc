import { describe, expect, it } from 'vitest';
import { GuillotineCross } from './GuillotineCross';

/** What the Aplicar Toxina dropdown puts on the bonus map for a given option value. */
function toxinBonus(value: number) {
  const cls: any = new GuillotineCross();
  const activeSkillIds = cls.activeSkills.map((a: any) => (a.name === 'Poisonous Weapon' ? value : 0));
  const passiveSkillIds = cls.passiveSkills.map(() => 0);
  const { equipAtks, activeSkillNames } = cls.setLearnSkills({ activeSkillIds, passiveSkillIds }).getSkillBonusAndName();
  return { bonus: equipAtks['Poisonous Weapon'], active: activeSkillNames.has('Poisonous Weapon') };
}

describe('Aplicar Toxina — toxin choices', () => {
  it('"-" means no toxin applied: no bonus at all', () => {
    expect(toxinBonus(0)).toEqual({ bonus: undefined, active: false });
  });

  // bROWiki, Aplicar Toxina: melee physical damage +2/4/6/8/10% at Nv 1-5.
  it.each([
    [3, 1, 2],
    [4, 2, 4],
    [5, 3, 6],
    [6, 4, 8],
    [7, 5, 10],
  ])('a toxin with no status (value %i, Nv %i) gives only the skill bonus, melee +%i%%', (value, _lv, melee) => {
    expect(toxinBonus(value)).toEqual({ bonus: { melee }, active: true });
  });

  it('keeps Pyrexia and Magic Mushroom on the values saved builds already carry', () => {
    expect(toxinBonus(1).bonus).toEqual({ criDmg: 15, flatDmg: 5, melee: 10 });
    expect(toxinBonus(2).bonus).toEqual({ acd: 10, melee: 10 });
  });
});
