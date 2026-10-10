import { captureShareEntry } from './app/core/share-entry';
captureShareEntry(window.location.href);
const entry = new URL(window.location.href);
history.replaceState(history.state, '', `/${entry.search}${entry.hash || '#/'}`);
// The inline splash can paint while CSS downloads. Activate each stylesheet and
// wait for both CSS and code before mounting, so the editor is always styled.
const stylesReady = Promise.all([...document.querySelectorAll<HTMLLinkElement>('link[data-ro-styles]')].map(link => {
  if (link.sheet) { link.media = 'all'; return Promise.resolve(); }
  return new Promise<void>((resolve, reject) => {
    link.addEventListener('load', () => { link.media = 'all'; resolve(); }, { once: true });
    link.addEventListener('error', () => reject(new Error(`Failed to load stylesheet: ${link.href}`)), { once: true });
  });
}));
void Promise.all([stylesReady, import('./react/bootstrap')]).then(([, module]) => module.mountApplication()).catch(error => console.error(error));
