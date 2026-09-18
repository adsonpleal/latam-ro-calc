import { Component, EventEmitter, Input, Output } from '@angular/core';
import { monsterDamageReductionTooltip } from 'src/app/constants';
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

  /** The purple "Redução N%" tag's tooltip; empty when the target reduces nothing. */
  get damageReductionTooltip(): string {
    const percent = this.totalSummary?.monster?.damageReduction ?? 0;
    return percent > 0 ? monsterDamageReductionTooltip(percent) : '';
  }

  constructor() {}

  onShowElementalTableClick() {
    this.showElementTableClick.emit(1);
  }
}
