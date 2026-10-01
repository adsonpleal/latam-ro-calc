import { expect, Page, test } from '@playwright/test';
import { join } from 'node:path';

// References were checked against the post-pull build (150eff06), then updated
// for the requested topbar/focus changes and fully loaded game images. Keep
// fonts/viewport/platform identical; only UI glyphs and settings are excluded.
test.beforeEach(async ({ page }) => {
  // CSS animation controls cannot freeze an APNG. Keep the game image and its
  // dimensions, but serve the same idle frame for every visual comparison.
  await page.route('https://assets.latam-tools.com.br/image?job=21067&action=0', route =>
    route.fulfill({ path: join(__dirname, 'fixtures/monster-21067.png'), contentType: 'image/png' }));
  await page.addInitScript(() => {
    localStorage.setItem('theme', 'vela-green');
    localStorage.setItem('colorScheme', 'dark');
    localStorage.setItem('scale', '14');
    localStorage.setItem('ro-right-accordion-active', '[]');
  });
  await page.goto('/');
  await expect(page.locator('#ro-splash')).toHaveCount(0, { timeout: 40_000 });
  await page.getByRole('button', { name: 'Importar', exact: true }).waitFor();
  await page.addStyleTag({ content: `
    .pi, .p-icon, app-icon, .ui-button-icon { visibility: hidden !important; }
    button[aria-label="Configurações"] { display: none !important; }
    *, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }
  ` });
});

