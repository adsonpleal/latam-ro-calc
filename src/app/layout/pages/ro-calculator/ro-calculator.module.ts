import { UiModule } from 'src/app/ui/ui.module';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { RoCalculatorComponent } from './ro-calculator.component';
import { ItemDescTooltipPipe } from './item-desc-tooltip.pipe';
import { PrettyJsonPipe } from '../../prettier-json.pipe';
import { RoCalculatorRoutingModule } from './ro-calculator-routing.module';
import { CalcValueComponent } from './calc-value/calc-value.component';
import { MiscDetailComponent } from './misc-detail/misc-detail.component';
import { ItemSearchComponent } from './item-search/item-search.component';
import { ElementalTableComponent } from './elemental-table/elemental-table.component';
import { ElementalTableRawComponent } from './elemental-table-raw/elemental-table-raw.component';
import { BattleHudComponent } from './battle-hud/battle-hud.component';
import { AutoCastHudComponent } from './auto-cast-hud/auto-cast-hud.component';
import { BattleEffectsComponent } from './battle-hud/effects/battle-effects.component';
import { BattleMonsterCardComponent } from './battle-hud/monster-card/battle-monster-card.component';
import { BattleDamagePopoversComponent } from './battle-hud/damage-popovers/battle-damage-popovers.component';
import { BattleSkillDetailsComponent } from './battle-hud/skill-details/battle-skill-details.component';
import { RotationListComponent } from './battle-hud/rotation-list/rotation-list.component';
import { RotationTimelineComponent } from './battle-hud/rotation-timeline/rotation-timeline.component';
import { AspdCurveComponent } from './aspd-curve/aspd-curve.component';
import { ItemPickerOverlayComponent } from './item-picker/item-picker-overlay.component';
import { CustomItemStudioComponent } from './custom-item-studio.component';
import { SlotColorPickerComponent } from './slot-color-picker/slot-color-picker.component';
import { EquipmentChipComponent } from './equipment-grid/equipment-chip.component';
import { EquipmentGridComponent } from './equipment-grid/equipment-grid.component';
import { EquipmentSlotCardComponent } from './equipment-grid/equipment-slot-card.component';
import { StatusInputModule } from './status-input/status-input.module';
import { IconUrlPipe } from '../../../pipes/icon-url.pipe';
import { MonsterSpritePipe } from '../../../pipes/monster-sprite.pipe';
import { MonsterTermPipe } from '../../../pipes/monster-term.pipe';
import { CharSpritePipe } from '../../../pipes/char-sprite.pipe';
import { MissingIconDirective } from '../../../pipes/missing-icon.directive';
import { KeyActivateDirective } from '../../../pipes/key-activate.directive';

@NgModule({
  imports: [
    UiModule,
    CommonModule,
    FormsModule,



    RoCalculatorRoutingModule,
    StatusInputModule,
    IconUrlPipe,
    MonsterSpritePipe,
    MonsterTermPipe,
    CharSpritePipe,
    MissingIconDirective,
    KeyActivateDirective,
  ],
  declarations: [
    RoCalculatorComponent,
    CalcValueComponent,
    PrettyJsonPipe,
    MiscDetailComponent,
    ItemSearchComponent,
    ElementalTableComponent,
    ElementalTableRawComponent,
    BattleHudComponent,
    AutoCastHudComponent,
    BattleEffectsComponent,
    BattleMonsterCardComponent,
    BattleDamagePopoversComponent,
    BattleSkillDetailsComponent,
    RotationListComponent,
    RotationTimelineComponent,
    AspdCurveComponent,
    ItemPickerOverlayComponent,
    CustomItemStudioComponent,
    SlotColorPickerComponent,
    EquipmentChipComponent,
    EquipmentSlotCardComponent,
    EquipmentGridComponent,
    ItemDescTooltipPipe,
  ],
  exports: [CalcValueComponent],
})
export class RoCalculatorModule {}
