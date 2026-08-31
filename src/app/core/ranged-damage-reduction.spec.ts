import { readFileSync } from 'node:fs';
import { Mechanic, Meister, RuneKnight } from 'src/app/jobs';
import { createMainModel } from 'src/app/utils';
import { equipStatusOf, makeCalculator } from './__tests__/make-calculator';

/**
 * "Resistência a dano(s) físico(s) a distância +N%" — the `dmg_taken_range` key behind the
 * "Físico à distância" row of the Redução de dano popover (reduction-breakdown.ts).
 *
 * Tracker card Gwn2qtlMHxT2lHAJKxwA (Escudo Ilusión A não somava na aba de redução de
 * dano) turned out to be one of sixteen items carrying that line, of which only four
 * cards had it registered. The other twelve are pinned here — one case per condition the
 * description states (flat, refine step, refine threshold, per-refine-from-N, combo), so
 * a rewrite that drops a partner generation or moves a refine gate by one fails loudly.
 *
 * The thirteenth, Carta Transistor (27012), is class-gated ("Mecânicos: +30%") and rides
 * on `USED[<Class>]`, the grammar's own class token — so it has to be measured on a
 * Mechanic and on someone else, not just registered.
 */

const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));

/** Slotted, effect-free hosts, so a card assertion reads only the card. */
const PLAIN_ARMOR = 2319; // Jaqueta Brilhante
const PLAIN_GARMENT = 2515; // Asa de Águia

/**
 * Equips `ids` and reads one key off the summed equipment bonus.
 *
 * `usableClass` is widened because these pieces belong to four different lineages
 * (Acolyte maces, Arqueiro/Justiceiro tunics, the Cerco armours) while the harness runs
 * one inert class — what is under test is the bonus, never who may wear it.
 */
const stat = (ids: number[], model: Record<string, any>, key = 'dmg_taken_range', characterClass?: any): number => {
  const items: any = {};
  for (const id of ids) {
    expect(db[id], `item ${id} missing from item.json`).toBeDefined();
    items[id] = { ...db[id], usableClass: ['all'] };
  }

  return equipStatusOf(makeCalculator(items, characterClass), { ...createMainModel(), level: 200, ...model })[key] || 0;
};

