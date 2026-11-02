import { describe, expect, it } from 'vitest';
import { ptBR } from '../i18n/pt-br';
import { catalog as es } from '../i18n/es';
import { catalog as en } from '../i18n/en';
import { GuillotineCross } from './GuillotineCross';

/** What Aplicar Toxina puts on the bonus map for a toxin (and a level control value). */
function toxinBonus(toxin: number, levelValue = 0) {
  const cls: any = new GuillotineCross();
  const activeSkillIds = cls.activeSkills.map((a: any) =>
    a.name === 'Poisonous Weapon' ? toxin : a.name === 'Poisonous Weapon Lv' ? levelValue : 0);
  const passiveSkillIds = cls.passiveSkills.map(() => 0);
  const { equipAtks, activeSkillNames } = cls.setLearnSkills({ activeSkillIds, passiveSkillIds }).getSkillBonusAndName();
  return { bonus: equipAtks['Poisonous Weapon'], active: activeSkillNames.has('Poisonous Weapon') };
}

const toxinControl = () => new GuillotineCross().activeSkills.find((a) => a.name === 'Poisonous Weapon')!;
const levelControl = () => new GuillotineCross().activeSkills.find((a) => a.name === 'Poisonous Weapon Lv')!;

describe('Aplicar Toxina — level and toxin', () => {
  it('"-" means no toxin applied: no bonus at all, whatever the level', () => {
    expect(toxinBonus(0)).toEqual({ bonus: undefined, active: false });
    expect(toxinBonus(0, 3)).toEqual({ bonus: undefined, active: false });
  });

  // bROWiki, Aplicar Toxina: melee physical damage +2/4/6/8/10% at Nv 1-5.
  it.each([
    [1, 2],
    [2, 4],
    [3, 6],
    [4, 8],
    [0, 10],
  ])('level value %i gives melee +%i%% with a toxin that has no damage effect (Cicuta)', (levelValue, melee) => {
    expect(toxinBonus(4, levelValue)).toEqual({ bonus: { melee }, active: true });
  });

  it('the level control defaults to Nv 5 and is never "in use" on its own', () => {
    const level = levelControl();
    expect(level.dropdown.find((o) => o.value === 0)?.skillLv).toBe(5);
    expect(level.dropdown.every((o) => !o.isUse)).toBe(true);
  });

  // Client descriptions, "No usuário": Pirexia "Dano crítico +15%. Dano físico de ataques
  // básicos +5%."; Waraitake "Pós-conjuração -10%.".
  it('adds the toxin\'s own self effect on top of the skill bonus', () => {
    expect(toxinBonus(1)).toEqual({ bonus: { criDmg: 15, flatBasicDmg: 5, melee: 10 }, active: true });
    expect(toxinBonus(2, 2)).toEqual({ bonus: { acd: 10, melee: 4 }, active: true });
  });

  it('keeps Pirexia on 1 and Waraitake on 2, the values saved builds carry', () => {
    const byValue = Object.fromEntries(toxinControl().dropdown.map((o) => [o.value, o.label]));
    expect([byValue[1], byValue[2]]).toEqual(['Pirexia', 'Waraitake']);
  });

  it('offers every toxin the skill can apply, the eight items 12717-12724', () => {
    const keys = toxinControl().dropdown.filter((o) => o.isUse).map((o) => o.labelKey).sort();
    expect(keys).toEqual([12717, 12718, 12719, 12720, 12721, 12722, 12723, 12724].map((id) => `cs.toxin.${id}`));
  });

  // The names the LATAM client itself uses for items 12717-12724 in each language.
  it('names each toxin as the client does in every language', () => {
    const names = (catalog: Record<string, string>) => toxinControl().dropdown.filter((o) => o.labelKey).map((o) => catalog[o.labelKey!]);
    expect(names(ptBR)).toEqual(['Curare', 'Squamata', 'Vipera', 'Beladona', 'Cicuta', 'Oblivium', 'Waraitake', 'Pirexia']);
    expect(names(es as Record<string, string>)).toEqual(['Parálisis', 'Herida de Muerte', 'Fluido de Sanguijuela', 'Sangre Envenenada', 'Toxina', 'Maldición del Ovido', 'Hongo Mágico', 'Pirexia']);
    expect(names(en as Record<string, string>)).toEqual(['Paralysis', 'Death Hurt', 'Leech End', 'Venom Bleed', 'Toxin', 'Oblivion Curse', 'Magic Mushroom', 'Pyrexia']);
  });
});
