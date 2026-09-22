import { ItemAutoCastRule } from '../models/item.model';

/**
 * Client-described physical basic-attack damage rules that have replay coverage.
 *
 * The public item model consumes the same shape as item.json. Keeping the clauses
 * together makes their evidence and replay fixtures reviewable without loading
 * descriptions into the calculator's startup path.
 */
export const ITEM_AUTO_CASTS: Record<number, ItemAutoCastRule[]> = {
  1185: [
    { key: 'item-1185-frost-nova', skillId: 88, skillLevel: 5, chance: 5, trigger: 'physical-hit', roll: 'independent', status: 'verified-direct-damage', evidence: 'LATAM: 5% por ataque físico' },
    { key: 'item-1185-meteor-storm', skillId: 83, skillLevel: 3, chance: 3, trigger: 'physical-hit', roll: 'independent', status: 'verified-direct-damage', evidence: 'LATAM: 3% por ataque físico' },
  ],
  24527: [
    { key: 'item-24527-psychic-wave', skillId: 2449, skillLevel: 3, chance: 7, trigger: 'physical-hit', roll: 'independent', conditions: ['SELF_REFINE>=9'], status: 'verified-direct-damage', evidence: 'LATAM: 4% +1% no +7 +2% no +9' },
  ],
  24728: [
    { key: 'item-24728-frost-misty', skillId: 2203, skillLevel: 3, skillLevelMode: 'highest-learned', chance: 7, trigger: 'melee-physical-hit', roll: 'independent', conditions: ['SELF_REFINE>=10'], status: 'verified-direct-damage', evidence: 'LATAM: Malha +10' },
    { key: 'item-24728-jack-frost', skillId: 2204, skillLevel: 4, skillLevelMode: 'highest-learned', chance: 8, trigger: 'melee-physical-hit', roll: 'independent', conditions: ['EQUIP_ID[24729]', 'TOTAL_REFINE[24728,24729]>=20'], status: 'verified-direct-damage', evidence: 'LATAM: Malha/Greva, soma +20' },
  ],
  510019: [
    { key: 'item-510019-meteor-storm', skillId: 83, skillLevel: 7, chance: 10, trigger: 'melee-physical-hit', roll: 'independent', conditions: ['SELF_REFINE>=7'], status: 'verified-direct-damage', evidence: 'LATAM: Punhal Primordial +7' },
    { key: 'item-510019-psychic-wave', skillId: 2449, skillLevel: 4, chance: 7, trigger: 'melee-physical-hit', roll: 'independent', conditions: ['SELF_REFINE>=11'], status: 'verified-direct-damage', evidence: 'LATAM: Punhal Primordial +11' },
  ],
  510040: [
    { key: 'item-510040-meteor-storm', skillId: 83, skillLevel: 7, chance: 10, trigger: 'melee-physical-hit', roll: 'independent', conditions: ['SELF_REFINE>=7'], status: 'verified-direct-damage', evidence: 'LATAM: Punhal Primordial-LT +7' },
    { key: 'item-510040-psychic-wave', skillId: 2449, skillLevel: 5, chance: 7, trigger: 'melee-physical-hit', roll: 'independent', conditions: ['SELF_REFINE>=11'], status: 'verified-direct-damage', evidence: 'LATAM: Punhal Primordial-LT +11' },
  ],
  510034: [
    { key: 'item-510034-killing-cloud', skillId: 2450, skillLevel: 3, chance: 7, trigger: 'melee-physical-hit', roll: 'independent', conditions: ['EQUIP_ID[460017]', 'TOTAL_REFINE[510034,460017]>=18'], status: 'verified-direct-damage', evidence: 'LATAM: Ritualística/Vembrassa, soma +18' },
  ],
  300006: [
    { key: 'item-300006-psychic-wave', skillId: 2449, skillLevel: 1, chance: 7, trigger: 'melee-physical-hit', roll: 'independent', status: 'verified-direct-damage', evidence: 'LATAM: Carta Geodoliant' },
  ],
  27305: [
    { key: 'item-27305-hell-inferno', skillId: 2212, skillLevel: 3, chance: 2, trigger: 'melee-physical-hit', roll: 'independent', status: 'verified-direct-damage', evidence: 'LATAM: Carta EL-A17T' },
  ],
  420820: [
    { key: 'item-420820-fire-bolt', skillId: 19, skillLevel: 5, chance: 7, trigger: 'physical-hit', roll: 'independent', conditions: ['EQUIP_ID[19192]'], status: 'verified-direct-damage', evidence: 'LATAM + replay: Boné Maratonista Renegado' },
    { key: 'item-420820-cold-bolt', skillId: 14, skillLevel: 5, chance: 7, trigger: 'physical-hit', roll: 'independent', conditions: ['EQUIP_ID[19192]'], status: 'verified-direct-damage', evidence: 'LATAM + replay: Boné Maratonista Renegado' },
    { key: 'item-420820-lightning-bolt', skillId: 20, skillLevel: 5, chance: 7, trigger: 'physical-hit', roll: 'independent', conditions: ['EQUIP_ID[19192]'], status: 'verified-direct-damage', evidence: 'LATAM + replay: Boné Maratonista Renegado' },
  ],
  700132: [
    { key: 'item-700132-judex', skillId: 2038, skillLevel: 5, chance: 10, trigger: 'ranged-physical-hit', roll: 'independent', conditions: ['AMMO_ID[1751]'], status: 'verified-direct-damage', evidence: 'LATAM: Arco Híbrido/Flecha de Prata' },
    { key: 'item-700132-crimson-rock', skillId: 2211, skillLevel: 3, chance: 10, trigger: 'ranged-physical-hit', roll: 'independent', conditions: ['AMMO_ID[1752]'], status: 'verified-direct-damage', evidence: 'LATAM + replay: Arco Híbrido/Flecha de Fogo' },
    { key: 'item-700132-diamond-dust', skillId: 2447, skillLevel: 3, chance: 10, trigger: 'ranged-physical-hit', roll: 'independent', conditions: ['AMMO_ID[1754]'], status: 'verified-direct-damage', evidence: 'LATAM: Arco Híbrido/Flecha de Cristal' },
    { key: 'item-700132-chain-lightning', skillId: 2214, skillLevel: 3, chance: 10, trigger: 'ranged-physical-hit', roll: 'independent', conditions: ['AMMO_ID[1755]'], status: 'verified-direct-damage', evidence: 'LATAM: Arco Híbrido/Flecha de Vento' },
    { key: 'item-700132-earth-strain', skillId: 2216, skillLevel: 3, chance: 10, trigger: 'ranged-physical-hit', roll: 'independent', conditions: ['AMMO_ID[1756]'], status: 'verified-direct-damage', evidence: 'LATAM: Arco Híbrido/Flecha de Pedra' },
    { key: 'item-700132-soul-expansion', skillId: 2202, skillLevel: 3, chance: 10, trigger: 'ranged-physical-hit', roll: 'independent', conditions: ['AMMO_ID[1757]'], status: 'verified-direct-damage', evidence: 'LATAM: Arco Híbrido/Flecha Imaterial' },
    { key: 'item-700132-killing-cloud', skillId: 2450, skillLevel: 3, chance: 10, trigger: 'ranged-physical-hit', roll: 'independent', conditions: ['AMMO_ID[1762]'], status: 'verified-direct-damage', evidence: 'LATAM: Arco Híbrido/Flecha Enferrujada' },
    { key: 'item-700132-psychic-wave', skillId: 2449, skillLevel: 3, chance: 10, trigger: 'ranged-physical-hit', roll: 'independent', conditions: ['AMMO_ID[1773]'], status: 'verified-direct-damage', evidence: 'LATAM: Arco Híbrido/Flecha Élfica' },
  ],
};
