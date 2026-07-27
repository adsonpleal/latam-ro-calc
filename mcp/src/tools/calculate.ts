/**
 * The tools that actually run the engine, plus the share-link bridge.
 *
 * Every one of these accepts a share link inline via `build.share`, so "here is my
 * build, what's the best boots?" is a single call rather than parse-then-calculate.
 */
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CompareState } from 'src/app/core/compare-state';
import { config } from '../config';
import { Dataset } from '../data/dataset';
import { SLOT_TAGS, SlotTag } from '../data/slot-classifier';
import { plainItemDesc } from '../data/text';
import { BuildInput, buildInputSchema, ResolvedBuild, resolveBuild } from '../engine/build-input';
import { projectResult } from '../engine/project';
import { buildShareUrl, isShortLink, parseShare, resolveShortLink, shortenShareUrl, toPreset } from '../engine/share';
import { solve } from '../engine/solve';
import { createBudget, withSolveSlot } from '../util/budget';
import { fail, json } from './helpers';

const targetSchema = z
  .object({
    monsterId: z.number().int().optional().describe('Id do monstro alvo. Veja search_monsters.'),
  })
  .optional();

/** Resolve a short link before decoding, since that is the form the app hands out. */
async function normalizeShare(input: BuildInput): Promise<BuildInput> {
  if (input.share && isShortLink(input.share, config.shortenerUrl)) {
    return { ...input, share: await resolveShortLink(input.share) };
  }
  return input;
}

/** Dummy - Neutro: neutral defence, so the element table cancels out and a bare
 *  comparison isn't distorted by resistances. */
const DEFAULT_TARGET_ID = 21077;

function resolveTarget(dataset: Dataset, monsterId?: number) {
  const id = monsterId ?? DEFAULT_TARGET_ID;
  const monster = dataset.monsters[id];
  if (!monster) throw new Error(`Monstro ${id} não tem bloco de atributos no calculador e não pode ser alvo. Use search_monsters.`);
  return { id, target: { monster } };
}

const shareOf = (rb: ResolvedBuild, compare?: CompareState | null) => buildShareUrl(toPreset(rb.model, rb.char), config.appOrigin, compare);

