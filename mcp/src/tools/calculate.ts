/**
 * The tools that actually run the engine, plus the share-link bridge.
 *
 * Every one of these accepts a share link inline via `build.share`, so "here is my
 * build, what's the best boots?" is a single call rather than parse-then-calculate.
 *
 * Schemas live at module scope: a fresh McpServer is built per HTTP POST, so a
 * schema declared inside the register call is rebuilt on every request.
 */
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CompareState } from 'src/app/core/compare-state';
import { collectConsumables } from 'src/app/core/calculator-controller';
import { round } from 'src/app/utils';
import { config } from '../config';
import { Dataset } from '../data/dataset';
import { SLOT_TAGS } from '../data/slot-classifier';
import { plainItemDesc } from '../data/text';
import { BuildInput, buildInputSchema, ITEM_ID_KEYS, MAIN_ITEM_SLOTS, relatedItemKeys, ResolvedBuild, resolveBuild } from '../engine/build-input';
import { projectResult } from '../engine/project';
import { buildShareUrl, parseShare, resolveIfShort, shortenShareUrl, toPreset } from '../engine/share';
import { solve } from '../engine/solve';
import { createBudget, withSolveSlot } from '../util/budget';
import { compact, json, registerJsonTool, truncatedNote } from './helpers';

const targetSchema = z
  .object({ monsterId: z.number().int().optional().describe('Id do monstro alvo. Veja search_monsters.') })
  .optional();

type TargetArg = z.infer<typeof targetSchema>;

/** Percentage delta of `value` against `base`, to two decimals. */
const deltaPct = (value: number, base: number): number | null => (base ? round(((value - base) / base) * 100, 2) : null);

/** Resolve a short link before decoding, since that is the form the app hands out. */
const normalizeShare = async (input: BuildInput): Promise<BuildInput> =>
  input.share ? { ...input, share: await resolveIfShort(input.share, config.shortenerUrl) } : input;

function resolveTarget(dataset: Dataset, monsterId?: number) {
  const id = monsterId ?? config.defaultTargetId;
  const monster = dataset.monsters[id];
  if (!monster) throw new Error(`Monstro ${id} não tem bloco de atributos no calculador e não pode ser alvo. Use search_monsters.`);
  return { id, monster };
}

const shareOf = (rb: ResolvedBuild, compare?: CompareState | null) => buildShareUrl(toPreset(rb.model, rb.char), config.appOrigin, compare);

/** The two numbers `optimize_slot` and `compare_builds` rank on, read straight off the
 *  damage summary — `projectResult` would clone the whole 15-40 kB summary for them. */
const dpsAndMax = (calc: any): { dps: number; max: number } => {
  const dmg = calc.getTotalSummary().dmg ?? {};
  return { dps: dmg.skillDps ?? 0, max: dmg.skillMaxDamage ?? 0 };
};

