import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-battle-effects',
  templateUrl: './battle-effects.component.html',
  styleUrls: ['./battle-effects.component.css'],
})
export class BattleEffectsComponent {
  @Input() chanceList: any[] = [];
  @Input() selectedChances: string[] = [];
  @Input() chanceList2: any[] = [];
  @Input() selectedChances2: string[] = [];
  @Input() isComparing = false;

  @Output() selectedChancesChange = new EventEmitter<string[]>();
  @Output() selectedChances2Change = new EventEmitter<string[]>();

  effectTooltip(label2: string): string {
    return (label2 || '').replace(/^\s*\[\s*/, '').replace(/\s*\]\s*$/, '');
  }
}
