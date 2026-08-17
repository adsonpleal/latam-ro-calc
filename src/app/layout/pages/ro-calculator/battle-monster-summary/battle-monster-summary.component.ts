import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DropdownModel } from 'src/app/models/dropdown.model';

@Component({
  selector: 'app-battle-monster-summary',
  templateUrl: './battle-monster-summary.component.html',
  styleUrls: ['./battle-monster-summary.component.css', '../ro-calculator.component.css'],
})
export class BattleMonsterSummaryComponent {
  @Input({ required: true }) totalSummary = {} as any;
  @Input({ required: true }) isInProcessingPreset: boolean;
  /**
   * Whether the target casts Aliviar. Only then does the level picker appear — every
   * other monster keeps the card exactly as it was (see constants/monster-relieve).
   */
  @Input() isRelieveTarget = false;
  @Input() relieveLevelOptions: DropdownModel[] = [];
  @Input() relieveLevel = 0;

  @Output() relieveLevelChange = new EventEmitter<number>();
  @Output() showElementTableClick = new EventEmitter<any>();

  constructor() {}

  onShowElementalTableClick() {
    this.showElementTableClick.emit(1);
  }
}