describe('dmg_taken_range — "Resistência a dano físico a distância"', () => {
  describe('flat', () => {
    it('Maça Longa 1525: +10%', () => {
      expect(stat([1525], { weapon: 1525 })).toBe(10);
    });

    it('Ombreiras de Goibne 2520: +10%', () => {
      expect(stat([2520], { garment: 2520 })).toBe(10);
    });
  });

  describe('refine step — "A cada 2 refinos: +3%"', () => {
    it('Maça Longa Ilusional 16063: 10 at +0', () => {
      expect(stat([16063], { weapon: 16063, weaponRefine: 0 })).toBe(10);
    });

    it('Maça Longa Ilusional 16063: 10 + floor(11/2)*3 = 25 at +11', () => {
      expect(stat([16063], { weapon: 16063, weaponRefine: 11 })).toBe(25);
    });

    it('Escudo Ilusión A 460004: 10 at +0', () => {
      expect(stat([460004], { shield: 460004, shieldRefine: 0 })).toBe(10);
    });

    it('Escudo Ilusión A 460004: 10 + floor(9/2)*3 = 22 at +9', () => {
      expect(stat([460004], { shield: 460004, shieldRefine: 9 })).toBe(22);
    });
  });

  describe('refine threshold — "Refino +6 ou mais"', () => {
    it('Túnica de Cerco 15047: nothing at +5, +20% at +6', () => {
      expect(stat([15047], { armor: 15047, armorRefine: 5 })).toBe(0);
      expect(stat([15047], { armor: 15047, armorRefine: 6 })).toBe(20);
    });

    it('Manto de Cerco 15048: nothing at +5, +15% at +6', () => {
      expect(stat([15048], { armor: 15048, armorRefine: 5 })).toBe(0);
      expect(stat([15048], { armor: 15048, armorRefine: 6 })).toBe(15);
    });
  });

  describe('per refine from +6 — Chapéu da Guarda Real 18878', () => {
    const cap = (refine: number) => stat([18878], { headUpper: 18878, headUpperRefine: refine });

    it('the base +5% alone below the gate', () => {
      expect(cap(5)).toBe(5);
    });

    it('the first step lands AT +6, not at +7', () => {
      expect(cap(6)).toBe(6);
    });

    it('5 + (refino - 5) at +12', () => {
      expect(cap(12)).toBe(12);
    });

    it('still climbs at the +18 the refine picker tops out at', () => {
      expect(cap(18)).toBe(18);
    });
  });

  describe('combos', () => {
    it('Túnica do Arqueiro de Elite 2381: nothing on its own', () => {
      expect(stat([2381], { armor: 2381 })).toBe(0);
    });

    it('Túnica do Arqueiro de Elite 2381: nothing with only one of the two partners', () => {
      expect(stat([2381, 2437], { armor: 2381, boot: 2437 })).toBe(0);
      expect(stat([2381, 2539], { armor: 2381, garment: 2539 })).toBe(0);
    });

    it('Túnica do Arqueiro de Elite 2381: +10% with Botas de Batalha + Manteau do Comandante', () => {
      expect(stat([2381, 2437, 2539], { armor: 2381, boot: 2437, garment: 2539 })).toBe(10);
    });

    it('Túnica do Artilheiro de Elite 2382: +10% with Botas de Batalha + Manteau do Xerife', () => {
      expect(stat([2382, 2437, 2540], { armor: 2382, boot: 2437, garment: 2540 })).toBe(10);
    });

    it('Túnica do Artilheiro de Elite 2382: the Comandante manteau is not its partner', () => {
      expect(stat([2382, 2437, 2539], { armor: 2382, boot: 2437, garment: 2539 })).toBe(0);
    });

    it('Carta Nuvem Perigosa 300002: +5% on its own', () => {
      expect(stat([300002, PLAIN_ARMOR], { armor: PLAIN_ARMOR, armorCard: 300002 })).toBe(5);
    });

    it('Carta Nuvem Perigosa 300002: +10% more alongside a Carta Nuvem Tóxica 4334', () => {
      // The Tóxica is a Capa card and carries its own flat +10%, so the pair is
      // 5 (Perigosa) + 10 (the set) + 10 (Tóxica) = 25.
      expect(
        stat([300002, 4334, PLAIN_ARMOR, PLAIN_GARMENT], {
          armor: PLAIN_ARMOR, armorCard: 300002, garment: PLAIN_GARMENT, garmentCard: 4334,
        }),
      ).toBe(25);
    });

    it('Grande Manto dos Esquecidos 480024: nothing without a Memorável', () => {
      expect(stat([480024], { garment: 480024, garmentRefine: 12 })).toBe(0);
    });

    it('Grande Manto dos Esquecidos 480024: Desejo dos Deuses 18972 gives floor(10/2)*1', () => {
      expect(stat([480024, 18972], { garment: 480024, garmentRefine: 10, headUpper: 18972 })).toBe(5);
    });

    it('Grande Manto dos Esquecidos 480024: Disciplina do Espírito 18979 gives floor(10/2)*2', () => {
      expect(stat([480024, 18979], { garment: 480024, garmentRefine: 10, headUpper: 18979 })).toBe(10);
    });
  });

  describe('the four cards that were already registered stay put', () => {
    it.each([
      [4045, 'Carta Besouro-Chifre', '35'],
      [4252, 'Carta Crocodilo', '5'],
      [4334, 'Carta Nuvem Tóxica', '10'],
      [27110, 'Carta Gazeti de Cristal', '20'],
    ])('%i %s: +%s%%', (id, _name, expected) => {
      expect(db[id].script.dmg_taken_range).toEqual([expected]);
    });

    it('Carta Gazeti de Cristal 27110 still pays +20% through the armour slot', () => {
      expect(stat([27110, PLAIN_ARMOR], { armor: PLAIN_ARMOR, armorCard: 27110 })).toBe(20);
    });
  });

  describe('class-gated — Carta Transistor 27012 ("Mecânicos: +30%")', () => {
    const worn = (cls: any) => stat([27012, PLAIN_ARMOR], { armor: PLAIN_ARMOR, armorCard: 27012 }, 'dmg_taken_range', cls);

    it('pays +30% on a Mecânico', () => {
      expect(worn(new Mechanic())).toBe(30);
    });

    it('pays +30% on a Meister, which is a Mecânico evolution', () => {
      expect(worn(new Meister())).toBe(30);
    });

    it('pays nothing outside the lineage', () => {
      expect(worn(new RuneKnight())).toBe(0);
    });

    it('its HP máx. +8% is unconditional, so the gate is on the right clause', () => {
      const armorOnly = stat([PLAIN_ARMOR], { armor: PLAIN_ARMOR }, 'hpPercent', new RuneKnight());
      expect(stat([27012, PLAIN_ARMOR], { armor: PLAIN_ARMOR, armorCard: 27012 }, 'hpPercent', new RuneKnight()) - armorOnly).toBe(8);
    });
  });
});

