import { describe, expect, it } from 'vitest';
import { getEnchants } from './_enchant_table';

// Tracker sQzMK7NU3lKMvlJx2E86, bROWiki Encantamento (Ziki):
// Bota Primordial-LT offers Fatal 1, improving only as far as Fatal 3.
describe('Bota Primordial-LT Fatal', () => {
  it('allows Fatal 1–3 in slot 3, never Fatal 4', () => {
    const slot3 = getEnchants('Hero_Boots_LT')?.[2] as string[];
    expect(slot3).toEqual(expect.arrayContaining(['Fatal1', 'Fatal2', 'Fatal3']));
    expect(slot3).not.toContain('Fatal4');
  });

  it('does not claim the original Bota Primordial uses the LT enchant table', () => {
    expect(getEnchants('Great_Hero_Boots')).toBeUndefined();
  });
});
