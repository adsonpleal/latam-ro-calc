import { describe, expect, it } from 'vitest';
import { ActiveSkillModel } from './_character-base.abstract';
import { ImperialGuard } from './ImperialGuard';

/**
 * The two Imperial Guard stances, held to the client's own tables.
 *
 * Posição de Defesa (Guard Stance, 5255) was missing from the class entirely until a
 * replay showed what it costs: `RoyalGuard.over-brand-replay.spec.ts` reads a recording
 * whose ATQ Equip. jumps 572 -> 822 the instant the stance is dropped, and whose opening
 * damage band only closes with the -250 applied. This spec is the table behind that one
 * number, at every level:
 *
 *   Posição de Defesa   Nv 1..5   DEF +100/+150/+200/+250/+300   ATQ -50/-100/-150/-200/-250
 *   Posição de Ataque   Nv 1..5   DEF -40/-80/-120/-160/-200     P.ATQ e S.ATQM +3/+6/+9/+12/+15
 *
 * **In game they replace one another** — casting either cancels the other, and the
 * offensive tree (Golpe do Destino, Arremessar Escudo, Lança da Justiça) needs Posição de
 * Ataque, while Escudo Guardião / Remissão / Ultimato need Posição de Defesa. The
 * calculator has no way to express "these two dropdowns are exclusive", so a build can
 * switch both on; that is on whoever assembles it, and is why neither entry gates the
 * other here.
 */

const stanceOf = (name: string): ActiveSkillModel => {
  const skill = new ImperialGuard().activeSkills.find((s) => s.name === name);
  if (!skill) throw new Error(`active skill not found: ${name}`);
  return skill;
};

/** The dropdown as a level -> bonus table, dropping the "-" (level 0) option. The picker
 *  itself lists the levels highest-first, so they are put back in order here. */
const tableOf = (name: string) =>
  stanceOf(name)
    .dropdown.filter((o) => o.isUse)
    .map((o) => ({ level: o.value, ...(o.bonus as Record<string, number>) }))
    .sort((a, b) => a.level - b.level);

describe('Posição de Defesa — DEF +50 + 50 x nível, ATQ -50 x nível', () => {
  it('cobre os 5 níveis, com a tabela do cliente', () => {
    expect(tableOf('Guard Stance')).toEqual([
      { level: 1, atk: -50, def: 100 },
      { level: 2, atk: -100, def: 150 },
      { level: 3, atk: -150, def: 200 },
      { level: 4, atk: -200, def: 250 },
      { level: 5, atk: -250, def: 300 },
    ]);
  });

  // The ATQ it removes is equipment ATK — that is the half the recording measured, and
  // what puts it in the equip-ATK bucket instead of the mastery one.
  it('o ATQ que ela tira é ATQ de equipamento', () => {
    expect(stanceOf('Guard Stance').isEquipAtk).toBe(true);
    expect(stanceOf('Guard Stance').isMasteryAtk).toBeFalsy();
  });
});

describe('Posição de Ataque — DEF -40 x nível, P.ATQ e S.ATQM +3 x nível', () => {
  it('cobre os 5 níveis, com a tabela do cliente', () => {
    expect(tableOf('Attack Stance')).toEqual([
      { level: 1, pAtk: 3, sMatk: 3, def: -40 },
      { level: 2, pAtk: 6, sMatk: 6, def: -80 },
      { level: 3, pAtk: 9, sMatk: 9, def: -120 },
      { level: 4, pAtk: 12, sMatk: 12, def: -160 },
      { level: 5, pAtk: 15, sMatk: 15, def: -200 },
    ]);
  });
});
