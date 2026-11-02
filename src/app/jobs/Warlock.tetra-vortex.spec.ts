import { describe, expect, it } from 'vitest';
import { ElementType } from '../constants/element-type.const';
import { SKILL_META } from '../skills';
import { ArchMage } from './ArchMage';
import { Warlock } from './Warlock';
import { AtkSkillFormulaInput } from './_character-base.abstract';

/**
 * Tetra Vortex (WL_TETRAVORTEX 2217), asked for on the tracker as card
 * HEb9jHvMXjynEMvNaDhP. It sat commented out in the Warlock list with no way to choose
 * the element.
 *
 * Source: the LATAM client description (28/10/2026) — 4 magic hits, one per Esfera, of
 * the Esferas' element, at 800 + 400 × Nv % ATQM each, no base-level term, 10 levels.
 * divine-pride's page still carries the older 5-level 500 + 500 × Nv table, which is not
 * what LATAM runs. Cast numbers are the client's Conjuração/Espera window.
 */

const entries = (cls = new Warlock()) => cls.atkSkills.filter((s) => s.name === 'Tetra Vortex');

const fire = entries()[0];

const ratio = (skillLevel: number, model = { level: 100 }) =>
  fire.formula({ skillLevel, model } as unknown as AtkSkillFormulaInput);

/** The client's "ATQM por Esfera" column, Nv1..Nv10. */
const clientRatios = (): number[] =>
  [...(SKILL_META['Tetra Vortex'].description ?? '').replace(/\^[0-9a-fA-F]{6}/g, '').matchAll(/\[Nv \d+\]: ([\d.]+)%/g)]
    .map((m) => Number(m[1].replace('.', '')));

describe('Tetra Vortex', () => {
  it('offers one entry per Esfera element', () => {
    expect(entries().map((s) => s.element)).toEqual([ElementType.Fire, ElementType.Water, ElementType.Wind, ElementType.Earth]);
    expect(new Set(entries().map((s) => s.value)).size).toBe(4);
  });

  it('is inherited by the Arcano Supremo', () => {
    expect(entries(new ArchMage())).toHaveLength(4);
  });

  it('matches the client ratio per Esfera at every level', () => {
    expect(clientRatios()).toEqual([1200, 1600, 2000, 2400, 2800, 3200, 3600, 4000, 4400, 4800]);
    expect(Array.from({ length: 10 }, (_, i) => ratio(i + 1))).toEqual(clientRatios());
  });

  it('does not scale with base level', () => {
    expect(ratio(10, { level: 250 })).toBe(4800);
  });

  it('lands four separate MATK hits', () => {
    for (const s of entries()) {
      expect(s.isMatk).toBe(true);
      expect(s.totalHit).toBe(4);
    }
  });

  it('lists every level 1..10 under each element', () => {
    for (const s of entries()) {
      expect(s.levelList.map((l) => Number(l.value.split('==')[1]))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      expect(s.levelList.every((l) => l.label.startsWith('Tetra Vortex '))).toBe(true);
    }
  });
});
