import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { StyleClassModule } from 'primeng/styleclass';
import { TableModule } from 'primeng/table';
import { DropdownModule } from 'primeng/dropdown';
import { BadgeModule } from 'primeng/badge';
import { InputSwitchModule } from 'primeng/inputswitch';
import { InputTextModule } from 'primeng/inputtext';
import { RadioButtonModule } from 'primeng/radiobutton';
import { RippleModule } from 'primeng/ripple';
import { InputNumberModule } from 'primeng/inputnumber';
import { AccordionModule } from 'primeng/accordion';
import { CardModule } from 'primeng/card';
import { CascadeSelectModule } from 'primeng/cascadeselect';
import { CheckboxModule } from 'primeng/checkbox';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DividerModule } from 'primeng/divider';
import { ListboxModule } from 'primeng/listbox';
import { MultiSelectModule } from 'primeng/multiselect';
import { OrderListModule } from 'primeng/orderlist';
import { PaginatorModule } from 'primeng/paginator';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SplitButtonModule } from 'primeng/splitbutton';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { BlockUIModule } from 'primeng/blockui';
import { DataViewModule } from 'primeng/dataview';
import { TreeSelectModule } from 'primeng/treeselect';
import { TooltipModule } from 'primeng/tooltip';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { A11yModule } from '@angular/cdk/a11y';
import { OverlayModule } from '@angular/cdk/overlay';
import { ScrollingModule } from '@angular/cdk/scrolling';

import { RoCalculatorComponent } from './ro-calculator.component';
import { ItemDescTooltipPipe } from './item-desc-tooltip.pipe';
import { ItemDescTooltipFitDirective } from './item-desc-tooltip-fit.directive';
import { ItemDescTooltipHoverDirective } from './item-desc-tooltip-hover.directive';
import { TooltipClampDirective } from './tooltip-clamp.directive';
import { PrettyJsonPipe } from '../../prettier-json.pipe';
import { RoCalculatorRoutingModule } from './ro-calculator-routing.module';
import { CalcValueComponent } from './calc-value/calc-value.component';
import { MonsterDataViewComponent } from './monster-data-view/monster-data-view.component';
import { FieldsetModule } from 'primeng/fieldset';
import { MiscDetailComponent } from './misc-detail/misc-detail.component';
import { DialogModule } from 'primeng/dialog';
import { ItemSearchComponent } from './item-search/item-search.component';
import { ElementalTableComponent } from './elemental-table/elemental-table.component';
import { ElementalTableRawComponent } from './elemental-table-raw/elemental-table-raw.component';
import { BattleDmgSummaryComponent } from './battle-dmg-summary/battle-dmg-summary.component';
import { BattleMonsterSummaryComponent } from './battle-monster-summary/battle-monster-summary.component';
import { BattleHudComponent } from './battle-hud/battle-hud.component';
import { RotationListComponent } from './battle-hud/rotation-list/rotation-list.component';
import { RotationTimelineComponent } from './battle-hud/rotation-timeline/rotation-timeline.component';
import { AspdCurveComponent } from './aspd-curve/aspd-curve.component';
import { ItemPickerOverlayComponent } from './item-picker/item-picker-overlay.component';
import { EquipmentChipComponent } from './equipment-grid/equipment-chip.component';
import { EquipmentGridComponent } from './equipment-grid/equipment-grid.component';
import { EquipmentSlotCardComponent } from './equipment-grid/equipment-slot-card.component';
import { StatusInputModule } from './status-input/status-input.module';
import { IconUrlPipe } from '../../../pipes/icon-url.pipe';
import { MonsterSpritePipe } from '../../../pipes/monster-sprite.pipe';
import { MonsterTermPipe } from '../../../pipes/monster-term.pipe';
import { CharSpritePipe } from '../../../pipes/char-sprite.pipe';
import { MissingSkillIconDirective } from '../../../pipes/missing-skill-icon.directive';
import { OverlayEscapeDirective } from './overlay-escape.directive';
import { KeyActivateDirective } from '../../../pipes/key-activate.directive';

@NgModule({
  imports: [
    AccordionModule,
    BadgeModule,
    ButtonModule,
    CardModule,
    CascadeSelectModule,
    CheckboxModule,
    CommonModule,
    ConfirmDialogModule,
    FormsModule,
    DividerModule,
    DropdownModule,
    InputNumberModule,
    InputSwitchModule,
    InputTextModule,
    ListboxModule,
    MultiSelectModule,
    OrderListModule,
    PaginatorModule,
    RadioButtonModule,
    RippleModule,
    SelectButtonModule,
    SplitButtonModule,
    StyleClassModule,
    TableModule,
    TagModule,
    ToastModule,
    ToggleButtonModule,
    BlockUIModule,
    DataViewModule,
    TreeSelectModule,
    TooltipModule,
    FieldsetModule,
    DialogModule,
    OverlayPanelModule,
    DragDropModule,
    A11yModule,
    OverlayModule,
    ScrollingModule,
    RoCalculatorRoutingModule,
    StatusInputModule,
    IconUrlPipe,
    MonsterSpritePipe,
    MonsterTermPipe,
    CharSpritePipe,
    MissingSkillIconDirective,
    KeyActivateDirective,
    OverlayEscapeDirective,
  ],
  declarations: [
    RoCalculatorComponent,
    CalcValueComponent,
    PrettyJsonPipe,
    MonsterDataViewComponent,
    MiscDetailComponent,
    ItemSearchComponent,
    ElementalTableComponent,
    ElementalTableRawComponent,
    BattleDmgSummaryComponent,
    BattleMonsterSummaryComponent,
    BattleHudComponent,
    RotationListComponent,
    RotationTimelineComponent,
    AspdCurveComponent,
    ItemPickerOverlayComponent,
    EquipmentChipComponent,
    EquipmentSlotCardComponent,
    EquipmentGridComponent,
    ItemDescTooltipPipe,
    ItemDescTooltipFitDirective,
    ItemDescTooltipHoverDirective,
    TooltipClampDirective,
  ],
  exports: [CalcValueComponent],
})
export class RoCalculatorModule {}
