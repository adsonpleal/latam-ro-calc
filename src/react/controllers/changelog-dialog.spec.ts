import { AppTopBarComponent } from './app.topbar';
import { DataClient } from '../services/data-client';
import { CalculatorLayout } from '../services/calculator-services';
import { DataManifest } from '../../app/core/data-manifest';
import { ReleaseEntry } from '../../releases/entry-logs';

// The Novidades dialog fetches the changelog through the data client; it used to be a
// bundled `import()` of history.json, which charged every release's own notes to the
// bundle ratchet. See tools/changelog-out-of-bundle.spec.ts for the guard that keeps it
// out of the bundle, and docs/dependency-reduction.md for what that cost.
const ENTRIES: ReleaseEntry[] = [
  { v: '0.1.193-beta', date: '30-10-2026', logs: ['Primeira linha.'], logs_es: ['Primera línea.'], logs_en: ['First line.'] },
  { v: '0.1.192-beta', date: '29-10-2026', logs: ['Linha anterior.'] },
];

// The controller reads the last-read version straight off localStorage in a field
// initializer, so the global has to exist before any instance is built.
beforeEach(() => {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
  });
});
afterEach(() => vi.unstubAllGlobals());

function topbar(history: Promise<unknown>, fetcher = vi.fn()) {
  const client = new DataClient({ inFlight: { releaseHistory: history } }, undefined, fetcher);
  return { controller: new AppTopBarComponent(new CalculatorLayout(undefined), client), fetcher };
}

describe('the Novidades dialog', () => {
  it('fills itself from the fetched artifact, with no import of its own', async () => {
    const { controller, fetcher } = topbar(Promise.resolve(ENTRIES));
    expect(controller.updates).toEqual([]);

    await controller.showUpdateDialog();

    expect(controller.visibleUpdate).toBe(true);
    expect(controller.updates).toEqual(ENTRIES);
    expect(controller.updatesLoading).toBe(false);
    expect(controller.updatesError).toBe(false);
    // The preload promise was adopted, so opening the dialog issued no second request.
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('asks for the artifact once, however often the dialog is reopened', async () => {
    const manifest = { base: 'assets/data/', files: { releaseHistory: 'release-history.json' } } as unknown as DataManifest;
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(ENTRIES) });
    const client = new DataClient({ manifest }, undefined, fetcher);
    const controller = new AppTopBarComponent(new CalculatorLayout(undefined), client);

    await controller.showUpdateDialog();
    await controller.showUpdateDialog();

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][0]).toBe('assets/data/release-history.json');
    expect(controller.updates).toEqual(ENTRIES);
  });

  it('reports a failed fetch and lets the reader try again', async () => {
    const { controller } = topbar(Promise.reject(new Error('offline')));

    await controller.showUpdateDialog();

    expect(controller.updatesError).toBe(true);
    expect(controller.updatesLoading).toBe(false);
    expect(controller.updates).toEqual([]);

    // A retry is only possible because the failed attempt cleared the memo.
    const retried = new DataClient({ inFlight: { releaseHistory: Promise.resolve(ENTRIES) } }, undefined, vi.fn());
    const second = new AppTopBarComponent(new CalculatorLayout(undefined), retried);
    await second.showUpdateDialog();
    expect(second.updates).toEqual(ENTRIES);
  });
});