export function registerCalculationTools(server: McpServer, dataset: Dataset): void {
  server.registerTool(
    'calculate',
    {
      title: 'Calcular dano',
      description:
        'Calcula o dano de uma build contra um alvo, com o mesmo motor do simulador web. Devolve dano da habilidade, dano básico, DPS, atributos finais, tempos de conjuração e um link para abrir a build no simulador.',
      inputSchema: {
        build: buildInputSchema,
        target: targetSchema,
        effects: z.array(z.string()).optional().describe('Efeitos de proc a ativar (veja `availableEffects` de uma chamada anterior).'),
        include: z.array(z.enum(['bonuses', 'tables'])).optional().describe('Seções pesadas opcionais.'),
      },
    },
    async ({ build, target, effects, include }) => {
      try {
        const input = await normalizeShare(build as BuildInput);
        return await withSolveSlot(() => {
          const rb = resolveBuild(input, dataset);
          const { id: targetId, target: t } = resolveTarget(dataset, target?.monsterId);
          const calc = solve(rb, dataset, t, effects ?? []);
          return json(
            projectResult(calc, rb, dataset.classes.get((rb.model as any).class), {
              include,
              targetId,
              share: shareOf(rb),
            }),
          );
        });
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    'damage_table',
    {
      title: 'Dano contra vários monstros',
      description: `Calcula a mesma build contra até ${config.limits.maxTableMonsters} monstros de uma vez.`,
      inputSchema: {
        build: buildInputSchema,
        monsterIds: z.array(z.number().int()).min(1).max(config.limits.maxTableMonsters),
      },
    },
    async ({ build, monsterIds }) => {
      try {
        const input = await normalizeShare(build as BuildInput);
        return await withSolveSlot(() => {
          const rb = resolveBuild(input, dataset);
          const budget = createBudget();
          const rows: any[] = [];
          let truncated = false;

          // One full solve, then re-target cheaply — changing the monster does not
          // invalidate the gear bonus pass, so runChain per target would be wasteful.
          const calc = solve(rb, dataset, resolveTarget(dataset, monsterIds[0]).target);
          for (const id of monsterIds) {
            if (budget.expired()) {
              truncated = true;
              break;
            }
            const monster = dataset.monsters[id];
            if (!monster) {
              rows.push({ id, error: 'sem bloco de atributos no calculador' });
              continue;
            }
            const dmg: any = calc
              .setMonster(monster)
              .prepareAllItemBonus()
              .calcDmgWithExtraBonus({ skillValue: (rb.model as any).selectedAtkSkill, isUseHpL: false });
            rows.push({
              id,
              name: monster.name,
              level: monster.stats?.level,
              hp: monster.stats?.health,
              min: dmg.skillMinDamage,
              max: dmg.skillMaxDamage,
              dps: dmg.skillDps,
              hitsToKill: dmg.skillHitKill,
            });
          }

          return json({
            skill: (rb.model as any).selectedAtkSkill,
            rows,
            ...(truncated ? { truncated: true, note: `Orçamento de tempo esgotado após ${rows.length} de ${monsterIds.length} alvos.` } : {}),
            share: shareOf(rb),
            ...(rb.warnings.length ? { warnings: rb.warnings } : {}),
          });
        });
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    'compare_builds',
    {
      title: 'Comparar builds',
      description: `Resolve de 2 a ${config.limits.maxCompareBuilds} builds contra o mesmo alvo e ordena por DPS.`,
      inputSchema: {
        builds: z.array(buildInputSchema).min(2).max(config.limits.maxCompareBuilds),
        target: targetSchema,
        labels: z.array(z.string()).optional().describe('Nomes para identificar cada build no resultado.'),
      },
    },
    async ({ builds, target, labels }) => {
      try {
        const inputs = await Promise.all((builds as BuildInput[]).map(normalizeShare));
        return await withSolveSlot(() => {
          const { id: targetId, target: t } = resolveTarget(dataset, target?.monsterId);
          const results = inputs.map((input, i) => {
            const rb = resolveBuild(input, dataset);
            const calc = solve(rb, dataset, t);
            const out = projectResult(calc, rb, dataset.classes.get((rb.model as any).class), { targetId, share: shareOf(rb) });
            return { label: labels?.[i] ?? `Build ${i + 1}`, dps: out['damage'].skill.dps ?? 0, result: out };
          });

          const ranked = [...results].sort((a, b) => b.dps - a.dps);
          const best = ranked[0];
          return json({
            best: best.label,
            ranking: ranked.map((r) => ({
              label: r.label,
              dps: r.dps,
              max: r.result['damage'].skill.max,
              deltaPct: best.dps ? Math.round(((r.dps - best.dps) / best.dps) * 10000) / 100 : 0,
              share: r.result['share'],
            })),
            details: Object.fromEntries(results.map((r) => [r.label, r.result])),
          });
        });
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    'optimize_slot',
    {
      title: 'Otimizar um slot',
      description:
        `Testa candidatos para um slot e ordena pelo ganho de DPS. Máximo de ${config.limits.maxOptimizeCandidates} candidatos e um orçamento de tempo — se estourar, devolve resultado parcial com \`truncated\`. ` +
        'O link devolvido já vem com a comparação armada (peça atual → peça sugerida), então o jogador abre o simulador e vê a diferença.',
      inputSchema: {
        build: buildInputSchema,
        slot: z.string().describe('Campo do equipamento a variar, ex.: "weapon", "armor", "boot", "accLeft".'),
        candidates: z.array(z.number().int()).max(config.limits.maxOptimizeCandidates).optional().describe('Ids a testar. Sem isso, busca pelo `slotTag`.'),
        slotTag: z.enum(SLOT_TAGS as [SlotTag, ...SlotTag[]]).optional().describe('Categoria para buscar candidatos automaticamente.'),
        query: z.string().optional().describe('Filtra os candidatos automáticos por nome.'),
        target: targetSchema,
        limit: z.number().int().min(1).max(20).optional().default(10),
      },
    },
    async ({ build, slot, candidates, slotTag, query, target, limit }) => {
      try {
        const input = await normalizeShare(build as BuildInput);
        return await withSolveSlot(() => {
          const baseRb = resolveBuild(input, dataset);
          const classId = (baseRb.model as any).class;
          const { target: t } = resolveTarget(dataset, target?.monsterId);

          let ids = candidates ?? [];
          if (!ids.length) {
            if (!slotTag) throw new Error('Informe `candidates` ou `slotTag` para escolher o que testar.');
            const char = dataset.classes.newInstance(classId);
            ids = dataset.itemIndex
              .search({ slot: slotTag, query, limit: config.limits.maxOptimizeCandidates }, char)
              .rows.map((r) => r.id);
          }
          ids = ids.slice(0, config.limits.maxOptimizeCandidates);
          if (!ids.length) throw new Error('Nenhum candidato encontrado para esse slot.');

          const baseCalc = solve(baseRb, dataset, t);
          const baseOut = projectResult(baseCalc, baseRb, dataset.classes.get(classId));
          const baseDps: number = baseOut['damage'].skill.dps ?? 0;
          const currentId = (baseRb.model as any)[slot];

          const budget = createBudget();
          const scored: any[] = [];
          let tested = 0;
          for (const id of ids) {
            if (budget.expired()) break;
            tested++;
            // Gear changes invalidate the bonus pass, so each candidate needs a full solve.
            const rb = resolveBuild({ ...input, gear: { ...(input.gear ?? {}), [slot]: id } }, dataset);
            const calc = solve(rb, dataset, t);
            const out = projectResult(calc, rb, dataset.classes.get(classId));
            const dps: number = out['damage'].skill.dps ?? 0;
            scored.push({
              id,
              name: dataset.itemIndex.get(id)?.name ?? String(id),
              dps,
              max: out['damage'].skill.max,
              deltaDps: Math.round((dps - baseDps) * 100) / 100,
              deltaPct: baseDps ? Math.round(((dps - baseDps) / baseDps) * 10000) / 100 : null,
            });
          }

          scored.sort((a, b) => b.dps - a.dps);
          const top = scored.slice(0, limit);
          const winner = top[0];

          // Arm the comparison so the link opens on the app's current → simulado view.
          const compare: CompareState | null = winner
            ? { itemNames: [slot], model2: { [slot]: winner.id, [`${slot}Refine`]: (baseRb.model as any)[`${slot}Refine`] ?? 0 } }
            : null;

          return json({
            slot,
            current: { id: currentId || null, name: currentId ? dataset.itemIndex.get(currentId)?.name : null, dps: baseDps },
            tested,
            ranking: top,
            ...(tested < ids.length ? { truncated: true, note: `Orçamento de tempo esgotado após ${tested} de ${ids.length} candidatos.` } : {}),
            share: shareOf(baseRb, compare),
            ...(baseRb.warnings.length ? { warnings: baseRb.warnings } : {}),
          });
        });
      } catch (error) {
        return fail(error);
      }
    },
  );
}

export function registerBridgeTools(server: McpServer, dataset: Dataset): void {
  server.registerTool(
    'parse_share_link',
    {
      title: 'Ler link do simulador',
      description:
        'Lê um link de simulação (URL completa, encurtada, fragmento #/?b=… ou token) e devolve a build resolvida: classe, níveis, atributos, cada peça equipada com refino/cartas/encantes, habilidades, buffs, consumíveis e a comparação, se o link levar uma. Não calcula dano — para isso passe o mesmo link em `calculate`.',
      inputSchema: { share: z.string() },
    },
    async ({ share }) => {
      try {
        const url = isShortLink(share, config.shortenerUrl) ? await resolveShortLink(share) : share;
        const decoded = parseShare(url);
        const rb = resolveBuild({ preset: decoded.preset }, dataset);
        const model = rb.model as any;
        const info = dataset.classes.get(model.class);

        const nameOf = (id: number) => dataset.itemIndex.get(id)?.name ?? `#${id} (desconhecido)`;
        const gear: Record<string, any> = {};
        for (const [key, value] of Object.entries(model)) {
          if (typeof value === 'number' && value > 0 && dataset.itemIndex.get(value) && !/Refine$|Grade$|^(class|level|jobLevel)$/.test(key)) {
            const refine = model[`${key}Refine`];
            gear[key] = { id: value, name: nameOf(value), ...(refine ? { refine } : {}) };
          }
        }

        const compare = decoded.compare
          ? {
              slots: decoded.compare.itemNames,
              items: Object.fromEntries(
                Object.entries(decoded.compare.model2)
                  .filter(([, v]) => typeof v === 'number' && (v as number) > 0 && dataset.itemIndex.get(v as number))
                  .map(([k, v]) => [k, { id: v, name: nameOf(v as number) }]),
              ),
            }
          : null;

        return json({
          summary: `${info?.name ?? model.class} nível ${model.level}/${model.jobLevel}, ${Object.keys(gear).length} peça(s) equipada(s)${compare ? `, comparando ${compare.slots.join(', ')}` : ''}.`,
          build: {
            class: model.class,
            className: info?.name,
            level: model.level,
            jobLevel: model.jobLevel,
            stats: { str: model.str, agi: model.agi, vit: model.vit, int: model.int, dex: model.dex, luk: model.luk, pow: model.pow, sta: model.sta, wis: model.wis, spl: model.spl, con: model.con, crt: model.crt },
            atkSkill: model.selectedAtkSkill,
            consumables: (model.consumables ?? []).filter(Boolean).map((id: number) => ({ id, name: nameOf(id) })),
          },
          gear,
          compare,
          /** Re-emit this (with overrides) into any other tool. */
          buildInput: { preset: decoded.preset },
          ...(rb.warnings.length ? { warnings: rb.warnings } : {}),
        });
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    'share_link',
    {
      title: 'Gerar link do simulador',
      description: 'Transforma uma build em um link que abre o simulador web já preenchido. Opcionalmente com uma comparação armada e/ou encurtado.',
      inputSchema: {
        build: buildInputSchema,
        compare: z
          .object({
            slots: z.array(z.string()).min(1).describe('Slots a comparar, ex.: ["weapon"].'),
            gear: z.record(z.string(), z.union([z.number().int(), z.string(), z.null()])).describe('Peças alternativas, mesmo formato de `build.gear`.'),
          })
          .optional()
          .describe('Abre o simulador na visão atual → simulado.'),
        short: z.boolean().optional().default(false).describe('Encurtar via short.latam-tools.com.br.'),
      },
    },
    async ({ build, compare, short }) => {
      try {
        const input = await normalizeShare(build as BuildInput);
        const rb = resolveBuild(input, dataset);
        const state: CompareState | null = compare ? { itemNames: compare.slots, model2: compare.gear as Record<string, unknown> } : null;
        const url = shareOf(rb, state);
        const finalUrl = short ? await shortenShareUrl(url, config.shortenerUrl) : url;
        return json({
          url: finalUrl,
          ...(short && finalUrl !== url ? {} : short ? { note: 'O encurtador não respondeu; devolvendo a URL longa.' } : {}),
          ...(rb.warnings.length ? { warnings: rb.warnings } : {}),
        });
      } catch (error) {
        return fail(error);
      }
    },
  );

  // Small convenience: descriptions are the pt-BR source of truth for what an item does.
  server.registerTool(
    'item_description',
    {
      title: 'Descrição do item',
      description: 'Só a descrição pt-BR de um item, sem os campos estruturais. Útil quando a pergunta é "o que essa peça faz?".',
      inputSchema: { id: z.number().int() },
    },
    async ({ id }) => {
      const latam = dataset.itemIndex.latamRecord(id);
      const rec = dataset.itemIndex.record(id);
      const desc = plainItemDesc(latam?.description ?? rec?.description);
      if (!desc) return json({ error: `Sem descrição para o item ${id}.` }, true);
      return json({ id, name: dataset.itemIndex.get(id)?.name, description: desc, inCalcDb: !!rec });
    },
  );
}
