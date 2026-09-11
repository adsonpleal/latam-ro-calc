/**
 * Balões Poring — 19143 Poring, 19146 Marin, 19147 Drops, 19148 Poring Natalino,
 * 19149 Poporing, 19150 Metaling, 19151 Deviling, 19152 Angeling, 19153 Ghostring,
 * 19154 Archangeling and 19095 Balões da Família Poring, the lower headgear of the poring
 * family. The eleven share one enchant table and none of them had a row here, so their
 * sockets offered nothing at all.
 *
 * The table is the "Encantamentos Aleatórios" block on browiki's Balões Poring template,
 * which lists the balloons together under a single "Alvo" column — one table for the whole
 * family, the same shape the Brotos Temporais take (see temporal_sprout.ts).
 *
 * 19095 is the one the wiki does not carry. Its "Alvo" column names only the ten
 * `*_Balloon` ids, and browiki has no page for 19095 at all (its aegisName is
 * `Happy_Balloon_K`, from an older release than the Caixa de Balões Poring the section is
 * headed by). It takes the same roll in game, reported by the maintainer, and that is the
 * only source for it.
 *
 * @see https://browiki.org/wiki/Predefini%C3%A7%C3%A3o:Bal%C3%B5es_Poring
 */

/**
 * Slot 4 — the whole roll, in the order the wiki prints it: tier 1 first (20,75% each),
 * then tier 2 (3%), then the two P.ATQ/S.ATQM pairs (2% and 0,5%). The upgrade table
 * below the roll is what pairs each tier-1 stone with its tier-2 form, so both tiers
 * belong in the one socket.
 */
export const poringBalloonSlot4 = [
  'aegis_310986', // Músculo 1 — Dano físico +3%
  'aegis_310988', // Intelecto 1 — Dano mágico +3%
  'aegis_310990', // HP máx. +3%
  'aegis_310992', // SP máx. +3%
  'aegis_310987', // Músculo 2 — Dano físico +5%
  'aegis_310989', // Intelecto 2 — Dano mágico +5%
  'aegis_310991', // HP máx. +5%
  'aegis_310993', // SP máx. +5%
  'aegis_310982', // P.ATQ +1
  'aegis_310984', // S.ATQM +1
  'aegis_310983', // P.ATQ +2
  'aegis_310985', // S.ATQM +2
];

/**
 * Slot 3 — the eleven "Mestre" stones, ten races at 9,95% each and "Mestre dos Mestres"
 * at 0,50% for monsters at large.
 *
 * Every one of them is an EXP-rate bonus ("EXP adquirida ao derrotar a raça Bruto +5%"),
 * and the engine has no key for experience or drop rate — the same reason the balloons'
 * own "Taxa de DROP +5%" and "EXP adquirida por monstros +5%" lines carry no script. They
 * are listed anyway so the picker offers the roll the game offers; picking one moves no
 * number, and nothing here should be read as a damage bonus that failed to register.
 */
export const poringBalloonSlot3 = [
  'aegis_310994', // Mestre Amorfo
  'aegis_310995', // Mestre Morto
  'aegis_310996', // Mestre Bruto
  'aegis_310997', // Mestre Planta
  'aegis_310998', // Mestre Inseto
  'aegis_310999', // Mestre Peixe
  'aegis_311000', // Mestre Demônio
  'aegis_311001', // Mestre Humanoide
  'aegis_311002', // Mestre Anjo
  'aegis_311003', // Mestre Dragão
  'aegis_311004', // Mestre dos Mestres
];
