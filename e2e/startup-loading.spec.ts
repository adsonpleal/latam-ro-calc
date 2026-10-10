import { expect, test } from '@playwright/test';

test('splash paints while styles load and the editor waits for them', async ({ page }) => {
  let finishStyles!: () => void;
  const stylesPending = new Promise<void>(resolve => { finishStyles = resolve; });
  await page.route('**/*.css', async route => { await stylesPending; await route.continue(); });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#ro-splash')).toBeVisible();
  await expect(page.locator('html')).toHaveCSS('font-size', '14px');
  await expect(page.locator('app-ro-calculator')).toHaveCount(0);
  finishStyles();
  await expect(page.locator('#ro-splash')).toHaveCount(0, { timeout: 40_000 });
  await expect(page.getByRole('button', { name: 'ATQ 26', exact: true })).toBeVisible();
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(23, 33, 47)');
});

test('calculator becomes usable before optional descriptions and history arrive', async ({ page }) => {
  let finishDescriptions!: () => void;
  const descriptionsPending = new Promise<void>(resolve => { finishDescriptions = resolve; });
  const requested: string[] = [];
  page.on('request', request => requested.push(request.url()));
  await page.route('**/assets/data/*-desc*.json', async route => { await descriptionsPending; await route.continue(); });
  await page.route('**/assets/data/skill-descriptions*.json', async route => { await descriptionsPending; await route.continue(); });
  await page.goto('/');
  await expect(page.locator('#ro-splash')).toHaveCount(0, { timeout: 40_000 });
  await expect(page.getByRole('button', { name: 'ATQ 26', exact: true })).toBeVisible();

  const files = await page.evaluate(() => {
    const boot = window as Window & { __RO_DATA__?: { files: Record<string, string> } };
    return boot.__RO_DATA__?.files;
  });
  expect(files).toBeDefined();
  await expect.poll(() => requested.some(url => url.includes(files!.skillDescriptions))).toBe(true);
  const preloadLinks = await page.locator('link[rel="modulepreload"]').evaluateAll(links => links.map(link => (link as HTMLLinkElement).href));
  const initialChunks = requested.filter(url => /\/chunk-.*\.js$/.test(url));
  expect(initialChunks.every(url => preloadLinks.includes(url))).toBe(true);

  finishDescriptions();
  await page.getByRole('button', { name: 'Novidades', exact: true }).click();
  await expect(page.getByRole('dialog').getByText('Histórico original (pré-fork) →')).toBeVisible();
  await expect(page.getByRole('dialog').locator('li')).not.toHaveCount(0);
  expect(requested.filter(url => /\/chunk-.*\.js$/.test(url)).some(url => !preloadLinks.includes(url))).toBe(true);
});
