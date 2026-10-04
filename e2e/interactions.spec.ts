import { expect, Page, test } from '@playwright/test';

async function boot(page: Page) {
  await page.goto('/');
  await expect(page.locator('#ro-splash')).toHaveCount(0, { timeout: 40_000 });
}

test.beforeEach(async ({ page }) => {
  // Exercise the local long-link fallback without creating public short links.
  await page.route('https://short.latam-tools.com.br/**', route => route.abort());
  await page.addInitScript(() => {
    localStorage.setItem('theme', 'arya-orange');
    localStorage.setItem('colorScheme', 'light');
    localStorage.setItem('scale', '16');
    localStorage.setItem('ui-test-unrelated', 'keep-me');
    localStorage.setItem('ro-right-accordion-active', '[]');
  });
});

test('fixed appearance ignores old preferences while preserving stored data', async ({ page }) => {
  await boot(page);
  await expect(page.locator('html')).toHaveCSS('font-size', '14px');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(23, 33, 47)');
  await expect(page.getByRole('button', { name: 'Configurações' })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('ui-test-unrelated'))).toBe('keep-me');
  expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('arya-orange');
  await expect(page.getByRole('button', { name: 'ATQ 26', exact: true })).toBeVisible();
});

test('filter, keyboard selection, reset and focus restoration', async ({ page }) => {
  await boot(page);
  const strength = page.getByRole('combobox', { name: 'FOR', exact: true });
  await strength.click();
  const filter = page.getByRole('searchbox', { name: 'Filtrar opções' });
  await filter.fill('99');
  await expect(page.getByRole('option', { name: '99', exact: true })).toBeVisible();
  await filter.press('Enter');
  await expect(strength).toHaveText('99');
  await expect(strength).toBeFocused();
  await expect(page.getByRole('button', { name: 'ATQ 26', exact: true })).toHaveCount(0);
  await strength.press('ArrowDown');
  await expect(filter).toHaveValue('');
  await filter.press('Home'); await filter.press('Enter');
  await expect(strength).toHaveText('1');
  await expect(page.getByRole('button', { name: 'ATQ 26', exact: true })).toBeVisible();
});

test('nested selectors close one at a time and dialogs restore focus', async ({ page }) => {
  await boot(page);
  await page.getByRole('button', { name: 'Meus itens', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const category = page.getByRole('combobox', { name: 'Filtrar categoria' });
  await category.click();
  await expect(page.getByRole('searchbox', { name: 'Filtrar opções' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('.ui-select-pane')).toHaveCount(0);
  await expect(dialog).toBeVisible(); await expect(category).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Meus itens', exact: true })).toBeFocused();
});

for (const outcome of ['success', 'offline'] as const) {
  test(`share dialog finishes shortening without another interaction (${outcome})`, async ({ page }) => {
    await boot(page);
    const shortUrl = 'https://short.latam-tools.com.br/test12';
    let finishRequest!: () => void;
    const pending = new Promise<void>(resolve => { finishRequest = resolve; });
    await page.route('https://short.latam-tools.com.br/api/links', async route => {
      await pending;
      if (outcome === 'success') {
        await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ short_url: shortUrl }) });
      } else {
        await route.abort();
      }
    });

    const requested = page.waitForRequest('https://short.latam-tools.com.br/api/links');
    await page.getByRole('button', { name: 'Link', exact: true }).click();
    const longUrl = (await requested).postDataJSON().url;
    const dialog = page.getByRole('dialog', { name: 'Compartilhar simulação' });
    await expect(dialog.getByRole('textbox')).toHaveValue('Encurtando o link…');
    await expect(dialog.getByRole('button', { name: 'Copiar link' })).toBeDisabled();
    finishRequest();

    await expect(dialog.getByRole('textbox')).toHaveValue(outcome === 'success' ? shortUrl : longUrl);
    await expect(dialog.getByRole('button', { name: 'Copiar link' })).toBeEnabled();
  });
}

test('save, clear, load, confirmation cancel, share and import retain the build', async ({ page }) => {
  await boot(page);
  await page.getByRole('combobox', { name: 'FOR', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Filtrar opções' }).fill('99');
  await page.getByRole('option', { name: '99', exact: true }).click();
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await page.getByLabel('Nome da simulação').fill('UI migration test');
  await page.getByRole('dialog', { name: 'Salvar simulação' }).getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.locator('.ui-toast-message')).toContainText('salva');
  await page.getByRole('button', { name: 'Limpar', exact: true }).click();
  await page.getByRole('button', { name: 'Não', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'FOR', exact: true })).toHaveText('99');
  await page.getByRole('button', { name: 'Limpar', exact: true }).click();
  await page.getByRole('button', { name: 'Sim', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'FOR', exact: true })).toHaveText('1');
  await page.getByRole('button', { name: 'Simulações', exact: true }).click();
  await page.getByRole('button', { name: 'Carregar', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(2);
  await page.getByRole('button', { name: 'Sim', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'FOR', exact: true })).toHaveText('99');
  await page.getByRole('button', { name: 'Link', exact: true }).click();
  const share = page.getByRole('dialog', { name: 'Compartilhar simulação' }).getByRole('textbox');
  await expect(share).not.toHaveValue('Encurtando o link…');
  const url = await share.inputValue(); expect(url).toContain('http');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Importar', exact: true }).click();
  await page.getByPlaceholder('Link do simulador (também aceita link curto)').fill(url);
  await page.getByRole('button', { name: 'Importar link', exact: true }).click();
  await page.getByRole('button', { name: 'Substituir simulação atual', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'FOR', exact: true })).toHaveText('99');
});

