import { Directive, EventEmitter, Input, Output } from '@angular/core';
import { ControlValueAccessor } from '@angular/forms';
import { UiTemplated } from './template.directive';

@Directive()
export abstract class UiValueControl extends UiTemplated implements ControlValueAccessor {
  @Input() disabled = false;
  @Input() inputId = '';
  @Input() ariaLabel = '';
  @Input() ariaLabelledBy = '';
  @Input() styleClass = '';
  @Output() valueChange = new EventEmitter<{ originalEvent: Event; value: any }>();
  value: any = null;
  protected changed: (value: any) => void = () => undefined;
  protected touched: () => void = () => undefined;
  writeValue(value: any): void { this.value = value; }
  registerOnChange(fn: (value: any) => void): void { this.changed = fn; }
  registerOnTouched(fn: () => void): void { this.touched = fn; }
  setDisabledState(disabled: boolean): void { this.disabled = disabled; }
  commit(value: any, event: Event): void {
    if (this.disabled) return;
    this.value = value;
    this.changed(value);
    this.touched();
    this.valueChange.emit({ originalEvent: event, value });
  }
  blur(): void { this.touched(); }
}

export interface SelectItemGroup {
  label: string;
  value?: any;
  items: any[];
}

/** The calculator's existing options use either primitives or {label,value}. */
export function optionValue(option: any, key?: string, labelKey?: string): any {
  if (option == null || typeof option !== 'object') return option;
  if (key) return option[key];
  return !labelKey && 'value' in option ? option.value : option;
}
export function optionLabel(option: any, key?: string): string {
  return String(option == null ? '' : typeof option === 'object' ? option[key || 'label'] ?? option.value ?? '' : option);
}

/** Toggle a value without mutating the form's current selection. */
export function toggleSelection(selection: any[] | null | undefined, value: any): any[] {
  const values = selection ?? [];
  return values.includes(value) ? values.filter(entry => entry !== value) : [...values, value];
}
