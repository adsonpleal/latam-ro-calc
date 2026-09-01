import { resolveSkillById } from 'src/app/skills';

/** Resolves a bonus/chance key to a { id, name } skill when it's a plain numeric skill id. */
export function resolveSkillKey(key: string): { id: number; name: string; iconType?: 'item' | 'skill' } | undefined {
  return /^\d+$/.test(key) ? resolveSkillById(Number(key)) : undefined;
}

// pt-BR stat labels aligned with the battle-summary panel (ATQ/ATQM/DEFM/Vel.Atq/Conj. …)
// and with bROWiki's own naming (Atributos / Talentos),
// so the item-bonus list reads the same as the rest of the UI instead of raw EN abbreviations.
export const ITEM_BONUS_LABELS: Record<string, string> = {
  hp: 'HP máx.', hpPercent: 'HP máx. %', sp: 'SP máx.', spPercent: 'SP máx. %',
  healReceived: 'Cura recebida', healPower: 'Efetividade de cura',
  hpRecovRate: 'Regen. natural de HP', spRecovRate: 'Regen. natural de SP',
  hpDrain: 'Converte dano em HP', spDrain: 'Converte dano em SP',
  reduceDamageReturn: 'Resistência a dano refletido',
  magicHealHp: 'Cura Mágica (HP/s)', magicHealSp: 'Cura Espiritual (SP/s)',
  hpRestoreOnKill: 'Recupera HP ao derrotar', spRestoreOnKill: 'Recupera SP ao derrotar',
  def: 'DEF', defPercent: 'DEF %', softDef: 'DEF Leve', softDefPercent: 'DEF Leve %',
  mdef: 'DEFM', mdefPercent: 'DEFM %', softMdef: 'DEFM Leve', softMdefPercent: 'DEFM Leve %',
  // Tenacidade / Tenacidade Mágica — the LATAM client's own names for the two
  // damage-reduction traits (bROWiki "Talentos"). The engine keys stay res/mres.
  res: 'TEN', mres: 'TENM',
  // Stats and traits under the status window's pt-BR names. Without these lines the
  // lookup fell through to the buff labels, which are the international abbreviations —
  // that is how Manopla Sombria POD showed up as "POW +4" in the item panel.
  str: 'FOR', agi: 'AGI', vit: 'VIT', int: 'INT', dex: 'DES', luk: 'SOR',
  pow: 'POD', sta: 'STA', wis: 'SAB', spl: 'FEI', con: 'CON', crt: 'CRV',
  hplus: 'C.Mais',
  allStatus: 'Todos os atributos', allTrait: 'Todos os talentos',
  range: 'Dano à distância', melee: 'Dano corpo a corpo', bowRange: 'Alcance do arco',
  // The client renamed these: what it used to print as "ATQ +N%" / "ATQ da arma +N%" is now
  // "Dano físico +N%", and "ATQM +N%" is now "Dano mágico +N%". The old wording survives on
  // 3 items each, the new one on 455 / 422 — so the labels follow the new text. The flat
  // ATQ/ATQM lines below keep their names; only the percentages were renamed.
  atk: 'ATQ', x_atk: 'ATQ (extra)', cannonballAtk: 'ATQ Bala de Canhão', atkPercent: 'Dano físico %',
  matk: 'ATQM', matkPercent: 'Dano mágico %', flatDmg: 'Dano fixo', dmg: 'Dano',
  pAtk: 'P.ATQ', sMatk: 'S.ATQM', cRate: 'T.CRIT',
  aspd: 'Vel.Atq', aspdPercent: 'Vel.Atq %',
  skillAspd: 'Vel.Atq (hab.)', skillAspdPercent: 'Vel.Atq % (hab.)', decreaseSkillAspdPercent: 'Reduz Vel.Atq (hab.)',
  acd: 'Pós-conjuração', fct: 'Conj. Fixa', fctPercent: 'Conj. Fixa %',
  vct: 'Conj. Variável', vct_inc: 'Conj. Variável (aumento)', vctBySkill: 'Conj. Variável (hab.)',
  cd: 'Recarga',
  hit: 'Precisão', perfectHit: 'Precisão perfeita', cri: 'Crítico', criRange: 'CRIT à distância', criDmg: 'Dano crítico',
  perfectDodge: 'Esquiva Perfeita', flee: 'Esquiva', forceCri: 'Força crítico',
  ignore_size_penalty: 'Ignora penalidade de tamanho', p_infiltration: 'Infiltração física',
  mildwind: 'Vento Suave',
  // Defender-side reductions vs players (PVP) — see docs/pvp.md §4
  dmg_taken_all: 'Redução de dano recebido de jogadores',
  dmg_taken_physical: 'Redução de dano físico recebido de jogadores',
  dmg_taken_magical: 'Redução de dano mágico recebido de jogadores',
  dmg_taken_range: 'Redução de dano físico à distância recebido de jogadores',
};

/**
 * pt-BR labels for buff bonus keys (skill descriptions aren't in the local data, so the
 * buff popover summarises the effect from its bonus values).
 *
 * Terser than BONUS_KEY_LABELS above, because these sit inside a one-line summary of a
 * buff rather than in a column of their own — but terse in pt-BR, not in English. The
 * abbreviations are the game's own: the ones the status window and the ficha print, so a
 * buff reading "ATQ +20" names the same thing the panel behind it does. They used to read
 * ATK / MATK / HIT / MDEF / POW / WIS / SPL / CRT, which is the client's *English*
 * vocabulary and appears nowhere in the pt-BR client.
 */
