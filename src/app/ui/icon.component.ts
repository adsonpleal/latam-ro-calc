import { ChangeDetectionStrategy, Component, ElementRef, HostBinding, Input } from '@angular/core';
import { IconName } from './icon-names';

/** A monochrome SVG mask inherits text colour, including on disabled controls. */
@Component({
  selector: 'app-icon',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconComponent {
  @HostBinding('class.ui-icon') readonly iconClass = true;
  @Input() name: IconName;
  @Input() label = '';
  @Input() role = '';
  constructor(private readonly host: ElementRef<HTMLElement>) {}
  get nativeElement(): HTMLElement { return this.host.nativeElement; }
  @HostBinding('attr.role') get ariaRole() { return this.role || (this.label ? 'img' : null); }
  @HostBinding('attr.aria-label') get ariaLabel() { return this.label || null; }
  @HostBinding('attr.aria-hidden') get decorative() { return this.label || this.role ? null : 'true'; }
  @HostBinding('style.--ui-icon') get source() { return this.name ? `url("assets/icons/ui/${this.name}.svg")` : null; }
  @HostBinding('class.ui-spin') get spinning() { return this.name === 'spinner'; }
}
