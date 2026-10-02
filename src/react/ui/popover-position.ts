import { ConnectedPosition } from './layers';
export function alignPopover(container: HTMLElement, anchor: HTMLElement, position: Pick<ConnectedPosition, 'overlayY'>): void {
  container.classList.toggle('ui-overlaypanel-flipped', position.overlayY === 'bottom');
  const rect = container.getBoundingClientRect();
  const origin = anchor.getBoundingClientRect();
  const requested = origin.left + origin.width / 2 - rect.left - container.clientLeft;
  container.style.setProperty('--overlayArrowLeft', `${Math.max(14, Math.min(Math.max(14, container.clientWidth - 14), requested))}px`);
  container.style.visibility = 'visible';
}
