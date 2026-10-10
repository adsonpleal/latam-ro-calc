import { expect, chromium, Page, test } from '@playwright/test';
import { join } from 'node:path';

async function swipe(page: Page, x: number, from: number, to: number) {
  const client = await page.context().newCDPSession(page);
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: from }] });
  for (let step = 1; step <= 10; step++) {
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: from + (to - from) * step / 10 }] });
    await page.waitForTimeout(20);
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await client.detach();
}

async function swipeHorizontally(page: Page, y: number, from: number, to: number) {
  const client = await page.context().newCDPSession(page);
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from, y }] });
  for (let step = 1; step <= 10; step++) {
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from + (to - from) * step / 10, y }] });
    await page.waitForTimeout(20);
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await client.detach();
}

for (const [width, height] of [[320, 568], [390, 844], [768, 1024], [844, 390], [1920, 918]]) {
  test(`equipment inspection and elemental controls remain independent at ${width}x${height}`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: true, isMobile: width < 1536, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
    try {
      await context.route('https://assets.latam-tools.com.br/image?job=21067&action=0', route => route.fulfill({ path: join(__dirname, 'fixtures/monster-21067.png'), contentType: 'image/png' }));
      const page = await context.newPage();
      await page.goto(process.env['UI_TEST_URL'] || 'http://127.0.0.1:4200');
      await expect(page.locator('#ro-splash')).toHaveCount(0, { timeout: 40_000 });
      expect(await page.evaluate(() => navigator.maxTouchPoints > 0 && matchMedia('(hover: none)').matches && matchMedia('(pointer: coarse)').matches)).toBe(true);
      await page.getByRole('button', { name: 'Importar', exact: true }).tap();
      const chooser = page.waitForEvent('filechooser');
      await page.getByRole('button', { name: 'Selecionar arquivo', exact: true }).tap();
      await (await chooser).setFiles(join(__dirname, '../src/app/replay/__tests__/fixtures/wh-ilimitar.rrf'));
      await page.getByRole('button', { name: 'Substituir simulação atual', exact: true }).tap();
      await expect(page.getByRole('combobox', { name: 'FOR', exact: true })).toHaveText('12');
      const itemInfo = page.getByRole('button', { name: /^Informações: Gakkung/ }).first();
      await itemInfo.scrollIntoViewIfNeeded();
      await itemInfo.tap();
      const details = page.getByRole('dialog', { name: 'Informações', exact: true });
      await expect(details).toContainText('Gakkung');
      await details.getByRole('button', { name: 'Fechar', exact: true }).tap();

      await page.getByRole('combobox', { name: 'Monstro', exact: true }).first().tap();
      await page.getByPlaceholder('Buscar por nome ou ID (ex: 21361)').fill('20994');
      await page.getByRole('option').filter({ hasText: 'Betelgeuse' }).first().tap();
      const difficulty = page.getByRole('combobox', { name: 'Dificuldade do Betelgeuse', exact: true }).first();
      await difficulty.tap();
      await page.getByRole('option').filter({ hasText: /^Selado/ }).tap();
      await expect(difficulty).toHaveText(/Selado/);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      const difficultyTarget = (await difficulty.boundingBox())!;
      expect(difficultyTarget.x + difficultyTarget.width).toBeLessThanOrEqual(width);

      await page.getByRole('button', { name: /^Ver tabela elemental:/ }).first().tap();
      const dialog = page.getByRole('dialog');
      const toggle = dialog.getByRole('checkbox', { name: 'Mostrar tabela elemental', exact: true });
      await expect(toggle).toBeChecked();
      const label = dialog.getByText('Mostrar tabela elemental', { exact: true });
      const labelTarget = (await label.boundingBox())!;
      await label.tap({ position: { x: labelTarget.width - 2, y: labelTarget.height / 2 } });
      await expect(toggle).not.toBeChecked();
      await toggle.tap();
      await expect(toggle).toBeChecked();
      await dialog.getByRole('combobox', { name: 'Escolher Monstros', exact: true }).tap();
      await expect(page.locator('.ui-multiselect-panel')).toBeVisible();
      if (height < 400) {
        await page.getByRole('button', { name: 'Fechar opções', exact: true }).tap();
      } else {
        await dialog.locator('.ui-dialog-header').tap();
      }
      await expect(page.locator('.ui-multiselect-panel')).toHaveCount(0);
      const table = dialog.locator('.ui-datatable-wrapper').last();
      if (await table.evaluate(element => element.scrollWidth > element.clientWidth)) {
        await table.scrollIntoViewIfNeeded();
        const bounds = (await table.boundingBox())!;
        await swipeHorizontally(page, bounds.y + bounds.height / 2, bounds.x + bounds.width - 16, bounds.x + 16);
        expect(await table.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
      }
      expect(await page.evaluate(() => visualViewport!.offsetLeft)).toBe(0);
      expect(await page.evaluate(() => visualViewport!.scale)).toBe(1);
      expect(await page.evaluate(() => navigator.maxTouchPoints > 0 && matchMedia('(hover: none)').matches && matchMedia('(pointer: coarse)').matches)).toBe(true);
      await dialog.getByRole('button', { name: 'Fechar', exact: true }).tap();
    } finally { await context.close(); }
  });
}

