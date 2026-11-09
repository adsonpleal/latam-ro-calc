import { expect, test } from '@playwright/test';

/**
 * The auto-conjuração glued under the Rotação tile that fires it.
 *
 * The numbers are unit-tested (rotation-view.spec.ts, consagrado-skill-use-autocasts.spec.ts);
 * what only a browser can answer is where the row is drawn and whether it travels with its
 * tile when the order changes — the group wrapper and the drag unit in src/react/ui/reorder.ts.
 *
 * The build is Soul Ascetic with Colar Consagrado do Destino and a Cajado de Taeguk +10,
 * whose clause autoconjures Talismã do Jabuti Nv4 on every use of Talismã da Fênix.
 */
const TRIGGER = 'Talismã da Fênix';
const PROC = 'Talismã do Jabuti';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('monster', '21065');
    localStorage.setItem('ro-right-accordion-active', '[]');
    localStorage.setItem('ro-set', JSON.stringify({
      class: 4303, level: 230, jobLevel: 48, int: 130, dex: 84, spl: 100,
      weapon: 550064, weaponRefine: 10, accLeft: 491119,
      passiveSkillMap: { 'Talisman Mastery': 10 },
      selectedAtkSkill: 'Talisman of Red Phoenix==5',
      // Ataque básico first, so the tile that owns the proc starts in second place.
      rotation: ['__basic', 'Talisman of Red Phoenix==5'],
    }));
  });
  await page.goto('/');
  await expect(page.locator('#ro-splash')).toHaveCount(0, { timeout: 40_000 });
  await page.getByRole('button', { name: 'Batalha', exact: true }).click();
});

test('the proc is drawn under its trigger tile, with its chance and its DPS', async ({ page }) => {
  const hud = page.locator('app-battle-hud').filter({ visible: true });
  const groups = hud.locator('.rot-item');
  await expect(groups).toHaveCount(2, { timeout: 40_000 });

  // Ataque básico fires no item clause, so its tile stands alone.
  await expect(groups.nth(0).locator('.rot-auto-row')).toHaveCount(0);

  const glued = groups.nth(1).locator('.rot-auto-row');
  await expect(glued).toHaveCount(1);
  await expect(glued.locator('.rot-name')).toHaveText(PROC);
  await expect(glued.locator('.rot-level')).toHaveText('Nv4');
  await expect(glued.locator('.rot-auto-chance')).toContainText('100%');
  await expect(glued.locator('.rot-auto-from')).toContainText('Colar Consagrado: Destino');
  await expect(glued.locator('.rot-dmg-val')).not.toHaveText('0');
});

test('the proc travels with its tile when the rotation is reordered', async ({ page }) => {
  const hud = page.locator('app-battle-hud').filter({ visible: true });
  const groups = hud.locator('.rot-item');
  await expect(groups).toHaveCount(2, { timeout: 40_000 });
  await expect(groups.nth(1).locator('.rot-row').first().locator('.rot-name')).toHaveText(TRIGGER);

  await groups.nth(1).locator('.rot-handle').focus();
  await page.keyboard.press('ArrowUp');

  // The tile moved to the top and the glued row is still its own: it is drawn inside the
  // same group, directly below the trigger and never under ataque básico.
  await expect(groups.nth(0).locator('.rot-row').first().locator('.rot-name')).toHaveText(TRIGGER);
  await expect(groups.nth(0).locator('.rot-auto-row .rot-name')).toHaveText(PROC);
  await expect(groups.nth(1).locator('.rot-auto-row')).toHaveCount(0);
});

test('clicking the glued DPS opens the derivation behind it', async ({ page }) => {
  const hud = page.locator('app-battle-hud').filter({ visible: true });
  const glued = hud.locator('.rot-item').nth(1).locator('.rot-auto-row');
  await expect(glued).toHaveCount(1, { timeout: 40_000 });

  const dps = glued.locator('.rot-auto-dps');
  const printed = (await dps.innerText()).trim();
  await dps.click();

  const panel = page.locator('.ui-overlaypanel').filter({ hasText: 'Como o DPS da autoconjuração é calculado' });
  await expect(panel).toBeVisible();
  // Every step of the figure, and the figure itself — the panel has to reconcile with the
  // row it was opened from, not restate it.
  await expect(panel).toContainText(PROC);
  await expect(panel).toContainText('Dano médio por ativação');
  await expect(panel).toContainText('× Chance');
  await expect(panel).toContainText('100%');
  await expect(panel).toContainText('÷ Duração do ciclo');
  await expect(panel).toContainText(printed);
});
