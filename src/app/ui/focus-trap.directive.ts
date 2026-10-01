import { AfterViewInit, Directive, ElementRef, HostListener, Input, OnDestroy } from '@angular/core';

const selector = 'button,input,select,textarea,a[href],[tabindex],[contenteditable="true"]';
@Directive({ selector: '[appTrapFocus]' })
export class FocusTrapDirective implements AfterViewInit, OnDestroy {
  @Input() appTrapFocus: boolean | '' = true;
  @Input() appTrapFocusAutoCapture: boolean | '' = true;
  private previous?: HTMLElement;
  private destroyed = false;
  constructor(private readonly element: ElementRef<HTMLElement>) {}
  private get enabled(): boolean { return this.appTrapFocus !== false; }
  private focusables(): HTMLElement[] {
    return Array.from(this.element.nativeElement.querySelectorAll<HTMLElement>(selector)).filter(el => el.tabIndex >= 0 && !el.matches(':disabled,[inert]') && !el.closest('[inert]') && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden');
  }
  ngAfterViewInit(): void {
    if (!this.enabled || this.appTrapFocusAutoCapture === false) return;
    this.previous = document.activeElement as HTMLElement;
    queueMicrotask(() => {
      if (this.destroyed || !this.enabled) return;
      (this.element.nativeElement.querySelector<HTMLElement>('[appFocusInitial]') ?? this.focusables()[0] ?? this.element.nativeElement).focus({ preventScroll: true });
    });
  }
  @HostListener('keydown', ['$event']) onKey(event: KeyboardEvent): void {
    if (!this.enabled || event.key !== 'Tab') return;
    const elements = this.focusables();
    const active = document.activeElement;
    const at = elements.indexOf(active as HTMLElement);
    if (!elements.length) { event.preventDefault(); this.element.nativeElement.focus(); }
    else if (event.shiftKey && at <= 0) { event.preventDefault(); elements[elements.length - 1].focus(); }
    else if (!event.shiftKey && (at < 0 || at === elements.length - 1)) { event.preventDefault(); elements[0].focus(); }
  }
  ngOnDestroy(): void {
    this.destroyed = true;
    if (this.previous?.isConnected && this.enabled) this.previous.focus({ preventScroll: true });
  }
}
