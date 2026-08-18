import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Calculator } from 'src/app/core/calculator';
import { MysticSymphonyFn } from 'src/app/constants/share-passive-skills/mystic-symphony-fn';
import { createMainModel } from 'src/app/utils';
import { Trouvere } from './Trouvere';

/**
 * Sinfonia Mística (5351) — tracker card X47Hghzqed5N1JN1WUMr, reported as "the Diva's
 * ultimate does not enter the final damage formula; in game the bonuses add up".
 *
 * The client description states it as "Também aumenta em 100% o dano de: Arranjo Musical
 * / Disparo Rítmico / Atirar Rosas" — the "Dano de [perícia] +N%" form, which is a
 * per-skill bonus keyed by skill id. Those all land in one additive pool, read once as
 * `equipSkillMultiplier = (100 + equipSkillBonus) / 100`.
 *
 * It used to be applied as `mysticMult = 2` on the skill ratio, a stage of its own, so
 * the ultimate and the weapon multiplied instead of adding. The reporter's measurement is
 * what separates the two models: on top of a whip already worth ~+40%, the ultimate was
 * worth about +70% in game — 240/140 = 1.71, where a separate ×2 stage would have been a
 * flat +100% no matter what the weapon gave.
 */

const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));

/** Chicote Consertado — "Dano de [Atirar Rosas] e [Disparo Rítmico] +7%" every 2 refines. */
const WHIP = 580028;
const RHYTHM_SHOOTING = 5355;
const ROSE_BLOSSOM = 5353;

const monster = {
  id: 1002, name: 'Poring', spawn: 'x',
  stats: { level: 1, health: 50, attack: { min: 7, max: 8 }, range: 1, defense: 0, magicDefense: 0, str: 1, int: 0, vit: 1, dex: 6, agi: 1, luk: 30, element: 1, elementName: 'Water', elementShortName: 'W1', race: 4, raceName: 'Plant', scale: 0, scaleName: 'Small', class: 0, criShield: 0, softDef: 0, mdef: 0, softMdef: 0, res: 0, mres: 0 },
  data: { def: 0, mdef: 0, criShield: 0, softDef: 0, res: 0, mres: 0 },
} as any;

/**
 * The skill-damage pool the damage pipeline reads, with the ultimate on or off.
 * `setEquipAtkSkillAtk` is the channel the controller uses to hand a class's active-skill
 * bonuses to the calculator, so this drives the real path rather than a stand-in.
 */
function skillDamagePool(symphonyOn: boolean, refine: number) {
  const cls = new Trouvere();
  const activeList = (cls as any)._activeSkillList as { name: string }[];
  const passiveList = (cls as any)._passiveSkillList as { name: string }[];
  cls
    .setLearnSkills({
      activeSkillIds: activeList.map(() => 0),
      passiveSkillIds: passiveList.map(() => 0),
    })
    .getSkillBonusAndName();

  const symphonyBonus = MysticSymphonyFn().dropdown.find((d) => d.isUse)!.bonus;

  const calc = new Calculator();
  calc
    .setMasterItems({ [WHIP]: db[WHIP] } as any)
    .setHpSpTable([{ jobs: {}, baseHp: Array(251).fill(1000), baseSp: Array(251).fill(100) }] as any)
    .setClass(cls)
    .setMonster(monster)
    .setEquipAtkSkillAtk(symphonyOn ? { 'Mystic Symphony': symphonyBonus } : {});

  const model = createMainModel();
  model.level = 250;
  model.weapon = WHIP;
  model.weaponRefine = refine;
  calc.loadItemFromModel(model).prepareAllItemBonus();

  const totalBonus = (calc as any).totalEquipStatus as Record<string, number>;

  return {
    rhythmShooting: totalBonus[RHYTHM_SHOOTING] ?? 0,
    roseBlossom: totalBonus[ROSE_BLOSSOM] ?? 0,
  };
}

describe('Sinfonia Mística — the +100% joins the skill-damage pool', () => {
  // +10 is 5 steps of "a cada 2 refinos", so the whip alone is worth +35%.
  it('adds to the weapon bonus instead of multiplying it', () => {
    expect(skillDamagePool(false, 10)).toEqual({ rhythmShooting: 35, roseBlossom: 35 });
    expect(skillDamagePool(true, 10)).toEqual({ rhythmShooting: 135, roseBlossom: 135 });
  });

  /**
   * The distinguishing case, and the reporter's own measurement: with a weapon bonus
   * already in the pool the ultimate is worth clearly less than the ×2 it used to apply.
   */
  it('is worth 1,74x on top of a +35% whip, not 2x', () => {
    const off = skillDamagePool(false, 10).rhythmShooting;
    const on = skillDamagePool(true, 10).rhythmShooting;

    const multiplier = (100 + on) / (100 + off);

    expect(multiplier).toBeCloseTo(1.74, 2);
    expect(multiplier).toBeLessThan(2);
  });

  // Where nothing else feeds the pool the two models agree, and that agreement is what
  // the old ×2 got right — the change must not disturb it.
  it('still doubles the skill damage when nothing else boosts it', () => {
    const off = skillDamagePool(false, 0).rhythmShooting;
    const on = skillDamagePool(true, 0).rhythmShooting;

    expect(off).toBe(0);
    expect((100 + on) / (100 + off)).toBe(2);
  });

  it('contributes nothing while the ultimate is down', () => {
    expect(skillDamagePool(false, 0)).toEqual({ rhythmShooting: 0, roseBlossom: 0 });
  });
});
