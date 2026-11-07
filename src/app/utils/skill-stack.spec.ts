import { describe, expect, it } from 'vitest';
import { stackRange } from './skill-stack';

/**
 * The bound a rotation row offers for a skill's per-use counter. Two shapes share it:
 * a fixed accumulation (Talho Eterno's 1..5) and a ground skill's scattered hits, whose
 * ceiling rises with the level (Florescer's 4 flowers at Nv1, 20 at Nv5) — card
 * mkvqph0HW51cDiRaXxKS.
 */
describe('stackRange', () => {
  it('says a skill without a counter has none, so the row draws no picker', () => {
    expect(stackRange(undefined, 5)).toEqual({ min: 0, max: 0, count: 0 });
    expect(stackRange({}, 5)).toEqual({ min: 0, max: 0, count: 0 });
  });

  it('defaults to the ceiling when the skill names no default', () => {
    expect(stackRange({ minStack: 1, maxStack: 5 }, 5)).toEqual({ min: 1, max: 5, count: 5 });
  });

  it('prefers the skill’s own default over the ceiling', () => {
    expect(stackRange({ minStack: 1, maxStack: 5, defaultStack: 1 }, 5).count).toBe(1);
  });

  it('reads a per-level bound at the level asked for', () => {
    const scattered = { minStack: 1, maxStack: (lv: number) => lv * 4 };

    expect(stackRange(scattered, 5)).toEqual({ min: 1, max: 20, count: 20 });
    expect(stackRange(scattered, 1)).toEqual({ min: 1, max: 4, count: 4 });
  });

  it('clamps a saved choice to what this level offers', () => {
    const scattered = { minStack: 1, maxStack: (lv: number) => lv * 4 };

    // 12 of 20 flowers is a choice the player made at Nv5; the same tile moved down to
    // Nv1 can only scatter 4, and the saved 12 must not outlive the level that allowed it.
    expect(stackRange(scattered, 5, 12).count).toBe(12);
    expect(stackRange(scattered, 1, 12).count).toBe(4);
    expect(stackRange(scattered, 5, 0).count).toBe(1);
  });

  it('falls back to the default when nothing was chosen', () => {
    expect(stackRange({ minStack: 1, maxStack: 5, defaultStack: 2 }, 5, undefined).count).toBe(2);
    expect(stackRange({ minStack: 1, maxStack: 5, defaultStack: 2 }, 5, NaN).count).toBe(2);
  });
});