/**
 * The full Elite set combos. Both suits print the same block, and the Archer one names a
 * partner its wearer can never equip — see the ARCHER_PAIRS note below.
 */
describe('Elite Archer / Shooter sets', () => {
  const ARCHER_SUIT = 2381;
  const SHOOTER_SUIT = 2382;
  const COMBAT_BOOTS = 2436; // Botas de Combate — Archer-usable
  const BATTLE_BOOTS = 2437; // Botas de Batalha — Gunslinger-only
  const COMMANDER = 2539; // Manteau do Comandante — Archer-usable
  const SHERIFF = 2540; // Manteau do Xerife — Gunslinger-only

  const wearing = (suit: number, boot: number, garment: number, key: string) =>
    stat([suit, boot, garment], { armor: suit, boot, garment }, key);

  /** What the suit itself adds: the boots and the manteau carry +1% race lines of their own. */
  const suitShare = (suit: number, boot: number, garment: number, key: string) =>
    wearing(suit, boot, garment, key) - stat([boot, garment], { boot, garment }, key);

  it('the Archer suit lists "Botas de Batalha", which no Archer can wear', () => {
    // Not a modelling choice — the client text names 2437 and 2437 is Gunslinger-only,
    // so taking the description literally would give the Archer set a partner that can
    // never be equipped. Both boots are named, per the re-issued-partner rule.
    expect(db[ARCHER_SUIT].usableClass).toEqual(['Archer']);
    expect(db[BATTLE_BOOTS].usableClass).toEqual(['Gunslinger']);
    expect(db[COMBAT_BOOTS].usableClass).toContain('Archer');
  });

  it.each([
    ['dex', 3],
    ['hpPercent', 12],
    ['acd', 25],
    ['dmg_taken_range', 10],
  ])('Archer set with the wearable pair: %s +%i', (key, expected) => {
    expect(wearing(ARCHER_SUIT, COMBAT_BOOTS, COMMANDER, key as string)).toBe(expected);
  });

  it.each([
    ['dex', 3],
    ['hpPercent', 12],
    ['acd', 25],
    ['dmg_taken_range', 10],
  ])('Shooter set: %s +%i', (key, expected) => {
    expect(wearing(SHOOTER_SUIT, BATTLE_BOOTS, SHERIFF, key as string)).toBe(expected);
  });

  it('the two boot generations never stack — only one boot fits the slot', () => {
    expect(wearing(ARCHER_SUIT, BATTLE_BOOTS, COMMANDER, 'dex')).toBe(3);
    expect(wearing(ARCHER_SUIT, COMBAT_BOOTS, COMMANDER, 'dex')).toBe(3);
  });

  // "Resistência a todas as outras raças -200%" is spelled race by race, the way the
  // sibling Elite suits 2377 and 2380 already spell it — never as subrace_all, which the
  // engine deliberately keeps off player attackers (PLAYER_RACES in core/pvp.ts) and
  // which would therefore have made the penalty read differently on the two halves.
  const OTHER_RACES = ['formless', 'undead', 'brute', 'plant', 'insect', 'fish', 'demon', 'angel', 'dragon', 'player_doram'];

  it.each(OTHER_RACES)('"todas as outras raças -200%%" hits subrace_%s', (race) => {
    expect(suitShare(ARCHER_SUIT, COMBAT_BOOTS, COMMANDER, `subrace_${race}`)).toBe(-200);
    expect(suitShare(SHOOTER_SUIT, BATTLE_BOOTS, SHERIFF, `subrace_${race}`)).toBe(-200);
  });

  it('leaves subrace_all alone, so the penalty cannot leak onto a race it excludes', () => {
    expect(wearing(ARCHER_SUIT, COMBAT_BOOTS, COMMANDER, 'subrace_all')).toBe(0);
    expect(wearing(SHOOTER_SUIT, BATTLE_BOOTS, SHERIFF, 'subrace_all')).toBe(0);
  });

  it('spares the two races the description exempts — Humanoide and Humano', () => {
    for (const suit of [ARCHER_SUIT, SHOOTER_SUIT]) {
      const [boot, garment] = suit === ARCHER_SUIT ? [COMBAT_BOOTS, COMMANDER] : [BATTLE_BOOTS, SHERIFF];
      expect(suitShare(suit, boot, garment, 'subrace_demihuman')).toBe(2);
      expect(suitShare(suit, boot, garment, 'subrace_player_human')).toBe(2);
    }
  });

  it('none of it fires on the suit alone', () => {
    for (const key of ['dex', 'acd', 'dmg_taken_range', 'subrace_dragon']) {
      expect(stat([ARCHER_SUIT], { armor: ARCHER_SUIT }, key), key).toBe(0);
    }
  });

  it('Manto do Médico 2380 carries the same slip and the same fix', () => {
    // Acolyte-only garment whose set was gated on 2437, a Gunslinger boot — dead as
    // written. Both boot generations are named now, so the wearable one pays.
    expect(db[2380].usableClass).toEqual(['Acolyte']); // "Manto" by name, armour by slot (513)
    const worn = (key: string) => stat([2380, 2436, 2539], { armor: 2380, boot: 2436, garment: 2539 }, key);
    expect(stat([2380], { armor: 2380 }, 'int')).toBe(0);
    expect(worn('int')).toBe(3);
    expect(worn('healPower')).toBe(6);
  });
});

