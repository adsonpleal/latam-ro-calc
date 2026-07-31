import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createRawTotalBonus } from 'src/app/utils';
import { bonusKeyLabel, resolveSkillKey } from './bonus-key-label';

/**
 * Rótulos pt-BR do painel de bônus do item (o que aparece ao clicar numa peça, junto com
 * a descrição e o preço do Mercado).
 *
 * `bonusKeyLabel` tenta ITEM_BONUS_LABELS, depois BUFF_BONUS_LABELS e por fim o decodifica-
 * dor das chaves estruturadas. O segundo passo é o perigoso: os rótulos de buff são siglas
 * internacionais (ATK, POW, WIS...), então toda chave que falta no primeiro mapa vaza em
 * inglês sem quebrar nada. Foi assim que a Manopla Sombria POD +9 apareceu no painel com
 * "POW +4" em vez de "POD +4".
 *
 * O teste de varredura no fim é o que segura isso: ele passa por **todas** as chaves de
 * bônus que existem no item.json e reprova qualquer uma que ainda saia em inglês ou com a
 * chave crua.
 */

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));

describe('bonusKeyLabel — atributos e talentos', () => {
  it.each([
    ['str', 'FOR'], ['agi', 'AGI'], ['vit', 'VIT'],
    ['int', 'INT'], ['dex', 'DES'], ['luk', 'SOR'],
  ])('%s → %s', (key, label) => expect(bonusKeyLabel(key)).toBe(label));

  // Os talentos são os que estavam vazando: POD/SAB/FEI/CRV têm sigla própria em pt-BR,
  // enquanto STA e CON são iguais nos dois idiomas e por isso não chamavam atenção.
  it.each([
    ['pow', 'POD'], ['sta', 'STA'], ['wis', 'SAB'],
    ['spl', 'FEI'], ['con', 'CON'], ['crt', 'CRV'],
  ])('%s → %s', (key, label) => expect(bonusKeyLabel(key)).toBe(label));

  it('hplus usa o nome do cliente (C.Mais), não a sigla', () => {
    expect(bonusKeyLabel('hplus')).toBe('C.Mais');
  });
});

describe('bonusKeyLabel — chaves estruturadas', () => {
  it('a resistência por tamanho separa o tipo de dano em vez de engolir o sufixo', () => {
    expect(bonusKeyLabel('subsize_m')).toBe('Resistência (Tamanho: Médio)');
    expect(bonusKeyLabel('subsize_m_physical')).toBe('Resistência (Tamanho: Médio, físico)');
    expect(bonusKeyLabel('subsize_all_magical')).toBe('Resistência (Tamanho: Todos, mágico)');
  });

  it('resistência por raça/elemento/classe segue sem sufixo', () => {
    expect(bonusKeyLabel('subrace_demon')).toBe('Resistência (Raça: Demônio)');
    expect(bonusKeyLabel('subele_fire')).toBe('Resistência (Elemento: Fogo)');
  });

  it('crítico por raça', () => {
    expect(bonusKeyLabel('cri_race_dragon')).toBe('Crítico (Raça: Dragão)');
  });

  // calc-skill-aspd.ts lê seis famílias de redução por habilidade; antes só três tinham
  // rótulo e as outras apareciam como "acd__156".
  it.each([
    ['cd__2008', 'Redução de Recarga de'],
    ['vct__2008', 'Redução de Conj. Variável de'],
    ['fct__2008', 'Redução de Conj. Fixa de'],
    ['fctPercent__2008', 'Redução de Conj. Fixa % de'],
    ['acd__2008', 'Redução de Pós-conjuração de'],
    ['fix_vct__2008', 'Redução de Conj. Variável (fixa) de'],
  ])('%s começa com "%s" e resolve o nome da habilidade', (key, prefixo) => {
    const label = bonusKeyLabel(key);
    expect(label.startsWith(prefixo)).toBe(true);
    expect(label).not.toContain('__');
    expect(label).not.toMatch(/\b2008\b/); // resolveu para o nome pt-BR da habilidade
  });
});

describe('bonusKeyLabel — varredura', () => {
  /** Chaves de bônus que aparecem de fato em algum script do item.json. */
  const chavesDoItemJson = [...new Set(
    Object.values<any>(items).flatMap((it) => Object.keys(it.script ?? {})),
  )];

  /** Uma chave numérica é id de habilidade: ela vira nome pelo catálogo, não por aqui. */
  const semRotulo = (key: string) => {
    if (resolveSkillKey(key)) return false;
    if (/^\d+$/.test(key)) return false; // habilidade fora do catálogo — outro problema
    const label = bonusKeyLabel(key);
    if (label === key) return true;
    if (/[a-z]+_[a-z]+/.test(label)) return true; // sobrou pedaço de chave no rótulo
    return /^(ATK|MATK|P\.ATK|S\.MATK|C\.RATE|HIT|ASPD|VCT|MDEF|POW|WIS|SPL|CRT)\b/.test(label);
  };

  it('toda chave não numérica do item.json tem rótulo pt-BR', () => {
    const faltando = chavesDoItemJson.filter(semRotulo).map((k) => `${k} -> "${bonusKeyLabel(k)}"`);
    // `dmg__<nome de monstro>` não é chave de bônus válida — a engine já a rejeita em
    // invalidBonusSet; está aqui só para o dia em que for removida do item.json.
    expect(faltando).toEqual(['dmg__Lucifer Morocc -> "dmg__Lucifer Morocc"']);
  });

  it('as chaves canônicas do somatório de bônus também têm rótulo', () => {
    const faltando = Object.keys(createRawTotalBonus()).filter(semRotulo);
    // `refine` e `weight` moram no somatório mas não são bônus de item — nenhum script os
    // usa, então nunca chegam ao painel. Ficam sem rótulo de propósito.
    expect(faltando).toEqual(['refine', 'weight']);
  });
});
