import { AttackDelay, Spell } from './_basic';

/**
 * Brotos Temporais — 420017 FOR, 420018 DES, 420019 AGI, 420020 SOR, 420021 VIT and
 * 420022 INT, the lower headgear of the Temporal sets. The six share one enchant table
 * and none of them had a row here, so their three sockets offered nothing at all.
 *
 * The table is the "Encantamentos Aleatórios" block on browiki's Brotos Temporais
 * template, which collapses the repeated rows: it prints one generic "Atributo +1" for
 * slot 4 and one generic "Talento +1" for slot 2, with a representative icon (FOR +1
 * and POD +1). Its own percentages say those two lines stand for the whole family
 * rather than for one stat per sprout — slot 4's 12,46 + 3,50 + 0,70 = 16,66% is
 * exactly a sixth of the roll, and slot 2's (9,50 + 0,50) × 10 entries is exactly all
 * of it, which only adds up if every sprout offers all six stats and all six traits.
 *
 * @see https://browiki.org/wiki/Predefini%C3%A7%C3%A3o:Brotos_Temporais
 */

/** Slot 3 — the flat pool, in the order the wiki lists it. */
export const sproutSlot3 = [
  'aegis_310992', // SP máx. +3%
  'aegis_310990', // HP máx. +3%
  'aegis_310986', // Músculo 1 — Dano físico +3%
  'aegis_310988', // Intelecto 1 — Dano mágico +3%
  Spell._1, // P. Encanto 1
  AttackDelay._1, // Anti-Atraso 1
  'aegis_310991', // HP máx. +5%
  'aegis_310993', // SP máx. +5%
  'aegis_310987', // Músculo 2 — Dano físico +5%
  'aegis_310989', // Intelecto 2 — Dano mágico +5%
  Spell._2, // P. Encanto 2 — the wiki gives it only in the slot-3 upgrade table
  AttackDelay._2, // Anti-Atraso 2 — likewise
];

/** Slot 2 — the six talentos plus the four derived stats, +1 then +2. */
export const sproutSlot2 = [
  'aegis_311076', // POD +1
  'aegis_311082', // STA +1
  'aegis_311078', // SAB +1
  'aegis_311080', // FEI +1
  'aegis_311086', // CON +1
  'aegis_311084', // CRV +1
  'aegis_311088', // T.CRÍT +1
  'aegis_311090', // C.Mais +1
  'aegis_310982', // P.ATQ +1
  'aegis_310984', // S.ATQM +1
  'aegis_311077', // POD +2
  'aegis_311083', // STA +2
  'aegis_311079', // SAB +2
  'aegis_311081', // FEI +2
  'aegis_311087', // CON +2
  'aegis_311085', // CRV +2
  'aegis_311089', // T.CRÍT +2
  'aegis_311091', // C.Mais +2
  'aegis_310983', // P.ATQ +2
  'aegis_310985', // S.ATQM +2
];
