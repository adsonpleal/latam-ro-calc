import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ro-right-accordion-active', '[]'));
  await page.goto('/');
  await expect(page.locator('#ro-splash')).toHaveCount(0, { timeout: 40_000 });
});

for (const width of [1920, 390]) {
  test(`auto-cast shared monster card keeps its layout at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 918 });
    await page.getByRole('button', { name: 'Auto-conjuração', exact: true }).click();
    const section = page.getByRole('region', { name: 'Auto-conjuração', exact: true });
    const card = section.locator('app-battle-monster-card');
    await expect(card.locator('.hud-monster-head')).toHaveCSS('display', 'flex');
    await expect(card.locator('.hud-mstats')).toHaveCSS('display', 'grid');
    await expect(card.locator('.ui-card-body').first()).toHaveCSS('padding', '0px');
    await expect(card.locator('.ui-card-content').first()).toHaveCSS('display', 'flex');
    const box = (await card.boundingBox())!;
    expect(box.height).toBeLessThan(width === 390 ? 520 : 400);
    if (width === 390) expect(box.width).toBeLessThanOrEqual(390);
    const stats = (await card.locator('.hud-band-right').boundingBox())!;
    expect(stats.x + stats.width).toBeLessThanOrEqual(box.x + box.width + 1);
    await expect(section.getByRole('link', { name: 'Bug ou sugestão', exact: true })).toHaveClass(/ui-button/);
    await expect(section.getByRole('button', { name: 'Fórmula ou cálculo', exact: true })).toBeVisible();
  });
}

test('custom-item library and editor keep icons inline and preview in its column', async ({ page }) => {
  await page.getByRole('button', { name: 'Meus itens', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const headerIcon = dialog.locator('.ui-dialog-header img');
  await expect(headerIcon).toHaveCSS('position', 'static');
  const heading = (await dialog.locator('.ui-dialog-header strong').boundingBox())!;
  const icon = (await headerIcon.boundingBox())!;
  expect(icon.x + icon.width).toBeLessThanOrEqual(heading.x);
  expect(Math.abs(icon.y + icon.height / 2 - heading.y - heading.height / 2)).toBeLessThan(2);
  await dialog.getByRole('button', { name: 'Novo item', exact: false }).click();
  await expect(headerIcon).toHaveCSS('position', 'static');
  await expect(dialog.locator('.studio-preview .item_img').first()).toHaveCSS('position', 'static');
  const editor = (await dialog.locator('.studio-main').boundingBox())!;
  const preview = (await dialog.locator('.studio-preview').boundingBox())!;
  expect(preview.x).toBeGreaterThanOrEqual(editor.x + editor.width);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(dialog.locator('.studio-preview')).toBeHidden();
  expect((await dialog.boundingBox())!.width).toBeLessThanOrEqual(390);
});

test('mobile viewport has no horizontal overflow and supports menu drawer, sticky HUD, and bottom-sheet item preview', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  const menuBtn = page.getByRole('button', { name: 'Menu', exact: true });
  await expect(menuBtn).toBeVisible();
  await menuBtn.click();
  const menuDialog = page.getByRole('dialog', { name: 'Menu e Configurações', exact: true });
  await expect(menuDialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menuDialog).toHaveCount(0);

  const mobileHud = page.getByRole('region', { name: 'Resumo rápido de dano e navegação', exact: true });
  await expect(mobileHud).toBeVisible();
  await expect(mobileHud.getByRole('button', { name: 'Ir para Build', exact: true })).toBeVisible();
  await expect(mobileHud.getByRole('button', { name: 'Ir para Batalha', exact: true })).toBeVisible();

  const head = page.locator('.eq-card').filter({ has: page.locator('.eq-card__label').filter({ hasText: /^Topo$/ }) });
  await head.getByRole('button', { name: 'Topo', exact: true }).click();
  const picker = page.locator('.picker');
  await expect(picker).toBeVisible();
  const filter = picker.getByPlaceholder('Filtrar…');
  await filter.fill('Kiwawa');
  const row = picker.locator('.picker__row').filter({ hasText: 'Kiwawa' }).first();
  await expect(row).toBeVisible();
  await row.locator('.picker__info').click();
  await expect(picker.locator('.picker__preview')).toBeVisible();
  await expect(picker).toBeVisible();
  await filter.fill('Chapéu');
  await expect(picker.locator('.picker__preview')).toHaveCount(0);
  await picker.locator('.picker__row').filter({ hasText: 'Chapéu' }).first().click();
  await expect(picker).toHaveCount(0);
});
