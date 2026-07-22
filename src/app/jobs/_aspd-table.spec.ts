import { describe, expect, it } from 'vitest';
import { AspdTable } from './_aspd-table';
import { ClassName } from './_class-name';
import { SuperNovice } from './SuperNovice';

/** Minimal Weapon stub for calcAspd: it only reads `.data` and `.isAllowShield()`. */
const weaponOf = (subTypeName: string, rangeType = 'melee') =>
  ({ data: { subTypeName, rangeType }, isAllowShield: () => true } as any);

/** Drive the real calcAspd for a Super Novice with a given weapon, no bonuses. */
const aspdFor = (subTypeName: string, totalAgi: number, totalDex: number) =>
  new SuperNovice().calcAspd({
    weapon: weaponOf(subTypeName),
    weapon2: undefined as any,
    isEquipShield: false,
    aspd: 0,
    aspdPercent: 0,
    totalAgi,
    totalDex,
    potionAspds: [],
    potionAspdPercent: 0,
    skillAspd: 0,
    skillAspdPercent: 0,
    decreaseSkillAspdPercent: 0,
  });

/**
 * In-game "Vel. de Atq." base-ASPD table for the Super Novice (RO LATAM).
 * `base` is the unarmed value; every weapon entry is the penalty ADDED to it
 * (calcBaseAspd = base + penalty), and `shield` is applied separately.
 *
 * Ground truth (screenshot from the game / wiki):
 *   Sem arma 156 · Escudo -10 · Adaga -15 · Espada -17 · Maça -10 ·
 *   Machado -10 · Cajado -25
 */
// End-to-end through the real ASPD formula: the reported bug was a Cajado (Rod)
// on a Super Novice reading too-high ASPD because the -25 penalty never applied.
describe('calcAspd — Super Novice Rod penalty is applied', () => {
  it('a Rod sits exactly 25 ASPD below a penalty-free weapon (the missing -25)', () => {
    // 'Whip' is not in the Super Novice table, so it carries a 0 penalty and acts
    // as the "no reduction" baseline — before the fix a Rod behaved identically.
    const noPenalty = aspdFor('Whip', 100, 100);
    const rod = aspdFor('Rod', 100, 100);
    expect(noPenalty - rod).toBe(25);
  });

  it('a Rod is 10 ASPD below a Dagger (-25 vs -15)', () => {
    expect(aspdFor('Dagger', 100, 100) - aspdFor('Rod', 100, 100)).toBe(10);
  });
});

// Base ASPD tables cross-checked against bROWiki's "Vel. de Atq." per class
// (the LATAM source of truth). Each map lists the values bROWiki defines for that
// class; `base` is "Sem arma", `shield` is "Escudo". Weapons bROWiki does not list
// for a class are intentionally omitted (nothing to assert there).
describe('AspdTable — bROWiki-authoritative values', () => {
  const expected: Record<string, Record<string, number>> = {
    // Regression: Rod (Cajado) was missing entirely, so it applied 0 penalty and
    // inflated ASPD instead of -25. Screenshot ground truth: Adaga -15, Espada -17,
    // Maça -10, Machado -10, Cajado -25.
    SuperNovice: { base: 156, shield: -10, Dagger: -15, Sword: -17, Mace: -10, Axe: -10, Rod: -25 },
    // "Livro" -3 -> -5
    Sorcerer: { base: 156, shield: -5, Dagger: -10, Rod: -5, 'Two-Handed Rod': -15, Book: -5 },
    // "Escudo" -5 -> -4, "Livro" -3 -> -5
    ElementalMaster: { base: 156, shield: -4, Dagger: -10, Rod: -5, 'Two-Handed Rod': -15, Book: -5 },
    // bROWiki makes Inquisidor identical to Shura (Sura): base 158, Maça -5, 2H Rod -12.
    Inquisitor: { base: 158, shield: -5, Mace: -5, Rod: -10, 'Two-Handed Rod': -12, Fistweapon: -1 },
    // "Chicote" (Whip) -4 -> -5
    Wanderer: { base: 156, shield: -7, Dagger: -12, Bow: -9, Whip: -5 },
    Trouvere: { base: 156, shield: -7, Dagger: -12, Bow: -9, Whip: -5 },
    // The whole row was a blanket -10 placeholder; bROWiki only defines Book/Shield.
    StarEmperor: { base: 156, shield: -3, Book: -5 },
    SkyEmperor: { base: 156, shield: -3, Book: -5 },
    // The row held the Gunslinger (Justiceiro) table; bROWiki Insurgente/Guerrilheiro.
    Rebellion: { base: 151, shield: -10, Revolver: -5, Rifle: -10, 'Gatling Gun': -3, Shotgun: -30, 'Grenade Launcher': -35 },
    NightWatch: { base: 151, shield: -10, Revolver: -5, Rifle: -10, 'Gatling Gun': -3, Shotgun: -30, 'Grenade Launcher': -35 },
    // "Adaga Esquerda" (off-hand dagger) -10 -> -11
    Oboro: { base: 156, shield: -3, Dagger: -5, 'left-Dagger': -11, Shuriken: -10 },
    Kagerou: { base: 156, shield: -3, Dagger: -5, 'left-Dagger': -11, Shuriken: -10 },
    Shinkiro: { base: 156, shield: -3, Dagger: -5, 'left-Dagger': -11, Shuriken: -10 },
    Shiranui: { base: 156, shield: -3, Dagger: -5, 'left-Dagger': -11, Shuriken: -10 },
  };

  for (const [cls, vals] of Object.entries(expected)) {
    it(`${cls} matches bROWiki`, () => {
      const row = AspdTable[ClassName[cls as keyof typeof ClassName]] as Record<string, number>;
      expect(row).toBeDefined();
      for (const [weapon, value] of Object.entries(vals)) {
        expect({ weapon, value: row[weapon] }).toEqual({ weapon, value });
      }
    });
  }
});
