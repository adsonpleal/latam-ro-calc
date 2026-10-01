import { AfterViewInit, Component, Directive, ElementRef, HostBinding, Input, OnChanges, Renderer2, forwardRef } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { IconName } from './icon-names';
import { UiTemplated } from './template.directive';
import { UiValueControl, optionLabel, optionValue, toggleSelection } from './value-control';

@Directive({ selector: 'button[appButton],a[appButton]' })
export class UiButtonDirective implements AfterViewInit, OnChanges {
  @HostBinding('class.ui-button') readonly buttonClass = true;
  @HostBinding('class.ui-component') readonly componentClass = true;
  @Input() label = '';
  @Input() icon: IconName | '' = '';
  @Input() iconPos: 'left' | 'right' = 'left';
  private iconElement?: HTMLElement;
  private labelElement?: HTMLElement;
  constructor(private readonly host: ElementRef<HTMLElement>, private readonly renderer: Renderer2) {}
  @HostBinding('class.ui-button-icon-only') get iconOnly() { return !!this.icon && !this.label; }
  ngAfterViewInit(): void { this.render(); }
  ngOnChanges(): void { this.render(); }
  private render(): void {
    const host = this.host.nativeElement;
    if (this.icon && !this.iconElement) {
      this.iconElement = this.renderer.createElement('span');
      this.renderer.setAttribute(this.iconElement, 'aria-hidden', 'true');
      this.renderer.insertBefore(host, this.iconElement, host.firstChild);
    }
    if (this.iconElement) {
      this.iconElement.className = `ui-button-icon ui-icon ui-button-icon-${this.iconPos}${this.icon === 'spinner' ? ' ui-spin' : ''}`;
      this.iconElement.style.setProperty('--ui-icon', `url("assets/icons/ui/${this.icon}.svg")`);
      this.iconElement.hidden = !this.icon;
    }
    if (this.label && !this.labelElement) {
      this.labelElement = this.renderer.createElement('span');
      this.renderer.addClass(this.labelElement, 'ui-button-label');
      this.renderer.appendChild(host, this.labelElement);
    }
    if (this.labelElement) this.labelElement.textContent = this.label;
  }
}

@Directive({ selector: '[appInputText],[appInputTextarea]' })
export class UiInputDirective {
  @HostBinding('class.ui-inputtext') readonly inputClass = true;
  @HostBinding('class.ui-component') readonly componentClass = true;
}

@Directive({ selector: '[appBadge]' })
export class UiBadgeDirective implements OnChanges, AfterViewInit {
  @HostBinding('class.ui-overlay-badge') readonly badgeClass = true;
  @Input() value: string | number = '';
  @Input() severity = '';
  private badge?: HTMLElement;
  constructor(private readonly host: ElementRef<HTMLElement>, private readonly renderer: Renderer2) {}
  ngAfterViewInit(): void { this.render(); }
  ngOnChanges(): void { this.render(); }
  private render(): void {
    if (!this.badge) {
      this.badge = this.renderer.createElement('span');
      this.renderer.appendChild(this.host.nativeElement, this.badge);
    }
    const value = String(this.value);
    this.badge.className = `ui-badge ui-component ui-badge-${this.severity}${value.length === 1 ? ' ui-badge-single' : ''}`;
    this.badge.textContent = value;
  }
}

@Component({
  selector: 'app-ui-tag',
  template: `<span class="ui-tag ui-component" [ngClass]="[styleClass, 'ui-tag-' + severity]">
    <app-icon *ngIf="icon" class="ui-tag-icon" [name]="icon"></app-icon><span class="ui-tag-value">{{ value }}</span><ng-content></ng-content>
  </span>`,
})
export class UiTagComponent {
  @Input() value: any = '';
  @Input() severity = '';
  @Input() styleClass = '';
  @Input() icon: IconName;
}

@Component({
  selector: 'app-ui-chip',
  template: `<span class="ui-chip ui-component" [ngClass]="styleClass"><app-icon *ngIf="icon" class="ui-chip-icon" [name]="icon"></app-icon><span class="ui-chip-text">{{ label }}</span></span>`,
})
export class UiChipComponent {
  @Input() label = '';
  @Input() icon: IconName;
  @Input() styleClass = '';
}

@Component({
  selector: 'app-ui-card',
  template: `<div class="ui-card ui-component" [ngClass]="styleClass"><div class="ui-card-body"><div class="ui-card-content"><ng-content></ng-content></div></div></div>`,
})
export class UiCardComponent { @Input() styleClass = ''; }

@Component({
  selector: 'app-ui-checkbox',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => UiCheckboxComponent), multi: true }],
  template: `<label class="ui-checkbox-label" [class.ui-disabled]="disabled">
    <span class="ui-checkbox ui-component"><input type="checkbox" [id]="inputId" [disabled]="disabled" [checked]="!!value" [attr.aria-label]="ariaLabel || label || null" (blur)="blur()" (change)="commit($any($event.target).checked, $event)" />
    <span class="ui-checkbox-box" [class.ui-highlight]="value"><app-icon *ngIf="value" name="check"></app-icon></span></span><span *ngIf="label">{{label}}</span>
  </label>`,
})
export class UiCheckboxComponent extends UiValueControl {
  @Input() label = '';
  @Input() binary = true;
}

@Component({
  selector: 'app-ui-input-switch',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => UiSwitchComponent), multi: true }],
  template: `<span class="ui-inputswitch ui-component" [class.ui-inputswitch-checked]="value" [class.ui-disabled]="disabled">
    <input type="checkbox" role="switch" [id]="inputId" [disabled]="disabled" [checked]="!!value" [attr.aria-label]="ariaLabel || null" (blur)="blur()" (change)="commit($any($event.target).checked, $event)" /><span class="ui-inputswitch-slider"></span>
  </span>`,
})
export class UiSwitchComponent extends UiValueControl {}

@Component({
  selector: 'app-ui-select-button',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => UiSelectButtonComponent), multi: true }],
  template: `<div class="ui-selectbutton ui-buttonset ui-component" [ngClass]="styleClass" role="group" [attr.aria-label]="ariaLabel || null" [attr.aria-labelledby]="ariaLabelledBy || null">
    <button type="button" *ngFor="let option of options" class="ui-button ui-component" [class.ui-highlight]="selected(option)" [attr.aria-pressed]="selected(option)" [disabled]="disabled || option?.disabled" (click)="pick(option, $event)">
      <ng-container *ngIf="template('item') as content; else text" [ngTemplateOutlet]="content" [ngTemplateOutletContext]="{ $implicit: option }"></ng-container><ng-template #text><span class="ui-button-label">{{labelOf(option)}}</span></ng-template>
    </button>
  </div>`,
})
export class UiSelectButtonComponent extends UiValueControl {
  @Input() options: any[] = [];
  @Input() multiple = false;
  @Input() optionLabel = '';
  @Input() optionValue = '';
  labelOf(option: any): string { return optionLabel(option, this.optionLabel); }
  optionValueOf(option: any): any { return optionValue(option, this.optionValue, this.optionLabel); }
  selected(option: any): boolean { const v = this.optionValueOf(option); return this.multiple ? (this.value ?? []).includes(v) : this.value === v; }
  pick(option: any, event: Event): void {
    if (option?.disabled || this.disabled) return;
    const value = this.optionValueOf(option);
    const next = this.multiple ? toggleSelection(this.value, value) : this.value === value ? null : value;
    this.commit(next, event);
  }
}

// Referenced by consumers that need projected templates, without exporting a UI library API.
export { UiTemplated };
