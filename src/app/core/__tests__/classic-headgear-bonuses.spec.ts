import { describe, expect, it } from 'vitest';
import { wornBonus } from './worn-bonus';

/**
 * The classic 22xx/50xx/18xxx head gears.
 *
 * These write their bonus inside the flavour paragraph, with no `-----` rule anywhere:
 *
 *   Acessório exclusivo do 'Lorde Kaho'. Apesar de ninguém saber quem é Lorde Kaho...
 *   FOR +5, INT +5, VIT +10, AGI +10, SOR +20, DEFM +10
 *
 * An importer that isolates effects by splitting on those rules scores every one of them
 * as "no effects", which is how 65 head gears carrying real bonuses came to be filed as
 * trivial vanity gear and left out of the db. These cases pin one of each shape the
 * format produces, so a future sweep that reintroduces the blind spot fails here.
 */

const LORD_KAHO = 5013;
const UFORING = 18892;
const BONE_DE_GATINHO = 18600;
const ORELHAS_IFRIT = 5421;
const ELMO_DE_OSSO = 5162;
const ELMO_TE = 18733;

describe('5013 Chifre de Lord Kaho', () => {
  it('grants the whole stat line the flavour paragraph hides', () => {
    const bonus = wornBonus({ headUpper: LORD_KAHO });

    expect(bonus['str']).toBe(5);
    expect(bonus['int']).toBe(5);
    expect(bonus['vit']).toBe(10);
    expect(bonus['agi']).toBe(10);
    expect(bonus['luk']).toBe(20);
    expect(bonus['mdef']).toBe(10);
  });
});

describe('18892 Chapéu de UFOring', () => {
  it('grants the ungated block at any refine', () => {
    const bonus = wornBonus({ headUpper: UFORING, headUpperRefine: 0 });

    expect(bonus['cri']).toBe(5);
    expect(bonus['hit']).toBe(5);
    expect(bonus['flee']).toBe(5);
    expect(bonus['vct'] ?? 0).toBe(0);
    expect(bonus['acd'] ?? 0).toBe(0);
  });

  it('opens the variable-cast cut at +7 and the after-cast + ASPD pair at +9', () => {
    const at7 = wornBonus({ headUpper: UFORING, headUpperRefine: 7 });
    expect(at7['vct']).toBe(5);
    expect(at7['acd'] ?? 0).toBe(0);
    expect(at7['aspdPercent'] ?? 0).toBe(0);

    const at9 = wornBonus({ headUpper: UFORING, headUpperRefine: 9 });
    expect(at9['vct']).toBe(5);
    // Both lines sit under the "Refino +9 ou mais:" heading, not just the first.
    expect(at9['acd']).toBe(5);
    expect(at9['aspdPercent']).toBe(5);
  });
});

describe('18600 Boné de Gatinho', () => {
  it('grants the ungated class damage at any refine', () => {
    const bonus = wornBonus({ headUpper: BONE_DE_GATINHO, headUpperRefine: 0 });

    expect(bonus['p_class_normal']).toBe(5);
    expect(bonus['p_class_boss']).toBe(5);
    expect(bonus['p_race_demihuman'] ?? 0).toBe(0);
  });

  it('adds one more point for every refine from +6 on', () => {
    // "A cada refino a partir do +6: +1%" — +6 is the first step, so the total is
    // refine - 5. Encoding it as thresholds is what makes it accumulate.
    for (const [refine, expected] of [
      [5, 0],
      [6, 1],
      [7, 2],
      [10, 5],
      [18, 13],
    ] as const) {
      const bonus = wornBonus({ headUpper: BONE_DE_GATINHO, headUpperRefine: refine });

      expect(bonus['p_race_demihuman'] ?? 0, `refine ${refine}`).toBe(expected);
      expect(bonus['p_race_player_human'] ?? 0, `refine ${refine}`).toBe(expected);
      expect(bonus['subrace_demihuman'] ?? 0, `refine ${refine}`).toBe(expected);
      expect(bonus['subrace_player_human'] ?? 0, `refine ${refine}`).toBe(expected);
    }
  });
});

describe('5421 Orelhas do Ifrit', () => {
  /**
   * The description prints the stat clause twice and the copies disagree —
   * "DEFM +3. FOR +1." then "FOR +1. INT +1.". Between them each of STR, INT and MDEF is
   * named once and only FOR is repeated, and the sibling 5420 Máscara do Ifrit grants
   * "FOR e INT +2" symmetrically, so the ears grant one of each. Summing the two copies
   * of the same clause into STR +2 is the reading to avoid.
   */
  it('grants one point of STR and INT, not two of STR', () => {
    const bonus = wornBonus({ headMiddle: ORELHAS_IFRIT });

    expect(bonus['str']).toBe(1);
    expect(bonus['int']).toBe(1);
    expect(bonus['mdef']).toBe(3);
  });

  it('trades water resistance for fire resistance', () => {
    const bonus = wornBonus({ headMiddle: ORELHAS_IFRIT });

    expect(bonus['subele_fire']).toBe(5);
    expect(bonus['subele_water']).toBe(-5);
  });

  it('boosts its six named skills by id', () => {
    const bonus = wornBonus({ headMiddle: ORELHAS_IFRIT });

    // Fire Bolt, Fire Pillar, Meteor Storm, Bash, Pierce, Magnum Break — a
    // skill-damage bonus is keyed by the skill id, never by its name.
    for (const skillId of [19, 80, 83, 5, 56, 7]) {
      expect(bonus[skillId], `skill ${skillId}`).toBe(2);
    }
  });
});

describe('5162 Elmo de Osso', () => {
  it('records its dark-damage clause as the penalty it is', () => {
    // "Aumenta em 15% o dano recebido por ataques de Propriedade Sombria" — the wearer
    // takes MORE dark damage, so the resistance is negative.
    expect(wornBonus({ headUpper: ELMO_DE_OSSO })['subele_dark']).toBe(-15);
  });
});

describe('18733 [Aluguel] Elmo TE', () => {
  it('grants nothing, because every line it has is gated on a WoE TE castle', () => {
    // "Em castelos da GDE TE:" is a map condition the engine has no notion of, so the
    // whole block stays out rather than paying everywhere.
    const bonus = wornBonus({ headUpper: ELMO_TE });

    expect(bonus['atk'] ?? 0).toBe(0);
    expect(bonus['p_race_player_human'] ?? 0).toBe(0);
    expect(bonus['p_race_player_doram'] ?? 0).toBe(0);
  });
});
