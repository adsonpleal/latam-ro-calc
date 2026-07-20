import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-status-input',
  templateUrl: './status-input.component.html',
  styleUrls: ['./status-input.component.css', '../ro-calculator.component.css'],
})
export class StatusInputComponent {
  @Input({ required: true }) label: string;
  @Input({ required: true }) dropdownList: any[];

  @Input({ required: true }) value = undefined;
  @Output() valueChange = new EventEmitter<number>();

  @Input({ required: true }) extraValue: number;
  @Input() badgeSeverity: 'success' | 'info' | 'warning' | 'danger' = 'info';
  @Input() disabled = false;
  /** When false the "+N" badge isn't clickable (no equipped item contributes to this
   *  stat, so its breakdown would be empty). */
  @Input() extraClickable = true;
  /** Emitted when the "+N" equip-bonus badge is clicked; the parent opens the
   *  "which items contribute" breakdown for this stat. */
  @Output() extraClick = new EventEmitter<void>();

  constructor() {}

  /** The "+N" badge only behaves as a button when there is a breakdown to open.
   *  Drives role/tabindex too, so it isn't announced as a button when inert. */
  get isExtraClickable(): boolean {
    return !!this.extraValue && this.extraClickable;
  }

  onBaseStatusChange() {
    this.valueChange.emit(this.value);
  }
}
