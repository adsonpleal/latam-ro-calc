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

  @Input() extraValue = 0;
  /** Hides the "+N" equip-bonus badge. The "Ajude o simulador" dialog reuses this
   *  field to collect raw trait values, where there is no equipment to add. */
  @Input() showExtra = true;
  @Input() badgeSeverity: 'success' | 'info' | 'warning' | 'danger' = 'info';
  @Input() disabled = false;
  /** When false the "+N" badge isn't clickable (no equipped item contributes to this
   *  stat, so its breakdown would be empty). */
  @Input() extraClickable = true;
  /** Emitted when the "+N" equip-bonus badge is clicked; the parent opens the
   *  "which items contribute" breakdown for this stat. */
  @Output() extraClick = new EventEmitter<void>();

  /**
   * The compared build's equip bonus for this stat, or null when nothing is being
   * compared. An item swap can move a base stat or a trait, and without this the grid was
   * the one place on screen where that went unsaid.
   */
  @Input() compareExtraValue: number | null = null;
  /** Emitted when the "→ N" compare badge is clicked; the parent opens the breakdown
   *  resolved against the *compared* build. */
  @Output() compareExtraClick = new EventEmitter<void>();

  constructor() {}

  /** The "+N" badge only behaves as a button when there is a breakdown to open.
   *  Drives role/tabindex too, so it isn't announced as a button when inert. */
  get isExtraClickable(): boolean {
    return !!this.extraValue && this.extraClickable;
  }

  /** The equipment bonus. `+0` rather than `0`: it is a bonus column, not a total. */
  get extraText(): string {
    return signed(this.extraValue);
  }

  /**
   * The compared build's bonus, or null when there is nothing to say.
   *
   * Same contract as the ficha's compareCell: an unchanged stat renders no cell at all
   * rather than a muted "±0", so the row only grows for the stats a swap moved.
   */
  get compareDelta(): { text: string; better: boolean } | null {
    const compared = this.compareExtraValue;
    if (compared == null || compared === this.extraValue) return null;

    // The value alone, not "→ +18 -3": the variation costs a second number's width on
    // every row, and the colour already says which way it went.
    return { text: signed(compared), better: compared > this.extraValue };
  }

  onBaseStatusChange() {
    this.valueChange.emit(this.value);
  }
}

/** Matches the badge's own sign convention: negatives already carry their '-'. */
const signed = (value: number): string => (value < 0 ? String(value) : `+${value}`);
