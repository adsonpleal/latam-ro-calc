import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createMainModel } from 'src/app/utils';
import { equipStatusOf, makeCalculator } from './__tests__/make-calculator';

/**
 * Effects of the eight Encantos dos Capacetes.
 *
 * item.json had shipped these ids with their kRO "Battle Pass" scripts (flat ATK 75, MATK
 * 75, crit +5/+40, and so on), which is not what LATAM gives. The five generic enchants
 * follow their pt-BR in-game description; the three weapon-set ones (Decadente, Fortificado,
 * Sucata) have a **truncated** in-game description — it stops after the first few weapons —
 * so the complete set list comes from bROWiki's "Descrições completas dos Encantos":
 * https://browiki.org/wiki/Passe_de_Batalha
 *
 * Not modelled (no engine support, so deliberately absent from the scripts): the autocast
 * procs (Onda Psíquica, Flamen, Onda de Choque, the SP-regen proc), "Habilita [skill] nv.N"
 * on Gume/Bastão Fortificado, the Espada Decadente item-drop chance, and the Aspersor
 * Descartado "Custo de SP das habilidades -10%".
 *
 * An enchant reads the refine of the headgear it sits in (getRefineLevelByItemType maps
 * `headUpperEnchant2` back to `headUpper`), which is what the "a cada 2 refinos" tiers use.
 */

const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));

const CAPACETE_DECADENTE = 401433;
const CAPACETE_FORTIFICADO = 401434;
const CAPACETE_DESCARTADO = 401435;

const ATAQUE = 313365;
const PODER = 313366;
const P_MAGICO = 310105;
const CONJURACAO = 313367;
const TALENTO = 313368;
const DECADENTE = 313369;
const FORTIFICADO = 313370;
const SUCATA = 313371;

/** Equip a capacete at `refine` with `enchant` in slot 2, optionally holding `weapon`. */
function bonusOf(params: { capacete?: number; enchant?: number; refine?: number; weapon?: number }): Record<string, number> {
  const { capacete = CAPACETE_DECADENTE, enchant, refine = 0, weapon } = params;
  const items: any = {};
  for (const id of [capacete, enchant, weapon]) if (id) items[id] = { ...db[id] };

  const model = createMainModel();
  model.level = 200;
  model.headUpper = capacete;
  model.headUpperRefine = refine;
  if (enchant) model.headUpperEnchant2 = enchant;
  if (weapon) model.weapon = weapon;

  return equipStatusOf(makeCalculator(items), model);
}

/**
 * What the enchant alone contributes: the same build with and without it, subtracted.
 * The capacete carries its own "a cada 2 refinos: ATQ e ATQM +10" and a weapon-set combo,
 * and `perfectHit` starts at a non-zero baseline — none of which is under test here.
 */
function deltaOf(params: { capacete?: number; enchant: number; refine?: number; weapon?: number }): Record<string, number> {
  const withEnchant = bonusOf(params);
  const without = bonusOf({ ...params, enchant: undefined });
  const delta: Record<string, number> = {};

  for (const key of new Set([...Object.keys(withEnchant), ...Object.keys(without)])) {
    const diff = (withEnchant[key] || 0) - (without[key] || 0);
    if (typeof withEnchant[key] === 'number' || typeof without[key] === 'number') delta[key] = diff;
  }

  return delta;
}

