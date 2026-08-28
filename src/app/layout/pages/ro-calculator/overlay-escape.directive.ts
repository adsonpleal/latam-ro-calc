import { Directive, OnDestroy, OnInit, Optional } from '@angular/core';
import { CascadeSelect } from 'primeng/cascadeselect';
import { Dialog } from 'primeng/dialog';
import { Dropdown } from 'primeng/dropdown';
import { MultiSelect } from 'primeng/multiselect';
import { OverlayPanel } from 'primeng/overlaypanel';
import { DismissibleOverlay, OverlayEscapeService } from './overlay-escape.service';

/** The overlay a picker owns, and the transition it fades its panel out on. */
interface PrimePicker {
  overlayVisible?: boolean;
  // `hide`'s first argument is the overlay element, not the event — PrimeNG's own
  // keyboard listener passes the event there, where it is only used as a fallback in the
  // callback payload. Left out entirely; the component fills in its own element.
  // `overlayEl` is the node ZIndexUtils stamps, which is what makes a picker open inside a
  // dialog sort above it (primeng-overlay: `ZIndexUtils.set(mode, this.overlayEl, …)`).
  overlayViewChild?: { hide(overlay?: HTMLElement, isFocus?: boolean): void; overlayEl?: HTMLElement };
}

/** `container` is the rendered overlay root on both Dialog and OverlayPanel, and neither
 *  declares it in its public typings. */
type WithContainer = { container?: HTMLElement | null };

/**
 * Sends Esc to the fast close on whichever overlay is open — a picker's panel, a dialog,
 * or one of the Resumo de Batalha popovers.
 *
 * PrimeNG has two closes and they are not equivalent — see OverlayEscapeService for the
 * measurements. This directive is the half that knows *which* overlay to close: it applies
 * itself by element selector, so every overlay registers without a template touching it.
 *
 * The equipment chips are not here: their panel is a CDK overlay that handles its own keys
 * and detaches within a frame.
 */
@Directive({
  // An element selector on purpose, against the style guide's attribute rule: no template
  // has to opt in, so an overlay added later cannot forget to. Spelled out rather than
  // built from a constant because a decorator argument has to be statically analysable.
  // eslint-disable-next-line @angular-eslint/directive-selector
  selector: 'p-dropdown, p-multiSelect, p-cascadeSelect, p-dialog, p-overlayPanel',
  standalone: true,
})
export class OverlayEscapeDirective implements OnInit, OnDestroy {
  private deregister: () => void = () => undefined;

  constructor(
    private readonly escapes: OverlayEscapeService,
    @Optional() private readonly dropdown?: Dropdown,
    @Optional() private readonly multiSelect?: MultiSelect,
    @Optional() private readonly cascadeSelect?: CascadeSelect,
    @Optional() private readonly dialog?: Dialog,
    @Optional() private readonly overlayPanel?: OverlayPanel,
  ) {}

  ngOnInit(): void {
    const overlay = this.asDialog() ?? this.asOverlayPanel() ?? this.asPicker();
    if (overlay) this.deregister = this.escapes.register(overlay);
  }

  ngOnDestroy(): void {
    this.deregister();
  }

  private asPicker(): DismissibleOverlay | null {
    const picker = (this.dropdown ?? this.multiSelect ?? this.cascadeSelect) as PrimePicker | undefined;
    if (!picker) return null;

    return {
      isOpen: () => !!picker.overlayVisible,
      // `isFocus` true hands focus back to the trigger, which is what PrimeNG does on this
      // path itself — without it focus lands on <body> and the next Tab restarts from the
      // top of the page.
      dismiss: () => picker.overlayViewChild?.hide(undefined, true),
      element: () => picker.overlayViewChild?.overlayEl,
    };
  }

  /**
   * A dialog already closes on Esc by itself, through a document listener of its own — but
   * in the bubble phase, which is where the ~300 tooltip host listeners sit and where the
   * keypress costs half a second. Registering it moves the same `close()` onto the capture
   * path, ahead of them.
   *
   * `closable`/`closeOnEscape` are honoured rather than assumed: a dialog that opts out of
   * being dismissed must not be dismissed faster.
   */
  private asDialog(): DismissibleOverlay | null {
    const dialog = this.dialog;
    if (!dialog) return null;

    return {
      isOpen: () => dialog.visible && dialog.closable && dialog.closeOnEscape,
      dismiss: (event) => dialog.close(event),
      element: () => (dialog as unknown as WithContainer).container,
    };
  }

  /**
   * An overlay panel has no Escape handling at all in this PrimeNG version — it never binds
   * a keydown listener. So this is not a faster path but the only one; the Resumo de Batalha
   * used to carry a hand-rolled document listener for its two formula popovers, along with
   * its own rule for not closing them out from under a dialog. Both are the service's job.
   */
  private asOverlayPanel(): DismissibleOverlay | null {
    const panel = this.overlayPanel;
    if (!panel) return null;

    return {
      isOpen: () => panel.overlayVisible,
      dismiss: () => panel.hide(),
      element: () => (panel as unknown as WithContainer).container,
    };
  }
}
