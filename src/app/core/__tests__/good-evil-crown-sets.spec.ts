import { describe, expect, it } from 'vitest';
import { ITEM_DB, wornBonus } from './worn-bonus';

/**
 * Coroa do Bem e do Mal (400374-400395) and the two weapon lines it pairs with: the
 * Brilliant Light weapons and the Sinful weapons.
 *
 * These items had records and enchant pools in the repo but were unreachable — LATAM has
 * not shipped them, so `presentInLatam` hid them from every picker. They are surfaced by
 * the `preRelease` opt-in (docs/item-json.md), which means nothing had ever exercised
 * their combos, and the first run of this spec found a real bug: the spell-enchant clause
 * carried no weapon condition, so the crown paid the whole set bonus with the enchant
 * alone and no weapon at all. The description puts that clause inside the weapon set
 * block, so all 22 crowns now spell it `EQUIP_ID[<weapon>&&<spell>]`.
 *
 * The Dragon Knight crown stands in for the other 21: they share one script shape,
 * differing only in which two weapons and which four skill ids they name.
 *
 * Bonuses are read off the pair, so each expectation is stated as a delta from the
 * weapon-only baseline — the weapons boost their own skills too.
 *
 * https://hazyforest.com/enchants:good_evil_headgears
 */

const CROWN_DK = 400374;
const EXECUTION_GREAT_SWORD = 600041; // Sinful — Hack and Slash / Storm Slash
const JUPITER_SPEAR = 630027; // Brilliant Light — Dragonic Breath / Madness Crusher

const GOOD_SPELL = 312014;
const EVIL_SPELL = 312021;

const HACK_AND_SLASH = '5208';
const STORM_SLASH = '5213';
const DRAGONIC_BREATH = '6001';
const MADNESS_CRUSHER = '5211';

/** What the weapon pays on its own, so the crown's share can be read as a difference. */
const weaponOnly = (weapon: number) => wornBonus({ weapon, weaponRefine: 9 });

describe('400374 Coroa do Bem e do Mal (Cavaleiro Draconiano)', () => {
  it('pays its own refine lines without any weapon', () => {
    const bonus = wornBonus({ headUpper: CROWN_DK, headUpperRefine: 9 });

    expect(bonus['p_race_all']).toBe(15); // every 3 refines, +5%
    expect(bonus['melee']).toBe(14); // every 4 refines, +7%
    expect(bonus['range']).toBe(14);
    expect(bonus['res']).toBe(50); // +7
    expect(bonus['acd']).toBe(5); // +9
    expect(bonus['aspdPercent']).toBe(5);
    expect(bonus['atkPercent'] ?? 0).toBe(0); // +11, not reached
  });

  it('pays no set bonus on its own, whichever spell is enchanted into it', () => {
    // The bug this spec was written for: these four were 15/20/15/20 with no weapon.
    for (const spell of [GOOD_SPELL, EVIL_SPELL]) {
      const bonus = wornBonus({ headUpper: CROWN_DK, headUpperRefine: 9, headUpperEnchants: [spell] });

      expect(bonus[HACK_AND_SLASH] ?? 0).toBe(0);
      expect(bonus[STORM_SLASH] ?? 0).toBe(0);
      expect(bonus[DRAGONIC_BREATH] ?? 0).toBe(0);
      expect(bonus[MADNESS_CRUSHER] ?? 0).toBe(0);
    }
  });

  it('fires the Execution Great Sword set off the weapon refine, not its own', () => {
    const base = weaponOnly(EXECUTION_GREAT_SWORD);
    const bonus = wornBonus({ headUpper: CROWN_DK, weapon: EXECUTION_GREAT_SWORD, weaponRefine: 9 });

    expect(bonus[HACK_AND_SLASH] - (base[HACK_AND_SLASH] ?? 0)).toBe(12); // 3 steps of 3 refines x 4%
    expect(bonus[STORM_SLASH] - (base[STORM_SLASH] ?? 0)).toBe(15); // 3 steps x 5%
    // The other half of the crown stays quiet — that is the Brilliant Light weapon's set.
    expect(bonus[DRAGONIC_BREATH] ?? 0).toBe(0);
    expect(bonus[MADNESS_CRUSHER] ?? 0).toBe(0);
  });

  it('adds the grade B bonus on top, to Hack and Slash only', () => {
    const plain = wornBonus({ headUpper: CROWN_DK, weapon: EXECUTION_GREAT_SWORD, weaponRefine: 9 });
    const graded = wornBonus({ headUpper: CROWN_DK, weapon: EXECUTION_GREAT_SWORD, weaponRefine: 9, weaponGrade: 'B' });

    expect(graded[HACK_AND_SLASH] - plain[HACK_AND_SLASH]).toBe(10);
    expect(graded[STORM_SLASH]).toBe(plain[STORM_SLASH]); // untouched by the grade line
  });

  it('adds the Evil Spell bonus when the enchant sits in the crown', () => {
    const plain = wornBonus({ headUpper: CROWN_DK, weapon: EXECUTION_GREAT_SWORD, weaponRefine: 9 });
    const spelled = wornBonus({
      headUpper: CROWN_DK,
      headUpperEnchants: [EVIL_SPELL],
      weapon: EXECUTION_GREAT_SWORD,
      weaponRefine: 9,
    });

    expect(spelled[HACK_AND_SLASH] - plain[HACK_AND_SLASH]).toBe(15);
    expect(spelled[STORM_SLASH] - plain[STORM_SLASH]).toBe(20);
  });

  it('fires the Jupiter Spear set with Good Spell, mirroring the evil half', () => {
    const base = weaponOnly(JUPITER_SPEAR);
    const bonus = wornBonus({
      headUpper: CROWN_DK,
      headUpperEnchants: [GOOD_SPELL],
      weapon: JUPITER_SPEAR,
      weaponRefine: 9,
      weaponGrade: 'B',
    });

    expect(bonus[DRAGONIC_BREATH] - (base[DRAGONIC_BREATH] ?? 0)).toBe(37); // 12 refine + 10 grade B + 15 spell
    expect(bonus[MADNESS_CRUSHER] - (base[MADNESS_CRUSHER] ?? 0)).toBe(35); // 15 refine + 20 spell
    expect(bonus[HACK_AND_SLASH] ?? 0).toBe(0);
  });

  it('keeps the good and evil halves apart — the wrong spell pays nothing extra', () => {
    const plain = wornBonus({ headUpper: CROWN_DK, weapon: EXECUTION_GREAT_SWORD, weaponRefine: 9 });
    const wrongSpell = wornBonus({
      headUpper: CROWN_DK,
      headUpperEnchants: [GOOD_SPELL],
      weapon: EXECUTION_GREAT_SWORD,
      weaponRefine: 9,
    });

    expect(wrongSpell[HACK_AND_SLASH]).toBe(plain[HACK_AND_SLASH]);
    expect(wrongSpell[STORM_SLASH]).toBe(plain[STORM_SLASH]);
    // And Good Spell must not light up the Brilliant Light skills with no spear equipped.
    expect(wrongSpell[DRAGONIC_BREATH] ?? 0).toBe(0);
    expect(wrongSpell[MADNESS_CRUSHER] ?? 0).toBe(0);
  });
});