test('item search supports cascading bonus selection, clearing, table pagination and row selection', async ({ page }) => {
  await boot(page);
  await page.getByRole('button', { name: 'Itens', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await page.getByRole('combobox', { name: 'Bônus 1', exact: true }).click();
  const first = page.locator('.ui-cascadeselect-items').first().locator(':scope > li > button').first();
  await first.focus(); await first.press('ArrowRight');
  const submenu = page.locator('.ui-cascadeselect-sublist');
  await expect(submenu).toBeVisible();
  await expect(submenu.getByRole('button').first()).toBeFocused();
  await submenu.getByRole('button').first().click();
  await page.locator('.ui-cascadeselect-sublist button:not([aria-expanded])').first().click();
  await expect(page.locator('.ui-select-pane')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Limpar seleção' }).click();
  await dialog.getByRole('button', { name: 'Buscar', exact: true }).click();
  const rows = dialog.locator('tbody tr');
  await expect(rows).toHaveCount(14);
  const firstPage = await rows.first().innerText();
  await dialog.getByRole('button', { name: 'Próxima página' }).click();
  await expect(rows.first()).not.toHaveText(firstPage);
  await rows.first().click(); await expect(rows.first()).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0);
});

test('long descriptions stay hoverable and inside the viewport while the page is scrolled', async ({ page }) => {
  await boot(page);
  await page.getByRole('button', { name: 'Topo', exact: true }).scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 240);
  await page.getByRole('button', { name: 'Topo', exact: true }).click();
  await page.getByPlaceholder('Filtrar…').fill('Kiwawa');
  const item = page.locator('.picker__row').filter({ hasText: 'Kiwawa' });
  await item.hover();
  const tooltip = page.getByRole('tooltip');
  await expect(tooltip).toContainText('Kiwawa');
  const rect = await tooltip.boundingBox();
  expect(rect.x).toBeGreaterThanOrEqual(0); expect(rect.y).toBeGreaterThanOrEqual(0);
  expect(rect.x + rect.width).toBeLessThanOrEqual(1920); expect(rect.y + rect.height).toBeLessThanOrEqual(918);
  await tooltip.hover(); await page.mouse.wheel(0, 400);
  await expect(tooltip).toBeVisible();
  expect(await tooltip.locator('.ui-tooltip-text').evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  await page.keyboard.press('Escape'); await expect(tooltip).toHaveCount(0);
  await expect(page.locator('.picker')).toBeVisible();
  await page.keyboard.press('Escape'); await expect(page.locator('.picker')).toHaveCount(0);
  const previous = await page.evaluate(() => window.scrollY);
  await page.mouse.move(1100, 850); await page.mouse.wheel(0, 350);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(previous);
});

test('replay file import opens the build choice and applies the recorded character', async ({ page }) => {
  await boot(page);
  await page.getByRole('button', { name: 'Importar', exact: true }).click();
  await page.locator('input[type="file"][accept=".rrf"]').setInputFiles('src/app/replay/__tests__/fixtures/shadowchaser-ofensiva-fatal.rrf');
  await expect(page.getByText('Replay de', { exact: false })).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Substituir simulação atual' }).click();
  await expect(page.getByRole('combobox', { name: 'Classe' })).toContainText('Renegado');
});

test('destroying a dialog with an open selector releases every scroll lock', async ({ page }) => {
  await boot(page);
  await page.mouse.move(1100, 850); await page.mouse.wheel(0, 250);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Meus itens', exact: true }).click();
  await page.getByRole('combobox', { name: 'Filtrar categoria' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Fechar', exact: true }).click();
  await expect(page.locator('.ui-overlay-pane')).toHaveCount(0);
  const previous = await page.evaluate(() => window.scrollY);
  await page.mouse.move(1100, 850); await page.mouse.wheel(0, 300);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(previous);
});

test('grouped monster selection, clearing and elemental table checkbox', async ({ page }) => {
  await boot(page);
  await page.getByRole('button', { name: 'Batalha', exact: true }).click();
  const hud = page.locator('app-battle-hud').first();
  await hud.getByRole('button', { name: 'Adicionar habilidade', exact: true }).click();
  await hud.locator('.rot-add-dd').click();
  await page.getByPlaceholder('Buscar por nome ou ID').fill('Ataque básico');
  await page.getByRole('option', { name: 'Ataque básico', exact: false }).click();
  await hud.locator('.el-tag-clickable').first().click();
  const checkbox = page.getByRole('checkbox', { name: 'Mostrar tabela elemental' });
  await checkbox.check(); await expect(checkbox).toBeChecked();
  await checkbox.uncheck(); await expect(checkbox).not.toBeChecked();
  const monsters = page.getByRole('combobox', { name: 'Escolher Monstros' });
  await monsters.click();
  await page.getByRole('searchbox', { name: 'Filtrar opções' }).fill('Poring');
  await expect(page.locator('.ui-multiselect-item-group').first()).toBeVisible();
  const option = page.getByRole('option', { name: /Poring/ }).first();
  await option.click(); await expect(option).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Escape');
  await expect(monsters).toContainText('Poring'); await expect(monsters).toBeFocused();
  await page.getByRole('button', { name: 'Limpar seleção' }).click();
  await expect(monsters).toHaveText('Escolher Monstros');
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('custom editor segmented controls and virtual options support keyboard selection', async ({ page }) => {
  await boot(page);
  await page.getByRole('button', { name: 'Meus itens', exact: true }).click();
  await page.getByRole('button', { name: 'Novo item', exact: true }).click();
  await page.getByRole('group', { name: 'Seções do item', exact: true }).getByRole('button', { name: 'Script', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Script', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Adicionar regra', exact: true }).click();
  await page.getByRole('button', { name: 'Adicionar condição', exact: true }).click();
  await page.getByRole('combobox', { name: 'Condição 1 do bônus 1' }).click();
  await page.getByRole('option', { name: 'Habilidade aprendida', exact: true }).click();
  const skill = page.getByRole('combobox', { name: 'Habilidade aprendida', exact: true });
  await skill.click();
  const filter = page.getByRole('searchbox', { name: 'Filtrar opções' });
  await filter.press('End');
  const viewport = page.locator('app-virtual-list');
  await expect.poll(() => viewport.evaluate(el => el.scrollTop)).toBeGreaterThan(1000);
  const last = await viewport.getByRole('option').last().innerText();
  await filter.press('Enter'); await expect(skill).toHaveText(last); await expect(skill).toBeFocused();
  await skill.click(); await page.getByRole('searchbox', { name: 'Filtrar opções' }).fill('zzzzzzzz');
  await expect(page.getByRole('option')).toHaveCount(0);
  await expect(page.getByText('Nenhum resultado encontrado', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'JSON bruto', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Script JSON do item' })).toBeVisible();
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);
});

for (const width of [1920, 390]) {
  test(`auto-cast effective-hit popup stays anchored to its row at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 918 });
    await boot(page);
    await page.getByRole('button', { name: 'Auto-conjuração', exact: true }).click();
    const trigger = page.locator('[data-auto-anchor="effective-hit"]');
    await trigger.scrollIntoViewIfNeeded();
    const anchor = await trigger.elementHandle();
    await trigger.click();
    const popup = page.locator('.ui-overlaypanel').filter({ hasText: 'Como o acerto efetivo é calculado' });
    await expect(popup).toBeVisible();
    expect(await anchor.evaluate(el => el.isConnected)).toBe(true);
    const source = await trigger.boundingBox();
    const panel = await popup.boundingBox();
    const center = source.x + source.width / 2;
    expect(center).toBeGreaterThanOrEqual(panel.x);
    expect(center).toBeLessThanOrEqual(panel.x + panel.width);
    const gap = Math.min(Math.abs(panel.y - source.y - source.height), Math.abs(source.y - panel.y - panel.height));
    expect(gap).toBeLessThanOrEqual(20);
    await page.keyboard.press('Escape');
    await expect(popup).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });
}

test('auto-cast damage, critical, DPS and details popups retain their source elements', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole('button', { name: 'Auto-conjuração', exact: true }).click();
  for (const kind of ['crit', 'damage-flat', 'dps', 'details']) {
    const trigger = page.locator(`[data-auto-source="basic-attack"][data-auto-anchor="${kind}"]`).first();
    await trigger.scrollIntoViewIfNeeded();
    const anchor = await trigger.elementHandle();
    await trigger.click();
    const popup = page.locator('.ui-overlaypanel');
    await expect(popup).toBeVisible();
    await page.mouse.move(0, 0);
    await expect(page.getByRole('tooltip')).toHaveCount(0);
    expect(await anchor.evaluate(el => el.isConnected)).toBe(true);
    await page.keyboard.press('Escape');
    await expect(popup).toHaveCount(0);
    await expect(trigger).toBeFocused();
  }
});
