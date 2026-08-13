import { Directive, ElementRef, OnDestroy, OnInit, Renderer2 } from '@angular/core';
import { Tooltip } from 'primeng/tooltip';

/**
 * How long the popover stays open after the pointer leaves the trigger.
 *
 * The popover does not touch the trigger: `.p-tooltip` has padding and there is also
 * the arrow, so crossing from one to the other passes over a few pixels that belong to
 * neither. Without this grace period the popover would close halfway across.
 */
const FOLGA_MS = 150;

/**
 * Keeps the description popover alive under the pointer — this is what makes a long
 * description scrollable, now that it scrolls vertically instead of splitting into two
 * columns.
 *
 * The stock `pTooltip` closes on the trigger's `mouseleave`, which puts the popover's
 * scrollbar out of reach: the pointer dismisses it before ever getting there. Here:
 *
 *  - `autoHide: false` makes PrimeNG ignore leaving the trigger when the destination is
 *    the popover itself, and binds a `mouseleave` on the container;
 *  - closing becomes a scheduled call with {@link FOLGA_MS} of grace, cancelled if the
 *    pointer enters the popover (or returns to the trigger) in the meantime;
 *  - Esc closes immediately, with no grace period.
 *
 * Net effect: it only closes when the pointer leaves both, or on Esc.
 */
// No "app" prefix, deliberately: by matching the attribute the item tooltips already
// carry, the behaviour applies to all of them — including any created later.
// Same reasoning as ItemDescTooltipFitDirective, which shares this selector.
// eslint-disable-next-line @angular-eslint/directive-selector
@Directive({ selector: '[pTooltip][tooltipStyleClass="item_desc_tooltip"]' })
export class ItemDescTooltipHoverDirective implements OnInit, OnDestroy {
  private saidaPendente?: ReturnType<typeof setTimeout>;
  private deactivateOriginal?: () => void;
  private showOriginal?: () => void;
  private hideOriginal?: () => void;
  private pressEscapeOriginal?: () => void;
  private readonly desinscrever: (() => void)[] = [];
  private desinscreverContainer: (() => void)[] = [];

  constructor(
    private readonly tooltip: Tooltip,
    private readonly host: ElementRef<HTMLElement>,
    private readonly renderer: Renderer2,
  ) {}

  ngOnInit(): void {
    // `setOption` rather than `tooltip.autoHide = false`: Tooltip reads everything via
    // `getOption`, and the input only reaches the options by going through ngOnChanges.
    this.tooltip.setOption({ autoHide: false });

    this.deactivateOriginal = this.tooltip.deactivate.bind(this.tooltip);
    this.showOriginal = this.tooltip.show.bind(this.tooltip);
    this.hideOriginal = this.tooltip.hide.bind(this.tooltip);

    this.tooltip.deactivate = () => {
      // With no popover on screen there is no crossing to protect, and the original
      // still has to run immediately to cancel a scheduled show (the 400ms showDelay) —
      // deferring that would make the popover blink after the pointer had already left.
      if (!this.tooltip.container) {
        this.deactivateOriginal?.();
        return;
      }
      this.agendarSaida();
    };

    this.tooltip.show = () => {
      this.cancelarSaida();
      this.showOriginal?.();
      this.ouvirContainer();
    };

    this.tooltip.hide = () => {
      this.cancelarSaida();
      this.soltarContainer();
      this.hideOriginal?.();
    };

    // Esc closes immediately. PrimeNG's `onPressEscape` calls `deactivate()`, which here
    // is deferred — without this the popover would only vanish one grace period later, and
    // the key would look like it had not worked.
    this.pressEscapeOriginal = this.tooltip.onPressEscape.bind(this.tooltip);
    this.tooltip.onPressEscape = () => {
      if (!this.tooltip.hideOnEscape) return;
      this.cancelarSaida();
      this.deactivateOriginal?.();
    };

    // PrimeNG's `onMouseEnter` only reacts when there is no container, so returning from
    // the popover to the trigger during the grace period would cancel nothing by itself.
    this.desinscrever.push(this.renderer.listen(this.host.nativeElement, 'mouseenter', () => this.cancelarSaida()));
  }

  ngOnDestroy(): void {
    this.cancelarSaida();
    this.soltarContainer();
    for (const fn of this.desinscrever.splice(0)) fn();
    // The patches are own properties sitting on top of the prototype methods; deleting
    // them restores the real originals. Reassigning the `bind`ed version would leave a
    // copy in place, which looks the same but is not the same method.
    const instancia = this.tooltip as unknown as Record<string, unknown>;
    for (const metodo of ['deactivate', 'show', 'hide', 'onPressEscape']) delete instancia[metodo];
  }

  private ouvirContainer(): void {
    const container = this.tooltip.container as HTMLElement | undefined;
    if (!container) return;

    this.soltarContainer();
    // `mouseenter` also fires on the ancestors being entered, so landing straight on
    // `.p-tooltip-text` (without crossing the container border) cancels the exit too.
    this.desinscreverContainer = [
      this.renderer.listen(container, 'mouseenter', () => this.cancelarSaida()),
      this.renderer.listen(container, 'mouseleave', () => this.agendarSaida()),
    ];
  }

  private soltarContainer(): void {
    for (const fn of this.desinscreverContainer.splice(0)) fn();
  }

  private agendarSaida(): void {
    this.cancelarSaida();
    this.saidaPendente = setTimeout(() => {
      this.saidaPendente = undefined;
      this.deactivateOriginal?.();
    }, FOLGA_MS);
  }

  private cancelarSaida(): void {
    if (this.saidaPendente === undefined) return;
    clearTimeout(this.saidaPendente);
    this.saidaPendente = undefined;
  }
}
