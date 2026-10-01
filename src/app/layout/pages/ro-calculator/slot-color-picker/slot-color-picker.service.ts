import { ComponentPortal, Overlay, OverlayRef } from 'src/app/ui/overlay';
import { Injectable, Injector } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { SlotColorLabels } from 'src/app/core/slot-colors';
import { UiOverlayService } from 'src/app/ui/overlay.service';
import { SlotColorPickerComponent } from './slot-color-picker.component';
import { SlotColorPickerEvent, SlotColorPickerRequest } from './slot-color-picker.model';

/**
 * Opens the slot-colour panel, anchored to the swatch in a card's header.
 *
 * Same overlay setup as {@link ItemPickerService} — a position that flips above the
 * button when it will not fit below, a transparent backdrop, and the page held still
 * through PageScrollLockService without displacing item-description popovers.
 */
@Injectable({ providedIn: 'root' })
export class SlotColorPickerService {
  /**
   * The two values that belong to the browser rather than to the build: what this person
   * calls each colour, and whether they have found the button yet.
   *
   * Held here rather than passed down as grid inputs. They are read by the card's tooltip
   * and by this panel, neither of which the grid has anything to do with — and an input
   * that changes identity makes the grid re-derive all ~46 slot derivations, which is a
   * strange price for renaming a colour. The host seeds both at boot and persists them
   * when `localChange` fires; nothing else writes them.
   */
  labels: SlotColorLabels = {};
  /** True until the button has been opened once, which is what the first-run hint asks. */
  hintPending = false;

  /** Raised when `labels` or `hintPending` moves, for the host to write to storage. */
  readonly localChange = new Subject<void>();

  private ref?: OverlayRef;

  constructor(
    private readonly overlay: Overlay,
    private readonly injector: Injector,
    private readonly layers: UiOverlayService,
  ) {}

  /** Seed both local values from storage. Called once, by the host, at boot. */
  initLocal(labels: SlotColorLabels, hintPending: boolean): void {
    this.labels = labels;
    this.hintPending = hintPending;
  }

  /** Opening the button is what retires the first-run hint, chosen colour or not. */
  markFound(): void {
    if (!this.hintPending) return;

    this.hintPending = false;
    this.localChange.next();
  }

  /** Emits a `rename` for each name edited, then one `pick` or `dismiss`, then completes. */
  open(request: SlotColorPickerRequest): Observable<SlotColorPickerEvent> {
    this.close();

    const result = new Subject<SlotColorPickerEvent>();
    const ref = this.overlay.create({
      hasBackdrop: true,
      backdropClass: 'ui-overlay-transparent-backdrop',
      positionStrategy: this.overlay
        .position()
        .flexibleConnectedTo(request.anchor)
        .withPositions([
          { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 4 },
          { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -4 },
          { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
          { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
        ])
        .withViewportMargin(8),
    });

    this.ref = ref;
    const instance = ref.attach(new ComponentPortal(SlotColorPickerComponent, this.injector)).instance;
    instance.init(request, this.labels);
    this.layers.adopt(ref, () => this.close(), true, request.anchor,
      () => instance.editing ? instance.cancelRename() : this.close());

    // One latch, as in the item picker: disposing emits a detachment, which would
    // otherwise come back round and overwrite a pick with a dismissal.
    let settled = false;
    const finish = (event: SlotColorPickerEvent) => {
      if (settled) return;
      settled = true;
      this.close();
      result.next(event);
      result.complete();
    };

    // A rename leaves the panel open, so it is recorded rather than settling the stream.
    instance.event.subscribe((event) => {
      if (event.kind !== 'rename') return finish(event);
      this.labels = event.labels;
      this.localChange.next();
    });
    ref.backdropClick().subscribe(() => finish({ kind: 'dismiss' }));
    ref.detachments().subscribe(() => finish({ kind: 'dismiss' }));

    return result.asObservable();
  }

  close(): void {
    const ref = this.ref;
    if (!ref) return;

    // Cleared before disposing: disposing emits a detachment, `finish` answers it by
    // calling back in here, and a `this.ref` still set would run this twice.
    this.ref = undefined;
    this.layers.close(ref);
  }
}
