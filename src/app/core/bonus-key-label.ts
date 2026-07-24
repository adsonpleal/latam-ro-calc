import { resolveSkillById } from 'src/app/skills';

/** Resolves a bonus/chance key to a { id, name } skill when it's a plain numeric skill id. */
export function resolveSkillKey(key: string): { id: number; name: string; iconType?: 'item' | 'skill' } | undefined {
  return /^\d+$/.test(key) ? resolveSkillById(Number(key)) : undefined;
}

// pt-BR stat labels aligned with the battle-summary panel (ATQ/ATQM/DEFM/VelAtq/Conj. …),
// so the item-bonus list reads the same as the rest of the UI instead of raw EN abbreviations.
export const ITEM_BONUS_LABELS: Record<string, string> = {
  hp: 'HP máx.', hpPercent: 'HP máx. %', sp: 'SP máx.', spPercent: 'SP máx. %',
  def: 'DEF', defPercent: 'DEF %', softDef: 'DEF Suave', softDefPercent: 'DEF Suave %',
  mdef: 'DEFM', mdefPercent: 'DEFM %', softMdef: 'DEFM Suave', softMdefPercent: 'DEFM Suave %',
  res: 'RES', mres: 'RESM',
  allStatus: 'Todos os atributos', allTrait: 'Todos os traços',
  range: 'Dano à distância', melee: 'Dano corpo a corpo', bowRange: 'Alcance do arco',
  atk: 'ATQ', x_atk: 'ATQ (extra)', cannonballAtk: 'ATQ Bala de Canhão', atkPercent: 'ATQ %',
  matk: 'ATQM', matkPercent: 'ATQM %', flatDmg: 'Dano fixo', dmg: 'Dano',
  pAtk: 'P.ATQ', sMatk: 'S.ATQM', cRate: 'T.CRÍT',
  aspd: 'VelAtq', aspdPercent: 'VelAtq %',
  skillAspd: 'VelAtq (hab.)', skillAspdPercent: 'VelAtq % (hab.)', decreaseSkillAspdPercent: 'Reduz VelAtq (hab.)',
  acd: 'Pós-conjuração', fct: 'Conj. Fixa', fctPercent: 'Conj. Fixa %',
  vct: 'Conj. Variável', vct_inc: 'Conj. Variável (aumento)', vctBySkill: 'Conj. Variável (hab.)',
  cd: 'Recarga',
  hit: 'Precisão', perfectHit: 'Precisão Perfeita', cri: 'Crítico', criDmg: 'Dano crítico',
  perfectDodge: 'Esquiva perfeita', flee: 'Esquiva', forceCri: 'Força crítico',
  ignore_size_penalty: 'Ignora penalidade de tamanho', p_infiltration: 'Infiltração física',
  p_final: 'Dano físico final', m_final: 'Dano mágico final', mildwind: 'Vento Suave',
  // Defender-side reductions vs players (PVP) — see docs/pvp.md §4
  dmg_taken_all: 'Redução de dano recebido de jogadores',
  dmg_taken_physical: 'Redução de dano físico recebido de jogadores',
  dmg_taken_magical: 'Redução de dano mágico recebido de jogadores',
  dmg_taken_range: 'Redução de dano físico à distância recebido de jogadores',
};

/** pt-BR labels for buff bonus keys (skill descriptions aren't in the local
 *  data, so the buff popover summarises the effect from its bonus values). */
export const BUFF_BONUS_LABELS: Record<string, string> = {
  atk: 'ATK', matk: 'MATK', atkPercent: 'ATK%', matkPercent: 'MATK%',
  pAtk: 'P.ATK', sMatk: 'S.MATK', cRate: 'C.RATE',
  hit: 'HIT', cri: 'Crit', perfectHit: 'Acerto Perfeito', flatDmg: 'Dano Fixo',
  aspd: 'ASPD', aspdPercent: 'ASPD%', skillAspd: 'ASPD (hab.)', vct: 'VCT',
  str: 'FOR', agi: 'AGI', vit: 'VIT', int: 'INT', dex: 'DES', luk: 'SOR',
  pow: 'POW', sta: 'STA', wis: 'WIS', spl: 'SPL', con: 'CON', crt: 'CRT',
  def: 'DEF', mdef: 'MDEF',
  p_pene_race_all: 'Penetração Física (Raça)', m_pene_race_all: 'Penetração Mágica (Raça)',
  pene_res: 'Penetrar Res', pene_mres: 'Penetrar MRes',
  monster_res: 'Res do alvo', monster_mres: 'MRes do alvo', oratio: 'Reduz Res. Sagrado do alvo',
  infection: 'Reduz Res. Veneno do alvo',
  intoxication: 'Reduz Res. Veneno do alvo',
  bitterCold: 'Reduz Res. Água do alvo',
  gravitation: 'Dano físico e mágico recebido',
  comet: 'Dano Cometa', raid: 'Dano físico recebido', darkClaw: 'Garra Sombria',
  sporeExplosion: 'Dano recebido', quake: 'Dano físico recebido', oleumSanctum: 'Oleum Sanctum',
  mysticAmp: 'Ampl. Mística', magnumBreakPsedoBonus: 'Impacto Explosivo', magnumBreakClearEDP: 'Limpar EDP',
  ignore_size_penalty: 'Ignora penalidade de tamanho', m_my_element_water: 'Dano Mágico (Água)',
};

