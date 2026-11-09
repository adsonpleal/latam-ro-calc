import { describe, expect, it } from 'vitest';
import { ITEM_DB, wornBonus } from './worn-bonus';

/**
 * Conjunto [Pele da Rainha Verme], declared on 19268 Hálito de Verme com Rosto.
 *
 * Reported anonymously: "O item Hálito de verme esta considerando o aumento de velocidade
 * de ataque como pós-conjuração". It was — the AGI line of the set was registered under
 * `acd` (Pós-conjuração), so a 120-AGI build read -18% after-cast delay instead of
 * +18% ASPD, and never got the attack speed the set actually grants.
 *
 * The pt-BR description is the source of truth (see CLAUDE.md), and the es/en client text
 * and the upstream Thai text agree with it — Thai writes ASPD as "ลดดีเลย์หลังโจมตี"
 * (delay after *attacking*), not "หลังร่าย" (after *casting*):
 *   Conjunto [Pele da Rainha Verme]:
 *     A cada 20 de FOR base: ATQ +5.
 *     A cada 20 de AGI base: Velocidade de ataque +3%.
 *     A cada 20 de VIT base: Resistência a propriedade Neutro +1%.
 *     A cada 20 de INT base: Conjuração variável -4%.
 *     A cada 20 de DES base: Dano físico à distância +1%.
 *     A cada 20 de SOR base: Dano crítico +3%.
 *
 * "Velocidade de ataque +N%" is `aspdPercent` everywhere else in the db — Carta Cenere
 * (4595) carries the same clause shape, "A cada 10 de AGI base: Velocidade de ataque +2%",
 * as `aspdPercent: SUM[agi==10]---2`.
 *
 * Two more things were wrong with the same block, both found while checking the report:
 *
 * 1. The VIT line was missing from the record altogether. The damage-taken audit of
 *    09/10/2026 (docs/damage-taken-item-audit.json) parked it as "Parceiro de conjunto não
 *    resolvido: Pele da Rainha Verme", because its resolver maps partners by pt-BR name
 *    and this set was gated on the English one. It is written in here by hand instead.
 * 2. The gate itself only reached one of the two partners. Both 20717 and 20718 are
 *    "Pele da Rainha Verme" in pt-BR and "Giant Faceworm Snake Skin" in English, and the
 *    Thai text of the headgear names both ("Giant God Snake Skin/Giant God Snake Skin[1]").
 *    But `EQUIP[Giant God Snake Skin]` matches on the db's own display name, and 20717 was
 *    imported carrying its pt-BR name — so the slotless skin fired nothing. Gated on ids
 *    now, the way the Goibne Ilusional set was fixed.
 */

const BREATH = 19268; // Hálito de Verme com Rosto — lower headgear
const SKIN = 20718; // Pele da Rainha Verme [1] — Giant God Snake Skin [1]
const SKIN_NO_SLOT = 20717; // Pele da Rainha Verme — same garment, no card slot
const PARTNERS = [SKIN, SKIN_NO_SLOT];

/** One entry per line of the set, with what a single 20-point step of its stat pays. */
const SET_LINES = {
  atk: 5,
  aspdPercent: 3,
  subele_neutral: 1,
  vct: 4,
  range: 1,
  criDmg: 3,
} as const;

/** Every base stat at six full steps of 20, so each line of the set pays out 6x. */
const EVERY_20 = 20;
const BASE = { str: 120, agi: 120, vit: 120, int: 120, dex: 120, luk: 120 };
const STEPS = BASE.agi / EVERY_20;

const setBonus = (stats: Partial<typeof BASE> = BASE, partner = SKIN) =>
  wornBonus({ headLower: BREATH, garment: partner, stats });

const breathAlone = () => wornBonus({ headLower: BREATH, stats: BASE });

describe('Conjunto Pele da Rainha Verme (Hálito de Verme com Rosto)', () => {
  it('is wired to partners that exist in the db', () => {
    expect(ITEM_DB[BREATH], `item ${BREATH}`).toBeDefined();
    for (const id of PARTNERS) expect(ITEM_DB[id], `item ${id}`).toBeDefined();
  });

  it('registers the AGI line as attack speed, not as after-cast delay', () => {
    // The pin for the report: `acd` here is what the bug was.
    const script = ITEM_DB[BREATH].script;

    expect(script['aspdPercent']).toBeDefined();
    expect(script['acd']).toBeUndefined();
  });

  it('gates the set on partner ids, not on a display name', () => {
    // 20717 carries its pt-BR name in item.json, so there is no English name to match.
    const encoded = JSON.stringify(ITEM_DB[BREATH].script);

    expect(encoded).not.toContain('EQUIP[');
    for (const id of PARTNERS) expect(encoded, `partner ${id}`).toContain(String(id));
  });

  it.each(PARTNERS)('pays every line of the set with partner %i worn', (partner) => {
    const bonus = setBonus(BASE, partner);

    for (const [key, perStep] of Object.entries(SET_LINES)) {
      expect(bonus[key], key).toBe(STEPS * perStep);
    }
  });

  it('spends the AGI steps on attack speed and nothing on after-cast delay', () => {
    const bonus = setBonus();

    expect(bonus['aspdPercent']).toBe(18);
    expect(bonus['acd'] ?? 0).toBe(0);
    // Flat ASPD is a different key, and the client prints a percentage.
    expect(bonus['aspd'] ?? 0).toBe(0);
  });

  it('steps each line per full 20 points of its own base stat', () => {
    expect(setBonus({ agi: 19 })['aspdPercent']).toBe(0);
    expect(setBonus({ agi: 20 })['aspdPercent']).toBe(3);
    expect(setBonus({ agi: 59 })['aspdPercent']).toBe(2 * 3);
    expect(setBonus({ vit: 99 })['subele_neutral']).toBe(4 * 1);
  });

  it('grants the headgear its own magic bonus but no set line when worn alone', () => {
    const bonus = breathAlone();

    expect(bonus['m_my_element_fire']).toBe(1); // "Dano mágico de propriedade Fogo +1%."
    for (const key of Object.keys(SET_LINES)) expect(bonus[key] ?? 0, key).toBe(0);
  });

  it('declares the set on the headgear only, so it cannot double up', () => {
    for (const id of PARTNERS) {
      expect(JSON.stringify(ITEM_DB[id].script ?? {}), `partner ${id}`).not.toContain(String(BREATH));
    }
  });
});
