import { Confirmations, Messages } from './notifications';

describe('React notifications', () => {
  afterEach(() => vi.useRealTimers());
  it('expires temporary messages and releases all timers on disposal', () => {
    vi.useFakeTimers();
    const messages = new Messages();
    messages.add({ detail: 'Temporary', life: 100 });
    const sticky = { detail: 'Progress', sticky: true, key: 'progress' };
    messages.add(sticky);
    vi.advanceTimersByTime(100);
    expect(messages.getSnapshot()).toEqual([sticky]);
    messages.add({ detail: 'Another' }); messages.clear('progress');
    expect(messages.getSnapshot()).toHaveLength(1);
    messages.dispose();
    expect(vi.getTimerCount()).toBe(0);
    expect(messages.getSnapshot()).toEqual([]);
  });
  it('settles replacement, cancellation and acceptance exactly once', () => {
    const confirmations = new Confirmations();
    const accept = vi.fn(); const reject = vi.fn();
    confirmations.confirm({ message: 'First', accept, reject });
    confirmations.resolve(false); confirmations.resolve(false);
    expect(reject).toHaveBeenCalledOnce();
    confirmations.confirm({ message: 'Second', accept, reject });
    confirmations.confirm({ message: 'Third', accept, reject });
    confirmations.resolve(true); confirmations.dispose();
    expect(reject).toHaveBeenCalledTimes(2);
    expect(accept).toHaveBeenCalledOnce();
  });
});
