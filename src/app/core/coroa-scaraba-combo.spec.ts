import { readFileSync } from 'node:fs';
import { RuneKnight } from 'src/app/jobs';
import { createMainModel } from 'src/app/utils';
import { Calculator } from './calculator';

/**
 * 400511 Coroa Scaraba (Queen Scaraba Crown) — Guto: os cards do conjunto (Carta Rainha
 * Scaraba 4507, Carta Rainha Scaraba Dourada 4509, Carta Rainha Scaraba Selada 27209)
 * não estavam no banco, então o combo da coroa não entrava.
 *
 * pt-BR (fonte da verdade) — a descrição da coroa lista DOIS conjuntos:
 *   [Carta Rainha Scaraba] (4507)          -> Dano físico contra Chefes +35%.
 *   [Carta Rainha Scaraba Dourada] (4509)  -> P.ATQ. +20; a cada refino, Dano crítico +10%.
 * A Carta Selada (27209) NÃO aparece em nenhum conjunto da coroa — é card avulso.
 *
 * Efeitos próprios dos cards:
 *   4507  / 27209 -> "Dano físico contra Scarabas +N%": dano por monstro específico, que a
 *                    engine não modela, então o script fica vazio (só o combo conta).
 *   4509          -> INT +3; Resistência a raça Inseto +10% (+5% a mais no refino +9 da coroa).
 *
 * Os cards são encaixados na coroa (4509, card de cabeça) e na arma (4507/27209, card de
 * arma); EQUIP_ID casa o combo pelo id do card equipado.
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

describe('Coroa Scaraba 400511 — cards do conjunto existem no banco', () => {
  it('os três cards estão cadastrados com tipo Carta e posição de encaixe correta', () => {
    for (const id of [CARD_QUEEN, CARD_GOLD, CARD_SEALED]) {
      expect(db[id], `card ${id}`).toBeDefined();
      expect(db[id].itemTypeId, `card ${id} itemTypeId`).toBe(6);
    }
    // 4507 e 27209 são cards de arma (compositionPos 0); 4509 é card de cabeça (769).
    expect(db[CARD_QUEEN].compositionPos).toBe(0);
    expect(db[CARD_SEALED].compositionPos).toBe(0);
    expect(db[CARD_GOLD].compositionPos).toBe(769);
  });
});

describe('Efeitos próprios dos cards', () => {
  it('Carta Rainha Scaraba Dourada (4509): INT +3 e Resistência a Inseto (10 → 15 no refino +9 da coroa)', () => {
    expect(stat('int', { headCard: CARD_GOLD, crownRefine: 0 })).toBe(3);
    expect(stat('subrace_insect', { headCard: CARD_GOLD, crownRefine: 0 })).toBe(10);
    expect(stat('subrace_insect', { headCard: CARD_GOLD, crownRefine: 9 })).toBe(15);
  });

  it('Cartas de dano vs Scarabas (4507, 27209) não têm script — dano por monstro não é modelado', () => {
    expect(db[CARD_QUEEN].script).toEqual({});
    expect(db[CARD_SEALED].script).toEqual({});
  });
});

describe('Conjunto [Carta Rainha Scaraba] (4507): Dano físico contra Chefes +35%', () => {
  it('coroa + 4507 → p_class_boss 35 (independente do refino)', () => {
    expect(stat('p_class_boss', { weaponCard: CARD_QUEEN, crownRefine: 0 })).toBe(35);
    expect(stat('p_class_boss', { weaponCard: CARD_QUEEN, crownRefine: 12 })).toBe(35);
  });
  it('não entra sem o card', () => {
    expect(stat('p_class_boss', { crownRefine: 12 })).toBe(0);
  });
  it('não entra sem a coroa', () => {
    expect(stat('p_class_boss', { weaponCard: CARD_QUEEN, withCrown: false })).toBe(0);
  });
});

describe('Conjunto [Carta Rainha Scaraba Dourada] (4509): P.ATQ +20, Dano crítico +10% por refino', () => {
  it('coroa + 4509 → pAtk +20', () => {
    expect(stat('pAtk', { headCard: CARD_GOLD, crownRefine: 5 })).toBe(20);
  });
  it('criDmg = próprio da coroa (floor(refino/3)*10) + combo (refino*10)', () => {
    // refino +5: coroa própria floor(5/3)*10 = 10; combo 5*10 = 50 → 60
    expect(stat('criDmg', { headCard: CARD_GOLD, crownRefine: 5 })).toBe(60);
    // refino +0: própria 0; combo 0 → 0
    expect(stat('criDmg', { headCard: CARD_GOLD, crownRefine: 0 })).toBe(0);
  });
  it('sem o card, só o crítico próprio da coroa entra', () => {
    expect(stat('pAtk', { crownRefine: 5 })).toBe(0);
    expect(stat('criDmg', { crownRefine: 5 })).toBe(10); // floor(5/3)*10
  });
});

describe('Carta Rainha Scaraba Selada (27209): sem conjunto na coroa', () => {
  it('coroa + 27209 não concede bônus de conjunto', () => {
    expect(stat('p_class_boss', { weaponCard: CARD_SEALED, crownRefine: 12 })).toBe(0);
    expect(stat('pAtk', { weaponCard: CARD_SEALED, crownRefine: 12 })).toBe(0);
  });
});

describe('O conjunto é declarado só na coroa', () => {
  it('os cards não referenciam o id da coroa no próprio script', () => {
    for (const id of [CARD_QUEEN, CARD_GOLD, CARD_SEALED]) {
      expect(JSON.stringify(db[id].script), `card ${id}`).not.toContain(String(CROWN));
    }
  });
});
