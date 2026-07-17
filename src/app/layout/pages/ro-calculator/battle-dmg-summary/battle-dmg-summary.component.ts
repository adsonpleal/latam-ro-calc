import { Component, EventEmitter, Input, Output } from '@angular/core';
import { dmgTypeLabel as dmgTypeLabelUtil } from '../../../../utils';

@Component({
  selector: 'app-battle-dmg-summary',
  templateUrl: './battle-dmg-summary.component.html',
  styleUrls: ['./battle-dmg-summary.component.css', '../ro-calculator.component.css'],
})
export class BattleDmgSummaryComponent {
  @Input({ required: true }) model = {} as any;
  @Input({ required: true }) totalSummary = {} as any;
  @Input({ required: true }) totalSummary2 = {} as any;
  @Input({ required: true }) isCalculating: boolean;
  @Input({ required: true }) isEnableCompare: boolean;
  @Input({ required: true }) isInProcessingPreset: boolean;
  @Input({ required: true }) selectedChances: any[];
  @Input({ required: true }) hideBasicAtk: boolean;
  @Input({ required: true }) showLeftWeapon: boolean;

  @Output() showElementTableClick = new EventEmitter<any>();

  constructor() {}

  // Display-only pt-BR for the skill damage type (the raw value drives logic).
  dmgTypeLabel(type: string): string {
    return dmgTypeLabelUtil(type);
  }

  onShowElementalTableClick() {
    this.showElementTableClick.emit(1);
  }
}