// New controls can introduce images after boot (options, sprites, dialog icons).
// Wait at each assertion so a missing network response is not captured as a blank.
async function imagesReady(page: Page) {
  await expect.poll(
    () => page.locator('img:visible').evaluateAll(images => images.every(image =>
      (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0)),
    { message: 'Visible game images have loaded', timeout: 15_000 },
  ).toBe(true);
}

test('main calculator and narrow viewport retain their geometry', async ({ page }) => {
  await page.mouse.move(0, 0);
  await imagesReady(page);
  await expect.soft(page).toHaveScreenshot('calculator-desktop.png');
  await page.setViewportSize({ width: 390, height: 844 });
  await imagesReady(page);
  await expect.soft(page).toHaveScreenshot('calculator-narrow.png');
});

test('import, saves and custom library dialogs', async ({ page }) => {
  await page.getByRole('button', { name: 'Importar', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.mouse.move(0, 0);
  await imagesReady(page);
  await expect.soft(page).toHaveScreenshot('import.png');
  await page.getByRole('dialog').locator('button[aria-label="Fechar"], button.p-dialog-header-close').click();
  await page.getByRole('button', { name: 'Simulações', exact: true }).click();
  await page.mouse.move(0, 0);
  await imagesReady(page);
  await expect.soft(page).toHaveScreenshot('saved-simulations.png');
  await page.getByRole('dialog').locator('button[aria-label="Fechar"], button.p-dialog-header-close').click();
  await page.getByRole('button', { name: 'Meus itens', exact: true }).click();
  await page.mouse.move(0, 0);
  await imagesReady(page);
  const library = page.getByRole('dialog');
  await expect(library.locator('.p-dialog-header strong, .ui-dialog-header strong')).toHaveCSS('font-size', '14px');
  await expect(library.locator('.p-dialog-header strong, .ui-dialog-header strong')).toHaveCSS('font-weight', '700');
  await expect(library.getByRole('button', { name: 'Página 1', exact: true })).toHaveCount(0);
  expect((await library.boundingBox())!.height).toBeCloseTo(page.viewportSize()!.height * .9, 0);
  await expect.soft(page).toHaveScreenshot('custom-library.png');
});

test('stat selector and expanded calculator sections', async ({ page }) => {
  await page.locator('.status_input').first().locator('.p-dropdown, .ui-dropdown').click();
  await page.mouse.move(0, 0);
  await imagesReady(page);
  const statPanel = page.locator('.p-dropdown-panel, .ui-dropdown-panel');
  await expect(statPanel).toBeVisible();
  expect((await statPanel.boundingBox())!.width).toBe(100);
  await expect.soft(page).toHaveScreenshot('stat-selector.png');
  await page.keyboard.press('Escape');
  await page.locator('.p-accordion-header, .ui-accordion-header').filter({ hasText: 'Consumíveis' }).click();
  await page.mouse.move(0, 0);
  await imagesReady(page);
  await expect.soft(page).toHaveScreenshot('consumables.png');
});

test('item search', async ({ page }) => {
  await page.getByRole('button', { name: 'Itens', exact: true }).click();
  await page.mouse.move(0, 0);
  await imagesReady(page);
  await expect.soft(page).toHaveScreenshot('item-search.png');
});

test('equipment picker on a scrolled page', async ({ page }) => {
  await page.mouse.move(1100, 500);
  await page.mouse.wheel(0, 300);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(300);
  await page.getByRole('button', { name: 'Topo', exact: true }).click();
  await page.getByPlaceholder('Filtrar…').fill('Kiwawa');
  await expect(page.locator('.picker__row').filter({ hasText: 'Kiwawa' })).toBeVisible();
  await page.mouse.move(0, 0);
  await imagesReady(page);
  await expect.soft(page).toHaveScreenshot('equipment-picker.png');
  await page.locator('.picker__row').filter({ hasText: 'Kiwawa' }).hover();
  await page.locator('.item_desc_tooltip').waitFor();
  await imagesReady(page);
  await expect.soft(page.locator('.item_desc_tooltip .p-tooltip-text, .item_desc_tooltip .ui-tooltip-text')).toHaveScreenshot('equipment-description.png');
});

test('battle panel, skill picker and damage details', async ({ page }) => {
  await page.locator('.p-accordion-header, .ui-accordion-header').filter({ hasText: 'Batalha' }).click();
  const hud = page.locator('app-battle-hud').first();
  await hud.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  await imagesReady(page);
  await expect.soft(hud).toHaveScreenshot('battle.png');
  await hud.getByRole('button', { name: 'Adicionar habilidade', exact: true }).click();
  await hud.locator('.rot-add-dd').click();
  await page.getByPlaceholder('Buscar por nome ou ID').fill('Ataque básico');
  await page.mouse.move(0, 0);
  await imagesReady(page);
  await expect.soft(page.locator('.p-dropdown-panel:visible, .ui-dropdown-panel:visible')).toHaveScreenshot('skill-picker.png');
  await page.getByRole('option', { name: 'Ataque básico', exact: false }).click();
  await hud.locator('.rot-icon--btn').last().click();
  await page.mouse.move(0, 0);
  await imagesReady(page);
  await expect.soft(page.locator('.p-overlaypanel:visible, .ui-overlaypanel:visible')).toHaveScreenshot('battle-details.png');
});

test('confirmation and notification', async ({ page }) => {
  await page.getByRole('button', { name: 'Limpar', exact: true }).click();
  await page.mouse.move(0, 0);
  await imagesReady(page);
  await expect.soft(page).toHaveScreenshot('confirmation.png');
  await page.getByRole('button', { name: 'Sim', exact: true }).click();
  const toast = page.locator('.p-toast-message, .ui-toast-message');
  await expect(toast).toContainText('Simulação limpa');
  await page.mouse.move(0, 0);
  await imagesReady(page);
  await expect.soft(toast).toHaveScreenshot('notification.png');
});

test('narrow dialogs preserve their existing overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Importar', exact: true }).click();
  await page.mouse.move(0, 0);
  await imagesReady(page);
  await expect.soft(page).toHaveScreenshot('import-narrow.png');
  await page.getByRole('dialog').locator('button[aria-label="Fechar"], button.p-dialog-header-close').click();
  // The fixed toolbar is wider than a phone in the reference app. Open its
  // offscreen action before resizing, preserving that existing overflow.
  await page.setViewportSize({ width: 1920, height: 918 });
  await page.getByRole('button', { name: 'Itens', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.mouse.move(0, 0);
  await imagesReady(page);
  await expect.soft(page).toHaveScreenshot('item-search-narrow.png');
});
