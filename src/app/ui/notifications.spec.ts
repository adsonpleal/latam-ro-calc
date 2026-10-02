
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Confirmations as UiConfirmationService, Messages as UiMessageService } from '../../react/services/notifications';

describe('notifications and confirmations', () => {
  afterEach(() => vi.useRealTimers());
  it('expires temporary messages, keeps sticky messages and releases timers on destruction', () => {
    vi.useFakeTimers();
    const service = new UiMessageService();
    service.add({ detail: 'Temporary', life: 100 });
    const sticky = { detail: 'Progress', sticky: true, key: 'progress' };
    service.add(sticky); vi.advanceTimersByTime(100);
    expect(service.getSnapshot()).toEqual([sticky]);
    service.add({ detail: 'Another' }); service.clear('progress');
    expect(service.getSnapshot()).toHaveLength(1);
    service.dispose(); expect(vi.getTimerCount()).toBe(0);
  });

  it('settles confirmations once, including cancellation and replacement', () => {
    const service = new UiConfirmationService(); const accept = vi.fn(); const reject = vi.fn();
    service.confirm({ message: 'First', accept, reject }); service.resolve(false); service.resolve(false);
    expect(reject).toHaveBeenCalledOnce(); expect(accept).not.toHaveBeenCalled();
    service.confirm({ message: 'Second', accept, reject });
    service.confirm({ message: 'Third', accept, reject }); service.resolve(true);
    expect(reject).toHaveBeenCalledTimes(2); expect(accept).toHaveBeenCalledOnce();
  });
});
