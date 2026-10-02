import { readFileSync } from 'node:fs';
import { CalculatorSession } from './calculator-session';
import { CalculatorData, CalculatorLayout, ItemShop, SlotColorPreferences } from '../services/calculator-services';
import { DataClient } from '../services/data-client';
import { CustomItems } from '../services/custom-items';
import { Confirmations, Messages } from '../services/notifications';
import { DataKey } from '../../app/core/data-manifest';

function makeSession() {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('window', { location: new URL('https://calc.test/#/') });
  vi.stubGlobal('location', new URL('https://calc.test/#/'));
  vi.stubGlobal('history', { state: null, replaceState: vi.fn() });
  vi.stubGlobal('document', { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], documentElement: { classList: { remove: vi.fn() } } });
  vi.stubGlobal('requestAnimationFrame', (callback: () => void) => setTimeout(callback, 0));
  const artifacts: Partial<Record<DataKey, Promise<unknown>>> = {};
  for (const [key, file] of [['itemsCore', 'items-core'], ['monsters', 'monsters'], ['hpsp', 'hpsp'], ['classes', 'classes'], ['itemViews', 'item-views'], ['itemsDesc', 'items-desc']]) {
    artifacts[key as DataKey] = Promise.resolve(JSON.parse(readFileSync(`src/assets/data/${file}.json`, 'utf8')));
  }
  const data = new DataClient({ inFlight: artifacts });
  const session = new CalculatorSession(new CalculatorData(data), new Messages(), new Confirmations(), new ItemShop(),
    data.descriptions, new SlotColorPreferences(), new CalculatorLayout(), new CustomItems(storage));
  return { session, storage };
}
describe('plain calculator session', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
  it('boots the real datasets, completes the solve and persists the existing autosave format', async () => {
    const { session, storage } = makeSession();
    session.start();
    await vi.advanceTimersByTimeAsync(1500);
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
});
