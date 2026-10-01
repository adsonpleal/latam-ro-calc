import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

/** Shared by production and development builds. Source datasets stay out of dist. */
export function copyWebAssets(root, output) {
  mkdirSync(output, { recursive: true });
  cpSync(resolve(root, 'src/assets'), resolve(output, 'assets'), {
    recursive: true,
    filter: path => !path.replaceAll('\\', '/').includes('/assets/demo/data'),
  });
  for (const name of ['favicon.ico', 'robots.txt', 'sitemap.xml', 'manifest.webmanifest', '_headers']) {
    if (existsSync(resolve(root, 'src', name))) cpSync(resolve(root, 'src', name), resolve(output, name));
  }
}
