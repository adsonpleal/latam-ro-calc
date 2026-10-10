import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ElementType } from '../constants/element-type.const';
import { getMonsterOffensiveSkills } from '../constants/monster-offensive-skills';
import { CAPA, ARMADURA, wornBonus } from './__tests__/worn-bonus';
import { calculateMonsterDamageTaken, IncomingDamageProfile } from './monster-damage-taken';
import { defenderReductionMultiplier } from './pvp';

const profile = (bonus: IncomingDamageProfile['defender']['bonus'] = {}): IncomingDamageProfile => ({
  attacker: { id: 20994, race: 'dragon', size: 'l', type: 'boss',
    attack: { minimum: 1000, maximum: 2000 }, magicAttack: { minimum: 100, maximum: 200 } },
  defender: { hp: 10000, def: 0, softDef: 0, mdef: 0, softMdef: 0, res: 0, mres: 0, bonus, armorElement: ElementType.Neutral },
});
const damage = (id: number, p = profile(), options = {}) => calculateMonsterDamageTaken(p, id, options)!;

describe('Betelgeuse incoming damage', () => {
  it('offers the seven unique damaging skill IDs from the Skills tab, with monster levels', () => {
    expect(getMonsterOffensiveSkills(20994).map(skill => [skill.id, skill.level])).toEqual([
      [708, 4], [2217, 5], [768, 5], [340, 10], [83, 10], [783, 4], [750, 4],
    ]);
    expect(calculateMonsterDamageTaken(profile(), 2213)).toBeNull();
    expect(calculateMonsterDamageTaken({ ...profile(), attacker: { ...profile().attacker, id: 1002 } }, 708)).toBeNull();
  });

  it('NPC Comet uses distance bands and one damage calculation, with no player level scaling', () => {
    expect(damage(708)).toMatchObject({ min: 4500, max: 9000, hits: 1 });
    expect(damage(708, profile(), { cometDistance: 4 }).max).toBe(8000);
    expect(damage(708, profile(), { cometDistance: 6 }).max).toBe(7000);
    expect(damage(708, profile(), { cometDistance: 8 }).max).toBe(6000);
  });

  it('Tetra Vortex is four neutral monster hits; Dark Strike is five shadow hits', () => {
    expect(damage(2217)).toMatchObject({ min: 11200, max: 22400, hits: 4, perHit: { min: 2800, max: 5600 } });
    expect(damage(2217, profile({ subele_fire: 100 })).max).toBe(22400);
    expect(damage(2217, profile({ subele_neutral: 50 })).max).toBe(11200);
    expect(damage(340)).toMatchObject({ min: 500, max: 1000, hits: 5 });
    expect(damage(340, profile(), { armorElement: ElementType.Dark }).max).toBe(0);
  });

  it('Betelgeuse Meteor Storm uses the NPC hit count, and the number landing is explicit', () => {
    expect(damage(83)).toMatchObject({ min: 1875, max: 3750, hits: 15 });
    expect(damage(83, profile(), { meteors: 7 })).toMatchObject({ min: 13125, max: 26250, hits: 105 });
  });

  it('applies the current player defenses and keeps the capped TEN reduction', () => {
    const p = profile();
    Object.assign(p.defender, { def: 400, softDef: 100, res: 1000 });
    // 2000 ATQ × 500% × 50% TEN × 4400/8000 DEF − 100 soft DEF.
    expect(damage(768, p).max).toBe(2650);
    Object.assign(p.defender, { mdef: 100, softMdef: 40, mres: 1000 });
    // Each Dark Strike hit: 200 MATK × 50% TENM × 1100/2000 DEFM − 40.
    expect(damage(340, p).max).toBe(75);
  });

  it('Renewal magic reduces MATK before DEFM, while monster physical reductions follow DEF', () => {
    const p = profile({ subclass_boss: 40 });
    Object.assign(p.defender, { mdef: 100, softMdef: 40, def: 400, softDef: 100 });
    // Dark Strike: (200 MATK × 60% × 1100/2000 − 40) × 5 hits.
    expect(damage(340, p).max).toBe(130);
    // Hell Judgment: (2000 ATK × 5 × 4400/8000 − 100) × 60%.
    expect(damage(768, p).max).toBe(3240);
  });

  it('uses dragon, large, boss and the skill element, keeping vulnerabilities and range separate', () => {
    const p = profile({ subrace_dragon: 20, subsize_l: 10, subclass_boss: 40, subele_neutral: 50,
      subrace_player_human: 100, subsize_m: 100, dmg_taken_range: 50 });
    expect(damage(768, p).max).toBe(2160);
    expect(damage(768, p, { attackerDistance: 7 }).max).toBe(1080);
    expect(damage(768, profile({ subrace_dragon: -20 })).max).toBe(12000);
    expect(damage(2217, profile({ dmg_taken_range: 100 })).max).toBe(22400);
  });

  it('Earthquake uses ATK and three split waves, bypassing ordinary defenses and gear categories', () => {
    const p = profile({ subrace_dragon: 100, subsize_l: 100, subclass_boss: 100, subele_neutral: 100, dmg_taken_range: 100 });
    Object.assign(p.defender, { def: 1000, softDef: 1000, mdef: 1000, softMdef: 1000, res: 1000, mres: 1000 });
    expect(damage(750, p)).toMatchObject({ min: 24000, max: 48000, hits: 3 });
    expect(damage(750, p, { earthquakeTargets: 4 }).max).toBe(12000);
    expect(damage(750, p, { earthquakeTargets: 0 }).max).toBe(48000);
    expect(damage(750, profile({ dmg_taken_magical: 50 })).max).toBe(24000);
    expect(damage(750, p, { armorElement: ElementType.Ghost }).max).toBe(43200);
  });

  it('Killing Aura stays 10000 per second even with defenses and a different armor element', () => {
    const p = profile({ dmg_taken_all: 100, subele_neutral: 100, subclass_boss: 100 });
    Object.assign(p.defender, { def: 1000, mdef: 1000, res: 1000, mres: 1000 });
    expect(damage(783, p, { armorElement: ElementType.Ghost })).toMatchObject({ min: 10000, max: 10000, hits: 1 });
    expect(damage(783, p).hpPercent).toEqual({ min: 100, max: 100 });
  });
});

