import { readFileSync } from 'node:fs';
import { RuneKnight } from 'src/app/jobs';
import { createMainModel } from 'src/app/utils';
import { Calculator } from './calculator';

/**
 * 400511 Coroa Scaraba (Queen Scaraba Crown) — reported by Guto: the set's cards (Carta
 * Rainha Scaraba 4507, Carta Rainha Scaraba Dourada 4509, Carta Rainha Scaraba Selada
 * 27209) were not in the database, so the crown's combo never fired.
 *
 * pt-BR (the source of truth) — the crown's description lists TWO sets:
 *   [Carta Rainha Scaraba] (4507)          -> Dano físico contra Chefes +35%.
 *   [Carta Rainha Scaraba Dourada] (4509)  -> P.ATQ. +20; a cada refino, Dano crítico +10%.
 * The Carta Selada (27209) appears in NO set on the crown — it is a standalone card.
 *
 * The cards' own effects:
 *   4507  / 27209 -> "Dano físico contra Scarabas +N%": per-monster damage, which the
 *                    engine does not model, so the script stays empty (only the set counts).
 *   4509          -> INT +3; Insect-race resistance +10% (+5% more at crown refine +9).
 *
 * The cards slot into the crown (4509, a headgear card) and the weapon (4507/27209,
 * weapon cards); EQUIP_ID matches the combo by the equipped card's id.
 */

const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));

const CROWN = 400511;
const CARD_GOLD = 4509; // head card
const CARD_QUEEN = 4507; // weapon card
const CARD_SEALED = 27209; // weapon card
const WEAPON = 1201; // Knife [3] — inert host for the weapon card

const monster = {
  id: 1002, name: 'Poring', spawn: 'x',
  stats: { level: 1, health: 50, attack: { min: 7, max: 8 }, range: 1, defense: 0, magicDefense: 0, str: 1, int: 0, vit: 1, dex: 6, agi: 1, luk: 30, element: 1, elementName: 'Water', elementShortName: 'W1', race: 4, raceName: 'Plant', scale: 0, scaleName: 'Small', class: 0, criShield: 0, softDef: 0, mdef: 0, softMdef: 0, res: 0, mres: 0 },
  data: { def: 0, mdef: 0, criShield: 0, softDef: 0, res: 0, mres: 0 },
} as any;

function totals(opts: { crownRefine?: number; headCard?: number | null; weaponCard?: number | null; withCrown?: boolean }): Record<string, number> {
  const { crownRefine = 0, headCard = null, weaponCard = null, withCrown = true } = opts;
  const items: any = { [WEAPON]: { ...db[WEAPON], itemTypeId: 1, itemSubTypeId: 256 } };
  if (withCrown) items[CROWN] = { ...db[CROWN] };
  if (headCard) items[headCard] = { ...db[headCard] };
  if (weaponCard) items[weaponCard] = { ...db[weaponCard] };

  const cls = new RuneKnight();
  cls.setLearnSkills({ activeSkillIds: [], passiveSkillIds: [] }).getSkillBonusAndName();
  const calc = new Calculator();
  calc
    .setMasterItems(items)
    .setHpSpTable([{ jobs: {}, baseHp: Array(251).fill(1000), baseSp: Array(251).fill(100) }] as any)
    .setClass(cls)
    .setMonster(monster);

  const model = createMainModel();
  model.level = 200;
  model.weapon = WEAPON;
  if (weaponCard) model.weaponCard1 = weaponCard;
  if (withCrown) { model.headUpper = CROWN; model.headUpperRefine = crownRefine; }
  if (headCard) model.headUpperCard = headCard;

  calc.loadItemFromModel(model).prepareAllItemBonus();
  return (calc as any).totalEquipStatus as Record<string, number>;
}

const stat = (key: string, opts: Parameters<typeof totals>[0]) => totals(opts)[key] ?? 0;

