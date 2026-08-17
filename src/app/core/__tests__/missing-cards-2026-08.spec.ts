import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createRawTotalBonus } from 'src/app/utils';
import { CardPosition } from 'src/app/constants/card-position.enum';

/**
 * The cards the community reported as missing from the database.
 *
 * Reported as "Marionete Demoníaca, Doppelganger e etc." — the two named ones plus a
 * wider gap: 534 of the 1083 cards the LATAM client ships had no `item.json` record, so
 * they reached no picker at all. This batch adds the 64 whose **every** description line
 * maps to a bonus key the engine already has. The rest are left for a follow-up card
 * rather than half-registered: 197 mix a mappable line with a proc/conditional one, 222
 * are entirely proc/utility text, and 51 print no "Equipa em:" slot to route them by.
 *
 * A card registered with a script that quietly drops half its description is worse than
 * one that is still missing — the first reads as modelled.
 */

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const latam = JSON.parse(readFileSync('src/assets/demo/data/latam-items.json', 'utf8'));
const strip = (s: string) => (s || '').replace(/\^[0-9a-fA-F]{6}/g, '');

/** The 64 ids this batch added. */
const ADDED = [
  4002, 4003, 4004, 4006, 4008, 4011, 4012, 4013, 4014, 4015, 4016, 4023, 4027, 4028,
  4030, 4032, 4042, 4043, 4049, 4050, 4052, 4056, 4059, 4068, 4074, 4078, 4081, 4095,
  4097, 4106, 4108, 4109, 4113, 4116, 4120, 4136, 4138, 4142, 4272, 4309, 4314, 4328,
  4340, 4362, 4450, 4452, 4453, 4505, 4515, 4516, 4526, 4527, 4545, 4640, 4659, 4663,
  4664, 4665, 4666, 4667, 27291, 27342, 31016, 31021,
];

const VALID_POS = new Set<number>(
  Object.values(CardPosition).filter((v): v is number => typeof v === 'number'),
);

describe('the two cards the report named', () => {
  it('4142 Carta Doppelganger — "Velocidade de ataque +10%"', () => {
    expect(items[4142].script).toEqual({ aspdPercent: ['10'] });
    expect(items[4142].compositionPos).toBe(CardPosition.Weapon);
  });

  it('31021 Carta Marionete Demoníaca — "ATQ da arma -3%" and "Velocidade de ataque +10%"', () => {
    // "ATQ da arma +N%" is the old wording of today's "Dano físico +N%", i.e. atkPercent
    // — see dano-fisico-percent.spec.ts. The -3% is a penalty, so it stays negative.
    expect(items[31021].script).toEqual({ atkPercent: ['-3'], aspdPercent: ['10'] });
    expect(items[31021].compositionPos).toBe(CardPosition.Weapon);
  });
});

describe('every card added in this batch', () => {
  it('is actually in item.json, as a card', () => {
    for (const id of ADDED) {
      expect(items[id], `${id} missing`).toBeTruthy();
      expect(items[id].itemTypeId, `${id} itemTypeId`).toBe(6);
      expect(items[id].itemSubTypeId, `${id} itemSubTypeId`).toBe(0);
    }
  });

  it('routes to a real card slot, taken from the description\'s "Equipa em:" line', () => {
    // A compositionPos no branch of the card router matches is how Carta Mosca Caçadora
    // vanished from every picker — see the 0.1.60-beta entry.
    const BY_SLOT: Record<string, number> = {
      'Arma': CardPosition.Weapon,
      'Armadura': CardPosition.Armor,
      'Escudo': CardPosition.Shield,
      'Capa': CardPosition.Garment,
      'Calçado': CardPosition.Boot,
      'Acessório': CardPosition.Acc,
      'Aces. Direito': CardPosition.AccR,
      'Aces. Esquerdo': CardPosition.AccL,
      'Equip. para Cabeça': CardPosition.Head,
    };

    for (const id of ADDED) {
      const pos = items[id].compositionPos;
      expect(VALID_POS.has(pos), `${id} has compositionPos ${pos}`).toBe(true);

      const slot = /Equipa em:\s*([^\n]*)/.exec(strip(latam[id].description))?.[1].trim();
      expect(BY_SLOT[slot!], `${id} "${slot}"`).toBe(pos);
    }
  });

  it('only uses bonus keys the engine actually reads', () => {
    // Never invent a key: an unknown one lands where nothing looks. See CLAUDE.md.
    const known = new Set(Object.keys(createRawTotalBonus()));
    for (const id of ADDED) {
      for (const key of Object.keys(items[id].script)) {
        expect(known.has(key), `${id} uses unknown key "${key}"`).toBe(true);
      }
    }
  });

  it('carries no number that is not in its own description', () => {
    // The guard against a mis-parsed line: every magnitude in the script has to appear
    // in the pt-BR text it was read from.
    for (const id of ADDED) {
      const desc = strip(latam[id].description).replace(/\./g, '');
      for (const values of Object.values(items[id].script) as string[][]) {
        for (const v of values) {
          expect(desc.includes(String(Math.abs(Number(v)))), `${id} value ${v}`).toBe(true);
        }
      }
    }
  });
});

describe('the mappings this batch relies on', () => {
  it('reads "Resistência a raça X" as damage taken (subrace_), not damage dealt', () => {
    // 4059 Carta Soldado Andre: "Reduz em 30% o dano causado por monstros da raça Planta."
    // Same effect as the modern "Resistência a raça +N%" wording, which Batina (2327) and
    // Asas de Anjo (2254) already carry as subrace_.
    expect(items[4059].script).toEqual({ subrace_plant: ['30'] });
  });

  it('reads "Dano físico contra a propriedade X" as damage dealt (p_element_)', () => {
    // 4030 Carta Mandrágora: "Dano físico contra a propriedade Vento +20%."
    expect(items[4030].script).toEqual({ p_element_wind: ['20'] });
  });

  it('keeps a cast-time penalty negative, since the key stores reductions positive', () => {
    // Carta Fen (4077, already in the DB) is the precedent: "Conjuração variável +25%"
    // is registered as vct -25.
    expect(items[4077].script.vct).toEqual(['-25']);
  });
});
