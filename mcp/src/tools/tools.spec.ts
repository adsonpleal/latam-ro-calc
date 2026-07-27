/**
 * Tool contract tests. These call the registered handlers through a real in-memory
 * MCP client, so the zod schemas and result shapes are exercised exactly as an agent
 * would hit them — including the serialized-size ceilings, which are the regression
 * guard for token cost.
 */
import { describe, expect, it, beforeAll } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { loadDataset } from '../data/dataset';
import { createMcpServer } from '../mcp-server';

const dataset = loadDataset('src/assets/demo/data');
let client: Client;

/** Every tool returns a single JSON text block. */
const call = async (name: string, args: Record<string, unknown> = {}) => {
  const res: any = await client.callTool({ name, arguments: args });
  const text = res.content[0].text as string;
  return { data: JSON.parse(text), bytes: text.length, isError: !!res.isError };
};

beforeAll(async () => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  client = new Client({ name: 'spec', version: '1.0.0' });
  await Promise.all([createMcpServer(dataset).connect(serverTransport), client.connect(clientTransport)]);
});

describe('tool surface', () => {
  it('exposes the full set', async () => {
    const names = (await client.listTools()).tools.map((t) => t.name).sort();
    expect(names).toEqual(
      [
        'calculate',
        'compare_builds',
        'damage_table',
        'get_item',
        'get_monster',
        'item_description',
        'list_bonus_keys',
        'list_classes',
        'list_skills',
        'optimize_slot',
        'parse_share_link',
        'search_items',
        'search_monsters',
        'share_link',
      ].sort(),
    );
  });
});

describe('discovery', () => {
  it('list_classes stays small', async () => {
    const { data, bytes } = await call('list_classes');
    expect(data.classes).toHaveLength(40);
    expect(data.classes[0]).toMatchObject({ id: expect.any(Number), name: expect.any(String), maxLevel: expect.any(Number) });
    expect(bytes).toBeLessThan(8000);
  });

  it('search_items covers both databases and flags which is which', async () => {
    const inCalc = await call('search_items', { query: 'arco de apoio' });
    expect(inCalc.data.items.some((i: any) => i.id === 700016 && i.db === true)).toBe(true);

    // 7508 exists in latam-items.json only — the app itself cannot surface it.
    const latamOnly = await call('search_items', { query: 'allysia' });
    expect(latamOnly.data.items[0]).toMatchObject({ id: 7508, db: false });
  });

  it('search_items keeps a page of results cheap', async () => {
    const { data, bytes } = await call('search_items', { query: 'arco', limit: 20 });
    expect(data.items.length).toBeLessThanOrEqual(20);
    expect(bytes).toBeLessThan(4000);
  });

  it('get_item decodes the bonus script with pt-BR labels', async () => {
    const { data } = await call('get_item', { id: 1291 });
    expect(data.name).toBeTruthy();
    expect(data.bonuses.some((b: any) => b.key === 'dex')).toBe(true);
    // The description must be plain text, not the app's <font>-tag popover HTML.
    expect(data.description).not.toMatch(/<font|\^[0-9a-fA-F]{6}/);
  });

  it('get_item explains an item with no calculator record instead of erroring', async () => {
    const { data } = await call('get_item', { id: 7508 });
    expect(data).toMatchObject({ id: 7508, inCalcDb: false });
    expect(data.note).toMatch(/não foi cadastrado/);
  });

  it('search_monsters defaults to targets calculate can actually use', async () => {
    const { data } = await call('search_monsters', { query: 'osiris' });
    expect(data.monsters.every((m: any) => m.hasStats !== false)).toBe(true);
    expect(data.monsters.some((m: any) => m.id === 1038)).toBe(true);
  });

  it('list_skills returns values calculate accepts verbatim', async () => {
    const { data } = await call('list_skills', { classId: 4261, kind: 'atk' });
    const skill = data.skills.find((s: any) => s.value === 'Poison Burst==5');
    expect(skill).toBeTruthy();
    expect(skill.label).toBeTruthy();
  });
});

