/**
 * Discovery tools: what classes, items, monsters, skills and bonus keys exist.
 * All read-only and cheap — no solve.
 */
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { bonusKeyLabel, decodeStructuredBonusKey } from 'src/app/core/bonus-key-label';
import { createBonusNameList } from 'src/app/utils';
import { resolveSkillMeta } from 'src/app/skills';
import { elementPtBr, racePtBr, sizePtBr } from 'src/app/constants/monster-i18n';
import { Dataset } from '../data/dataset';
import { ItemRow, SearchFilters } from '../data/item-index';
import { SLOT_TAGS, SlotTag } from '../data/slot-classifier';
import { plainItemDesc } from '../data/text';
import { config } from '../config';
import { json } from './helpers';

/** Compact row: ~25-35 tokens. Full records only ever come from get_item. */
const toRow = (r: ItemRow) =>
  r.inCalcDb
    ? {
        id: r.id,
        name: r.name,
        ...(r.slots ? { slots: r.slots } : {}),
        ...(r.slotTags?.length ? { slot: r.slotTags[0] } : {}),
        ...(r.reqLv ? { lv: r.reqLv } : {}),
        ...(r.atk ? { atk: r.atk } : {}),
        ...(r.def ? { def: r.def } : {}),
        db: true,
      }
    : { id: r.id, name: r.name, ...(r.slots ? { slots: r.slots } : {}), db: false, note: 'sem dados no calculador' };

