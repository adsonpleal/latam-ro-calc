import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createMainModel } from '../utils';
import { makeCalculator } from './__tests__/make-calculator';

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));

describe('Bonés do Aluno: conjuntos com Uniforme Escolar e lápis', () => {
  it.each([[18816, 18818, 'matk'], [18817, 18819, 'atk']] as const)(
    '%i requires all three pieces and scales once per three base levels', (cap, pencil, key) => {
      const bonus = (level: number, armor?: number, headLower?: number) => {
        const calc = makeCalculator(items);
        calc.loadItemFromModel({ ...createMainModel(), headUpper: cap, armor, headLower, level }).prepareAllItemBonus();
        return (calc as any).totalEquipStatus;
      };
      for (const [armor, lower] of [[undefined, undefined], [15088, undefined], [undefined, pencil], [15088, pencil === 18818 ? 18819 : 18818]]) {
        expect(bonus(150, armor, lower)[key]).toBe(0);
        expect(bonus(150, armor, lower).expGainPercent).toBe(0);
      }
      for (const [level, expected] of [[2, 0], [3, 1], [149, 49], [150, 50]]) {
        expect(bonus(level, 15088, pencil)[key]).toBe(expected);
        expect(bonus(level, 15088, pencil).expGainPercent).toBe(5);
      }
      expect(items[cap].defense).toBe(4);
      expect(items[cap].weight).toBe(10);
    },
  );
});