describe('calculate', () => {
  const build = { class: 4261, level: 230, jobLevel: 47, stats: { int: 133, spl: 100, vit: 120 }, atkSkill: 'Poison Burst==5' };

  it('reproduces the replay-validated damage and stays under the size ceiling', async () => {
    const { data, bytes } = await call('calculate', { build, target: { monsterId: 21077 } });
    expect(data.damage.skill.max).toBe(68309);
    expect(data.target).toMatchObject({ id: 21077, name: 'Dummy - Neutro' });
    expect(data.share).toMatch(/^https:\/\/simulador\.latam-tools\.com\.br\/#\/\?b=/);
    // The default result must stay cheap — never spread getTotalSummary().
    expect(bytes).toBeLessThan(4000);
  });

  it('accepts a share link as the build, with overrides on top', async () => {
    const first = await call('calculate', { build, target: { monsterId: 21077 } });
    const viaShare = await call('calculate', { build: { share: first.data.share }, target: { monsterId: 21077 } });
    expect(viaShare.data.damage).toEqual(first.data.damage);

    const overridden = await call('calculate', { build: { share: first.data.share, level: 200 }, target: { monsterId: 21077 } });
    expect(overridden.data.build.level).toBe(200);
    expect(overridden.data.damage.skill.max).not.toBe(68309);
  });

  it('reports an unusable target as a tool error, not a crash', async () => {
    const { data, isError } = await call('calculate', { build, target: { monsterId: 999999 } });
    expect(isError).toBe(true);
    expect(data.error).toMatch(/não tem bloco de atributos/);
  });

  it('include: tables adds the multiplier tables on request only', async () => {
    const plain = await call('calculate', { build });
    expect(plain.data.tables).toBeUndefined();
    const withTables = await call('calculate', { build, include: ['tables'] });
    expect(withTables.data.tables.element.length).toBeGreaterThan(0);
    expect(withTables.bytes).toBeGreaterThan(plain.bytes);
  });
});

describe('optimize_slot', () => {
  it('ranks candidates and arms the comparison in the returned link', async () => {
    const { data } = await call('optimize_slot', {
      build: {
        class: 4257,
        level: 200,
        jobLevel: 50,
        stats: { agi: 100, dex: 130, pow: 60, con: 40 },
        gear: { weapon: 700016, weaponRefine: 11, ammo: 1773 },
        atkSkill: 'Focused Arrow Strike==5',
      },
      slot: 'weapon',
      slotTag: 'weapon',
      query: 'arco',
      limit: 3,
    });

    expect(data.ranking.length).toBeGreaterThan(0);
    expect(data.ranking[0].dps).toBeGreaterThanOrEqual(data.ranking[data.ranking.length - 1].dps);
    expect(data.current.id).toBe(700016);

    // The link must open the app on its current → simulado view.
    const parsed = await call('parse_share_link', { share: data.share });
    expect(parsed.data.compare.slots).toEqual(['weapon']);
    expect(parsed.data.compare.items.weapon.id).toBe(data.ranking[0].id);
  });
});

describe('regressions', () => {
  const windhawk = {
    class: 4257,
    level: 200,
    jobLevel: 50,
    stats: { agi: 100, dex: 130, pow: 60, con: 40 },
    gear: { weapon: 700016, weaponRefine: 11, weaponCard1: 4628, ammo: 1773 },
    atkSkill: 'Focused Arrow Strike==5',
  };

  it('damage_table honours HP Increase Potion (L) like calculate does', async () => {
    // Tiger Cannon's base damage is literally a function of maxHp (Sura.ts:232), so
    // it is the skill that exposes the flag. The per-target recompute used to hardcode
    // isUseHpL:false, making this tool disagree with `calculate` for the same build.
    const build = { class: 13, level: 200, jobLevel: 50, stats: { str: 110, vit: 100, dex: 90 }, atkSkill: 'Tiger Cannon==10', consumables: [12424] };
    const single = await call('calculate', { build, target: { monsterId: 21077 } });
    const table = await call('damage_table', { build, monsterIds: [21077] });

    // Guard that the fixture actually exercises the flag: without the potion the
    // damage must differ, otherwise this test could never fail.
    const noPotion = await call('calculate', { build: { ...build, consumables: [] }, target: { monsterId: 21077 } });
    expect(single.data.damage.skill.max).not.toBe(noPotion.data.damage.skill.max);

    expect(table.data.rows[0].max).toBe(single.data.damage.skill.max);
  });

  it('damage_table survives an unknown id in the first position', async () => {
    const { data } = await call('damage_table', { build: windhawk, monsterIds: [999999, 21077] });
    expect(data.rows).toHaveLength(2);
    expect(data.rows[0]).toMatchObject({ id: 999999, error: expect.any(String) });
    expect(data.rows[1].max).toBeGreaterThan(0);
  });

  it('optimize_slot rejects a slot that is not an equipment field', async () => {
    // Previously this silently scored every candidate as the untouched base build.
    const { data, isError } = await call('optimize_slot', { build: windhawk, slot: 'boots', candidates: [700016], target: { monsterId: 21077 } });
    expect(isError).toBe(true);
    expect(data.error).toMatch(/não é um slot de equipamento/);
  });

  it('optimize_slot carries the slot cards into the emitted comparison', async () => {
    // The app rebuilds a compared slot's related fields from model2 alone, so a card
    // left out here comes back as null and the simulated side stops matching the rank.
    const { data } = await call('optimize_slot', { build: windhawk, slot: 'weapon', candidates: [18186], target: { monsterId: 21077 }, limit: 1 });
    const parsed = await call('parse_share_link', { share: data.share });
    expect(parsed.data.compare.items.weapon.id).toBe(18186);
    expect(parsed.data.compare.items.weaponCard1.id).toBe(4628);
  });

  it('parse_share_link does not report consumables as equipped gear', async () => {
    const { data: made } = await call('share_link', { build: { ...windhawk, aspdPotion: 645 } });
    const { data } = await call('parse_share_link', { share: made.url });
    expect(data.gear.weapon.id).toBe(700016);
    expect(data.gear.aspdPotion).toBeUndefined();
  });

  it('search_monsters does not invent a type for monsters with no stat block', async () => {
    const { data } = await call('search_monsters', { query: 'poring', hasStats: false, limit: 25 });
    const statless = data.monsters.find((m: any) => m.hasStats === false);
    expect(statless).toBeTruthy();
    expect(statless.type).toBeUndefined();
  });
});

describe('bridge', () => {
  it('parse_share_link resolves ids to names and summarises the build', async () => {
    const { data: calc } = await call('calculate', {
      build: { class: 4257, level: 200, jobLevel: 50, gear: { weapon: 700016, weaponRefine: 11 }, atkSkill: 'Focused Arrow Strike==5' },
    });
    const { data } = await call('parse_share_link', { share: calc.share });

    expect(data.build.className).toBe('Falcão do Vento');
    expect(data.gear.weapon).toMatchObject({ id: 700016, name: 'Arco de Apoio Certeiro', refine: 11 });
    expect(data.summary).toMatch(/Falcão do Vento nível 200\/50/);
    expect(data.buildInput.preset).toBeTruthy();
  });

  it('share_link can arm a comparison without solving', async () => {
    const { data } = await call('share_link', {
      build: { class: 4257, level: 200, jobLevel: 50, gear: { weapon: 700016 } },
      compare: { slots: ['weapon'], gear: { weapon: 18186 } },
    });
    const parsed = await call('parse_share_link', { share: data.url });
    expect(parsed.data.compare.items.weapon.id).toBe(18186);
  });

  it('rejects a malformed link with a readable message', async () => {
    const { data, isError } = await call('parse_share_link', { share: 'https://simulador.latam-tools.com.br/#/?b=garbage' });
    expect(isError).toBe(true);
    expect(data.error).toMatch(/inválido|corrompido/);
  });
});
