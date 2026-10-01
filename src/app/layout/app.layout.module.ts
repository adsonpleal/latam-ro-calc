import { UiModule } from 'src/app/ui/ui.module';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { AppMenuComponent } from './app.menu.component';
import { AppMenuitemComponent } from './app.menuitem.component';
import { RouterModule } from '@angular/router';
import { AppTopBarComponent } from './app.topbar.component';
import { AppFooterComponent } from './app.footer.component';
import { AppSidebarComponent } from './app.sidebar.component';
import { AppLayoutComponent } from './app.layout.component';
import { HelpImproveDialogComponent } from './help-improve/help-improve-dialog.component';
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
    UiModule,
    CommonModule,
    FormsModule,
    HttpClientModule,
    RouterModule,
    StatusInputModule,
  ],
  exports: [AppLayoutComponent],
})
export class AppLayoutModule {}