export const BUFF_BONUS_LABELS: Record<string, string> = {
  atk: 'ATQ', matk: 'ATQM', atkPercent: 'Dano físico %', matkPercent: 'Dano mágico %',
  pAtk: 'P.ATQ', sMatk: 'S.ATQM', cRate: 'T.CRIT',
  hit: 'Precisão', cri: 'Crítico', perfectHit: 'Precisão perfeita', flatDmg: 'Dano fixo',
  aspd: 'Vel.Atq', aspdPercent: 'Vel.Atq %', skillAspd: 'Vel.Atq (hab.)',
  vct: 'Conj. Variável', vctBySkill: 'Conj. Variável (hab.)', acd: 'Pós-conjuração', fctPercent: 'Conj. Fixa %',
  str: 'FOR', agi: 'AGI', vit: 'VIT', int: 'INT', dex: 'DES', luk: 'SOR',
  pow: 'POD', sta: 'STA', wis: 'SAB', spl: 'FEI', con: 'CON', crt: 'CRV',
  def: 'DEF', mdef: 'DEFM',
  p_pene_race_all: 'Penetração Física (Raça)', m_pene_race_all: 'Penetração Mágica (Raça)',
  pene_res: 'Penetrar TEN', pene_mres: 'Penetrar TENM',
  monster_res: 'TEN do alvo', monster_mres: 'TENM do alvo', oratio: 'Reduz Res. Sagrado do alvo',
  infection: 'Reduz Res. Veneno do alvo',
  intoxication: 'Reduz Res. Veneno do alvo',
  bitterCold: 'Reduz Res. Água do alvo',
  gravitation: 'Dano físico e mágico recebido',
  comet: 'Dano Cometa', raid: 'Dano físico recebido', darkClaw: 'Garra Sombria',
  shadowScar: 'Profanação',
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
    demon: 'Demônio', demihuman: 'Humanoide', angel: 'Anjo', dragon: 'Dragão',
    player_human: 'Humano', player_doram: 'Doram',
  } as Record<string, string>,
};

/** Decode the structured damage keys, e.g. `p_size_l` → "Dano Físico (Tamanho: Grande)",
 *  `m_pene_race_demon` → "Penetração Mágica (Raça: Demônio)", `pene_res_race_fish` →
 *  "Penetrar TEN (Raça: Peixe)". Returns undefined when the key isn't one of these. */
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
  // Defender-side PVP reductions: sub{race,element,size,class}_X → "Resistência (Cat.: X)".
  // Only the size ones have the per-damage-type variant (subsize_m_physical), and the
  // suffix has to come off before the lookup — otherwise the target becomes "m_physical"
  // and the label comes out raw.
  if ((m = key.match(/^sub(race|ele|size|class)_(\w+?)(_physical|_magical)?$/))) {
    const catKey = { race: 'race', ele: 'element', size: 'size', class: 'class' }[m[1]] as string;
    const tipo = m[3] === '_physical' ? ', físico' : m[3] === '_magical' ? ', mágico' : '';
    return `Resistência (${cat[catKey]}: ${sub[m[2]] ?? m[2]}${tipo})`;
  }
  // Crit against a race
  if ((m = key.match(/^cri_race_(\w+)$/))) {
    return `Crítico (Raça: ${sub[m[1]] ?? m[1]})`;
  }
  // TEN/TENM penetration vs a race
  if ((m = key.match(/^pene_(res|mres)_race_(\w+)$/))) {
    return `Penetrar ${m[1] === 'res' ? 'TEN' : 'TENM'} (Raça: ${sub[m[2]] ?? m[2]})`;
  }
  // Chance of activating something
  if ((m = key.match(/^chance__(\w+)$/))) {
    const determinedBonus = BUFF_BONUS_LABELS[m[1]] ?? decodeStructuredBonusKey(m[1]);
    return `Chance de ${determinedBonus ?? m[1].toUpperCase()}`;
  }
  // `enable_skill__<id>` — the item grants the skill rather than boosting it, and the
  // value is the level it is granted at ("Habilita [Meteoro Escarlate] nv.5"). A class
  // that only reaches a skill this way gates it on the key, so it has to be readable in
  // the item's bonus list like any other.
  if ((m = key.match(/^enable_skill__(\d+)$/))) {
    const resolvedSkill = resolveSkillKey(m[1]);
    return `Habilita ${resolvedSkill ? resolvedSkill.name : m[1]}`;
  }
  // Per-skill reductions. The six keys are the ones calc-skill-aspd.ts reads: cd__,
  // vct__, fix_vct__, fct__, fctPercent__ and acd__ — only the first three used to have a
  // label, and the rest showed up raw ("acd__156").
  if ((m = key.match(/^(vct|fix_vct|fct|fctPercent|acd|cd)__(.+)$/))) {
    const resolvedSkill = resolveSkillKey(m[2]);
    const label = m[1] === 'fix_vct' ? 'Conj. Variável (fixa)' : ITEM_BONUS_LABELS[m[1]];
    return `Redução de ${label} de ${resolvedSkill ? resolvedSkill.name : m[2]}`;
  }
  return undefined;
}

/** pt-BR label for an item/equip bonus key: explicit overrides first, then the shared
 *  buff labels, then a decoder for the structured damage keys (p_/m_ × size/element/
 *  race/class), falling back to the raw key when nothing matches. */
export function bonusKeyLabel(key: string): string {
  return ITEM_BONUS_LABELS[key] ?? BUFF_BONUS_LABELS[key] ?? decodeStructuredBonusKey(key) ?? key;
}
