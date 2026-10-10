import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CalculatorSession } from './calculator-session';
import { CalculatorData, CalculatorLayout, ItemShop, SlotColorPreferences } from '../services/calculator-services';
import { DataClient } from '../services/data-client';
import { CustomItems } from '../services/custom-items';
import { Confirmations, Messages } from '../services/notifications';
import { DataKey, DataManifest, manifestPath } from '../../app/core/data-manifest';
import { SKILL_DESC_BY_ID } from '../../app/skills';

function makeSession(overrides: Partial<Record<DataKey, Promise<unknown>>> = {}) {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('window', { location: new URL('https://calc.test/#/') });
  vi.stubGlobal('location', new URL('https://calc.test/#/'));
  vi.stubGlobal('history', { state: null, replaceState: vi.fn() });
  vi.stubGlobal('document', { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], documentElement: { classList: { remove: vi.fn() } } });
  vi.stubGlobal('requestAnimationFrame', (callback: () => void) => setTimeout(callback, 0));
  const artifacts: Partial<Record<DataKey, Promise<unknown>>> = {};
  const manifest = JSON.parse(readFileSync('src/assets/data-manifest.json', 'utf8')) as DataManifest;
  for (const key of ['itemsCore', 'monsters', 'hpsp', 'classes', 'itemViews', 'itemsDesc', 'skillDescriptions'] as const) {
    artifacts[key] = Promise.resolve(JSON.parse(readFileSync(join('src', manifestPath(manifest, key)), 'utf8')));
  }
  Object.assign(artifacts, overrides);
  const data = new DataClient({ inFlight: artifacts });
  const session = new CalculatorSession(new CalculatorData(data), new Messages(), new Confirmations(), new ItemShop(),
    data.descriptions, new SlotColorPreferences(), new CalculatorLayout(), new CustomItems(storage));
  return { session, storage, data };
}
describe('plain calculator session', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
  it('boots the real datasets, completes the solve and persists the existing autosave format', async () => {
    const { session, storage } = makeSession();
    session.start();
    await vi.advanceTimersByTimeAsync(1500);
    session.viewReady();
    await vi.advanceTimersByTimeAsync(300);
    expect(session.isInProcessingPreset).toBe(false);
    expect(session.isCalculating).toBe(false);
    expect(session.totalSummary?.calc?.totalAspd).toBeGreaterThan(0);
    expect(session.modelSummary).toBeDefined();
    expect(JSON.parse(storage.getItem('ro-set')!)).toHaveProperty('class', session.model.class);
    expect(session.getSnapshot()).toBeGreaterThan(0);
    session.dispose();
  });
  it('disposes pending initialization and does not publish late data', async () => {
    const { session } = makeSession();
    session.start(); session.dispose();
    const snapshot = session.getSnapshot();
    await vi.advanceTimersByTimeAsync(1500);
    expect(session.getSnapshot()).toBe(snapshot);
    expect(session.totalSummary).toBeUndefined();
  });

  it('replaces cached skill fallbacks when deferred descriptions arrive', async () => {
    const id = 999_998;
    const { session, data } = makeSession({ skillDescriptions: Promise.resolve({ [id]: 'Descrição completa da habilidade' }) });
    const skill = { name: 'delayed-skill', label: 'Habilidade', icon: id, dropdown: [] };
    try {
      expect(session.buffTooltip(skill)).not.toContain('Descrição completa');
      expect(session.skillTooltip(skill)).not.toContain('Descrição completa');
      await data.loadSkillDescriptions();
      expect(session.buffTooltip(skill)).toContain('Descrição completa da habilidade');
      expect(session.skillTooltip(skill)).toContain('Descrição completa da habilidade');
    } finally {
      delete SKILL_DESC_BY_ID[id];
      session.dispose();
    }
  });

  it('uses the chosen Betelgeuse HP in both builds without changing the database or other targets', async () => {
    const { session, storage } = makeSession();
    session.start();
    await vi.advanceTimersByTimeAsync(1500);
    session.selectedMonster = 20994;
    session.onMonsterChange();
    session.toggleStatsCompare();
    for (const hp of [500_000_000, 800_000_000, 1_100_000_000, 1_400_000_000, 1_700_000_000, 2_000_000_000]) {
      session.betelgeuseHp = hp;
      session.onBetelgeuseHpChange();
      await vi.advanceTimersByTimeAsync(1500);
      expect(session.totalSummary.monster.hp).toBe(hp);
      expect(session.totalSummary2.monster.hp).toBe(hp);
      expect(storage.getItem('betelgeuseHp')).toBe(String(hp));
    }
    expect(session.monsterDataMap[20994].stats.health).toBe(2_000_000_000);
    session.betelgeuseHp = 500_000_000;
    session.selectedMonster = 21067;
    session.onMonsterChange();
    await vi.advanceTimersByTimeAsync(1500);
    expect(session.totalSummary.monster.hp).toBe(session.monsterDataMap[21067].stats.health);
    session.dispose();
  });

  it('offers Freyja Aliviar 0–8, resets a saved higher level and retains other targets’ 0–10', () => {
    const { session, storage } = makeSession();
    session.selectedMonster = 20994;
    session.relieveLevel = 10;
    expect(session.relieveLevelOptions.map((option) => option.value)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    session.selectedMonster = 21361;
    session.onMonsterChange();
    expect(session.isRelieveTarget).toBe(true);
    expect(session.relieveLevelOptions.map((option) => option.value)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(session.relieveLevelOptions.at(-1)?.label).toContain('80%');
    expect(session.relieveLevel).toBe(0);
    expect(storage.getItem('monster')).toBe('21361');
    session.dispose();
  });
  it.each(['success', 'offline'])('publishes the completed share link when shortening is %s', async (outcome) => {
    const { session } = makeSession();
    session.start();
    await vi.advanceTimersByTimeAsync(1500);
    const shortUrl = 'https://short.latam-tools.com.br/test12';
    vi.stubGlobal('fetch', outcome === 'success'
      ? vi.fn().mockResolvedValue(new Response(JSON.stringify({ short_url: shortUrl }), { status: 201 }))
      : vi.fn().mockRejectedValue(new Error('offline')));
    const rendered: { url: string; shortening: boolean }[] = [];
    const stop = session.subscribe(() => rendered.push({ url: session.shareUrl, shortening: session.shareShortening }));

    session.action(() => session.openShareDialog());
    const longUrl = session.shareUrl;
    expect(rendered.at(-1)?.shortening).toBe(true);
    await vi.advanceTimersByTimeAsync(0);

    expect(rendered.at(-1)).toEqual({ url: outcome === 'success' ? shortUrl : longUrl, shortening: false });
    stop();
    session.dispose();
  });
});
