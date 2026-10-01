import { FocusTrapDirective } from './focus-trap.directive';
import { VirtualListComponent } from './virtual-list.component';
import { ReorderDirective } from './reorder.directive';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from './icon.component';
import { UiTemplateDirective } from './template.directive';
import { UiButtonDirective, UiInputDirective, UiBadgeDirective, UiTagComponent, UiChipComponent, UiCardComponent, UiCheckboxComponent, UiSwitchComponent, UiSelectButtonComponent } from './primitives';
import { UiAccordionComponent, UiAccordionTabComponent } from './accordion';
import { UiDialogComponent } from './dialog.component';
import { UiPopoverComponent } from './popover.component';
import { UiTooltipDirective, UiTooltipContentComponent } from './tooltip.directive';
import { UiSelectComponent } from './select.component';
import { UiListboxComponent } from './listbox.component';
import { UiTableComponent, UiSelectableRowDirective } from './table.component';
import { UiToastComponent, UiConfirmDialogComponent, UiBlockComponent } from './notifications';

const declarations = [FocusTrapDirective, VirtualListComponent, ReorderDirective, IconComponent, UiTemplateDirective, UiButtonDirective, UiInputDirective, UiBadgeDirective,
  UiTagComponent, UiChipComponent, UiCardComponent, UiCheckboxComponent, UiSwitchComponent, UiSelectButtonComponent,
  UiAccordionComponent, UiAccordionTabComponent, UiDialogComponent, UiPopoverComponent, UiTooltipDirective,
  UiTooltipContentComponent, UiSelectComponent, UiListboxComponent, UiTableComponent, UiSelectableRowDirective,
  UiToastComponent, UiConfirmDialogComponent, UiBlockComponent];

@NgModule({ imports: [CommonModule], declarations, exports: declarations })
export class UiModule {}
