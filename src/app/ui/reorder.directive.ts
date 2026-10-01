import { Directive, ElementRef, EventEmitter, HostListener, Input, OnDestroy, Output } from '@angular/core';

export function moveItemInArray<T>(items: T[], from: number, to: number): void {
  if (from === to) return;
  const [item] = items.splice(from, 1); items.splice(to, 0, item);
}
@Directive({ selector: '[appReorder]' })
export class ReorderDirective implements OnDestroy {
  @Input() appReorder = 0;
  @Input() reorderDisabled = false;
  @Output() reordered = new EventEmitter<{ previousIndex: number; currentIndex: number }>();
  private stop?: () => void;
  constructor(private readonly host: ElementRef<HTMLElement>) {}
  @HostListener('pointerdown', ['$event']) start(event: PointerEvent): void {
    if (this.reorderDisabled || event.button !== 0) return;
    this.stop?.();
    const row = this.host.nativeElement.closest<HTMLElement>('.rot-row');
    if (!row) return;
    const parent = row.parentElement!;
    const originalNext = row.nextSibling;
    const previousIndex = this.appReorder;
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
      this.stop = undefined;
      if (commit && dragged && previousIndex !== currentIndex) this.reordered.emit({ previousIndex, currentIndex });
    };
    const up = (next: PointerEvent) => { if (next.pointerId === event.pointerId) finish(true); };
    const cancel = () => finish();
    const key = (next: KeyboardEvent) => { if (next.key === 'Escape') { next.preventDefault(); next.stopPropagation(); finish(); } };
    this.stop = cancel;
    document.addEventListener('pointermove', move, { passive: false });
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', cancel);
    document.addEventListener('keydown', key, true);
    window.addEventListener('blur', cancel);
  }
  ngOnDestroy(): void { this.stop?.(); }
}
