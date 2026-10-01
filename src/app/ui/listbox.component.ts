import { Component, Input, forwardRef } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { UiValueControl, optionLabel, optionValue, toggleSelection } from './value-control';

@Component({
  selector: 'app-ui-listbox',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => UiListboxComponent), multi: true }],
  template: `<div class="ui-listbox ui-component" [ngClass]="styleClass"><div class="ui-listbox-list-wrapper" [ngStyle]="listStyle"><ul class="ui-listbox-list" role="listbox" [attr.aria-label]="ariaLabel || null" [attr.aria-multiselectable]="multiple">
    <li *ngFor="let option of options; let index = index" class="ui-listbox-item" role="option" [attr.aria-selected]="selected(option)" [attr.tabindex]="disabled || option.disabled ? -1 : 0" [class.ui-highlight]="selected(option)" [class.ui-disabled]="disabled || option.disabled" (click)="pick(option, $event)" (keydown)="key(option, $event)">
      <ng-container *ngIf="template('item') as content; else text" [ngTemplateOutlet]="content" [ngTemplateOutletContext]="{ $implicit: option, index: index }"></ng-container><ng-template #text>{{labelOf(option)}}</ng-template>
    </li>
  </ul></div></div>`,
})
export class UiListboxComponent extends UiValueControl {
  @Input() options: any[] = [];
  @Input() multiple = false;
  @Input() metaKeySelection = false;
  @Input() listStyle: Record<string, any> = {};
  @Input() optionLabel = '';
  @Input() optionValue = '';
  labelOf(option: any): string { return optionLabel(option, this.optionLabel); }
  optionValueOf(option: any): any { return optionValue(option, this.optionValue, this.optionLabel); }
  selected(option: any): boolean { const v = this.optionValueOf(option); return this.multiple ? (this.value ?? []).includes(v) : this.value === v; }
  pick(option: any, event: Event): void {
    if (option.disabled) return;
    const value = this.optionValueOf(option);
    const next = this.multiple ? toggleSelection(this.value, value) : this.value === value ? null : value;
    this.commit(next, event);
  }
  key(option: any, event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); this.pick(option, event); }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault(); const element = event.currentTarget as HTMLElement;
      (event.key === 'ArrowDown' ? element.nextElementSibling as HTMLElement : element.previousElementSibling as HTMLElement)?.focus();
    }
  }
}