export function registerCalculationTools(server: McpServer, dataset: Dataset): void {
  registerJsonTool<{ build: BuildInput; target?: TargetArg; effects?: string[]; include?: ('bonuses' | 'tables')[] }>(
    server,
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
      const input = await normalizeShare(build);
      return withSolveSlot(() => {
        const rb = resolveBuild(input, dataset);
        const { id: targetId, monster } = resolveTarget(dataset, target?.monsterId);
        const calc = solve(rb, dataset, monster, effects ?? []);
        return json(projectResult(calc, rb, { include, targetId, share: shareOf(rb), effects }));
      });
    },
  );

  registerJsonTool<{ build: BuildInput; monsterIds: number[] }>(server, 'damage_table', {
    title: 'Dano contra vários monstros',
    description: `Calcula a mesma build contra até ${config.limits.maxTableMonsters} monstros de uma vez.`,
    inputSchema: {
      build: buildInputSchema,
      monsterIds: z.array(z.number().int()).min(1).max(config.limits.maxTableMonsters),
    },
  }, async ({ build, monsterIds }) => {
    const input = await normalizeShare(build);
    return withSolveSlot(() => {
      const rb = resolveBuild(input, dataset);
      const skillValue = rb.model.selectedAtkSkill;
      // Same flag solve() feeds runChain: HP Increase Potion (L) changes max HP, so
      // hardcoding false here would make this tool disagree with `calculate`.
      const { usedHpL } = collectConsumables(rb.model, dataset.items);
      const budget = createBudget();
      const rows: any[] = [];

      // Seed the solve with the first id we actually have data for: the loop reports
      // unknown ids as per-row errors, so an unknown one in position 0 must not throw
      // away every other row.
      const seedId = monsterIds.find((id) => dataset.monsters[id]);
      if (seedId === undefined) throw new Error('Nenhum dos monstros informados tem bloco de atributos no calculador.');

      // One full solve, then re-target cheaply — changing the monster does not
      // invalidate the gear bonus pass, so runChain per target would be wasteful.
      const calc = solve(rb, dataset, dataset.monsters[seedId]);
      for (const id of monsterIds) {
        if (budget.expired()) break;
        const monster = dataset.monsters[id];
        if (!monster) {
          rows.push({ id, error: 'sem bloco de atributos no calculador' });
          continue;
        }
        const dmg: any = calc.setMonster(monster).prepareAllItemBonus().calcDmgWithExtraBonus({ skillValue, isUseHpL: usedHpL });
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
        skill: skillValue,
        rows,
        ...truncatedNote(rows.length, monsterIds.length, 'alvos'),
        share: shareOf(rb),
        ...(rb.warnings.length ? { warnings: rb.warnings } : {}),
      });
    });
  });

  registerJsonTool<{ builds: BuildInput[]; target?: TargetArg; labels?: string[] }>(server, 'compare_builds', {
    title: 'Comparar builds',
    description: `Resolve de 2 a ${config.limits.maxCompareBuilds} builds contra o mesmo alvo e ordena por DPS.`,
    inputSchema: {
      builds: z.array(buildInputSchema).min(2).max(config.limits.maxCompareBuilds),
      target: targetSchema,
      labels: z.array(z.string()).optional().describe('Nomes para identificar cada build no resultado.'),
    },
  }, async ({ builds, target, labels }) => {
    const inputs = await Promise.all(builds.map(normalizeShare));
    return withSolveSlot(() => {
      const { id: targetId, monster } = resolveTarget(dataset, target?.monsterId);
      const results = inputs.map((input, i) => {
        const rb = resolveBuild(input, dataset);
        const calc = solve(rb, dataset, monster);
        const out = projectResult(calc, rb, { targetId, share: shareOf(rb) });
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
          deltaPct: deltaPct(r.dps, best.dps) ?? 0,
          share: r.result['share'],
        })),
        details: Object.fromEntries(results.map((r) => [r.label, r.result])),
      });
    });
  });

  registerJsonTool<{
    build: BuildInput;
    slot: string;
    candidates?: number[];
    slotTag?: (typeof SLOT_TAGS)[number];
    query?: string;
    target?: TargetArg;
    limit?: number;
  }>(server, 'optimize_slot', {
    title: 'Otimizar um slot',
    description:
      `Testa candidatos para um slot e ordena pelo ganho de DPS. Máximo de ${config.limits.maxOptimizeCandidates} candidatos e um orçamento de tempo — se estourar, devolve resultado parcial com \`truncated\`. ` +
      'O link devolvido já vem com a comparação armada (peça atual → peça sugerida), então o jogador abre o simulador e vê a diferença.',
    inputSchema: {
      build: buildInputSchema,
      slot: z.string().describe('Campo do equipamento a variar, ex.: "weapon", "armor", "boot", "accLeft".'),
      candidates: z.array(z.number().int()).max(config.limits.maxOptimizeCandidates).optional().describe('Ids a testar. Sem isso, busca pelo `slotTag`.'),
      slotTag: z.enum(SLOT_TAGS).optional().describe('Categoria para buscar candidatos automaticamente.'),
      query: z.string().optional().describe('Filtra os candidatos automáticos por nome.'),
      target: targetSchema,
      limit: z.number().int().min(1).max(20).optional().default(10),
    },
  }, async ({ build, slot, candidates, slotTag, query, target, limit = 10 }) => {
    const input = await normalizeShare(build);
    return withSolveSlot(() => {
      if (!ITEM_ID_KEYS.includes(slot)) {
        // Without this the override is silently skipped and every candidate solves to
        // the baseline, producing a confident ranking of identical numbers.
        throw new Error(`"${slot}" não é um slot de equipamento. Use um destes: ${MAIN_ITEM_SLOTS.join(', ')}.`);
      }

      const baseRb = resolveBuild(input, dataset);
      const classId = baseRb.model.class;
      const { monster } = resolveTarget(dataset, target?.monsterId);

      const ids = resolveCandidates(dataset, classId, { candidates, slotTag, query });
      const baseDps = dpsAndMax(solve(baseRb, dataset, monster)).dps;

      // Decode the share token once — resolveBuild would re-decompress it per candidate.
      const perCandidate: BuildInput = { ...input, share: undefined, preset: input.share ? parseShare(input.share).preset : input.preset };

      const budget = createBudget();
      const scored: any[] = [];
      for (const id of ids) {
        if (budget.expired()) break;
        // Gear changes invalidate the bonus pass, so each candidate needs a full solve.
        const rb = resolveBuild({ ...perCandidate, gear: { ...(perCandidate.gear ?? {}), [slot]: id } }, dataset);
        const { dps, max } = dpsAndMax(solve(rb, dataset, monster));
        scored.push({
          id,
          name: dataset.itemIndex.get(id)?.name ?? String(id),
          dps: round(dps, 2),
          max,
          deltaDps: round(dps - baseDps, 2),
          deltaPct: deltaPct(dps, baseDps),
        });
      }

      scored.sort((a, b) => b.dps - a.dps);
      const top = scored.slice(0, limit);
      const winner = top[0];
      const currentId = baseRb.model[slot];

      // Arm the comparison so the link opens on the app's current → simulado view.
      // The app rebuilds a compared slot's related fields from model2 alone and merges
      // the result over the main model, so any card/enchant left out here would come
      // back as null — and the simulated side would not match the DPS ranked above.
      // Only main slots can be compared; the picker has no row for a card slot.
      const compare: CompareState | null =
        winner && MAIN_ITEM_SLOTS.includes(slot)
          ? {
              itemNames: [slot],
              model2: {
                [slot]: winner.id,
                [`${slot}Refine`]: baseRb.model[`${slot}Refine`] ?? 0,
                [`${slot}Grade`]: baseRb.model[`${slot}Grade`] ?? null,
                ...Object.fromEntries(relatedItemKeys(slot).map((k) => [k, baseRb.model[k] ?? null])),
              },
            }
          : null;

      return json({
        slot,
        current: { id: currentId || null, name: currentId ? dataset.itemIndex.get(currentId)?.name : null, dps: round(baseDps, 2) },
        tested: scored.length,
        ranking: top,
        ...truncatedNote(scored.length, ids.length, 'candidatos'),
        share: shareOf(baseRb, compare),
        ...(baseRb.warnings.length ? { warnings: baseRb.warnings } : {}),
      });
    });
  });
}

