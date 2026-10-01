import { ComponentPortal, Overlay, OverlayRef } from 'src/app/ui/overlay';
import { Injectable, Injector } from '@angular/core';
import { Observable, Subject, take } from 'rxjs';
import { ItemPickerOverlayComponent } from './item-picker-overlay.component';
import { PickerRequest, PickerResult } from './item-picker.model';
import { UiOverlayService } from 'src/app/ui/overlay.service';

/**
 * Opens the chip picker.
 *
 * The panel has to flip above the chip when it does
 * not fit below and then clamp inside the viewport, which `ConnectedPositionStrategy`
 * expresses directly. The bottom-most shadow card is the case that needs it.
 */
@Injectable({ providedIn: 'root' })
export class ItemPickerService {
  private ref?: OverlayRef;

  constructor(
    private readonly overlay: Overlay,
    private readonly injector: Injector,
    private readonly layers: UiOverlayService,
  ) {}

  /** Emits once — the pick, or a dismissal — and completes. */
  open(request: PickerRequest): Observable<PickerResult> {
    this.close();

    const result = new Subject<PickerResult>();
    const ref = this.overlay.create({
      hasBackdrop: true,
      backdropClass: 'ui-overlay-transparent-backdrop',
      // The page behind the panel holds still rather than scrolling out from under it, so
      // the chip this is anchored to cannot move — but through PageScrollLockService, which
      // suppresses the wheel instead of pinning <html> and displacing description popovers.
      positionStrategy: this.overlay
        .position()
        .flexibleConnectedTo(request.anchor)
        .withPositions([
          { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
          { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
          { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 4 },
          { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -4 },
        ])
        .withViewportMargin(8),
    });

    this.ref = ref;
    const instance = ref.attach(new ComponentPortal(ItemPickerOverlayComponent, this.injector)).instance;
    instance.init(request);
    this.layers.adopt(ref, () => this.close(), true, request.anchor);

    // Disposing the overlay makes it emit a detachment, which would re-enter finish and
    // overwrite the pick with a dismissal. One latch settles the race whichever way the
    // panel closes: a pick, the backdrop, or disposal.
    let settled = false;
    const finish = (value: PickerResult) => {
      if (settled) return;
      settled = true;
      this.close();
      result.next(value);
      result.complete();
    };

    instance.closed.pipe(take(1)).subscribe(finish);
    ref.backdropClick().pipe(take(1)).subscribe(() => finish({ committed: false }));
    ref
      .detachments()
      .pipe(take(1))
      .subscribe(() => finish({ committed: false }));

    return result.asObservable();
  }

  close(): void {
    const ref = this.ref;
    if (!ref) return;

    // Cleared before disposing, not after: disposing emits a detachment, `finish` answers it
    // by calling back in here, and a `this.ref` still set at that point would run the whole
    // body a second time — releasing the page scroll twice for the one panel.
    this.ref = undefined;
    this.layers.close(ref);
  }
}