describe('Coroa Scaraba 400511 — the set cards exist in the database', () => {
  it('registers all three cards with the Card type and the right slot position', () => {
    for (const id of [CARD_QUEEN, CARD_GOLD, CARD_SEALED]) {
      expect(db[id], `card ${id}`).toBeDefined();
      expect(db[id].itemTypeId, `card ${id} itemTypeId`).toBe(6);
    }
    // 4507 and 27209 are weapon cards (compositionPos 0); 4509 is a headgear card (769).
    expect(db[CARD_QUEEN].compositionPos).toBe(0);
    expect(db[CARD_SEALED].compositionPos).toBe(0);
    expect(db[CARD_GOLD].compositionPos).toBe(769);
  });
});

describe('The cards\' own effects', () => {
  it('Carta Rainha Scaraba Dourada (4509): INT +3 and Insect resistance (10 → 15 at crown refine +9)', () => {
    expect(stat('int', { headCard: CARD_GOLD, crownRefine: 0 })).toBe(3);
    expect(stat('subrace_insect', { headCard: CARD_GOLD, crownRefine: 0 })).toBe(10);
    expect(stat('subrace_insect', { headCard: CARD_GOLD, crownRefine: 9 })).toBe(15);
  });

  it('leaves the Scaraba damage cards (4507, 27209) scriptless — per-monster damage is not modelled', () => {
    expect(db[CARD_QUEEN].script).toEqual({});
    expect(db[CARD_SEALED].script).toEqual({});
  });
});

describe('Conjunto [Carta Rainha Scaraba] (4507): Dano físico contra Chefes +35%', () => {
  it('crown + 4507 → p_class_boss 35 (regardless of refine)', () => {
    expect(stat('p_class_boss', { weaponCard: CARD_QUEEN, crownRefine: 0 })).toBe(35);
    expect(stat('p_class_boss', { weaponCard: CARD_QUEEN, crownRefine: 12 })).toBe(35);
  });
  it('does not apply without the card', () => {
    expect(stat('p_class_boss', { crownRefine: 12 })).toBe(0);
  });
  it('does not apply without the crown', () => {
    expect(stat('p_class_boss', { weaponCard: CARD_QUEEN, withCrown: false })).toBe(0);
  });
});

describe('Set [Carta Rainha Scaraba Dourada] (4509): P.ATK +20, crit damage +10% per refine', () => {
  it('crown + 4509 → pAtk +20', () => {
    expect(stat('pAtk', { headCard: CARD_GOLD, crownRefine: 5 })).toBe(20);
  });
  it('gives criDmg = the crown\'s own (floor(refine/3)*10) + the combo (refine*10)', () => {
    // refine +5: crown floor(5/3)*10 = 10; combo 5*10 = 50 → 60
    expect(stat('criDmg', { headCard: CARD_GOLD, crownRefine: 5 })).toBe(60);
    // refine +0: crown 0; combo 0 → 0
    expect(stat('criDmg', { headCard: CARD_GOLD, crownRefine: 0 })).toBe(0);
  });
  it('applies only the crown\'s own crit damage without the card', () => {
    expect(stat('pAtk', { crownRefine: 5 })).toBe(0);
    expect(stat('criDmg', { crownRefine: 5 })).toBe(10); // floor(5/3)*10
  });
});

describe('Carta Rainha Scaraba Selada (27209): no set on the crown', () => {
  it('grants no set bonus for crown + 27209', () => {
    expect(stat('p_class_boss', { weaponCard: CARD_SEALED, crownRefine: 12 })).toBe(0);
    expect(stat('pAtk', { weaponCard: CARD_SEALED, crownRefine: 12 })).toBe(0);
  });
});

describe('The set is declared only on the crown', () => {
  it('keeps the crown id out of the cards\' own scripts', () => {
    for (const id of [CARD_QUEEN, CARD_GOLD, CARD_SEALED]) {
      expect(JSON.stringify(db[id].script), `card ${id}`).not.toContain(String(CROWN));
    }
  });
});
