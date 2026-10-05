import { expect, test } from '@playwright/test';

// https://issues.latam-tools.com.br/t/urhhrh4gOPKVBUWIj89E
for (const compare of [false, true]) {
  test(`equipment random bonuses survive category navigation (${compare ? 'comparison' : 'build'})`, async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('ro-right-accordion-active', '[]'));
    await page.goto('/');
    await expect(page.locator('#ro-splash')).toHaveCount(0, { timeout: 40_000 });
    await page.getByRole('combobox', { name: 'Classe', exact: true }).click();
    await page.getByRole('searchbox', { name: 'Filtrar opções' }).fill('Renegado');
    await page.getByRole('option', { name: 'Renegado', exact: true }).click();
    const weapon = page.locator('app-equipment-slot-card').filter({ has: page.locator('.eq-card__label', { hasText: /^Arma$/ }) });
    await weapon.getByRole('button', { name: 'Arma', exact: true }).click();
    await page.getByPlaceholder('Filtrar…').fill('Faca');
    await page.getByRole('button', { name: 'Faca [3]', exact: true }).click();
    if (compare) await weapon.getByRole('button', { name: 'Comparar', exact: true }).click();
    const build = weapon.locator('.eq-card__body').first();
    const side = compare ? weapon.locator('.eq-card__compare-row') : build;
    const delay = page.locator('.ss_label:text-is("Pós-conjuração") + .ss_value');
    await side.getByRole('button', { name: 'Bônus 1', exact: true }).click();
    const picker = page.locator('app-item-picker-overlay');
    await picker.getByRole('button', { name: 'Pós-conjuração ›', exact: true }).click();
    await expect(picker).toBeVisible();
    await picker.getByRole('button', { name: 'Pós-conjuração 1 - 10 % ›', exact: true }).click();
    await expect(picker).toBeVisible();
    // Returning to a breadcrumb replaces the clicked row too.
    await picker.getByRole('button', { name: 'Pós-conjuração', exact: true }).click();
    await expect(picker.getByRole('button', { name: 'Pós-conjuração 1 - 10 % ›', exact: true })).toBeVisible();
    await picker.getByRole('button', { name: 'Pós-conjuração 1 - 10 % ›', exact: true }).click();
    await picker.getByRole('button', { name: 'Pós-conjuração -10 %', exact: true }).click();
    await expect(picker).toHaveCount(0);
    await expect(side.getByRole('button', { name: 'Pós-conjuração -10 %', exact: true })).toBeVisible();
    if (compare) await expect(build.getByRole('button', { name: 'Bônus 1', exact: true })).toBeVisible();
    await expect(delay.locator(compare ? '.ss_delta' : '.ss_value_text')).toContainText('-10%');
    if (compare) {
      await expect(delay.locator('.ss_value_text')).toHaveText('0%');
    } else {
      await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('ro-set')!).rawOptionTxts[0])).toBe('acd:10');
      await page.reload();
      await expect(side.getByRole('button', { name: 'Pós-conjuração -10 %', exact: true })).toBeVisible();
      await expect(delay.locator('.ss_value_text')).toHaveText('-10%');
    }

    await side.getByRole('button', { name: 'Pós-conjuração -10 %', exact: true }).click();
    await picker.getByPlaceholder('Filtrar…').fill('Pós-conjuração -20');
    await picker.getByRole('button', { name: 'Pós-conjuração -20 %', exact: true }).click();
    await expect(side.getByRole('button', { name: 'Pós-conjuração -20 %', exact: true })).toBeVisible();
    await expect(delay.locator(compare ? '.ss_delta' : '.ss_value_text')).toContainText('-20%');
    await side.getByRole('button', { name: 'Pós-conjuração -20 %', exact: true }).click();
    await picker.getByRole('button', { name: 'Nenhum', exact: true }).click();
    await expect(side.getByRole('button', { name: 'Bônus 1', exact: true })).toBeVisible();
    await expect(delay.locator('.ss_value_text')).toHaveText('0%');
    if (compare) await expect(delay.locator('.ss_delta')).toHaveCount(0);

    // Genuine outside clicks still dismiss the picker and preserve the empty slot.
    await side.getByRole('button', { name: 'Bônus 1', exact: true }).click();
    await page.locator('.ui-overlay-backdrop').click({ position: { x: 1, y: 1 } });
    await expect(picker).toHaveCount(0);
    await expect(side.getByRole('button', { name: 'Bônus 1', exact: true })).toBeFocused();
  });
}