describe('Chapéu da Guarda Real 18878 — the Neutro half of the same refine line', () => {
  const cap = (refine: number) => stat([18878], { headUpper: 18878, headUpperRefine: refine }, 'subele_neutral');

  it('the base +5% below the gate', () => {
    expect(cap(5)).toBe(5);
  });

  it('climbs one point per refine from +6, in step with the ranged half', () => {
    expect(cap(6)).toBe(6);
    expect(cap(12)).toBe(12);
    expect(cap(18)).toBe(18);
  });
});

describe('Escudo Ilusión A 460004 — the upstream Thai script is gone', () => {
  const shield = (key: string, refine: number) => stat([460004], { shield: 460004, shieldRefine: refine }, key);

  it('grants no MaxHP/MaxSP +10% — the pt-BR description has neither', () => {
    expect(shield('hpPercent', 12)).toBe(0);
    expect(shield('spPercent', 12)).toBe(0);
  });

  it('grants no DEF/DEFM per 3 refines — likewise absent from the pt-BR description', () => {
    // `def` still carries the shield's own base DEF; what must not appear is the Thai
    // "3---50" step, which at +12 would have added another 200 on top of it.
    expect(shield('def', 12)).toBe(90);
    expect(shield('mdef', 12)).toBe(0);
  });

  it('"Refino +7 ou mais: Resistência a danos mágicos +5%" lands on dmg_taken_magical', () => {
    expect(shield('dmg_taken_magical', 6)).toBe(0);
    expect(shield('dmg_taken_magical', 7)).toBe(5);
  });

  it('keeps the Soquete Ilusión A combo (Esquiva perfeita +10)', () => {
    const withSoquete = stat([460004, 32209], { shield: 460004, accLeft: 32209 }, 'perfectDodge');
    const without = stat([460004], { shield: 460004 }, 'perfectDodge');
    expect(withSoquete - without).toBe(10);
  });

  it('carries the LATAM DEF, weight and level, not the Thai ones', () => {
    expect(db[460004].defense).toBe(90);
    expect(db[460004].weight).toBe(100);
    expect(db[460004].requiredLevel).toBe(130);
  });
});
