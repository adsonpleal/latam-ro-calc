import { readFileSync } from 'node:fs';
import { Calculator } from 'src/app/core/calculator';
import { createMainModel } from 'src/app/utils';
import { RuneKnight } from './RuneKnight';

/**
 * Runa Othila / Aura de Combate (RK_FIGHTINGSPIRIT) — reported on the tracker: the rune was
 * lifting ASPD to a value nobody can reach in game.
 *
 * The client's own text names no number ("ATQ +70. Aumenta a velocidade de ataque."), so the
 * figure comes from browiki's Aura de Combate page:
 *
 *   Velocidade de ataque = [4 × (100 − Vel.Atq por equipamentos)]
 *   "O bônus de velocidade de ataque é um valor fixo, não em porcentagem."
 *   24% of gear ASPD leaves +3; 40% leaves +2.
 *
 * So it is flat ASPD, it shrinks as the gear's ASPD% grows, and it never exceeds +4. The bug
 * was reading Perícia em Runas as a multiplier — the skill only gates learning the rune —
 * and writing the result into aspdPercent, which at Nv. 10 meant +40% ASPD.
 */

const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));

const WEAPON = 1201; // Knife [3] — inert host, the rune does not care about the weapon
const TEST_ARMOR = 90001;

const monster = {
  id: 1002, name: 'Poring', spawn: 'x',
  stats: { level: 1, health: 50, attack: { min: 7, max: 8 }, range: 1, defense: 0, magicDefense: 0, str: 1, int: 0, vit: 1, dex: 6, agi: 1, luk: 30, element: 1, elementName: 'Water', elementShortName: 'W1', race: 4, raceName: 'Plant', scale: 0, scaleName: 'Small', class: 0, criShield: 0, softDef: 0, mdef: 0, softMdef: 0, res: 0, mres: 0 },
  data: { def: 0, mdef: 0, criShield: 0, softDef: 0, res: 0, mres: 0 },
} as any;

/** A bare armour whose only effect is the gear ASPD% the rune's formula reads. */
const armorWithAspdPercent = (aspdPercent: number) => ({
  id: TEST_ARMOR, aegisName: 'Test_Armor', name: 'Test Armor', unidName: 'Armor', resName: '',
  description: '', slots: 0, itemTypeId: 2, itemSubTypeId: 513, itemLevel: null, attack: null,
  defense: 0, weight: 0, requiredLevel: 1, location: null, compositionPos: null,
  usableClass: ['all'], script: aspdPercent ? { aspdPercent: [String(aspdPercent)] } : {},
});

function totals(opts: { runeActive: boolean; gearAspdPercent?: number; runeMastery?: number; }): Record<string, number> {
  const { runeActive, gearAspdPercent = 0, runeMastery = 10 } = opts;

  const cls = new RuneKnight();
  const activeList = (cls as any)._activeSkillList as { name: string; }[];
  const passiveList = (cls as any)._passiveSkillList as { name: string; }[];
  const activeSkillIds = activeList.map((skill) => (skill.name === 'Asir Runestone' && runeActive ? 1 : 0));
  const passiveSkillIds = passiveList.map((skill) => (skill.name === 'Rune Mastery' ? runeMastery : 0));
  cls.setLearnSkills({ activeSkillIds, passiveSkillIds }).getSkillBonusAndName();

  const items: any = {
    [WEAPON]: { ...db[WEAPON], itemTypeId: 1, itemSubTypeId: 256 },
    [TEST_ARMOR]: armorWithAspdPercent(gearAspdPercent),
  };

  const calc = new Calculator();
  calc
    .setMasterItems(items)
    .setHpSpTable([{ jobs: {}, baseHp: Array(251).fill(1000), baseSp: Array(251).fill(100) }] as any)
    .setClass(cls)
    .setMonster(monster);

  const model = createMainModel();
  model.level = 200;
  model.weapon = WEAPON;
  model.armor = TEST_ARMOR;

  calc.loadItemFromModel(model).prepareAllItemBonus();

  return (calc as any).totalEquipStatus as Record<string, number>;
}

describe('Runa Othila — Aura de Combate', () => {
  it('gives flat ASPD, never a percentage', () => {
    const bonus = totals({ runeActive: true });

    expect(bonus['aspd']).toBe(4);
    expect(bonus['aspdPercent'] ?? 0).toBe(0);
  });

  it('shrinks as the gear ASPD% grows, per browiki\'s own examples', () => {
    expect(totals({ runeActive: true, gearAspdPercent: 24 })['aspd']).toBe(3);
    expect(totals({ runeActive: true, gearAspdPercent: 40 })['aspd']).toBe(2);
  });

  it('floors at zero once the gear alone is worth 100%', () => {
    expect(totals({ runeActive: true, gearAspdPercent: 100 })['aspd']).toBe(0);
    expect(totals({ runeActive: true, gearAspdPercent: 120 })['aspd']).toBe(0);
  });

  it('does not scale with Perícia em Runas — that skill only unlocks the rune', () => {
    expect(totals({ runeActive: true, runeMastery: 1 })['aspd']).toBe(4);
    expect(totals({ runeActive: true, runeMastery: 10 })['aspd']).toBe(4);
  });

  it('grants nothing while the rune is off', () => {
    const bonus = totals({ runeActive: false });

    expect(bonus['aspd'] ?? 0).toBe(0);
    expect(bonus['aspdPercent'] ?? 0).toBe(0);
  });
});
