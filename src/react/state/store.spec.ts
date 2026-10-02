import { LatestRequest, Store } from './store';

describe('React snapshot store', () => {
  it('keeps snapshot identity until a complete update and removes subscriptions', () => {
    const initial = { value: 0 };
    const store = new Store(initial);
    const seen: unknown[] = [];
    const stop = store.subscribe(() => seen.push(store.getSnapshot()));
    expect(store.getSnapshot()).toBe(initial);
    store.set(initial);
    expect(seen).toEqual([]);
    const next = { value: 1 };
    store.set(next);
    expect(seen).toEqual([next]);
    stop();
    store.update(previous => ({ value: previous.value + 1 }));
    expect(seen).toEqual([next]);
    expect(store.getSnapshot()).toEqual({ value: 2 });
  });
});

describe('latest request', () => {
  it('ignores a late result even if its loader ignores cancellation', async () => {
    const request = new LatestRequest();
    const seen: number[] = [];
    let finish!: (value: number) => void;
    let oldSignal!: AbortSignal;
    const old = request.run(signal => {
      oldSignal = signal;
      return new Promise<number>(resolve => { finish = resolve; });
    }, value => seen.push(value));
    await request.run(async () => 2, value => seen.push(value));
    expect(oldSignal.aborted).toBe(true);
    finish(1);
    await old;
    expect(seen).toEqual([2]);
  });
  it('does not commit after disposal or start another load', async () => {
    const request = new LatestRequest();
    let finish!: (value: number) => void;
    const commit = vi.fn();
    const running = request.run(() => new Promise<number>(resolve => { finish = resolve; }), commit);
    request.dispose();
    finish(1);
    await running;
    const load = vi.fn(async () => 2);
    await request.run(load, commit);
    expect(load).not.toHaveBeenCalled();
    expect(commit).not.toHaveBeenCalled();
  });
  it('surfaces current failures but suppresses superseded failures', async () => {
    const request = new LatestRequest();
    const failure = new Error('network');
    await expect(request.run(async () => { throw failure; }, () => undefined)).rejects.toBe(failure);
    let reject!: (reason: Error) => void;
    const old = request.run(() => new Promise<number>((_resolve, fail) => { reject = fail; }), () => undefined);
    await request.run(async () => 2, () => undefined);
    reject(failure);
    await expect(old).resolves.toBeUndefined();
  });
});