for (const [width, height] of [[320, 568], [390, 844], [768, 1024], [820, 1180], [1024, 768], [1920, 918]]) {
  test(`lower-edge touch changes only the selected attribute at ${width}x${height}`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: true, isMobile: true });
    try {
      const page = await context.newPage();
      await page.goto(process.env['UI_TEST_URL'] || 'http://127.0.0.1:4200');
      await expect(page.locator('#ro-splash')).toHaveCount(0, { timeout: 40_000 });
      expect(await page.evaluate(() => navigator.maxTouchPoints > 0 && matchMedia('(hover: none)').matches && matchMedia('(pointer: coarse)').matches)).toBe(true);
      const strength = page.getByRole('combobox', { name: 'FOR', exact: true });
      await strength.scrollIntoViewIfNeeded();
      const target = (await strength.boundingBox())!;
      await page.touchscreen.tap(target.x + target.width / 2, target.y + target.height - 1);
      await page.getByRole('option', { name: '2', exact: true }).tap();
      await expect(strength).toHaveText('2');
      for (const label of ['AGI', 'VIT', 'INT', 'DES', 'SOR']) {
        await expect(page.getByRole('combobox', { name: label, exact: true })).toHaveText('1');
      }
      await expect(page.getByRole('combobox', { name: 'POD', exact: true })).toHaveText('0');
    } finally { await context.close(); }
  });
}

for (const [width, height] of [[320, 568], [390, 844], [768, 1024], [844, 390]]) {
  test(`imported rotation retains visible names and touch information at ${width}x${height}`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: true, isMobile: true, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
    try {
      await context.route('https://assets.latam-tools.com.br/image?job=21067&action=0', route => route.fulfill({ path: join(__dirname, 'fixtures/monster-21067.png'), contentType: 'image/png' }));
      const page = await context.newPage();
      await page.goto(process.env['UI_TEST_URL'] || 'http://127.0.0.1:4200');
      await expect(page.locator('#ro-splash')).toHaveCount(0, { timeout: 40_000 });
      await page.getByRole('button', { name: 'Importar', exact: true }).tap();
      const chooser = page.waitForEvent('filechooser');
      await page.getByRole('button', { name: 'Selecionar arquivo', exact: true }).tap();
      await (await chooser).setFiles(join(__dirname, '../src/app/replay/__tests__/fixtures/wh-ilimitar.rrf'));
      await page.getByRole('button', { name: 'Substituir simulação atual', exact: true }).tap();
      await expect(page.getByRole('combobox', { name: 'FOR', exact: true })).toHaveText('12');
      const row = page.locator('app-rotation-list .rot-row').first();
      await row.scrollIntoViewIfNeeded();
      await expect(row.locator('.rot-name')).toHaveText('Ataque Aéreo');
      expect((await row.locator('.rot-name').boundingBox())!.width).toBeGreaterThan(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      for (const target of await row.locator('.ui-touch-info').all()) {
        const box = (await target.boundingBox())!;
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width);
      }
      const info = row.locator('.rot-line2 .ui-touch-info').first();
      await info.tap();
      const details = page.getByRole('dialog', { name: 'Informações', exact: true });
      await expect(details).toContainText('Ver tabela elemental');
      await details.getByRole('button', { name: 'Fechar', exact: true }).tap();
      const elemental = row.getByRole('button', { name: 'Ver tabela elemental', exact: true });
      const elementalTarget = (await elemental.boundingBox())!;
      expect(elementalTarget.width).toBeGreaterThanOrEqual(44);
      expect(elementalTarget.height).toBeGreaterThanOrEqual(44);
      await elemental.tap();
      const table = page.getByRole('checkbox', { name: 'Mostrar tabela elemental' });
      await expect(table).toBeVisible();
      await expect(table).toBeChecked();
      await table.tap();
      await expect(table).not.toBeChecked();
      await table.tap();
      await expect(table).toBeChecked();
      await page.getByRole('dialog').getByRole('button', { name: 'Fechar', exact: true }).tap();
      const client = await context.newCDPSession(page);
      await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: width - 24, y: 200 }] });
      for (let step = 1; step <= 10; step++) {
        await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: width - 24 - (width - 48) * step / 10, y: 200 }] });
        await page.waitForTimeout(20);
      }
      await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await client.detach();
      expect(await page.evaluate(() => visualViewport!.offsetLeft)).toBe(0);
      expect(await page.evaluate(() => navigator.maxTouchPoints > 0 && matchMedia('(hover: none)').matches && matchMedia('(pointer: coarse)').matches)).toBe(true);
      const level = row.getByRole('combobox').first();
      const levelTarget = (await level.boundingBox())!;
      expect(levelTarget.width).toBeGreaterThanOrEqual(44);
      expect(levelTarget.height).toBeGreaterThanOrEqual(44);
      const pet = page.getByRole('button', { name: 'Pet', exact: true });
      expect((await pet.boundingBox())!.width).toBeGreaterThanOrEqual(44);
      await page.getByRole('button', { name: 'Habilidades', exact: true }).tap();
      for (const name of ['Adestrar Ave', 'Adestrar Worg']) {
        const skill = page.locator('.skill-control-row').filter({ has: page.getByRole('link', { name, exact: true }) });
        const enable = skill.getByRole('button', { name: 'Sim', exact: true });
        const enableTarget = (await enable.boundingBox())!;
        expect(enableTarget.width).toBeGreaterThanOrEqual(44);
        expect(enableTarget.height).toBeGreaterThanOrEqual(44);
        await enable.tap();
        await expect(enable).toHaveAttribute('aria-pressed', 'true');
      }
    } finally { await context.close(); }
  });
}

