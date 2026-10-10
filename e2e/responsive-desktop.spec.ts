import { expect, test } from '@playwright/test';
import { join } from 'node:path';

for (const [width, height] of [[1920, 918], [1600, 900], [1536, 864]]) {
  test(`desktop matches an immutable original at ${width}x${height}`, async ({ browser }, testInfo) => {
    test.skip(!process.env['UI_BASELINE_URL'], 'Supply the immutable original URL for same-platform comparison.');
    const states: Buffer[][] = [];
    for (const [name, url] of [['original', process.env['UI_BASELINE_URL']!], ['candidate', process.env['UI_TEST_URL'] || 'http://127.0.0.1:4200']]) {
      const context = await browser.newContext({ viewport: { width, height }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', colorScheme: 'dark' });
      try {
        await context.route('https://assets.latam-tools.com.br/image?job=21067&action=0', route => route.fulfill({ path: join(__dirname, 'fixtures/monster-21067.png'), contentType: 'image/png' }));
        const page = await context.newPage();
        await page.goto(url);
        await expect(page.locator('#ro-splash')).toHaveCount(0, { timeout: 40_000 });
        await page.evaluate(() => document.fonts.ready);
        await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}' });
        const captures: Buffer[] = [];
        const capture = async (state: string) => {
          await page.mouse.move(0, 0);
          await expect.poll(() => page.locator('img:visible').evaluateAll(images => images.every(image => (image as HTMLImageElement).complete))).toBe(true);
          // Let paint/focus updates settle identically on the two immutable builds.
          await page.waitForTimeout(500);
          const bytes = await page.screenshot({ path: testInfo.outputPath(`${name}-${state}.png`), fullPage: true });
          captures.push(bytes);
        };
        await capture('initial');
        await page.getByRole('button', { name: 'Importar', exact: true }).click();
        await expect(page.getByRole('dialog')).toBeVisible();
        await capture('import');
        await page.getByRole('dialog').getByRole('button', { name: 'Fechar', exact: true }).click();
        await page.getByRole('button', { name: 'Buscar itens', exact: true }).click();
        await expect(page.getByRole('dialog')).toBeVisible();
        await capture('search');
        states.push(captures);
      } finally { await context.close(); }
    }
    for (let state = 0; state < states[0].length; state++) expect(states[1][state].equals(states[0][state]), `Matched desktop state ${state}`).toBe(true);
  });
}
