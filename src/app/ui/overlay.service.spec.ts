import '@angular/compiler';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { PageScrollLockService } from '../page-scroll-lock.service';
import { OverlayEscapeService } from './overlay-escape.service';
import { UiOverlayService } from './overlay.service';

function layer() {
  const detach = new Subject<void>();
  const descendants = new Set<unknown>();
  const element = { style: {}, contains: (node: unknown) => descendants.has(node) };
  let attached = true;
  const ref = {
    overlayElement: element, hostElement: { style: {}, classList: { add: vi.fn() } }, backdropElement: { style: {} },
    hasAttached: () => attached,
    detachments: () => detach,
    dispose: vi.fn(() => { attached = false; detach.next(); detach.complete(); }),
  } as unknown as OverlayRef;
  return { ref, descendants, detach };
}

describe('overlay lifecycle', () => {
  function setup() {
    const held = new Set<Element>();
    const scroll = { lock: vi.fn(owner => held.add(owner)), unlock: vi.fn(owner => held.delete(owner)) };
    const unregister = vi.fn();
    const escapes = { register: vi.fn(() => unregister) };
    const service = new UiOverlayService({} as Overlay, scroll as unknown as PageScrollLockService, escapes as unknown as OverlayEscapeService);
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
    const trigger = {} as HTMLElement; const hover = {} as HTMLElement;
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
    const trigger = {} as HTMLElement; parent.descendants.add(trigger);
    const cancelEdit = vi.fn();
    service.adopt(parent.ref, () => service.close(parent.ref));
    service.adopt(child.ref, () => service.close(child.ref), true, trigger, cancelEdit);
    escapes.register.mock.calls[1][0].dismiss();
    expect(cancelEdit).toHaveBeenCalledOnce(); expect(held.size).toBe(2);
    service.close(parent.ref);
    expect(child.ref.dispose).toHaveBeenCalledOnce(); expect(held.size).toBe(0);
  });
});
