import { alignPopover } from '../../react/ui/popover-position';
import { Events } from '../../react/services/events';
import { describe, expect, it, vi } from 'vitest';

function setup() {
  const positions = new Events<{ connectionPair: { overlayY: string } }>();
  const ownerDocument = new EventTarget();
  const style = { visibility: '', setProperty: vi.fn() };
  const classList = { toggle: vi.fn() };
  const container = { style, classList, clientLeft: 1, clientWidth: 498, getBoundingClientRect: () => ({ left: 100, width: 500 }) };
  const target = { ownerDocument, isConnected: true, focus: vi.fn(), getBoundingClientRect: () => ({ left: 520, width: 40 }) } as unknown as HTMLElement;
  const layers = { close: vi.fn(), isOutside: vi.fn(() => true) };
  let subscription: { unsubscribe(): void };
  let active = false;
  const scroll = () => { if (layers.isOutside()) popover.hide(); };
  const popover = {
    show(_event?: Event) {
      active = true;
      subscription = positions.subscribe(event => alignPopover(container as unknown as HTMLElement, target, event.connectionPair as any));
      positions.next({ connectionPair: { overlayY: 'top' } });
      ownerDocument.addEventListener('scroll', scroll, true);
    },
    hide() { if (!active) return; active = false; subscription.unsubscribe(); ownerDocument.removeEventListener('scroll', scroll, true); layers.close(); }
  };
  const show = () => popover.show({ currentTarget: target } as unknown as Event);
  return { popover, show, target, ownerDocument, layers, positions, style, classList };
}

describe('popover positioning and scrolling', () => {
  it('points at the trigger when first opened, including a panel pushed to the left', () => {
    const { show, style, classList } = setup();
    show();
    expect(style.setProperty).toHaveBeenLastCalledWith('--overlayArrowLeft', '439px');
    expect(classList.toggle).toHaveBeenLastCalledWith('ui-overlaypanel-flipped', false);
  });

  it.each([{ left: 60, arrow: '14px' }, { left: 590, arrow: '484px' }])(
    'keeps the arrow base clear of the rounded corner for a trigger at $left', ({ left, arrow }) => {
      const { show, target, style } = setup();
      vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({ left, width: 40 } as DOMRect);
      show();
      expect(style.setProperty).toHaveBeenLastCalledWith('--overlayArrowLeft', arrow);
    },
  );

  it('moves the arrow to the bottom when the connected position flips above the trigger', () => {
    const { popover, show, positions, classList } = setup();
    show();
    positions.next({ connectionPair: { overlayY: 'bottom' } });
    expect(classList.toggle).toHaveBeenLastCalledWith('ui-overlaypanel-flipped', true);
    popover.hide();
    classList.toggle.mockClear();
    positions.next({ connectionPair: { overlayY: 'top' } });
    expect(classList.toggle).not.toHaveBeenCalled();
  });

  it('dismisses on outside scrolling and releases its listener without moving focus', () => {
    const { show, ownerDocument, layers, target } = setup();
    show();
    layers.close.mockClear();
    ownerDocument.dispatchEvent(new Event('scroll'));
    expect(layers.close).toHaveBeenCalledOnce();
    expect(target.focus).not.toHaveBeenCalled();
    ownerDocument.dispatchEvent(new Event('scroll'));
    expect(layers.close).toHaveBeenCalledOnce();
  });

  it('allows scrolling within the popover and its nested overlays', () => {
    const { show, ownerDocument, layers } = setup();
    show();
    layers.close.mockClear();
    layers.isOutside.mockReturnValue(false);
    ownerDocument.dispatchEvent(new Event('scroll'));
    expect(layers.close).not.toHaveBeenCalled();
  });
});
