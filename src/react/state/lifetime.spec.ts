import { Lifetime } from './lifetime';
import { Events, listenDebounced } from '../services/events';

describe('calculator action ownership', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());
  it('keeps immediate updates and trailing debounce ordered and releases queued work', async () => {
    const events = new Events<number>();
    const calls: string[] = [];
    const subscription = listenDebounced(events, 250, value => calls.push(`solve:${value}`), value => calls.push(`change:${value}`));
    events.next(1); await vi.advanceTimersByTimeAsync(200); events.next(2);
    await vi.advanceTimersByTimeAsync(249);
    expect(calls).toEqual(['change:1', 'change:2']);
    await vi.advanceTimersByTimeAsync(1);
    expect(calls).toEqual(['change:1', 'change:2', 'solve:2']);
    events.next(3); subscription.unsubscribe(); await vi.advanceTimersByTimeAsync(250);
    expect(calls).not.toContain('solve:3');
  });
  it('suppresses pending completions and rejects owned waits when disposed', async () => {
    const lifetime = new Lifetime();
    const commit = vi.fn(); const publish = vi.fn();
    lifetime.watch(Promise.resolve('late'), commit, publish);
    lifetime.watch(lifetime.wait(1), commit, publish);
    lifetime.dispose();
    await vi.advanceTimersByTimeAsync(1000);
    expect(commit).not.toHaveBeenCalled(); expect(publish).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
