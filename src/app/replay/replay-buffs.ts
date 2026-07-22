/**
 * Resolve the buffs / ASPD potions a replay had active at recording start from
 * its EFST (status-effect) snapshot. Persistent buffs live in the RRF's EfstList
 * container (see rrf/decode.ts) and never fire a status-change packet, so the
 * importer seeds them as active statuses and this module turns them into model
 * fields (`aspdPotion`, `aspdPotions`, `skillBuffMap`).
 *
 * EFST ids are the LATAM client's (ragreplaystats public/db/status.json), NOT
 * rAthena's — verify any new id against status.json before adding.
 */

/** ASPD-potion EFST → item id, strongest first (Fúria > Despertar > Concentração).
 *  Only one is worn at a time (each replaces the weaker), so we keep the highest. */
const ASPD_POTION_EFST: [number, number][] = [
  [39, 657], // Em Fúria!        → Poção da Fúria Selvagem
  [38, 656], // Poção do Despertar
  [37, 645], // Poção da Concentração
];

/** Stackable ASPD potion EFST → item id (adds on top of the single-select one). */
const STACKABLE_POTION_EFST: Record<number, number> = {
  647: 12684, // Poção de Ouro (+3%, acumulativo)
};

/**
 * Job/party buffs importable purely from an active EFST — you receive Bênção,
 * Aumentar Agilidade, Impositio, etc. without learning them, so they can't come
 * from the learned-skill tree. `name` is the JobBuffs entry (job-buffs.ts) and
 * `value` its dropdown value. Level-scaled buffs default to their base level
 * (the snapshot doesn't carry a reliable caster level); the user can bump it.
 */
export const BUFF_EFST: Record<number, { name: string; value: number }> = {
  10: { name: 'Clementia', value: 10 }, // Bênção
  12: { name: 'Cantocandidus', value: 10 }, // Aumentar Agilidade
  15: { name: 'Impositio Manus', value: 5 },
  340: { name: 'Expiatio', value: 5 },
  1201: { name: 'Competentia', value: 5 },
  1227: { name: 'Religio', value: 5 },
  1228: { name: 'Benedictum', value: 5 },
  30: { name: 'Crazy Uproar', value: 1 }, // Grito de Guerra
  25: { name: 'Power Thrust', value: 5 }, // Força Violenta
  24: { name: 'Weapon Perfection', value: 5 }, // Manejo Perfeito
  23: { name: 'Adrenaline Rush', value: 5 }, // Adrenalina Pura
  445: { name: 'Striking', value: 20 }, // Encanto de Órion
  1263: { name: 'March of Prontera', value: 5 }, // Marcha de Prontera
  920: { name: 'Bunch of Shrimp', value: 1 }, // Chuva de Mariscos
};

export function resolveAspdPotionFromStatus(activeStatuses: Iterable<number>): {
  aspdPotion?: number;
  aspdPotions: number[];
} {
  const set = new Set(activeStatuses);
  const out: { aspdPotion?: number; aspdPotions: number[] } = { aspdPotions: [] };
  for (const [efst, itemId] of ASPD_POTION_EFST) {
    if (set.has(efst)) {
      out.aspdPotion = itemId;
      break; // strongest wins (they replace one another)
    }
  }
  for (const [efst, itemId] of Object.entries(STACKABLE_POTION_EFST)) {
    if (set.has(Number(efst))) out.aspdPotions.push(itemId);
  }
  return out;
}

export function resolveBuffsFromStatus(activeStatuses: Iterable<number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const efst of activeStatuses) {
    const buff = BUFF_EFST[efst];
    if (buff) out[buff.name] = buff.value;
  }
  return out;
}
