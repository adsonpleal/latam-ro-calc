import { createMainModel } from 'src/app/utils';
import { SuperNovice } from 'src/app/jobs';
import { equipStatusOf, makeCalculator } from './__tests__/make-calculator';
import { ITEM_DB, wornBonus } from './__tests__/worn-bonus';
import { bonusKeyLabel } from './bonus-key-label';

/**
 * `enable_skill__<id>` — an item that grants a skill rather than boosting it.
 *
 * 400528 Boina Escarlate-OS, whose pt-BR description declares the set:
 *
 *   ^FA4E09Conjunto^000000 ^FA4E09[Rutilus-OS]^000000
 *   Habilita [Meteoro Escarlate] nv.5.
 *   A cada 2 refinos da arma: Dano mágico de propriedade Fogo +3%.
 *
 * Meteoro Escarlate (Crimson Rock, 2211) is not in the Superaprendiz skill tree, so this
 * combo is the only way the class reaches it. Registering the grant as a bonus key lets
 * SuperNovice.ts gate the skill on the item instead of hardcoding the two ids, and puts
 * the line in the item's bonus list where the player can see it.
 *
 * Reported anonymously, tracker RtQoUCeAB7NxnzQ7Xlkq. The gate's own cases live in
 * jobs/super-novice-skills.spec.ts.
 */

const BOINA = 400528;
const RUTILUS = 26151; // Rutilus Stick-OS [2] — the set's weapon
const OTHER_STAFF = 1602; // Rod [4] — an inert stand-in that is not the set partner

/** The set is class-gated ("Superaprendizes e evoluções"), so wear it on one. */
const worn = (opts: { weapon?: number; weaponRefine?: number; withBoina?: boolean }) =>
  wornBonus({
    headUpper: opts.withBoina === false ? undefined : BOINA,
    weapon: opts.weapon,
    weaponRefine: opts.weaponRefine,
    cls: new SuperNovice(),
  });

const grant = (opts: Parameters<typeof worn>[0]) => worn(opts)['enable_skill__2211'] ?? 0;

describe('Boina Escarlate-OS 400528 — Conjunto [Rutilus-OS] habilita Meteoro Escarlate nv.5', () => {
  it('grants nothing with the headgear alone', () => {
    expect(grant({})).toBe(0);
  });

  it('grants nothing with a weapon that is not the set partner', () => {
    expect(grant({ weapon: OTHER_STAFF })).toBe(0);
  });

  it('grants nothing with the partner but no headgear — the grant is the boina\'s clause', () => {
    expect(grant({ weapon: RUTILUS, withBoina: false })).toBe(0);
  });

  it('grants level 5 with both pieces, at any refine', () => {
    expect(grant({ weapon: RUTILUS })).toBe(5);
    expect(grant({ weapon: RUTILUS, weaponRefine: 11 })).toBe(5);
  });

  it('matches the set partner by id, not by name', () => {
    expect(ITEM_DB[BOINA].script['enable_skill__2211']).toEqual(['EQUIP_ID[26151]===5']);
  });

  it('leaves the set\'s other clause alone', () => {
    // "A cada 2 refinos da arma: Dano mágico de propriedade Fogo +3%."
    expect(worn({ weapon: RUTILUS, weaponRefine: 10 })['m_my_element_fire']).toBe(15);
  });

  it('reads as a pt-BR line in the item bonus list', () => {
    expect(bonusKeyLabel('enable_skill__2211')).toBe('Habilita Meteoro Escarlate');
  });
});

describe('Two items granting the same skill take the best level, not the sum', () => {
  /**
   * A granted level is not additive — nv.5 twice is still nv.5. Only one item grants
   * Meteoro Escarlate today, so the second grantor here is synthetic: the point is to
   * hold `updateTotalStatus` to max-semantics for the key family before a real second
   * one ships and quietly stacks into a level the game does not give.
   */
  const grantingBoot = (level: number) => ({
    ...ITEM_DB[2413], // Coturnos — an inert host, no script of its own
    itemTypeId: 2,
    itemSubTypeId: 516,
    script: { [`enable_skill__2211`]: [`${level}`] },
  });

  const both = (bootLevel: number) => {
    const items: Record<number, any> = { [BOINA]: ITEM_DB[BOINA], [RUTILUS]: ITEM_DB[RUTILUS], 2413: grantingBoot(bootLevel) };
    const model: any = createMainModel();
    model.level = 200;
    model.headUpper = BOINA;
    model.weapon = RUTILUS;
    model.boot = 2413;

    return equipStatusOf(makeCalculator(items, new SuperNovice()), model)['enable_skill__2211'];
  };

  it('keeps 5 when both grant 5', () => {
    expect(both(5)).toBe(5);
  });

  it('takes the higher of the two', () => {
    expect(both(3)).toBe(5);
    expect(both(7)).toBe(7);
  });
});
