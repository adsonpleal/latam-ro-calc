import { build } from 'esbuild';
import { basename, resolve } from 'node:path';
import { expect, test } from '@playwright/test';

const assets = new Map<string, Uint8Array>();
test.beforeAll(async () => {
  const result = await build({ entryPoints: ['e2e/fixtures/react-application.tsx'], absWorkingDir: process.cwd(),
    outdir: resolve('.tmp/react-application'), entryNames: 'application', bundle: true, format: 'esm', jsx: 'automatic', write: false,
    define: { 'process.env.NODE_ENV': '"development"' }, metafile: true });
  expect(Object.keys(result.metafile!.inputs).filter(file => /node_modules.*(?:@angular|rxjs|zone\.js)/.test(file))).toEqual([]);
  for (const file of result.outputFiles!) assets.set(basename(file.path), file.contents);
});
test('complete React screen boots with the existing data and opens the retained workflows', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => { errors.push(error.message); console.error(error.stack); });
  page.on('console', message => { if (message.type() === 'error') console.error(message.text()); });
  await page.route('**/__react_application__/**', async route => {
    const name = basename(new URL(route.request().url()).pathname);
    const asset = assets.get(name);
    if (asset) { await route.fulfill({ body: Buffer.from(asset), contentType: name.endsWith('.css') ? 'text/css' : 'text/javascript' }); return; }
    await route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="pt-BR"><head><base href="/"><link rel="stylesheet" href="/__react_application__/application.css"></head><body><app-root></app-root><script type="module" src="/__react_application__/application.js"></script></body></html>' });
  });
  await page.goto('/__react_application__/');
  await expect(page.locator('app-equipment-grid')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Novidades', exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('ro-set'))).not.toBeNull();
  await expect.poll(() => errors).toEqual([]);
  await page.getByRole('button', { name: 'Novidades', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.locator('.status_input').first().locator('.ui-dropdown').click();
  await expect(page.locator('.ui-dropdown-panel')).toBeVisible();
  await expect.poll(() => errors).toEqual([]);
});
