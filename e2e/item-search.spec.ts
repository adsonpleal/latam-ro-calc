import { expect, Page, Route, test } from '@playwright/test';
import { ITEM_SEARCH_BONUS_OPTIONS } from '../src/app/core/item-search';

async function openSearch(page: Page) {
  await page.goto('/');
  await expect(page.locator('#ro-splash')).toHaveCount(0, { timeout: 40_000 });
  await page.getByRole('button', { name: 'Buscar itens', exact: true }).click();
  return page.getByRole('dialog', { name: /Buscar itens/ });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ro-right-accordion-active', '[]'));
});

test('search dropdowns expose all bonus and type options, and bonus rows have no four-picker cap', async ({ page }) => {
  const dialog = await openSearch(page);
  const types = dialog.getByRole('combobox', { name: 'Tipo', exact: true });
  await types.click();
  await expect(page.getByRole('option').locator('img')).toHaveCount(26);
  await expect.poll(() => page.getByRole('option').locator('img').evaluateAll(images => images.every(image => (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
  expect(await page.getByRole('option').allTextContents()).toEqual([
    'Arma', 'Munição', 'Carta de Arma', 'Escudo', 'Carta de Escudo', 'Topo', 'Meio', 'Baixo', 'Carta de Cabeça',
    'Pedra de Encantamento', 'Armadura', 'Carta de Armadura', 'Capa', 'Carta de Capa', 'Botas', 'Carta de Botas',
    'Acessório', 'Carta de Acessório', 'Pet', 'Visual', 'Arma Sombria', 'Armadura Sombria', 'Escudo Sombrio',
    'Botas Sombrias', 'Brinco Sombrio', 'Pingente Sombrio',
  ]);
  await page.getByRole('option', { name: 'Arma', exact: true }).click();
  await page.getByRole('option', { name: 'Escudo', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(types).toHaveText('Arma, Escudo');
  await dialog.getByRole('combobox', { name: 'Habilidade', exact: true }).click();
  expect(await page.getByRole('option').count()).toBeGreaterThan(0);
  await expect(page.getByRole('option').locator('img')).toHaveCount(await page.getByRole('option').count());
  await expect.poll(() => page.getByRole('option').locator('img').evaluateAll(images => images.every(image => (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
  await page.getByRole('option').first().click();
  await page.getByRole('option').nth(1).click();
  await page.keyboard.press('Escape');

  const firstBonus = dialog.getByRole('combobox', { name: 'Bônus 1', exact: true });
  await firstBonus.click();
  expect(await page.getByRole('option').allTextContents()).toEqual(ITEM_SEARCH_BONUS_OPTIONS.map(option => option.label));
  await page.getByRole('searchbox', { name: 'Filtrar opções' }).fill('Redução de Recarga');
  await page.getByRole('option', { name: 'Redução de Recarga', exact: true }).click();
  await expect(firstBonus).toHaveText('Redução de Recarga');
  for (let n = 0; n < 7; n++) await dialog.getByRole('button', { name: 'Adicionar bônus', exact: true }).click();
  await expect(dialog.getByRole('combobox', { name: /^Bônus \d+$/ })).toHaveCount(8);
  await dialog.getByRole('button', { name: 'Remover bônus 2', exact: true }).click();
  await expect(dialog.getByRole('combobox', { name: /^Bônus \d+$/ })).toHaveCount(7);
  await expect(firstBonus).toHaveText('Redução de Recarga');
  await dialog.locator('.item-search-bonus-row').first().getByRole('button', { name: 'Limpar seleção' }).click();
  await expect(firstBonus).toHaveText('Bônus 1');
  for (let n = 0; n < 6; n++) await dialog.getByRole('button', { name: 'Remover bônus 2', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Remover bônus 1' })).toHaveCount(0);
  const mode = dialog.getByRole('group', { name: 'Item deve incluir todos os bônus selecionados', exact: true });
  await mode.getByRole('button', { name: 'Sim', exact: true }).click();
  await expect(mode.getByRole('button', { name: 'Sim', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await mode.getByRole('button', { name: 'Não', exact: true }).click();
  await expect(mode.getByRole('button', { name: 'Não', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
});

test('name searches require submission, clear selection, preserve filters on reopen, and fit narrow screens', async ({ page }) => {
  const dialog = await openSearch(page);
  const name = dialog.getByRole('searchbox', { name: 'Nome', exact: true });
  await dialog.getByRole('button', { name: 'Buscar', exact: true }).click();
  await expect(dialog.locator('tbody tr')).toHaveCount(14);
  await dialog.locator('tbody tr').first().click();
  await expect(dialog.locator('.item-description-meta')).toBeVisible();
  await name.fill('nome que não existe em nenhum item');
  await expect(dialog.locator('tbody tr')).toHaveCount(14);
  await name.press('Enter');
  await expect(dialog.locator('.item-description-meta')).toHaveCount(0);
  await expect(dialog.getByText('Nenhum item encontrado.', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Buscar itens', exact: true }).click();
  await expect(name).toHaveValue('nome que não existe em nenhum item');
  await name.fill('');
  await name.press('Enter');
  await expect(dialog.locator('tbody tr')).toHaveCount(14);
  await page.setViewportSize({ width: 390, height: 844 });
  const overflow = await dialog.evaluate(element => element.scrollWidth - element.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(dialog.getByRole('combobox', { name: 'Tipo', exact: true })).toBeVisible();
  await dialog.getByRole('combobox', { name: 'Bônus 1', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Filtrar opções' }).fill('ATQ');
  await page.getByRole('searchbox', { name: 'Filtrar opções' }).press('Enter');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('combobox', { name: 'Bônus 1', exact: true })).toBeFocused();
});

test('a selected item gains its formatted description when the delayed dataset arrives', async ({ page }) => {
  let pendingDescription: Route | undefined;
  await page.route('**/items-desc*.json', route => { pendingDescription = route; });
  const dialog = await openSearch(page);
  await expect.poll(() => !!pendingDescription).toBe(true);
  await dialog.getByRole('button', { name: 'Buscar', exact: true }).click();
  await dialog.locator('tbody tr').first().click();
  const idLink = dialog.getByRole('link', { name: /^Item ID:/ });
  const id = (await idLink.innerText()).replace('Item ID: ', '');
  await expect(dialog.locator('.item-search-description')).toBeEmpty();
  await pendingDescription!.fulfill({ json: { [id]: 'Descrição carregada após selecionar o item\n^FF0000<b>ATQ +10</b><script>window.itemSearchUnsafe = true</script>' } });
  await expect(dialog.locator('.item-search-description')).toContainText('Descrição carregada após selecionar o item');
  await expect(dialog.locator('.item-search-description b')).toHaveText('ATQ +10');
  await expect(dialog.locator('.item-search-description br')).toHaveCount(1);
  await expect(dialog.locator('.item-search-description font')).toHaveAttribute('color', '#FF0000');
  await expect(dialog.locator('.item-search-description script')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).itemSearchUnsafe)).toBeUndefined();
  await dialog.locator('tbody tr').first().click();
  await expect(dialog.locator('.item-description-meta')).toHaveCount(0);
});

const equipmentCard = (page: Page, label: string) => page.locator('.eq-card').filter({
  has: page.locator('.eq-card__label').filter({ hasText: new RegExp('^' + label + '$') }),
});

test('equipment picker opens full search with its type selected and equips the chosen item', async ({ page }) => {
  await page.goto('/');
  const card = equipmentCard(page, 'Topo');
  await card.getByRole('button', { name: 'Topo', exact: true }).click();
  await page.locator('.picker').getByRole('button', { name: 'Buscar itens', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: /Buscar itens/ });
  await expect(page.locator('.picker')).toHaveCount(0);
  await expect(dialog.getByRole('combobox', { name: 'Tipo', exact: true })).toHaveText('Topo');
  await expect(dialog.locator('tbody tr')).toHaveCount(14);
  await dialog.locator('tbody tr').first().click();
  const id = (await dialog.getByRole('link', { name: /^Item ID:/ }).innerText()).replace('Item ID: ', '');
  await expect(dialog.getByRole('combobox', { name: 'Equipar em', exact: true })).toHaveText('Topo');
  await dialog.getByRole('button', { name: 'Equipar', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(card.locator('.eq-card__icon img').first()).toHaveAttribute('src', new RegExp('/' + id + '\.png$'));
  // The destination's normal picker must now identify the item as selected.
  await card.locator('.eq-chip--primary').first().click();
  await expect(page.locator('.picker__row--selected')).toContainText(await card.locator('.eq-chip--primary .eq-chip__text').first().innerText());
  await page.keyboard.press('Escape');
});

test('global search equips an accessory in the selected compatible side', async ({ page }) => {
  const dialog = await openSearch(page);
  await dialog.getByRole('searchbox', { name: 'Nome', exact: true }).fill('Broche');
  await dialog.getByRole('searchbox', { name: 'Nome', exact: true }).press('Enter');
  await dialog.locator('tbody tr').first().click();
  const id = (await dialog.getByRole('link', { name: /^Item ID:/ }).innerText()).replace('Item ID: ', '');
  const destination = dialog.getByRole('combobox', { name: 'Equipar em', exact: true });
  await destination.click();
  await page.getByRole('option', { name: 'Acess. Dir.', exact: true }).click();
  await dialog.getByRole('button', { name: 'Equipar', exact: true }).click();
  await expect(equipmentCard(page, 'Acess. Dir.').locator('.eq-card__icon img').first()).toHaveAttribute('src', new RegExp('/' + id + '\.png$'));
  await expect(equipmentCard(page, 'Acess. Esq.').locator('.eq-card__icon img')).toHaveCount(0);
});

test('full search from comparison equips only the comparison and cancellation preserves equipment', async ({ page }) => {
  await page.goto('/');
  const card = equipmentCard(page, 'Topo');
  await card.locator('.eq-card__compare').click();
  await card.locator('.eq-card__compare-row').getByRole('button', { name: 'Topo', exact: true }).click();
  const search = page.locator('.picker').getByRole('button', { name: 'Buscar itens', exact: true });
  // The full-search action remains usable by keyboard inside the picker.
  await search.focus(); await search.press('Enter');
  const dialog = page.getByRole('dialog', { name: /Buscar itens/ });
  await expect(dialog.getByRole('combobox', { name: 'Tipo', exact: true })).toHaveText('Topo');
  await dialog.locator('tbody tr').first().click();
  const id = (await dialog.getByRole('link', { name: /^Item ID:/ }).innerText()).replace('Item ID: ', '');
  await dialog.getByRole('button', { name: 'Equipar na comparação', exact: true }).click();
  await expect(card.locator('.eq-card__compare-row .eq-card__icon img')).toHaveAttribute('src', new RegExp('/' + id + '\.png$'));
  await expect(card.locator('.eq-card__body').first().locator('.eq-card__icon img')).toHaveCount(0);
  await card.locator('.eq-card__compare-row .eq-chip--primary').first().click();
  await page.locator('.picker').getByRole('button', { name: 'Buscar itens', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('.picker')).toHaveCount(0);
  await expect(card.locator('.eq-card__compare-row .eq-card__icon img')).toHaveAttribute('src', new RegExp('/' + id + '\.png$'));
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
});