/**
 * Three divergences the description audit turned up in the upstream port. All three
 * were silent — the items were unreachable, so nothing exercised them — and all three
 * are single numbers or a single key, exactly the kind that a re-port would reintroduce.
 */
describe('audit fixes against the iRO description', () => {
  it('gives the ranged crowns CON, not POW, at grade B', () => {
    // Abyss Chaser, Windhawk and Trouvere/Troubadour read "P.ATK + 2, S.MATK + 2,
    // CON + 2, SPL + 2"; the other 19 crowns read POW there and the port copied those.
    for (const id of [400383, 400384, 400385]) {
      const script = ITEM_DB[id].script;
      expect(script['con']).toEqual(['GRADE[headUpper==B]===2']);
      expect(script['pow']).toBeUndefined();
      expect(script['spl']).toEqual(['GRADE[headUpper==B]===2']);
    }
  });

  it('keeps POW at grade B on the other crowns', () => {
    for (const id of [400374, 400382, 400387, 400395]) {
      expect(ITEM_DB[id].script['pow']).toEqual(['GRADE[headUpper==B]===2']);
      expect(ITEM_DB[id].script['con']).toBeUndefined();
    }
  });

  it('pays the Shadow Cross crown 5% melee per 3 weapon refines, not 10%', () => {
    // "increase Impact Crater damage by 4%, increase melee physical damage by 5%".
    const bonus = wornBonus({ headUpper: 400382, weapon: 610044, weaponRefine: 9 });
    const base = wornBonus({ weapon: 610044, weaponRefine: 9 });

    expect(bonus['melee'] - (base['melee'] ?? 0)).toBe(15); // 3 steps x 5%
  });

  it('pays Victory Sword 10% melee at grade D, not 5%', () => {
    const plain = wornBonus({ weapon: 500066, weaponRefine: 0 });
    const graded = wornBonus({ weapon: 500066, weaponRefine: 0, weaponGrade: 'D' });

    expect(graded['melee'] - (plain['melee'] ?? 0)).toBe(10);
  });
});
