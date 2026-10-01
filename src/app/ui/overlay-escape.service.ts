import { Injectable, NgZone, OnDestroy } from '@angular/core';

export interface DismissibleOverlay {
  isOpen(): boolean;
  dismiss(event: KeyboardEvent): void;
}

/** One capture listener, present only while overlays are registered. Registration
 * order is also visual stacking order (assigned by UiOverlayService). */
@Injectable({ providedIn: 'root' })
export class OverlayEscapeService implements OnDestroy {
  private readonly overlays = new Set<DismissibleOverlay>();
  private unlisten?: () => void;

  constructor(private readonly zone: NgZone) {}

  register(overlay: DismissibleOverlay): () => void {
    this.overlays.add(overlay);
    if (!this.unlisten) this.zone.runOutsideAngular(() => {
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== 'Escape') return;
        const top = [...this.overlays].reverse().find(entry => entry.isOpen());
        if (!top) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        this.zone.run(() => top.dismiss(event));
      };
      document.addEventListener('keydown', onKeyDown, true);
      this.unlisten = () => document.removeEventListener('keydown', onKeyDown, true);
    });
    return () => {
      this.overlays.delete(overlay);
      if (!this.overlays.size) this.stopListening();
    };
  }

  private stopListening(): void { this.unlisten?.(); this.unlisten = undefined; }
  ngOnDestroy(): void { this.overlays.clear(); this.stopListening(); }
}
