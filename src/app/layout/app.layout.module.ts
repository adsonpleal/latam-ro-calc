import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { InputTextModule } from 'primeng/inputtext';
import { SidebarModule } from 'primeng/sidebar';
import { BadgeModule } from 'primeng/badge';
import { RadioButtonModule } from 'primeng/radiobutton';
import { InputSwitchModule } from 'primeng/inputswitch';
import { RippleModule } from 'primeng/ripple';
import { AppMenuComponent } from './app.menu.component';
import { AppMenuitemComponent } from './app.menuitem.component';
import { RouterModule } from '@angular/router';
import { AppTopBarComponent } from './app.topbar.component';
import { AppFooterComponent } from './app.footer.component';
import { AppConfigModule } from './config/config.module';
import { AppSidebarComponent } from './app.sidebar.component';
import { AppLayoutComponent } from './app.layout.component';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { ChipModule } from 'primeng/chip';
import { AccordionModule } from 'primeng/accordion';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { HelpImproveDialogComponent } from './help-improve/help-improve-dialog.component';
import { OverlayEscapeDirective } from './pages/ro-calculator/overlay-escape.directive';
import { StatusInputModule } from './pages/ro-calculator/status-input/status-input.module';

@NgModule({
  declarations: [
    AppMenuitemComponent,
    AppTopBarComponent,
    AppFooterComponent,
    AppMenuComponent,
    AppSidebarComponent,
    AppLayoutComponent,
    HelpImproveDialogComponent,
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpClientModule,
    BrowserAnimationsModule,
    InputTextModule,
    SidebarModule,
    BadgeModule,
    RadioButtonModule,
    InputSwitchModule,
    RippleModule,
    RouterModule,
    // Standalone, imported for its element selector: it is what puts this module's own
    // dialogs (Novidades, "Ajude o simulador", the saves and share dialogs) on the fast
    // Escape path. Without it they still close, but through PrimeNG's bubble-phase
    // listener — the half-second one — and they stay invisible to the layering rule.
    OverlayEscapeDirective,
    AppConfigModule,
    ButtonModule,
    DialogModule,
    ChipModule,
    AccordionModule,
    ConfirmDialogModule,
    ToastModule,
    CheckboxModule,
    InputTextareaModule,
    StatusInputModule,
  ],
  exports: [AppLayoutComponent],
})
export class AppLayoutModule {}
