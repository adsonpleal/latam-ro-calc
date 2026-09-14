import { describe, expect, it } from 'vitest';
import { SKILL_META } from 'src/app/skills';
import { DragonKnight } from './DragonKnight';

/**
 * Dragonic Breath (DK_DRAGONIC_BREATH, 6001) — a kRO/iRO Dragon Knight skill LATAM has not
 * received, added back on 14/09/2026 as a preview. Every number is irowiki's
 * (https://irowiki.org/wiki/Dragonic_Breath); no recording exists to hold it to, so these
 * tests pin the transcription, not the game.
 */

const skillOf = (dk: DragonKnight) => dk.atkSkills.find((s) => s.name === 'Dragonic Breath');

function formula(level: number, opts: { aura?: boolean } = {}) {
  const dk: any = new DragonKnight();
  const activeIds = dk.activeSkills.map((a: any) => (a.name === 'Dragonic Aura' && opts.aura ? 10 : 0));
  dk.setLearnSkills({ activeSkillIds: activeIds, passiveSkillIds: dk.passiveSkills.map(() => 0) }).getSkillBonusAndName();

  return skillOf(dk).formula({
    model: { level: 250 },
    skillLevel: level,
    maxHp: 400_000,
    maxSp: 16_000,
    status: { totalPow: 120 },
  } as any);
}

describe('Dragonic Breath (preview)', () => {
  it('is on the Dragon Knight with every level and the iRO cast times', () => {
    const skill = skillOf(new DragonKnight());
    expect(skill.levelList.map((l) => l.value)).toEqual(Array.from({ length: 10 }, (_, i) => `Dragonic Breath==${i + 1}`));
    expect(skill.levelList.every((l) => l.label.startsWith('Dragonic Breath'))).toBe(true);
    expect([skill.fct, skill.vct, skill.acd, skill.cd]).toEqual([0.5, 2, 0.15, 0.5]);
    expect([skill.isIgnoreDef, skill.isIgnoreSDef]).toEqual([true, true]);
  });

  it('carries no invented pt-BR name, description or client icon', () => {
    expect(SKILL_META['Dragonic Breath']).toEqual({ id: 6001, label: 'Dragonic Breath (Prévia)' });
  });

  it('follows the irowiki ratio, outside and inside the Aura Draconiana state', () => {
    // Nv 10: (3550 + (400000 × 0,00625 + 16000 × 0,0125) × 10 + 7 × 120) × 250 ÷ 100
    expect(formula(10)).toBeCloseTo((3550 + (2500 + 200) * 10 + 840) * 2.5, 6);
    // with the Aura: 0,00875 and 0,0175
    expect(formula(10, { aura: true })).toBeCloseTo((3550 + (3500 + 280) * 10 + 840) * 2.5, 6);
    // Nv 1 takes the first base value
    expect(formula(1)).toBeCloseTo((400 + 2700 + 840) * 2.5, 6);
  });
});
