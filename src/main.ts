import 'zone.js';
import { AppComponent } from './app/app.component';
import { importProvidersFrom, enableProdMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';

import { AppModule } from './app/app.module';
import { captureShareEntry } from './app/core/share-entry';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

// Before anything else: the router's first replaceState resolves '#/' against
// <base href="/"> and wipes the path, taking a /s/<token>/ share link with it.
captureShareEntry(window.location.href);

bootstrapApplication(AppComponent, { providers: [importProvidersFrom(AppModule)] })
  .catch(err => console.error(err));
