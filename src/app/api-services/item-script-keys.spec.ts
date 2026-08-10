/**
 * Valida as chaves de bônus e os nomes de classe declarados no item.json.
 *
 * Isto era uma varredura dev-only dentro do RoService, que re-percorria os 9.555
 * itens a cada reload em desenvolvimento e despejava `console.error` que ninguém
 * lia. Como spec, roda no pre-push e falha de verdade quando a base de itens
 * ganha uma chave que o motor não conhece.
 *
 * Chaves com valor: um bônus escrito errado no item.json não dá erro em lugar
 * nenhum — o item simplesmente não faz nada no cálculo.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRawTotalBonus } from 'src/app/utils';
import { VALID_SKILL_IDS } from 'src/app/skills';
import { validClassNameSet } from './valid-bonuses';

const items: Record<string, any> = JSON.parse(
  readFileSync(join(process.cwd(), 'src/assets/demo/data/item.json'), 'utf8'),
);

/** Modificadores de tempo/cooldown prefixados sobre uma chave já válida. */
const PREFIXES = ['fix_vct__', 'vct__', 'chance__', 'fctPercent__', 'fct__', 'acd__', 'cd__'];

/** Os prefixos empilham — `chance__cd__2447` é chance de redução de recarga da skill 2447. */
const stripPrefix = (key: string) => {
  let out = key;
  for (let changed = true; changed; ) {
    changed = false;
    for (const p of PREFIXES) {
      if (out.startsWith(p)) {
        out = out.slice(p.length);
        changed = true;
        break;
      }
    }
  }
  return out;
};

/**
 * Famílias de chave montadas dinamicamente em runtime, que por isso não aparecem
 * no createRawTotalBonus() estático:
 *
 *   cri_race_<raça>  — lido em damage-calculator.ts:538 (`cri_race_${race}`).
 */
const DYNAMIC_KEY_PATTERNS = [/^cri_race_\w+$/];

/**
 * Chaves que a base declara e o motor NÃO consome. Não são erro de digitação:
 * são bônus ainda não modelados. Ficam fixados aqui para que a spec passe hoje e
 * ainda assim quebre se a base ganhar uma chave desconhecida nova. Ao modelar um
 * bônus, apague a linha correspondente.
 *
 *   dmg__<monstro> — dano contra um monstro específico. Só o Diabolus Manteau
 *                    (2537) e o Diabolus Ring (2729) usam, contra Lucifer Morocc.
 */
const CHAVES_NAO_MODELADAS = ['dmg__Lucifer Morocc'];

describe('item.json: chaves de bônus', () => {
  const validStatusSet = new Set(Object.keys(createRawTotalBonus()));

  const desconhecidas = new Map<string, string[]>();

  for (const key of Object.keys(items)) {
    const script = items[key].script as Record<string, unknown> | undefined;
    if (!script) continue;

    for (const bonusKey of Object.keys(script)) {
      const realKey = stripPrefix(bonusKey);
      if (validStatusSet.has(realKey)) continue;
      // chaves de bônus de habilidade são ids de skill do jogo (ver Skill Catalog)
      if (/^\d+$/.test(realKey) && VALID_SKILL_IDS.has(Number(realKey))) continue;
      if (DYNAMIC_KEY_PATTERNS.some((re) => re.test(realKey))) continue;

      const donos = desconhecidas.get(realKey) ?? [];
      donos.push(key);
      desconhecidas.set(realKey, donos);
    }
  }

  it('não introduz chaves que o motor desconhece', () => {
    const inesperadas = [...desconhecidas.keys()].filter((k) => !CHAVES_NAO_MODELADAS.includes(k));
    expect(inesperadas).toEqual([]);
  });

  it('mantém a lista de bônus não modelados sem crescer', () => {
    // Se um destes sumir da base (ou passar a ser modelado), apague-o da
    // constante — a spec avisa em vez de deixar a lista apodrecer.
    expect([...desconhecidas.keys()].sort()).toEqual([...CHAVES_NAO_MODELADAS].sort());
  });
});

describe('item.json: nomes de classe', () => {
  it('usa apenas nomes de classe conhecidos em usableClass/unusableClass', () => {
    const invalidas = new Set<string>();

    for (const key of Object.keys(items)) {
      for (const field of ['usableClass', 'unusableClass'] as const) {
        const list = items[key][field];
        if (!Array.isArray(list)) continue;
        for (const className of list) {
          if (!validClassNameSet.has(className)) invalidas.add(className);
        }
      }
    }

    expect([...invalidas]).toEqual([]);
  });
});
