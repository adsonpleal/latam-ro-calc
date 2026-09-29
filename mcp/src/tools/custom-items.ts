import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Dataset } from '../data/dataset';
import { config } from '../config';
import { registerJsonTool, json } from './helpers';
import { CUSTOM_ITEM_LIMIT, CUSTOM_ITEM_MIN_ID, CUSTOM_ITEM_MAX_ID, CUSTOM_KINDS, validateCustomItems, customItemDescription } from 'src/app/core/custom-items';
import { encodeCustomBundle } from 'src/app/core/custom-item-library';
import { createRawTotalBonus } from 'src/app/utils/create-raw-total-bonus';
import { bonusKeyLabel } from 'src/app/core/bonus-key-label';
import { shortenShareUrl } from '../engine/share';

const itemWarnings = (item: { script: Record<string, unknown> }): string[] => [
  ...((item.script['autoCastPending'] as unknown[] | undefined)?.length
    ? ['O item contém autoconjurações documentadas, mas indisponíveis no cálculo.'] : []),
  ...(!Object.keys(item.script).length ? ['Sem bônus mapeados.'] : []),
];

const draftsSchema = {
  items: z.array(z.record(z.string(), z.unknown())).min(1).max(CUSTOM_ITEM_LIMIT),
};

/** Item creation is entirely stateless. The returned URL carries the validated records. */
export function registerCustomItemTools(server: McpServer, dataset: Dataset): void {
  registerJsonTool(server, 'get_custom_item_schema', {
    title: 'Esquema de itens personalizados',
    description: 'Tipos, campos e chaves de bônus que podem ser enviados a validate_custom_items/create_custom_items.',
    inputSchema: {},
  }, () => json({
    kinds: CUSTOM_KINDS,
    fields: {
      name: 'Nome pt-BR obrigatório', kind: 'Uma categoria de kinds',
      id: `Opcional; inteiro entre ${CUSTOM_ITEM_MIN_ID} e ${CUSTOM_ITEM_MAX_ID}. Use IDs definidos aqui para combos entre itens do mesmo lote.`,
      itemSubTypeId: 'Armas: 256–278 (257 espada, 267 arco); munições: 1024 flecha, 1025 bala de canhão, 1026 kunai, 1027 projétil, 1028 adaga de arremesso.',
      cardCapacity: '0–4; compartilha as 4 posições com enchantCapacity',
      enchantCapacity: '0–4; soma com cardCapacity <= 4', baCapacity: '0–5',
      defaultCards: 'IDs de cartas iniciais', defaultEnchants: 'IDs de encantamentos iniciais',
      defaultBas: 'Valores de Bônus Aleatório iniciais no formato attr:valor',
      isRefinable: 'Booleano', canGrade: 'Booleano',
      itemLevel: 'Nível da arma/equipamento', attack: 'ATQ base', baseMatk: 'ATQM base da arma',
      defense: 'DEF base', weight: 'Peso', iconItemId: 'ID de item existente para emprestar o ícone',
      script: 'Objeto no formato de item.json: chave de bônus => lista de expressões; diretivas autoCast também são aceitas.',
    },
    bonusKeys: Object.keys(createRawTotalBonus()).map((key) => ({ key, label: bonusKeyLabel(key) })),
    dynamicKeys: ['chance__<skillId>', 'cd__<skillId>', 'acd__<skillId>', 'vct__<skillId>',
      'fix_vct__<skillId>', 'fct__<skillId>', 'fctPercent__<skillId>', 'enable_skill__<skillId>',
      'spCost__<skillId>', 'cri_race_<race>', '<skillId>'],
    directives: ['autoCast', 'autoCastEffect', 'autoCastPending'],
    conditions: ['REFINE[N]', 'REFINE[slot==N]', 'N===valor', 'N---valor', 'GRADE[slot==A]',
      'EQUIP_ID[id]', 'SKILL_ID[id==nível]', 'ACTIVE_SKILL_ID[id]', 'LEVEL[N]', 'LOYALTY[N]',
      'USED[classe]', 'POS[slot]', 'WEAPON_TYPE[tipo]', 'AMMO_SUBTYPE[id]', 'SPAWN[mapa]', 'UNTIL[AAAA-MM-DD]'],
    constraints: ['A soma de cardCapacity e enchantCapacity não pode passar de 4.',
      'BAs usam capacidade própria de 0 a 5.', 'Uma falha invalida o lote completo.',
      'Scripts e combinações são validados antes de gerar o link.'],
    semantics: ['Bônus percentuais usam a unidade da chave de script; reduções seguem o sinal do avaliador.',
      'Algumas famílias escolhem o maior valor aplicável em vez de somar.',
      'Faixas de lealdade de mascote substituem as anteriores, sem acumular.',
      'autoCastPending descreve um efeito que o motor ainda não calcula.'],
    singleExample: { items: [{ name: 'Espada de Teste', kind: 'weapon', itemSubTypeId: 257,
      cardCapacity: 1, enchantCapacity: 3, baCapacity: 2, isRefinable: true, canGrade: true,
      itemLevel: 5, attack: 150, script: { atk: ['50', '7===20'] } }] },
    batchExample: { items: [
      { name: 'Espada de Teste', kind: 'weapon', itemSubTypeId: 257, cardCapacity: 1, enchantCapacity: 3, baCapacity: 2, isRefinable: true, canGrade: true, itemLevel: 5, attack: 150, script: { atk: ['50', '7===20'] } },
      { name: 'Carta de Teste', kind: 'card', script: { cri: ['10'] } },
    ] },
  }));

  registerJsonTool<{ items: unknown[] }>(server, 'validate_custom_items', {
    title: 'Validar itens personalizados',
    description: `Valida de 1 a ${CUSTOM_ITEM_LIMIT} itens como um lote e devolve diagnósticos por item/campo; não salva nada.`,
    inputSchema: draftsSchema,
  }, ({ items }) => {
    const result = validateCustomItems(items, dataset.items as any);
    return json(result.errors.length
      ? { valid: false, errors: result.errors }
      : { valid: true, items: result.items.map((item) => ({ item, description: customItemDescription(item), warnings: itemWarnings(item) })) });
  });

  registerJsonTool<{ items: unknown[] }>(server, 'create_custom_items', {
    title: 'Criar itens personalizados',
    description: `Cria de 1 a ${CUSTOM_ITEM_LIMIT} itens de uma vez e devolve um link que importa todo o lote para o navegador. O servidor não armazena os itens.`,
    inputSchema: draftsSchema,
  }, async ({ items }) => {
    const result = validateCustomItems(items, dataset.items as any);
    if (result.errors.length) return json({ valid: false, errors: result.errors }, true);
    const token = encodeCustomBundle(result.items);
    const url = `${config.appOrigin.replace(/\/+$/, '')}/#/?customItem=${token}`;
    return json({
      valid: true,
      url: await shortenShareUrl(url, config.shortenerUrl),
      items: result.items.map((item) => ({ item, description: customItemDescription(item), warnings: itemWarnings(item) })),
    });
  });
}
