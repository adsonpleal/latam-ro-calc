import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createRawTotalBonus } from 'src/app/utils';
import { bonusKeyLabel, resolveSkillKey } from './bonus-key-label';

/**
 * pt-BR labels for the item bonus panel (what shows when you click a piece, next to the
 * description and the Mercado price).
 *
 * `bonusKeyLabel` tries ITEM_BONUS_LABELS, then BUFF_BONUS_LABELS, and finally the
 * structured-key decoder. The second step is the dangerous one: buff labels are the
 * international abbreviations (ATK, POW, WIS...), so any key missing from the first map
 * leaks through in English without breaking anything. That is how Manopla Sombria POD +9
 * ended up in the panel as "POW +4" instead of "POD +4".
 *
 * The sweep test at the end is what holds the line: it walks **every** bonus key present
 * in item.json and fails any that still comes out in English or as the raw key.
 */

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));

describe('bonusKeyLabel — stats and traits', () => {
  it.each([
    ['str', 'FOR'], ['agi', 'AGI'], ['vit', 'VIT'],
    ['int', 'INT'], ['dex', 'DES'], ['luk', 'SOR'],
  ])('%s → %s', (key, label) => expect(bonusKeyLabel(key)).toBe(label));

  // The traits are the ones that were leaking: POD/SAB/FEI/CRV have their own pt-BR
  // abbreviations, while STA and CON read the same in both languages and so drew no
  // attention.
  it.each([
    ['pow', 'POD'], ['sta', 'STA'], ['wis', 'SAB'],
    ['spl', 'FEI'], ['con', 'CON'], ['crt', 'CRV'],
  ])('%s → %s', (key, label) => expect(bonusKeyLabel(key)).toBe(label));

  it('uses the client name for hplus (C.Mais), not the abbreviation', () => {
    expect(bonusKeyLabel('hplus')).toBe('C.Mais');
  });
});

describe('bonusKeyLabel — structured keys', () => {
  it('splits out the damage type on size resistance instead of swallowing the suffix', () => {
    expect(bonusKeyLabel('subsize_m')).toBe('Resistência (Tamanho: Médio)');
    expect(bonusKeyLabel('subsize_m_physical')).toBe('Resistência (Tamanho: Médio, físico)');
    expect(bonusKeyLabel('subsize_all_magical')).toBe('Resistência (Tamanho: Todos, mágico)');
  });

  it('leaves race/element/class resistance without a suffix', () => {
    expect(bonusKeyLabel('subrace_demon')).toBe('Resistência (Raça: Demônio)');
    expect(bonusKeyLabel('subele_fire')).toBe('Resistência (Elemento: Fogo)');
  });

  it('handles per-race crit', () => {
    expect(bonusKeyLabel('cri_race_dragon')).toBe('Crítico (Raça: Dragão)');
  });

  // calc-skill-aspd.ts reads six families of per-skill reduction; only three used to have
  // a label, and the rest showed up as "acd__156".
  it.each([
    ['cd__2008', 'Redução de Recarga de'],
    ['vct__2008', 'Redução de Conj. Variável de'],
    ['fct__2008', 'Redução de Conj. Fixa de'],
    ['fctPercent__2008', 'Redução de Conj. Fixa % de'],
    ['acd__2008', 'Redução de Pós-conjuração de'],
    ['fix_vct__2008', 'Redução de Conj. Variável (fixa) de'],
  ])('%s starts with "%s" and resolves the skill name', (key, prefixo) => {
    const label = bonusKeyLabel(key);
    expect(label.startsWith(prefixo)).toBe(true);
    expect(label).not.toContain('__');
    expect(label).not.toMatch(/\b2008\b/); // resolved to the skill's pt-BR name
  });
});

describe('bonusKeyLabel — sweep', () => {
  /** Bonus keys that actually appear in some item.json script. */
  const chavesDoItemJson = [...new Set(
    Object.values<any>(items).flatMap((it) => Object.keys(it.script ?? {})),
  )];

  /** A numeric key is a skill id: it becomes a name through the catalog, not through here. */
  const semRotulo = (key: string) => {
    if (resolveSkillKey(key)) return false;
    if (/^\d+$/.test(key)) return false; // skill outside the catalog — a different problem
    const label = bonusKeyLabel(key);
    if (label === key) return true;
    if (/[a-z]+_[a-z]+/.test(label)) return true; // a chunk of the key survived in the label
    return /^(ATK|MATK|P\.ATK|S\.MATK|C\.RATE|HIT|ASPD|VCT|MDEF|POW|WIS|SPL|CRT)\b/.test(label);
  };

  it('gives every non-numeric item.json key a pt-BR label', () => {
    const faltando = chavesDoItemJson.filter(semRotulo).map((k) => `${k} -> "${bonusKeyLabel(k)}"`);
    // `dmg__<monster name>` is not a valid bonus key — the engine already rejects it in
    // invalidBonusSet; it is listed here only until it is removed from item.json.
    expect(faltando).toEqual(['dmg__Lucifer Morocc -> "dmg__Lucifer Morocc"']);
  });

  it('also labels the canonical keys of the bonus total', () => {
    const faltando = Object.keys(createRawTotalBonus()).filter(semRotulo);
    // `refine` and `weight` live in the total but are not item bonuses — no script uses
    // them, so they never reach the panel. They are deliberately left unlabelled.
    expect(faltando).toEqual(['refine', 'weight']);
  });
});