describe('defensive description mappings in the real equipment pipeline', () => {
  it('Alice reduces boss attacks but increases normal-monster damage', () => {
    const bonus = wornBonus({ shield: 2101, shieldCard: 4253 });
    expect(bonus['subclass_boss']).toBe(40);
    expect(bonus['subclass_normal']).toBe(-40);
    expect(damage(2217, profile(bonus)).max).toBe(13440);
  });

  it('Mochila needs both 90 base VIT and the armor refine threshold', () => {
    expect(wornBonus({ garment: 2576, garmentRefine: 9, stats: { vit: 89 } })['subele_neutral'] ?? 0).toBe(0);
    expect(wornBonus({ garment: 2576, garmentRefine: 6, stats: { vit: 90 } })['subele_neutral'] ?? 0).toBe(0);
    expect(wornBonus({ garment: 2576, garmentRefine: 7, stats: { vit: 90 } })['subele_neutral']).toBe(5);
    expect(wornBonus({ garment: 2576, garmentRefine: 9, stats: { vit: 90 } })['subele_neutral']).toBe(10);
  });

  it('type-limited resistance only affects the specified damage channel', () => {
    const bonus = wornBonus({ garment: 2541 });
    expect(damage(768, profile(bonus)).max).toBe(7000);
    expect(damage(2217, profile(bonus)).max).toBe(22400);
    const input = { bonus: { subrace_brute_physical: 10 }, attackerRace: 'brute', attackerElement: 'neutral', attackerSize: 'm' as const, attackerType: 'normal' as const };
    expect(defenderReductionMultiplier({ ...input, dmgType: 'physical' })).toBe(0.9);
    expect(defenderReductionMultiplier({ ...input, dmgType: 'magical' })).toBe(1);
  });

  it('the new refine-only bonuses use the host equipment refine, and set bonuses need their partner', () => {
    expect(wornBonus({ garment: CAPA, garmentCard: 4375, garmentRefine: 8 })['subele_neutral']).toBe(10);
    expect(wornBonus({ garment: CAPA, garmentCard: 4375, garmentRefine: 9 })['subele_neutral']).toBe(15);
    expect(wornBonus({ armor: ARMADURA, armorCard: 300122 })['subele_neutral']).toBe(15);
    expect(wornBonus({ armor: ARMADURA, armorCard: 300122, weapon: 1103, weaponCard: 300121 })['subele_neutral']).toBe(20);
  });

  it('publishes deterministic armor properties independently of description loading', () => {
    const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
    expect(db[4047].armorElement).toBe('Ghost');
    expect(db[4119].armorElement).toBe('Dark');
    expect(db[2344].armorElement).toBe('Fire');
  });
});
