import { NgZone } from '@angular/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PageScrollLockService } from './page-scroll-lock.service';

/**
 * The suite runs in plain Node (see vitest.config.ts) and jsdom is not a dependency, so the
 * handful of DOM pieces the service actually touches are stood up by hand: an element tree
 * with a parent chain and a connectedness flag, `getComputedStyle` for the overflow read,
 * and a document that collects listeners so a gesture can be delivered to them.
 */
interface FakeElement {
  parentElement: FakeElement | null;
  isConnected: boolean;
  scrollHeight: number;
  clientHeight: number;
  overflowY: string;
}

function element(overrides: Partial<FakeElement> = {}): FakeElement {
  return { parentElement: null, isConnected: true, scrollHeight: 0, clientHeight: 0, overflowY: 'visible', ...overrides };
}

/** An element the browser would hand a wheel gesture to — a picker's list, a dialog's body. */
function scroller(): FakeElement {
  return element({ scrollHeight: 500, clientHeight: 100, overflowY: 'auto' });
}

const page = element();
const listeners = new Map<string, Set<(event: unknown) => void>>();

/** Delivers a wheel gesture the way the browser would, and says whether it was suppressed. */
function wheelOn(target: FakeElement | null): boolean {
  let prevented = false;
  const event = { target, preventDefault: () => (prevented = true) };
  [...(listeners.get('wheel') ?? [])].forEach((listener) => listener(event));

  return prevented;
}

const zone = { runOutsideAngular: <T>(fn: () => T): T => fn() } as NgZone;

let service: PageScrollLockService;

beforeEach(() => {
  listeners.clear();
  globalThis.document = {
    scrollingElement: page,
    addEventListener: (type: string, listener: (event: unknown) => void) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)?.add(listener);
    },
    removeEventListener: (type: string, listener: (event: unknown) => void) => {
      listeners.get(type)?.delete(listener);
    },
  } as unknown as Document;
  globalThis.getComputedStyle = ((el: FakeElement) => ({ overflowY: el.overflowY })) as unknown as typeof getComputedStyle;

  service = new PageScrollLockService(zone);
});

afterEach(() => {
  delete (globalThis as { document?: unknown }).document;
  delete (globalThis as { getComputedStyle?: unknown }).getComputedStyle;
});

/** Stands in for a panel's root element, the thing a lock is held for. */
function panel(): FakeElement {
  return element();
}

describe('PageScrollLockService', () => {
  it('suppresses a gesture aimed at the page only while a panel is open', () => {
    expect(wheelOn(page)).toBe(false);

    const open = panel();
    service.lock(open as unknown as Element);
    expect(wheelOn(page)).toBe(true);

    service.unlock(open as unknown as Element);
    expect(wheelOn(page)).toBe(false);
  });

  it('lets a gesture that belongs to a scroller of its own through', () => {
    service.lock(panel() as unknown as Element);

    const list = scroller();
    const rowInsideTheList = element({ parentElement: list });

    expect(wheelOn(list)).toBe(false);
    expect(wheelOn(rowInsideTheList)).toBe(false);
  });

  it('stays locked until the last of two nested panels releases', () => {
    const dialog = panel();
    const pickerInsideIt = panel();

    service.lock(dialog as unknown as Element);
    service.lock(pickerInsideIt as unknown as Element);

    service.unlock(pickerInsideIt as unknown as Element);
    expect(wheelOn(page)).toBe(true);

    service.unlock(dialog as unknown as Element);
    expect(wheelOn(page)).toBe(false);
  });

  // The report this was written for: card GgGPCGQUNQGRWZthqfS2, "Scroll na página não
  // funciona". A PrimeNG picker destroyed while its panel is open never raises
  // onBeforeHide — the event comes from the leave animation, which a destroyed component
  // never plays — so the release simply never arrives.
  it('releases a lock whose panel left the document without saying so', () => {
    const destroyedWhileOpen = panel();
    service.lock(destroyedWhileOpen as unknown as Element);
    expect(wheelOn(page)).toBe(true);

    destroyedWhileOpen.isConnected = false;

    expect(wheelOn(page)).toBe(false);
    // And the listeners are gone with it, rather than being left to answer every gesture.
    expect(listeners.get('wheel')?.size ?? 0).toBe(0);
  });

  it('keeps a live panel locked when a dead one beside it is reclaimed', () => {
    const stillOpen = panel();
    const destroyedWhileOpen = panel();

    service.lock(stillOpen as unknown as Element);
    service.lock(destroyedWhileOpen as unknown as Element);
    destroyedWhileOpen.isConnected = false;

    expect(wheelOn(page)).toBe(true);
  });

  it("does not let one panel release another panel's lock", () => {
    const open = panel();
    service.lock(open as unknown as Element);

    service.unlock(panel() as unknown as Element);

    expect(wheelOn(page)).toBe(true);
  });

  it('releases once when the same panel is released twice', () => {
    const outer = panel();
    const inner = panel();
    service.lock(outer as unknown as Element);
    service.lock(inner as unknown as Element);

    service.unlock(inner as unknown as Element);
    service.unlock(inner as unknown as Element);

    expect(wheelOn(page)).toBe(true);
  });

  it('ignores a release with no lock behind it', () => {
    expect(() => service.unlock()).not.toThrow();
    expect(() => service.unlock(panel() as unknown as Element)).not.toThrow();
    expect(wheelOn(page)).toBe(false);
  });

  it('pairs an unnamed release with an unnamed lock', () => {
    service.lock();
    expect(wheelOn(page)).toBe(true);

    service.unlock();
    expect(wheelOn(page)).toBe(false);
  });
});
