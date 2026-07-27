import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { canGradeItem } from 'src/app/utils/can-grade';

/**
 * item.json's `itemLevel` against the pt-BR description, for every item that ships on LATAM.
 *
 * Reported by williamcms: the Armas Decadentes could not be graded. They are "Nível da arma
 * 5", and every level-5 weapon / level-2 equipment takes an Enchant Grade.
 *
 * `itemLevel` is load-bearing well beyond the grade dropdown:
 *   - it indexes the weapon refine table, so a weapon missing it gains *nothing* from refine
 *     (see Weapon.set, and weapon-refine.spec.ts);
 *   - it drives the weapon damage variance (± base x level x 0,05);
 *   - equipment level 2 is what grants the extra refine DEF and the +2 Res/MRes per refine
 *     in calcAllDefs.
 *
 * The client prints it as "Nível da arma: N" / "Nível do Equip.: N" (the casing and the
 * spacing around the colon vary between items), and that line is the source of truth per
 * CLAUDE.md. Gear old enough to predate the system prints no line at all and is level 1.
 */

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const latam = JSON.parse(readFileSync('src/assets/demo/data/latam-items.json', 'utf8'));

const WEAPON_LEVEL = /n[íi]vel da arma\s*:\s*(\d+)/i;
const EQUIP_LEVEL = /n[íi]vel do equip(?:amento)?\.?\s*:\s*(\d+)/i;

/** Strip the client's ^RRGGBB colour codes so the level line can be matched. */
const plain = (description: string) => (description || '').replace(/\^[0-9a-fA-F]{6}/g, '');

/** The level the pt-BR description prints, or null when it prints none. */
function declaredLevel(description: string): { kind: 'weapon' | 'armor'; level: number } | null {
  const text = plain(description);
  const equip = EQUIP_LEVEL.exec(text);
  if (equip) return { kind: 'armor', level: Number(equip[1]) };
  const weapon = WEAPON_LEVEL.exec(text);
  if (weapon) return { kind: 'weapon', level: Number(weapon[1]) };

  return null;
}

/** Every LATAM item whose description prints a level, paired with its item.json entry. */
const withDeclaredLevel = Object.keys(latam)
  .filter((id) => items[id])
  .map((id) => ({ id, name: latam[id].name, item: items[id], declared: declaredLevel(latam[id].description) }))
  .filter((entry): entry is typeof entry & { declared: NonNullable<typeof entry.declared> } => !!entry.declared);

/** The ids from the report, so a regression names them instead of just counting. */
const ARMAS_DECADENTES = [500018, 510026, 510055, 540043, 550058, 590015, 610015, 620005];

describe('itemLevel vs the pt-BR description', () => {
  it('has a meaningful number of items to check', () => {
    // Guards the parser itself: a regex typo would empty the list and pass everything below.
    expect(withDeclaredLevel.length).toBeGreaterThan(1000);
  });

  it('matches the printed level on every LATAM item that prints one', () => {
    const wrong = withDeclaredLevel
      .filter(({ item, declared }) => item.itemLevel !== declared.level)
      .map(({ id, name, item, declared }) => `${id} ${name}: itemLevel ${item.itemLevel}, description says ${declared.level}`);

    expect(wrong).toEqual([]);
  });

  it('records the level as a number, never a string', () => {
    const notNumeric = withDeclaredLevel
      .filter(({ item }) => typeof item.itemLevel !== 'number')
      .map(({ id, name }) => `${id} ${name}`);

    expect(notNumeric).toEqual([]);
  });
});

describe('grade availability', () => {
  it('enables grading on every level-5 weapon and level-2 equipment on LATAM', () => {
    const wrong = withDeclaredLevel
      .filter(({ item, declared }) => {
        const shouldGrade = declared.level === (declared.kind === 'weapon' ? 5 : 2);

        return canGradeItem(item) !== shouldGrade;
      })
      .map(({ id, name, declared }) => `${id} ${name} (${declared.kind} lv${declared.level})`);

    expect(wrong).toEqual([]);
  });

  it.each(ARMAS_DECADENTES)('enables grading on Arma Decadente %i', (id) => {
    expect(items[id], `item ${id}`).toBeDefined();
    expect(items[id].itemLevel).toBe(5);
    expect(canGradeItem(items[id])).toBe(true);
  });

  it('leaves ordinary gear ungradeable', () => {
    // Armadura de Goibne (2354) is level-1 gear; Elmo Goibne Ilusional (19366) prints no
    // equipment level either. Neither takes a grade.
    expect(canGradeItem(items[2354])).toBe(false);
    expect(canGradeItem(items[19366])).toBe(false);
  });
});
