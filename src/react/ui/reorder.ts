import { PointerEvent as ReactPointerEvent, useEffect, useRef } from 'react';

export interface ReorderEvent { previousIndex: number; currentIndex: number; }
export function moveItemInArray<T>(items: T[], from: number, to: number): void {
  if (from === to) return;
  const [item] = items.splice(from, 1); items.splice(to, 0, item);
}
/** Restore the original DOM before publishing so React reconciles its own keyed rows. */
function startReorder(host: HTMLElement, event: PointerEvent, index: number,
  onReordered: (event: ReorderEvent) => void, onStopped: () => void): (() => void) | undefined {
    const row = host.closest<HTMLElement>('.rot-row');
    if (!row) return undefined;
    const parent = row.parentElement!;
    const originalNext = row.nextSibling;
    const previousIndex = index;
    const rect = row.getBoundingClientRect();
    let preview: HTMLElement | undefined;
    let y = event.clientY;
    let frame = 0;
    const rows = () => Array.from(parent.children).filter(el => el !== preview && el.classList.contains('rot-row')) as HTMLElement[];
    const place = () => {
      if (!preview) return;
      preview.style.top = `${y - (event.clientY - rect.top)}px`;
      const siblings = rows().filter(el => el !== row);
      const before = siblings.find(el => { const bounds = el.getBoundingClientRect(); return y < bounds.top + bounds.height / 2; });
      parent.insertBefore(row, before ?? preview);
    };
    const scroll = () => {
      if (!preview) return;
      const delta = y < 48 ? -12 : y > window.innerHeight - 48 ? 12 : 0;
      if (delta) { window.scrollBy(0, delta); place(); }
      frame = requestAnimationFrame(scroll);
    };
    const move = (next: PointerEvent) => {
      if (next.pointerId !== event.pointerId) return;
      y = next.clientY;
      if (!preview && Math.hypot(next.clientX - event.clientX, y - event.clientY) < 5) return;
      next.preventDefault();
      if (!preview) {
        preview = row.cloneNode(true) as HTMLElement;
        preview.removeAttribute('id'); preview.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
        preview.setAttribute('aria-hidden', 'true'); preview.setAttribute('inert', '');
        preview.classList.add('ui-drag-preview');
        Object.assign(preview.style, { position: 'fixed', left: `${rect.left}px`, width: `${rect.width}px`, margin: '0', pointerEvents: 'none', zIndex: '2000' });
        parent.append(preview); row.classList.add('ui-drag-placeholder');
        parent.classList.add('ui-dragging'); frame = requestAnimationFrame(scroll);
      }
      place();
    };
    const finish = (commit = false) => {
      const currentIndex = rows().indexOf(row);
      const dragged = !!preview;
      cancelAnimationFrame(frame); preview?.remove();
      row.classList.remove('ui-drag-placeholder'); parent.classList.remove('ui-dragging');
      parent.insertBefore(row, originalNext?.parentNode === parent ? originalNext : null);
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', cancel);
      document.removeEventListener('keydown', key, true);
      window.removeEventListener('blur', cancel);
      onStopped();
      if (commit && dragged && previousIndex !== currentIndex) onReordered({ previousIndex, currentIndex });
    };
    const up = (next: PointerEvent) => { if (next.pointerId === event.pointerId) finish(true); };
    const cancel = () => finish();
    const key = (next: KeyboardEvent) => { if (next.key === 'Escape') { next.preventDefault(); next.stopPropagation(); finish(); } };

    document.addEventListener('pointermove', move, { passive: false });
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', cancel);
    document.addEventListener('keydown', key, true);
    window.addEventListener('blur', cancel);
    return cancel;
}

export function useReorder(index: number, onReordered: (event: ReorderEvent) => void, disabled = false) {
  const stop = useRef<(() => void) | undefined>(undefined);
  const callback = useRef(onReordered); callback.current = onReordered;
  useEffect(() => () => stop.current?.(), []);
  useEffect(() => { if (disabled) stop.current?.(); }, [disabled]);
  return (event: ReactPointerEvent<HTMLElement>) => {
    if (disabled || event.button !== 0) return;
    stop.current?.();
    stop.current = startReorder(event.currentTarget, event.nativeEvent, index,
      next => callback.current(next), () => { stop.current = undefined; });
  };
}
