import { captureShareEntry } from './app/core/share-entry';
captureShareEntry(window.location.href);
const entry = new URL(window.location.href);
history.replaceState(history.state, '', `/${entry.search}${entry.hash || '#/'}`);
void import('./react/bootstrap').then(module => module.mountApplication()).catch(error => console.error(error));
