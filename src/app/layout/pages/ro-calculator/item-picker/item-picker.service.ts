import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Injectable, Injector } from '@angular/core';
import { Observable, Subject, take } from 'rxjs';
import { ItemPickerOverlayComponent } from './item-picker-overlay.component';
import { PickerRequest, PickerResult } from './item-picker.model';

/**
 * Opens the chip picker.
 *
 * A CDK overlay rather than PrimeNG's: the panel has to flip above the chip when it does
 * not fit below and then clamp inside the viewport, which `FlexibleConnectedPositionStrategy`
 * expresses directly. The bottom-most shadow card is the case that needs it.
 */
@Injectable({ providedIn: 'root' })
export class ItemPickerService {
  private ref?: OverlayRef;

  constructor(
    private readonly overlay: Overlay,
    private readonly injector: Injector,
  ) {}

  /** Emits once — the pick, or a dismissal — and completes. */
  open(request: PickerRequest): Observable<PickerResult> {
    this.close();

    const result = new Subject<PickerResult>();
    const ref = this.overlay.create({
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-transparent-backdrop',
      // autoClose so scrolling the page away from the chip takes the panel with it,
      // which is what the dropdown it replaces did.
      scrollStrategy: this.overlay.scrollStrategies.reposition({ autoClose: true }),
      positionStrategy: this.overlay
        .position()
        .flexibleConnectedTo(request.anchor)
        .withPositions([
          { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
          { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
          { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 4 },
          { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -4 },
        ])
        .withPush(true)
        .withViewportMargin(8)
        .withFlexibleDimensions(false),
    });

    this.ref = ref;

    const instance = ref.attach(new ComponentPortal(ItemPickerOverlayComponent, null, this.injector)).instance;
    instance.init(request);

    // Disposing the overlay makes it emit a detachment, which would re-enter finish and
    // overwrite the pick with a dismissal. One latch settles the race whichever way the
    // panel closes: a pick, the backdrop, or the scroll strategy detaching it.
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
    this.ref?.dispose();
    this.ref = undefined;
  }
}
