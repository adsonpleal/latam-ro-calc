import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DamageCalculator } from '../core/damage-calculator';
import { Monster } from '../domain/monster';
import { MonsterModel } from '../models/monster.model';
import { monsterDefMultiplier } from './monster-instance-def';

/**
 * "Defesa de Ferro" — the DEF multiplier the Glast Heim EDDA instances hand their MVP
 * (10x in Ruína, 33x in Queda; the bROWiki pages are cited in monster-instance-def.ts).
 *
 * Three things are pinned. The **multipliers**, which are data; the **published DEF** they
 * multiply, so that a `sync-monster-db` run that changes the record makes this fail instead
 * of silently moving the result; and the **tag** the shared monster card renders, which is
 * the half no other test can see — the template reads `defMultiplier` off a spread of
 * `Monster.data`, so renaming the field there would empty the tag without breaking a type.
 *
 * Reported through the issue board: the damage shown for Schmidt Corrompido was several
 * times what the player saw in the instance, because the simulator hit the unbuffed DEF.
 */

const monsters = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));

const MONSTER_CARD_TEMPLATE = 'src/react/views/battle-monster-card.tsx';

const dataOf = (id: number) => new Monster().setData(monsters[id] as MonsterModel).data;

/**
 * The hard-DEF step read off the engine itself, with penetration zeroed — the same harness
 * `damage-calculator.spec.ts` uses for these private getters. Re-deriving the formula here
 * would pin the spec's own arithmetic instead of what a Schmidt player sees.
 */
const hardDefFactor = (def: number) => {
  const dc = new DamageCalculator();
  (dc as any).monster = new Monster().setData(monsters[20387] as MonsterModel);
  (dc as any).monster.data.def = def;
  (dc as any).totalBonus = { p_pene_race_all: 0, p_pene_class_all: 0, monster_res: 0 };
  (dc as any).finalMultipliers = [];

  return (dc as any).getPhisicalDefData().dmgReductionByHardDef as number;
};

describe('monsterDefMultiplier', () => {
  it('leaves an ordinary monster on its published DEF', () => {
    expect(monsterDefMultiplier(1002)).toBe(1); // Poring
    expect(monsterDefMultiplier(20994)).toBe(1); // Betelgeuse — reduces damage, but not through DEF
    expect(dataOf(20994).def).toBe(monsters[20994].stats.defense);
  });

  it('gives each Schmidt Corrompido the DEF its instance fights with', () => {
    expect(monsterDefMultiplier(20386)).toBe(10); // Ruína de Glastheim
    expect(monsterDefMultiplier(20387)).toBe(33); // Queda de Glastheim
    // The published records the multipliers act on; divine-pride 20386/20387 agrees.
    expect(monsters[20386].stats.defense).toBe(340);
    expect(monsters[20387].stats.defense).toBe(680);
    expect(dataOf(20386).def).toBe(3400);
    expect(dataOf(20387).def).toBe(22440);
  });

  it('only touches DEF — DEFM, soft DEF and the rest stay as published', () => {
    const schmidt = dataOf(20387);
    expect(schmidt.mdef).toBe(90);
    expect(schmidt.softDef).toBe(132); // (level 175 + VIT 90) / 2
    expect(schmidt.hp).toBe(45000000);
  });

  it('is what the reporter felt: the hard-DEF step now cuts roughly four times as much', () => {
    // 43,3% of the hit got through at the published DEF 680; 11,6% gets through at 22.440.
    const before = hardDefFactor(monsters[20387].stats.defense);
    const after = hardDefFactor(dataOf(20387).def);
    expect(before).toBeCloseTo(0.4333, 4);
    expect(after).toBeCloseTo(0.1158, 4);
    expect(before / after).toBeGreaterThan(3.5);
  });

  it('reaches the card through Monster.data, which is what the UI reads', () => {
    expect(dataOf(20387).defMultiplier).toBe(33);
    expect(dataOf(21077).defMultiplier).toBe(1); // a training dummy: no tag for an ordinary target
    const html = readFileSync(MONSTER_CARD_TEMPLATE, 'utf8');
    expect(html, MONSTER_CARD_TEMPLATE).toMatch(/monster\??\.defMultiplier/);
    expect(html, MONSTER_CARD_TEMPLATE).toContain("t('hud.defMultiplier'");
  });
});
