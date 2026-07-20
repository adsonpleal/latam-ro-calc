import { Directive, ElementRef, HostBinding, HostListener, Input } from '@angular/core';

/**
 * Makes a non-native clickable element (a `<div>`/`<span>` with a `(click)` handler)
 * keyboard-operable, the way a real `<button>` is: it advertises `role="button"` +
 * `tabindex="0"` and, on Enter or Space, replays the element's own click.
 *
 * Because it fires the existing `(click)` binding via `.click()` rather than taking
 * its own handler, the keyboard and mouse paths cannot drift — there is one action
 * expression, not three copies. It also `preventDefault()`s Space, which a focused
 * non-button would otherwise consume to scroll the page as well as activate.
 *
 * Usage:
 *   <div (click)="panel.toggle($event)" keyActivate>…</div>          // always on
 *   <span (click)="v && open(v)" [keyActivate]="v">…</span>          // on when v truthy
 *   <div (click)="cmp ? null : open()" [keyActivate]="!cmp">…</div>  // off in cmp mode
 *
 * When gated off, it adds no role/tabindex and ignores keys, so an inert element
 * isn't announced as a button or made focusable — the guard must match whatever
 * makes the `(click)` a no-op. Same one-directive intent as MissingSkillIconDirective.
 *
 * The two @angular-eslint template a11y rules (click-events-have-key-events,
 * interactive-supports-focus) are static and can't see this directive, so templates
 * that use it disable those two rules at the top of the file.
 *
 * The `keyActivate` selector is intentionally un-prefixed (not `appKeyActivate`) to
 * read like a native a11y attribute at the call site, matching the img.skill_icon
 * choice in MissingSkillIconDirective — hence the directive-selector exemption.
 */
// eslint-disable-next-line @angular-eslint/directive-selector
@Directive({ selector: '[keyActivate]', standalone: true })
export class KeyActivateDirective {
  // `''` is the bare-attribute form; a bound value (`[keyActivate]="expr"`) is any
  // guard whose truthiness decides whether the element is active. Typed `unknown`
  // so a numeric guard like `[keyActivate]="row.value"` type-checks under
  // strictTemplates without an explicit `!!`.
  @Input('keyActivate') enabled: unknown = '';

  private get active(): boolean {
    return this.enabled === '' || !!this.enabled;
  }

  @HostBinding('attr.role') get role(): string | null {
    return this.active ? 'button' : null;
  }

  @HostBinding('attr.tabindex') get tabindex(): string | null {
    return this.active ? '0' : null;
  }

  constructor(private readonly el: ElementRef<HTMLElement>) {}

  @HostListener('keydown.enter', ['$event'])
  @HostListener('keydown.space', ['$event'])
  onActivate(event: Event): void {
    if (!this.active) return;
    event.preventDefault();
    this.el.nativeElement.click();
  }
}
