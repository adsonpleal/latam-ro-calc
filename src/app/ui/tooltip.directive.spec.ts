import '@angular/compiler';
import { ElementRef } from '@angular/core';
import { Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UiOverlayService } from './overlay.service';
import { UiTooltipDirective } from './tooltip.directive';

class ElementStub extends EventTarget {
  ownerDocument = new EventTarget();
  contains(node: unknown) { return node === this; }
  isConnected = true;
  id = '';
  offsetHeight = 780;
  getBoundingClientRect() { return { height: 780.25 }; }
  attributes = new Map<string, string>();
  classList = { add: vi.fn(), remove: vi.fn() };
  setAttribute(key: string, value: string) { this.attributes.set(key, value); }
  getAttribute(key: string) { return this.attributes.get(key) ?? null; }
  removeAttribute(key: string) { this.attributes.delete(key); }
}

describe('hoverable descriptions', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function setup() {
    const host = new ElementStub(); const panel = new ElementStub();
    const ref = { overlayElement: panel, attach: () => ({ instance: {}, changeDetectorRef: { detectChanges: vi.fn() } }), updatePosition: vi.fn() };
    const layers = { connected: () => ({ positionChanges: new Subject() }), overlay: { create: vi.fn(() => ref), scrollStrategies: { reposition: vi.fn() } }, adopt: vi.fn(), close: vi.fn() };
    const tooltip = new UiTooltipDirective(new ElementRef(host as unknown as HTMLElement), layers as unknown as UiOverlayService);
    tooltip.text = 'Descrição'; tooltip.tooltipStyleClass = 'item_desc_tooltip'; tooltip.showDelay = 300;
    const show = () => { tooltip.activate(); vi.advanceTimersByTime(300); };
    return { host, panel, layers, tooltip, show };
  }

  it('cancels a delayed show when the trigger is left before the delay', () => {
    const { tooltip, layers } = setup();
    tooltip.activate(); vi.advanceTimersByTime(100); tooltip.deactivate(); vi.runAllTimers();
    expect(layers.overlay.create).not.toHaveBeenCalled();
  });

  it('allows the pointer to cross into the description and scroll until it leaves', () => {
    const { tooltip, layers, panel, show } = setup();
    show(); tooltip.deactivate(); vi.advanceTimersByTime(100);
    panel.dispatchEvent(new Event('mouseenter')); vi.advanceTimersByTime(1000);
    expect(layers.close).not.toHaveBeenCalled();
    panel.dispatchEvent(new Event('mouseleave')); vi.advanceTimersByTime(150);
    expect(layers.close).toHaveBeenCalledOnce();
  });

  it('cancels closing when returning to the trigger; Escape closes immediately', () => {
    const { tooltip, layers, show } = setup();
    show(); tooltip.deactivate(); tooltip.activate(); vi.advanceTimersByTime(1000);
    expect(layers.close).not.toHaveBeenCalled();
    layers.adopt.mock.calls[0][1]();
    expect(layers.close).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
  });

  it('releases the portal, handlers and pending timers on destruction, preserving other descriptions', () => {
    const { tooltip, layers, host, panel, show } = setup();
    host.setAttribute('aria-describedby', 'existing-description'); show(); tooltip.deactivate(); tooltip.ngOnDestroy();
    expect(layers.close).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
    expect(host.getAttribute('aria-describedby')).toBe('existing-description');
    panel.dispatchEvent(new Event('mouseleave')); expect(vi.getTimerCount()).toBe(0);
  });

  it('does not open a disabled or detached trigger', () => {
    const { tooltip, layers, host, show } = setup();
    tooltip.tooltipDisabled = true; show(); tooltip.tooltipDisabled = false; host.isConnected = false; show();
    expect(layers.overlay.create).not.toHaveBeenCalled();
  });

  it('dismisses on outside scrolling and removes the scroll listener when closed', () => {
    const { host, tooltip, layers, show } = setup();
    show();
    host.ownerDocument.dispatchEvent(new Event('scroll'));
    expect(layers.close).toHaveBeenCalledOnce();
    host.ownerDocument.dispatchEvent(new Event('scroll'));
    expect(layers.close).toHaveBeenCalledOnce();
    tooltip.ngOnDestroy();
  });

  it('keeps the tooltip open when its description is scrolled', () => {
    const { host, panel, layers, show } = setup();
    const listen = vi.spyOn(host.ownerDocument, 'addEventListener');
    show();
    const onScroll = listen.mock.calls.find(([name]) => name === 'scroll')![1] as EventListener;
    onScroll({ target: panel } as unknown as Event);
    expect(layers.close).not.toHaveBeenCalled();
  });
});