for (const [width, height] of [[320, 568], [390, 844], [768, 1024], [844, 390]]) {
  test(`touch inspection, equipment and overlay scrolling at ${width}x${height}`, async () => {
    const browser = await chromium.launch({ executablePath: process.env['PLAYWRIGHT_EXECUTABLE_PATH'],
      ...(process.env['HTTPS_PROXY'] ? { proxy: { server: process.env['HTTPS_PROXY'], bypass: '127.0.0.1,localhost' } } : {}) });
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: true, isMobile: true, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
    try {
      await context.route('https://assets.latam-tools.com.br/image?job=21067&action=0', route => route.fulfill({ path: join(__dirname, 'fixtures/monster-21067.png'), contentType: 'image/png' }));
      const page = await context.newPage();
      await page.goto(process.env['UI_TEST_URL'] || 'http://127.0.0.1:4200');
      await expect(page.locator('#ro-splash')).toHaveCount(0, { timeout: 40_000 });
      expect(await page.evaluate(() => navigator.maxTouchPoints > 0 && matchMedia('(hover: none)').matches && matchMedia('(pointer: coarse)').matches)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      const slot = page.locator('app-equipment-slot-card').filter({ has: page.locator('.eq-card__label', { hasText: /^Topo$/i }) }).first();
      await slot.getByRole('button', { name: 'Topo', exact: true }).tap();
      await page.getByPlaceholder('Filtrar…').tap();
      await page.getByPlaceholder('Filtrar…').fill('Kiwawa');
      const row = page.locator('.picker__row').filter({ hasText: 'Kiwawa' }).first();
      await expect(row).toBeVisible();
      const inspect = page.getByRole('button', { name: /^Informações:.*Kiwawa/ }).first();
      await expect(inspect).toBeVisible();
      const target = (await inspect.boundingBox())!;
      expect(target.width).toBeGreaterThanOrEqual(44);
      expect(target.height).toBeGreaterThanOrEqual(44);
      await inspect.tap();
      const details = page.getByRole('dialog', { name: 'Informações', exact: true });
      await expect(details).toContainText('Kiwawa');
      await expect(slot.getByRole('button', { name: 'Topo', exact: true })).toHaveCount(1);
      const geometry = (await details.boundingBox())!;
      expect(geometry.x).toBeGreaterThanOrEqual(0);
      expect(geometry.x + geometry.width).toBeLessThanOrEqual(width);
      expect(geometry.y + geometry.height).toBeLessThanOrEqual(height);
      const before = await page.evaluate(() => ({ left: visualViewport!.offsetLeft, top: visualViewport!.pageTop }));
      await swipe(page, geometry.x + geometry.width / 2, geometry.y + geometry.height - 30, geometry.y + 90);
      const after = await page.evaluate(() => ({ left: visualViewport!.offsetLeft, top: visualViewport!.pageTop }));
      expect(after).toEqual(before);
      await details.getByRole('button', { name: 'Fechar', exact: true }).tap();
      await expect(page.locator('.picker')).toBeVisible();
      await expect(slot.getByRole('button', { name: 'Topo', exact: true })).toHaveCount(1);
      await row.tap();
      await expect(slot.locator('.eq-chip--primary')).toContainText('Kiwawa');
      await slot.getByRole('button', { name: 'Limpar slot', exact: true }).tap();
      await expect(slot.getByRole('button', { name: 'Topo', exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Buscar itens', exact: true }).tap();
      const search = page.getByRole('dialog', { name: /Buscar itens/ });
      await search.getByRole('searchbox', { name: 'Nome', exact: true }).tap();
      await search.getByRole('searchbox', { name: 'Nome', exact: true }).fill('Anulus Ira');
      await search.getByRole('button', { name: 'Buscar', exact: true }).tap();
      await search.locator('tbody tr').filter({ hasText: 'Anulus Ira' }).first().tap();
      await expect(search.locator('.item-description-meta')).toContainText('Anulus Ira');
      await expect(search.locator('.item-search-description')).not.toBeEmpty();
      await search.getByRole('button', { name: 'Fechar', exact: true }).tap();
      await expect(page.locator('.ui-overlay-host')).toHaveCount(0);
    } finally { await context.close(); await browser.close(); }
  });
}
