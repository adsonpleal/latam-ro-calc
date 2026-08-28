import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';
import { TooltipModule } from 'primeng/tooltip';
import { KeyActivateDirective } from '../../../../pipes/key-activate.directive';
import { OverlayEscapeDirective } from '../overlay-escape.directive';
import { StatusInputComponent } from './status-input.component';

/**
 * The labelled stat picker used by the calculator's FOR/AGI/.../CRV fields.
 *
 * Packaged as its own module because the "Ajude o simulador" dialog (in the
 * layout module) asks for the same trait values and has to look identical —
 * two hand-rolled lookalikes drift apart the moment either is restyled.
 */
@NgModule({
  declarations: [StatusInputComponent],
  // KeyActivateDirective and OverlayEscapeDirective are standalone, hence imported
  // rather than declared.
  imports: [CommonModule, FormsModule, DropdownModule, TooltipModule, KeyActivateDirective, OverlayEscapeDirective],
  exports: [StatusInputComponent],
})
export class StatusInputModule {}
