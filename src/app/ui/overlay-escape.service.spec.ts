import { afterEach, describe, expect, it, vi } from 'vitest';
import { LayerManager } from '../../react/ui/layers';

describe('owned overlay Escape stack', () => {
  afterEach(() => vi.unstubAllGlobals());

  function setup() {
    const document = new EventTarget();
    vi.stubGlobal('document', document);
    const manager = new LayerManager();
    const dismissed = vi.fn();
    const service = {
      register: (layer: { isOpen: () => boolean; dismiss: () => void }) => manager.register({
        get isConnected() { return layer.isOpen(); }, parentElement: { style: {}, classList: { add: vi.fn() } },
      } as unknown as HTMLElement, null, () => { dismissed(); layer.dismiss(); }, false),
      dispose: () => manager.dispose(),
    };
    const escape = () => {
      const event = new Event('keydown', { cancelable: true });
      Object.defineProperty(event, 'key', { value: 'Escape' });
      document.dispatchEvent(event);
      return event;
    };
    return { document, service, escape, dismissed };
  }

  it('closes only the most recently opened overlay and consumes the event', () => {
    const { service, escape } = setup();
    const parent = { isOpen: () => true, dismiss: vi.fn() };
    const child = { isOpen: () => true, dismiss: vi.fn() };
    service.register(parent);
    const unregister = service.register(child);
    expect(escape().defaultPrevented).toBe(true);
    expect(child.dismiss).toHaveBeenCalledOnce();
    expect(parent.dismiss).not.toHaveBeenCalled();
    unregister();
    escape();
    expect(parent.dismiss).toHaveBeenCalledOnce();
    service.dispose();
  });

  it('ignores detached overlays and releases the only listener after the last close', () => {
    const { document, service, escape, dismissed } = setup();
    const remove = vi.spyOn(document, 'removeEventListener');
    const unregister = service.register({ isOpen: () => false, dismiss: vi.fn() });
    expect(escape().defaultPrevented).toBe(false);
    expect(dismissed).not.toHaveBeenCalled();
    unregister();
    expect(remove).toHaveBeenCalledOnce();
    expect(escape().defaultPrevented).toBe(false);
  });

  it('removes listeners on destruction, and does not cascade past a nondismissible top layer', () => {
    const { service, escape } = setup();
    const parent = { isOpen: () => true, dismiss: vi.fn() };
    service.register(parent);
    service.register({ isOpen: () => true, dismiss: () => undefined });
    escape();
    expect(parent.dismiss).not.toHaveBeenCalled();
    service.dispose();
    expect(escape().defaultPrevented).toBe(false);
  });
});