/** Explicit ids, or a slot-scoped search capped at the candidate limit. */
function resolveCandidates(
  dataset: Dataset,
  classId: number,
  opts: { candidates?: number[]; slotTag?: (typeof SLOT_TAGS)[number]; query?: string },
): number[] {
  const max = config.limits.maxOptimizeCandidates;
  const ids = opts.candidates?.length
    ? opts.candidates
    : (() => {
        if (!opts.slotTag) throw new Error('Informe `candidates` ou `slotTag` para escolher o que testar.');
        const char = dataset.classes.newInstance(classId);
        return dataset.itemIndex.search({ slot: opts.slotTag, query: opts.query, limit: max }, char).rows.map((r) => r.id);
      })();

  if (!ids.length) throw new Error('Nenhum candidato encontrado para esse slot.');
  return ids.slice(0, max);
}

export function registerBridgeTools(server: McpServer, dataset: Dataset): void {
  registerJsonTool<{ share: string }>(server, 'parse_share_link', {
    title: 'Ler link do simulador',
    description:
      'Lê um link de simulação (URL completa, encurtada, fragmento antigo #/?b=… ou token) e devolve a build resolvida: classe, níveis, atributos, cada peça equipada com refino/cartas/encantes, habilidades, buffs, consumíveis e a comparação, se o link levar uma. Não calcula dano — para isso passe o mesmo link em `calculate`.',
    inputSchema: { share: z.string() },
  }, async ({ share }) => {
    const decoded = parseShare(await resolveIfShort(share, config.shortenerUrl));
    const rb = resolveBuild({ preset: decoded.preset }, dataset);
    const model = rb.model;

    const nameOf = (id: number) => dataset.itemIndex.get(id)?.name ?? `#${id} (desconhecido)`;
    // Only the keys that actually hold equipment — a numeric-key sweep would also
    // report `aspdPotion` and `pet` as equipped pieces.
    const gear: Record<string, any> = {};
    for (const key of ITEM_ID_KEYS) {
      const value = model[key];
      if (typeof value !== 'number' || value <= 0 || !dataset.itemIndex.get(value)) continue;
      gear[key] = compact({ id: value, name: nameOf(value), refine: model[`${key}Refine`] || undefined });
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
      summary: `${rb.classInfo?.name ?? model.class} nível ${model.level}/${model.jobLevel}, ${Object.keys(gear).length} peça(s) equipada(s)${compare ? `, comparando ${compare.slots.join(', ')}` : ''}.`,
      build: {
        class: model.class,
        className: rb.classInfo?.name,
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
  });

  registerJsonTool<{ build: BuildInput; compare?: { slots: string[]; gear: Record<string, any> }; short?: boolean }>(server, 'share_link', {
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
  }, async ({ build, compare, short }) => {
    const rb = resolveBuild(await normalizeShare(build), dataset);
    const state: CompareState | null = compare ? { itemNames: compare.slots, model2: compare.gear } : null;
    const url = shareOf(rb, state);
    const finalUrl = short ? await shortenShareUrl(url, config.shortenerUrl) : url;
    return json(
      compact({
        url: finalUrl,
        note: short && finalUrl === url ? 'O encurtador não respondeu; devolvendo a URL longa.' : undefined,
        warnings: rb.warnings.length ? rb.warnings : undefined,
      }),
    );
  });

  registerJsonTool<{ id: number }>(server, 'item_description', {
    title: 'Descrição do item',
    description: 'Só a descrição pt-BR de um item, sem os campos estruturais. Útil quando a pergunta é "o que essa peça faz?".',
    inputSchema: { id: z.number().int() },
  }, ({ id }) => {
    const latam = dataset.itemIndex.latamRecord(id);
    const rec = dataset.itemIndex.record(id);
    const desc = plainItemDesc(latam?.description ?? rec?.description);
    if (!desc) return json({ error: `Sem descrição para o item ${id}.` }, true);
    return json({ id, name: dataset.itemIndex.get(id)?.name, description: desc, inCalcDb: !!rec });
  });
}