const BONUS_KEY_PARTS = {
  atk: { p: 'Físico', m: 'Mágico' } as Record<string, string>,
  cat: { size: 'Tamanho', element: 'Elemento', race: 'Raça', class: 'Classe' } as Record<string, string>,
  sub: {
    all: 'Todos', s: 'Pequeno', m: 'Médio', l: 'Grande',
    normal: 'Normal', boss: 'Chefe',
    neutral: 'Neutro', water: 'Água', earth: 'Terra', fire: 'Fogo', wind: 'Vento',
    poison: 'Veneno', holy: 'Sagrado', dark: 'Sombrio', ghost: 'Fantasma', undead: 'Morto-vivo',
    formless: 'Sem Forma', brute: 'Bruto', plant: 'Planta', insect: 'Inseto', fish: 'Peixe',
    demon: 'Demônio', demihuman: 'Semi-humano', angel: 'Anjo', dragon: 'Dragão',
    player_human: 'Humano', player_doram: 'Doram',
  } as Record<string, string>,
};

/** Decode the structured damage keys, e.g. `p_size_l` → "Dano Físico (Tamanho: Grande)",
 *  `m_pene_race_demon` → "Penetração Mágica (Raça: Demônio)", `pene_res_race_fish` →
 *  "Penetrar RES (Raça: Peixe)". Returns undefined when the key isn't one of these. */
export function decodeStructuredBonusKey(key: string): string | undefined {
  const { atk, cat, sub } = BONUS_KEY_PARTS;
  let m: RegExpMatchArray | null;
  // p_/m_ penetration vs a category subtype
  if ((m = key.match(/^([pm])_pene_(size|element|race|class)_(\w+)$/))) {
    return `Penetração ${atk[m[1]] === 'Físico' ? 'Física' : 'Mágica'} (${cat[m[2]]}: ${sub[m[3]] ?? m[3]})`;
  }
  // m_my_element_* — damage with the character's own element
  if ((m = key.match(/^m_my_element_(\w+)$/))) {
    const prop = m[1] === 'all' ? 'todas as propriedades' : (sub[m[1]] ?? m[1]);
    return `Dano Mágico por Propriedade (${prop})`;
  }
  // p_/m_ damage vs a category subtype
  if ((m = key.match(/^([pm])_(size|element|race|class)_(\w+)$/))) {
    return `Dano ${atk[m[1]]} (${cat[m[2]]}: ${sub[m[3]] ?? m[3]})`;
  }
  // Defender-side PVP reductions: sub{race,element,size,class}_X → "Resistência (Cat.: X)"
  if ((m = key.match(/^sub(race|ele|size|class)_(\w+)$/))) {
    const catKey = { race: 'race', ele: 'element', size: 'size', class: 'class' }[m[1]] as string;
    return `Resistência (${cat[catKey]}: ${sub[m[2]] ?? m[2]})`;
  }
  // RES/MRES penetration vs a race
  if ((m = key.match(/^pene_(res|mres)_race_(\w+)$/))) {
    return `Penetrar ${m[1].toUpperCase()} (Raça: ${sub[m[2]] ?? m[2]})`;
  }
  // Chance of activating something
  if ((m = key.match(/^chance__(\w+)$/))) {
    const determinedBonus = BUFF_BONUS_LABELS[m[1]] ?? decodeStructuredBonusKey(m[1]);
    return `Chance de ${determinedBonus ?? m[1].toUpperCase()}`;
  }
  // Combo bonuses
  if ((m = key.match(/^(vct|fct|cd)__(.+)$/))) {
    const resolvedSkill = resolveSkillKey(m[2]);
    return `Redução de ${ITEM_BONUS_LABELS[m[1]]} de ${resolvedSkill ? resolvedSkill.name : m[2]}`;
  }
  return undefined;
}

/** pt-BR label for an item/equip bonus key: explicit overrides first, then the shared
 *  buff labels, then a decoder for the structured damage keys (p_/m_ × size/element/
 *  race/class), falling back to the raw key when nothing matches. */
export function bonusKeyLabel(key: string): string {
  return ITEM_BONUS_LABELS[key] ?? BUFF_BONUS_LABELS[key] ?? decodeStructuredBonusKey(key) ?? key;
}
