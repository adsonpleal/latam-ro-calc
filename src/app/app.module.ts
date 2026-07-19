import { LOCALE_ID, NgModule } from '@angular/core';
import { HashLocationStrategy, LocationStrategy, registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { AppLayoutModule } from './layout/app.layout.module';
import { RoService } from './api-services/ro.service';
import { PrettyJsonPipe } from './layout/prettier-json.pipe';

// The UI is pt-BR, so numbers must read "1.234,5" — not Angular's default en-US
// "1,234.5". This one provider covers every `| number` in every template; the code
// paths that build display strings by hand use utils/format-number.ts instead.
registerLocaleData(localePt);

const customComponent = [PrettyJsonPipe];

@NgModule({
  declarations: [AppComponent],
  imports: [AppRoutingModule, AppLayoutModule],
  providers: [{ provide: LocationStrategy, useClass: HashLocationStrategy }, { provide: LOCALE_ID, useValue: 'pt-BR' }, RoService, ...customComponent],
  bootstrap: [AppComponent],
})
export class AppModule {}
