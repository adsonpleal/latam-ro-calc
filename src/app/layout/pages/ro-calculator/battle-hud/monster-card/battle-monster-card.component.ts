import { Component, EventEmitter, Input, Output } from '@angular/core';
import { monsterDamageReductionTooltip } from '../../../../../constants';
import { DropdownModel } from '../../../../../models/dropdown.model';
import { ReductionCategory, ReductionRow, reductionRowClickable } from '../../reduction-breakdown';
import { elementTagClass } from '../battle-hud.logic';

@Component({
  selector: 'app-battle-monster-card',
  templateUrl: './battle-monster-card.component.html',
  styleUrls: ['./battle-monster-card.component.css', '../battle-hud.component.css', '../../ro-calculator.component.css'],
})
export class BattleMonsterCardComponent {
  @Input({ required: true }) totalSummary = {} as any;
  @Input({ required: true }) selectedMonster: number;
  @Input({ required: true }) selectedMonsterName: string;
  @Input() isInProcessingPreset = false;
  @Input() isRelieveTarget = false;
  @Input() relieveLevelOptions: DropdownModel[] = [];
  @Input() relieveLevel = 0;
  @Input() spriteUrlOverride: string | null = null;
  @Input() spriteFallbackUrl: string | null = null;
  @Input() reductionCategories: ReductionCategory[] = [];
  @Input() reductionSources: Record<string, any> = {};

  @Output() relieveLevelChange = new EventEmitter<number>();
  @Output() showElementTableClick = new EventEmitter<void>();
  @Output() reductionRowClick = new EventEmitter<ReductionRow>();

  readonly elementTagClass = elementTagClass;

  get damageReductionTooltip(): string {
    const percent = this.totalSummary?.monster?.damageReduction ?? 0;
    return percent > 0 ? monsterDamageReductionTooltip(percent) : '';
  }

  isReductionRowClickable(row: ReductionRow): boolean {
    return reductionRowClickable(row, this.reductionSources);
  }

  onSpriteOverrideError(event: Event): void {
    if (this.spriteFallbackUrl) (event.target as HTMLImageElement).src = this.spriteFallbackUrl;
  }
}
