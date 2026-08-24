import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { captureShareEntry } from './app/core/share-entry';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

// Before anything else: the router's first replaceState resolves '#/' against
// <base href="/"> and wipes the path, taking a /s/<token>/ share link with it.
captureShareEntry(window.location.href);

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