describe('Encantos dos Capacetes — efeitos', () => {
  describe('Encanto de Ataque (313365)', () => {
    it('gives ATQ and ATQM +5 for every 2 refines of the capacete', () => {
      // "A cada 2 refinos: ATQ e ATQM +5."
      for (const [refine, expected] of [[0, 0], [1, 0], [2, 5], [9, 20], [10, 25]] as const) {
        const delta = deltaOf({ enchant: ATAQUE, refine });
        expect(delta['atk'], `+${refine} atk`).toBe(expected);
        expect(delta['matk'], `+${refine} matk`).toBe(expected);
      }
    });

    it('does not carry the kRO Battle Pass flat ATK or melee/range tiers', () => {
      const delta = deltaOf({ enchant: ATAQUE, refine: 11 });
      expect(delta['atkPercent']).toBe(0);
      expect(delta['melee']).toBe(0);
      expect(delta['range']).toBe(0);
    });
  });

  describe('Encanto de Poder (313366)', () => {
    it('gives ATQ da arma +1% and Dano mágico +1% for every 2 refines', () => {
      // The client renamed the percentage lines: "ATQ da arma / ATQ +N%" is now printed as
      // "Dano físico +N%" (atkPercent) and "ATQM +N%" as "Dano mágico +N%" (matkPercent).
      // This enchant still carries the old wording on the physical half. Same keys 400053
      // (Elmo Morrigane Ilusional) uses for "ATQ da arma. +10%".
      for (const [refine, expected] of [[0, 0], [1, 0], [2, 1], [11, 5]] as const) {
        const delta = deltaOf({ enchant: PODER, refine });
        expect(delta['atkPercent'], `+${refine} atkPercent`).toBe(expected);
        expect(delta['matkPercent'], `+${refine} matkPercent`).toBe(expected);
      }
    });

    it('does not carry the kRO flat MATK, nor a final-damage multiplier', () => {
      // m_final ("Dano mágico final") is a different effect from matkPercent, and only
      // 48 items use it for this phrase against 300 that use matkPercent.
      expect(deltaOf({ enchant: PODER, refine: 11 })['matk']).toBe(0);
      expect(deltaOf({ enchant: PODER, refine: 11 })['m_final'] || 0).toBe(0);
    });
  });

  describe('P-Mágico (310105)', () => {
    it('gives MATK +20 and Conjuração variável -10% at any refine', () => {
      const delta = deltaOf({ enchant: P_MAGICO, refine: 0 });
      expect(delta['matk']).toBe(20);
      expect(delta['vct']).toBe(10);
    });

    it('steps the all-property magic damage 2 / 3 / 4 at +0, +9 and +11', () => {
      expect(deltaOf({ enchant: P_MAGICO, refine: 8 })['m_my_element_all']).toBe(2);
      expect(deltaOf({ enchant: P_MAGICO, refine: 9 })['m_my_element_all']).toBe(3);
      expect(deltaOf({ enchant: P_MAGICO, refine: 10 })['m_my_element_all']).toBe(3);
      // The +11 tier is "+1% adicional", not +2%: 2 + 1 + 1.
      expect(deltaOf({ enchant: P_MAGICO, refine: 11 })['m_my_element_all']).toBe(4);
    });
  });

  describe('Encanto de Conjuração (313367)', () => {
    it('cuts fixed cast by 0,25 s and does nothing else', () => {
      const delta = deltaOf({ enchant: CONJURACAO, refine: 11 });
      expect(delta['fct']).toBe(0.25);
      expect(delta['matk']).toBe(0);
      expect(delta['m_my_element_all']).toBe(0);
      expect(delta['m_size_all']).toBe(0);
    });
  });

  describe('Encanto de Talento (313368)', () => {
    it('gives every trait stat +1', () => {
      const delta = deltaOf({ enchant: TALENTO, refine: 11 });
      expect(delta['allTrait']).toBe(1);
      expect(delta['atk']).toBe(0);
      expect(delta['melee']).toBe(0);
    });
  });

  /** [weapon id, weapon label, expected bonus keys] for each weapon-set enchant. */
  const DECADENTE_SETS: [number, string, Record<string, number>][] = [
    [510026, 'Adaga Decadente', { '5321': 15 }],
    [590015, 'Cruz Decadente', { '5283': 15 }],
    [500018, 'Espada Decadente', { '5340': 15, '5341': 15 }],
    [610015, 'Katar Decadente', { '5292': 15, cd__5001: 10 }],
    [620005, 'Machado Decadente', { '5295': 15, cd__2280: 1 }],
    [550058, 'Planta Decadente', { '5436': 15, cd__5028: 2, cd__5036: 2 }],
    [540043, 'Livro Decadente', { '5466': 15, criDmg: 10 }],
    [510055, 'Lâmina Decadente', { '5481': 15, cd__3004: 2 }],
  ];

  const FORTIFICADO_SETS: [number, string, Record<string, number>][] = [
    [530009, 'Pique Fortificado', { '5266': 15, perfectHit: 20 }],
    [540013, 'Grimório Fortificado', { '5372': 15, cd__2449: 1.5 }],
    [600013, 'Florete Fortificado', { '5213': 15 }],
    [640013, 'Báculo Fortificado', { '5225': 15, cd__2211: 1 }],
    [510054, 'Gume Fortificado', { '5451': 15 }],
    [550057, 'Bastão Fortificado', { '5459': 15 }],
    [550059, 'Cajado Fortificado', { '5430': 15 }],
    [510053, 'Punhal Fortificado', { '5490': 15, '5491': 15, m_my_element_all: 10 }],
  ];

  const SUCATA_SETS: [number, string, Record<string, number>][] = [
    [560011, 'Punho Descartado', { '5244': 15, cd__2330: 1 }],
    [580012, 'Chicote Descartado', { '5353': 15, cd__2418: 2.5 }],
    [570012, 'Violino Descartado', { '5353': 15, cd__2418: 2.5 }],
    [700021, 'Arco Descartado', { '5330': 15, cd__2233: 2.5 }],
    [830009, 'Aspersor Descartado', { '5408': 15 }],
    [820005, 'Retalhador Descartado', { '5405': 15, cd__2557: 1 }],
    [810006, 'Atirador Descartado', { '5407': 15, criDmg: 20 }],
    [800010, 'Revólver Descartado', { '5406': 15, criDmg: 20 }],
  ];

  const WEAPON_ENCHANTS: [string, number, number, [number, string, Record<string, number>][]][] = [
    ['Encanto Decadente', DECADENTE, CAPACETE_DECADENTE, DECADENTE_SETS],
    ['Encanto Fortificado', FORTIFICADO, CAPACETE_FORTIFICADO, FORTIFICADO_SETS],
    ['Encanto de Sucata', SUCATA, CAPACETE_DESCARTADO, SUCATA_SETS],
  ];

  describe.each(WEAPON_ENCHANTS)('%s (%i)', (_label, enchant, capacete, sets) => {
    it.each(sets)('fires the set bonus while holding %i (%s)', (weapon, _name, expected) => {
      const delta = deltaOf({ capacete, enchant, refine: 11, weapon });

      for (const [key, value] of Object.entries(expected)) {
        expect(delta[key], `${key} with weapon ${weapon}`).toBe(value);
      }
    });

    it('grants nothing at all without one of its weapons', () => {
      const delta = deltaOf({ capacete, enchant, refine: 11 });
      const keys = new Set(sets.flatMap(([, , expected]) => Object.keys(expected)));

      for (const key of keys) expect(delta[key] || 0, `${key} with no weapon`).toBe(0);
    });

    it('does not fire on an unrelated weapon', () => {
      // Claymore Gloriosa (1187) is a real weapon that belongs to none of these sets.
      const delta = deltaOf({ capacete, enchant, refine: 11, weapon: 1187 });
      const keys = new Set(sets.flatMap(([, , expected]) => Object.keys(expected)));

      for (const key of keys) expect(delta[key] || 0, `${key} with a foreign weapon`).toBe(0);
    });

    it('does not carry the kRO Battle Pass lines it shipped with', () => {
      const delta = deltaOf({ capacete, enchant, refine: 11, weapon: sets[0][0] });

      expect(delta['p_size_all']).toBe(0);
      expect(delta['m_size_all']).toBe(0);
      expect(delta['cri']).toBe(0);
      expect(delta['acd']).toBe(0);
    });
  });

  it('keeps the capacete itself working underneath the enchant', () => {
    // "A cada 2 refinos: ATQ e ATQM +10" — the capacete's own line, plus the enchant's +5.
    const bonus = bonusOf({ enchant: ATAQUE, refine: 10 });
    expect(bonus['atk']).toBe(50 + 25);
    expect(bonus['matk']).toBe(50 + 25);
    expect(bonus['pAtk']).toBe(3); // "A cada 3 refinos: P.ATQ e S.ATQM +1"
  });
});
