import { useSyncExternalStore } from 'react';
import './touch-controls.css';

const touchQuery = '(hover: none), (pointer: coarse)';
export function usesTouchInput(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.(touchQuery).matches;
}
function subscribe(listener: () => void): () => void {
  if (!window.matchMedia) return () => {};
  const query = window.matchMedia(touchQuery);
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
}
/** Input capability also applies to a wide tablet or a hybrid device. */
export function useTouchInput(): boolean {
  return useSyncExternalStore(subscribe, usesTouchInput, () => false);
}
export function needsCompactOverlay(): boolean {
  return typeof window !== 'undefined' && (window.innerWidth < 1536 || usesTouchInput());
}
