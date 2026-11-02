import { expect, Locator, Page, test } from '@playwright/test';

/**
 * The comparison strip above the rotation card. The session spec owns the state rules;
 * what this covers is the part only a browser can answer — that the strip is drawn, that
 * the "+" is reachable, and that switching tabs really swaps the rotation and the figures
 * the panel solves from it.
 */
async function boot(page: Page) {
  await page.addInitScript(() => localStorage.setItem('ro-right-accordion-active', '[]'));
  await page.goto('/');
  await expect(page.locator('#ro-splash')).toHaveCount(0, { timeout: 40_000 });
  await page.getByRole('button', { name: 'Batalha', exact: true }).click();
  // Two instances of the panel live in the tree — PVP's and this one — and only the open
  // accordion's is visible.
  const hud = page.locator('app-battle-hud').filter({ visible: true });
  await expect(hud.locator('.hud-rot-tabs')).toBeVisible({ timeout: 40_000 });
  return hud;
}

/** Put the option at `nth` into the rotation being edited, the way a reader does. */
async function addSkill(page: Page, hud: Locator, nth: number) {
  await hud.getByRole('button', { name: 'Adicionar habilidade', exact: true }).click();
  await hud.locator('.rot-add-dd').click();
  const options = page.getByRole('listbox').getByRole('option');
  await expect(options.nth(nth)).toBeVisible({ timeout: 30_000 });
  await options.nth(nth).click();
}

test('starts on a single unnumbered tab and numbers them once a second one exists', async ({ page }) => {
  const hud = await boot(page);
  const tabs = hud.locator('.hud-rot-tab-pick');

  await expect(tabs).toHaveText(['Rotação']);

  await hud.locator('.hud-rot-tab-add').click();
  await expect(tabs).toHaveText(['Rotação 1', 'Rotação 2']);

  await hud.locator('.hud-rot-tab-add').click();
  await expect(tabs).toHaveText(['Rotação 1', 'Rotação 2', 'Rotação 3']);
});

test('each tab keeps its own rotation and its own figures', async ({ page }) => {
  const hud = await boot(page);
  const rows = hud.locator('.rot-row .rot-name');

  await addSkill(page, hud, 1);
  await expect(rows).toHaveCount(1, { timeout: 40_000 });
  const first = await rows.allTextContents();
  const firstDps = await hud.locator('.hud-dps-col').innerText();

  await hud.locator('.hud-rot-tab-add').click();
  // A fresh tab is empty, so the card falls back to its "nothing here yet" state.
  await expect(rows).toHaveCount(0);
  await expect(hud.getByText('Nenhuma habilidade na rotação.')).toBeVisible();

  await addSkill(page, hud, 3);
  await expect(rows).toHaveCount(1, { timeout: 40_000 });
  const second = await rows.allTextContents();
  expect(second).not.toEqual(first);

  await hud.locator('.hud-rot-tab-pick').first().click();
  await expect(rows).toHaveText(first, { timeout: 40_000 });
  await expect.poll(() => hud.locator('.hud-dps-col').innerText()).toBe(firstDps);

  await hud.locator('.hud-rot-tab-pick').last().click();
  await expect(rows).toHaveText(second, { timeout: 40_000 });
});

test('closing a tab takes the strip back to one unnumbered rotation', async ({ page }) => {
  const hud = await boot(page);
  await addSkill(page, hud, 1);
  await expect(hud.locator('.rot-row')).toHaveCount(1, { timeout: 40_000 });
  const kept = await hud.locator('.rot-row .rot-name').allTextContents();

  await hud.locator('.hud-rot-tab-add').click();
  await expect(hud.locator('.hud-rot-tab-pick')).toHaveCount(2);

  await hud.locator('.hud-rot-tab-close').last().click();

  await expect(hud.locator('.hud-rot-tab-pick')).toHaveText(['Rotação']);
  await expect(hud.locator('.rot-row .rot-name')).toHaveText(kept);
});

test('the strip survives a reload, on the rotation that was open', async ({ page }) => {
  const hud = await boot(page);
  await addSkill(page, hud, 1);
  await expect(hud.locator('.rot-row')).toHaveCount(1, { timeout: 40_000 });

  await hud.locator('.hud-rot-tab-add').click();
  await addSkill(page, hud, 3);
  await expect(hud.locator('.rot-row')).toHaveCount(1, { timeout: 40_000 });
  const second = await hud.locator('.rot-row .rot-name').allTextContents();

  const reopened = await boot(page);
  await expect(reopened.locator('.hud-rot-tab-pick')).toHaveText(['Rotação 1', 'Rotação 2']);
  await expect(reopened.locator('.rot-row .rot-name')).toHaveText(second, { timeout: 40_000 });
});
