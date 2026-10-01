import '@angular/compiler';
import { describe, expect, it } from 'vitest';
import { ConnectedPositionStrategy } from './overlay';

function setup(anchor: { left: number; top: number; width: number; height: number }, width = 320, height = 200, viewportWidth = 800, viewportHeight = 600) {
  const origin = { getBoundingClientRect: () => anchor, ownerDocument: { defaultView: { innerWidth: viewportWidth, innerHeight: viewportHeight } } } as unknown as HTMLElement;
  const panel = { style: {}, getBoundingClientRect: () => ({ width, height }) } as unknown as HTMLElement;
  const strategy = new ConnectedPositionStrategy(origin).withPositions([
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
  ]);
  return { panel, strategy };
}
describe('connected overlay positioning', () => {
  it('flips above a low anchor and follows later anchor movement', () => {
    const anchor = { left: 100, top: 500, width: 80, height: 30 };
    const { panel, strategy } = setup(anchor);
    strategy.apply(panel);
    expect(panel.style.top).toBe('296px'); expect(panel.style.left).toBe('100px');
    anchor.top = 50; strategy.apply(panel);
    expect(panel.style.top).toBe('84px');
  });
  it('chooses the vertically fitting fallback even when both require horizontal clamping', () => {
    const { panel, strategy } = setup({ left: 280, top: 500, width: 80, height: 30 }, 320, 200, 390);
    strategy.apply(panel);
    expect(panel.style.top).toBe('296px'); expect(panel.style.left).toBe('62px');
  });
  it('clamps panels larger than the viewport and reports the selected connection', () => {
    const { panel, strategy } = setup({ left: 0, top: 50, width: 80, height: 30 }, 900, 900);
    const positions: string[] = [];
    strategy.positionChanges.subscribe(change => positions.push(change.connectionPair.overlayY));
    strategy.apply(panel);
    expect(panel.style.left).toBe('8px'); expect(panel.style.top).toBe('8px');
    expect(positions).toEqual(['top']);
  });
});
