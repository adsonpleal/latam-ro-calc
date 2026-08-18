import { describe, expect, it } from 'vitest';
import { computeBasicCritRate, computeSkillCritRate, CritRateStep } from './crit-rate';

/** A character with LUK 136 and +20 CRIT of equipment: floor(136 x 0,3) = 40, so 60. */
const character = { totalLuk: 136, equipCri: 20, isKatar: false };
/** Pimentão: LUK 57 -> floor(57 / 5) = 11. */
const target = { criShield: 11, targetLuk: 57 };

const skill = (over: Record<string, any> = {}) =>
  computeSkillCritRate({ ...character, ...target, canCri: true, forceCri: false, skillCri: 0, skillCriPercentage: 1, ...over } as any);

const valueOf = (steps: CritRateStep[], key: string) => steps.find((s) => s.key === key)?.value;

describe('computeSkillCritRate', () => {
  it('adds the character crit, the skill flat crit and the target shield', () => {
    // Tiro Preciso: baseCri 50. 60 + 50 - 11.
    const r = skill({ skillCri: 50 });

    expect(r.total).toBe(99);
    expect(valueOf(r.steps, 'luk')).toBe(40);
    expect(valueOf(r.steps, 'equip')).toBe(20);
    expect(valueOf(r.steps, 'character')).toBe(60);
    expect(valueOf(r.steps, 'skillCri')).toBe(50);
    expect(valueOf(r.steps, 'shield')).toBe(-11);
  });

  it('names the target LUK the shield came from', () => {
    // The shield is the only term the build cannot see anywhere else on screen.
    expect(skill().steps.find((s) => s.key === 'shield')?.detail).toBe('piso(SOR 57 do alvo ÷ 5)');
  });

  it('applies a skill that only gets half the crit before the shield', () => {
    // Cross Impact and friends: baseCriPercentage 0,5. floor(60 x 0,5) - 11.
    const r = skill({ skillCriPercentage: 0.5 });

    expect(r.total).toBe(19);
    expect(valueOf(r.steps, 'skillPct')).toBe(0.5);
  });

  it('omits the percentage row when the skill takes the whole crit', () => {
    expect(skill().steps.some((s) => s.key === 'skillPct')).toBe(false);
  });

  it('doubles the character crit for a katar, and takes the shield before the percentage', () => {
    // The katar branch is genuinely a different order: floor(120 - 11) x 0,5, not
    // floor(120 x 0,5) - 11. The two disagree by the half-shield.
    const r = skill({ isKatar: true, skillCriPercentage: 0.5 });

    expect(valueOf(r.steps, 'character')).toBe(120);
    expect(r.total).toBe(54); // floor(109 x 0,5)
    expect(r.steps.findIndex((s) => s.key === 'shield')).toBeLessThan(r.steps.findIndex((s) => s.key === 'skillPct'));
  });

  it('puts the shield after the percentage for every other weapon', () => {
    const r = skill({ skillCriPercentage: 0.5 });

    expect(r.steps.findIndex((s) => s.key === 'skillPct')).toBeLessThan(r.steps.findIndex((s) => s.key === 'shield'));
  });

  it('never reports a negative rate', () => {
    expect(skill({ criShield: 999, targetLuk: 4995 }).total).toBe(0);
  });

  it('reports 100 for a skill that always crits, and says so', () => {
    const r = skill({ forceCri: true });

    expect(r.total).toBe(100);
    expect(r.steps[0].kind).toBe('note');
  });

  it('reports 0 for a skill that cannot crit at all', () => {
    const r = skill({ canCri: false, skillCri: 50 });

    expect(r.total).toBe(0);
    expect(r.steps.some((s) => s.key === 'skillCri')).toBe(false);
  });

  it('flags a rate past the cap, since the surplus buys nothing', () => {
    const r = skill({ skillCri: 100 });

    expect(r.total).toBe(149);
    expect(r.effective).toBe(100);
    expect(r.isCapped).toBe(true);
  });

  it('always ends on the total, so the popover can read straight down', () => {
    const steps = skill({ skillCri: 50 }).steps;

    expect(steps[steps.length - 1]).toMatchObject({ key: 'total', kind: 'total', value: 99 });
  });
});

describe('computeBasicCritRate', () => {
  const basic = (over: Record<string, any> = {}) =>
    computeBasicCritRate({ ...character, ...target, rangedCri: 0, extraCri: 0, ...over } as any);

  it('adds the two terms no skill receives', () => {
    // CRIT à distância and the per-race/element/size crit reach the basic attack only.
    const r = basic({ rangedCri: 15, extraCri: 5 });

    expect(r.total).toBe(69); // 60 + 15 + 5 - 11
    expect(valueOf(r.steps, 'criRange')).toBe(15);
    expect(valueOf(r.steps, 'extra')).toBe(5);
  });

  it('leaves both rows out when the build has neither', () => {
    const r = basic();

    expect(r.total).toBe(49);
    expect(r.steps.some((s) => s.key === 'criRange' || s.key === 'extra')).toBe(false);
  });

  it('offers the equipment row its own sources', () => {
    expect(basic().steps.find((s) => s.key === 'equip')?.keys).toEqual(['cri']);
  });

  it('never reports a negative rate', () => {
    expect(basic({ criShield: 999, targetLuk: 4995 }).total).toBe(0);
  });
});