export function registerDiscoveryTools(server: McpServer, dataset: Dataset): void {
  server.registerTool(
    'list_classes',
    {
      title: 'Listar classes',
      description: 'Lista as classes jogáveis no RO LATAM, com id interno, nome pt-BR e limites de nível. O id é o que as outras ferramentas esperam em `build.class`.',
      inputSchema: {},
    },
    async () => json({ classes: dataset.classes.list() }),
  );

  server.registerTool(
    'search_items',
    {
      title: 'Buscar itens',
      description:
        'Busca itens por nome (sem distinção de acentos) e/ou por filtros estruturais. Cobre TANTO o banco do calculador quanto o banco completo do LATAM: itens marcados com `db: false` existem no jogo mas ainda não foram cadastrados no calculador, então aparecem só com nome/descrição e não podem ser usados em builds. Qualquer filtro estrutural (slot, classId, bonus, skill, minSlots, maxLevel) implica `db: true`, porque esses itens não têm dados mecânicos.',
      inputSchema: {
        query: z.string().optional().describe('Texto livre; acentos são ignorados ("pocao magica" acha "Poção Mágica").'),
        slot: z.enum(SLOT_TAGS as [SlotTag, ...SlotTag[]]).optional(),
        classId: z.number().int().optional().describe('Só itens equipáveis por esta classe.'),
        bonus: z.array(z.string()).optional().describe('Chaves de bônus (veja list_bonus_keys).'),
        bonusMode: z.enum(['all', 'any']).optional().default('all'),
        skill: z.string().optional().describe('Id da habilidade: acha bônus de dano, recarga e conjuração dela.'),
        minSlots: z.number().int().optional(),
        maxLevel: z.number().int().optional().describe('Nível necessário no máximo N.'),
        inCalcDb: z.boolean().optional().describe('true = só itens do calculador; false = só os que faltam cadastrar.'),
        latamOnly: z.boolean().optional().default(true),
        limit: z.number().int().min(1).max(config.limits.maxSearchResults).optional().default(20),
        offset: z.number().int().min(0).optional().default(0),
      },
    },
    async (args) => {
      const filters = args as SearchFilters;
      const char = filters.classId !== undefined ? dataset.classes.newInstance(filters.classId) : undefined;
      const { total, rows } = dataset.itemIndex.search(filters, char);
      const offset = filters.offset ?? 0;
      return json({
        total,
        shown: rows.length,
        offset,
        items: rows.map(toRow),
        ...(total > offset + rows.length ? { hint: `Mais ${total - offset - rows.length} resultados: use offset=${offset + rows.length}.` } : {}),
      });
    },
  );

  server.registerTool(
    'get_item',
    {
      title: 'Detalhes do item',
      description: 'Ficha completa de um item: descrição pt-BR, campos estruturais, classes que podem usar e os bônus decodificados. Itens fora do banco do calculador voltam só com nome e descrição.',
      inputSchema: { id: z.number().int().describe('Id do item.') },
    },
    async ({ id }) => {
      const row = dataset.itemIndex.get(id);
      if (!row) return json({ error: `Item ${id} não encontrado nem no calculador nem no banco do LATAM.` }, true);

      const latam = dataset.itemIndex.latamRecord(id);
      if (!row.inCalcDb) {
        return json({
          id,
          name: row.name,
          inCalcDb: false,
          description: plainItemDesc(latam?.description),
          note: 'Existe no LATAM mas ainda não foi cadastrado no calculador — não pode ser usado em builds.',
        });
      }

      const rec = dataset.itemIndex.record(id)!;
      return json({
        id,
        name: rec.name,
        enName: rec.enName,
        aegisName: rec.aegisName,
        inCalcDb: true,
        presentInLatam: !!rec.presentInLatam,
        slots: rec.slots || 0,
        slotTags: row.slotTags ?? [],
        requiredLevel: rec.requiredLevel ?? undefined,
        weaponLevel: rec.itemLevel ?? undefined,
        attack: rec.attack ?? undefined,
        defense: rec.defense ?? undefined,
        usableClass: rec.usableClass,
        unusableClass: rec.unusableClass,
        description: plainItemDesc(rec.description),
        bonuses: Object.entries(rec.script ?? {}).map(([key, values]) => ({
          key,
          label: bonusKeyLabel(key),
          structured: decodeStructuredBonusKey(key) ?? undefined,
          values,
        })),
      });
    },
  );

  server.registerTool(
    'search_monsters',
    {
      title: 'Buscar monstros',
      description:
        'Busca monstros por nome (ou id) e atributos. Por padrão devolve só os que têm bloco de atributos no calculador, que são os únicos utilizáveis como alvo em `calculate`.',
      inputSchema: {
        query: z.string().optional(),
        minLevel: z.number().int().optional(),
        maxLevel: z.number().int().optional(),
        race: z.string().optional().describe('Chave em inglês: Formless, Undead, Brute, Plant, Insect, Fish, Demon, DemiHuman, Angel, Dragon.'),
        element: z.string().optional().describe('Chave em inglês: Neutral, Water, Earth, Fire, Wind, Poison, Holy, Dark, Ghost, Undead.'),
        size: z.string().optional().describe('Small, Medium ou Large.'),
        boss: z.boolean().optional(),
        hasStats: z.boolean().optional().default(true),
        limit: z.number().int().min(1).max(config.limits.maxSearchResults).optional().default(20),
        offset: z.number().int().min(0).optional().default(0),
      },
    },
    async (args) => {
      const { total, rows } = dataset.monsterIndex.search(args as any);
      const offset = (args as any).offset ?? 0;
      return json({
        total,
        shown: rows.length,
        offset,
        monsters: rows.map((m) => ({
          id: m.id,
          name: m.name,
          ...(m.level !== undefined ? { level: m.level } : {}),
          ...(m.hp !== undefined ? { hp: m.hp } : {}),
          ...(m.element ? { element: elementPtBr(m.element) } : {}),
          ...(m.race ? { race: racePtBr(m.race) } : {}),
          ...(m.size ? { size: sizePtBr(m.size) } : {}),
          ...(m.mvp ? { mvp: true } : m.boss ? { boss: true } : {}),
          ...(m.hasStats ? {} : { hasStats: false }),
        })),
        ...(total > offset + rows.length ? { hint: `Mais ${total - offset - rows.length} resultados: use offset=${offset + rows.length}.` } : {}),
      });
    },
  );

  server.registerTool(
    'get_monster',
    {
      title: 'Detalhes do monstro',
      description: 'Bloco de atributos completo de um monstro.',
      inputSchema: { id: z.number().int() },
    },
    async ({ id }) => {
      const detail = dataset.monsterIndex.detail(id);
      return detail ? json(detail) : json({ error: `Monstro ${id} não encontrado.` }, true);
    },
  );

  server.registerTool(
    'list_skills',
    {
      title: 'Listar habilidades da classe',
      description:
        'Habilidades de uma classe. Para `kind: "atk"`, o campo `value` é exatamente o que `build.atkSkill` espera ("Nome==Nível"). Os multiplicadores das habilidades são funções do motor, não dados — para saber o dano de uma delas, chame `calculate`.',
      inputSchema: {
        classId: z.number().int(),
        kind: z.enum(['atk', 'active', 'passive']).optional().default('atk'),
      },
    },
    async ({ classId, kind }) => {
      if (!dataset.classes.has(classId)) return json({ error: `Classe ${classId} não disponível. Veja list_classes.` }, true);
      const char = dataset.classes.newInstance(classId);

      if (kind === 'atk') {
        return json({
          classId,
          skills: char.atkSkills.map((s: any) => ({
            value: s.value,
            name: s.name,
            label: resolveSkillMeta(s.name)?.label ?? s.label ?? s.name,
            id: resolveSkillMeta(s.name)?.id,
            ...(s.element ? { element: elementPtBr(s.element) } : {}),
            ...(s.isMatk ? { magic: true } : {}),
            ...(s.hit ? { hits: s.hit } : {}),
            ...(s.levelList?.length ? { levels: s.levelList.map((lv: any) => lv.value) } : {}),
          })),
        });
      }

      const list = kind === 'active' ? char.activeSkills : char.passiveSkills;
      return json({
        classId,
        skills: (list as any[]).map((s) => ({
          name: s.name,
          label: resolveSkillMeta(s.name)?.label ?? s.label ?? s.name,
          maxLevel: Math.max(0, ...s.dropdown.map((d: any) => Number(d.value) || 0)),
        })),
      });
    },
  );

  server.registerTool(
    'list_bonus_keys',
    {
      title: 'Listar chaves de bônus',
      description: 'Todas as chaves de bônus pesquisáveis, com rótulo pt-BR. Use-as no filtro `bonus` de search_items.',
      inputSchema: { query: z.string().optional().describe('Filtra por texto no rótulo ou na chave.') },
    },
    async ({ query }) => {
      const flat: { key: string; label: string }[] = [];
      const walk = (nodes: any[]) => {
        for (const node of nodes ?? []) {
          if (node.children?.length) walk(node.children);
          else if (node.value) flat.push({ key: String(node.value), label: node.label ?? bonusKeyLabel(String(node.value)) });
        }
      };
      walk(createBonusNameList() as any[]);

      const q = query?.toLowerCase();
      const rows = q ? flat.filter((b) => b.key.toLowerCase().includes(q) || b.label.toLowerCase().includes(q)) : flat;
      return json({ total: rows.length, keys: rows });
    },
  );
}
