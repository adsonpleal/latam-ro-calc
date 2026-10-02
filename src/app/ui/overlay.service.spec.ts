import { afterEach, describe, expect, it, vi } from 'vitest';
import { LayerManager } from '../../react/ui/layers';
import { Events } from '../../react/services/events';
afterEach(() => vi.unstubAllGlobals());
function layer() {
  const detach = new Events<void>();
  const descendants = new Set<unknown>();
  const element = { isConnected: true, parentElement: { style: {}, classList: { add: vi.fn() } }, style: {}, contains: (node: unknown) => descendants.has(node) };
  let attached = true;
  const ref = {
    overlayElement: element, hostElement: { style: {}, classList: { add: vi.fn() } }, backdropElement: { style: {} },
    hasAttached: () => attached,
    detachments: () => detach,
    dispose: vi.fn(() => { attached = false; detach.next();  }),
  } as any;
  return { ref, descendants, detach };
}

describe('overlay lifecycle', () => {
  function setup() {
    const held = new Set<Element>();
    const scroll = { lock: vi.fn(owner => held.add(owner)), unlock: vi.fn(owner => held.delete(owner)) };
    vi.stubGlobal('document', new EventTarget());
    const manager = new LayerManager();
    vi.spyOn(manager.scrollLocks, 'lock').mockImplementation(scroll.lock);
    vi.spyOn(manager.scrollLocks, 'unlock').mockImplementation(scroll.unlock);
    const unregister = vi.fn();
    const escapes = { register: vi.fn() };
    const releases = new Map<any, () => void>();
    const service = {
      adopt(ref: any, close: () => void, lock = true, origin?: HTMLElement, escape = close) {
        escapes.register({ dismiss: escape });
        const release = manager.register(ref.overlayElement, origin ?? null, close, lock, escape);
        const detach = ref.detachments().subscribe(() => {
          const active = releases.get(ref); if (active) { releases.delete(ref); active(); }
        });
        releases.set(ref, () => { detach.unsubscribe(); release(); unregister(); });
      },
      close(ref: any) {
        const release = releases.get(ref); if (!release) return;
        releases.delete(ref); release(); ref.dispose();
      },
      isOutside(ref: any, event: MouseEvent) { return manager.isOutside(ref.overlayElement, event.target); }
    };
    return { service, held, scroll, unregister, escapes };
  }

  it('keeps the parent scroll lock when closing a nested picker', () => {
    const { service, held, scroll } = setup();
    const parent = layer(); const child = layer();
    service.adopt(parent.ref, () => service.close(parent.ref));
    service.adopt(child.ref, () => service.close(child.ref));
    expect(held.size).toBe(2);
    service.close(child.ref);
    expect(held.has(parent.ref.overlayElement)).toBe(true);
    expect(held.size).toBe(1);
    service.close(parent.ref);
    expect(held.size).toBe(0);
    expect(scroll.unlock).toHaveBeenCalledTimes(2);
  });

  it('destroys anchored descendants before releasing a parent, including tooltips without locks', () => {
    const { service, held, unregister } = setup();
    const parent = layer(); const child = layer(); const tooltip = layer();
    const trigger = { tagName: 'BUTTON', classList: [], parentElement: null } as unknown as HTMLElement; const hover = { tagName: 'BUTTON', classList: [], parentElement: null } as unknown as HTMLElement;
    parent.descendants.add(trigger); child.descendants.add(hover);
    service.adopt(parent.ref, () => service.close(parent.ref));
    service.adopt(child.ref, () => service.close(child.ref), true, trigger);
    service.adopt(tooltip.ref, () => service.close(tooltip.ref), false, hover);
    service.close(parent.ref);
    expect(child.ref.dispose).toHaveBeenCalledOnce();
    expect(tooltip.ref.dispose).toHaveBeenCalledOnce();
    expect(held.size).toBe(0);
    expect(unregister).toHaveBeenCalledTimes(3);
  });

  it('releases a directly detached portal and distinguishes child clicks from outside clicks', () => {
    const { service, held, scroll } = setup();
    const parent = layer(); const child = layer();
    const target = {} as Node;
    child.descendants.add(target);
    service.adopt(parent.ref, () => service.close(parent.ref));
    service.adopt(child.ref, () => service.close(child.ref));
    expect(service.isOutside(parent.ref, { target } as MouseEvent)).toBe(false);
    expect(service.isOutside(parent.ref, { target: {} } as MouseEvent)).toBe(true);
    child.ref.dispose();
    service.close(child.ref);
    expect(scroll.unlock).toHaveBeenCalledOnce();
    expect(held.size).toBe(1);
    service.close(parent.ref);
  });

  it('destroys children even when Escape only cancels their inline editing', () => {
    const { service, held, escapes } = setup();
    const parent = layer(); const child = layer();
    const trigger = { tagName: 'BUTTON', classList: [], parentElement: null } as unknown as HTMLElement; parent.descendants.add(trigger);
    const cancelEdit = vi.fn();
    service.adopt(parent.ref, () => service.close(parent.ref));
    service.adopt(child.ref, () => service.close(child.ref), true, trigger, cancelEdit);
    escapes.register.mock.calls[1][0].dismiss();
    expect(cancelEdit).toHaveBeenCalledOnce(); expect(held.size).toBe(2);
    service.close(parent.ref);
    expect(child.ref.dispose).toHaveBeenCalledOnce(); expect(held.size).toBe(0);
  });
});
