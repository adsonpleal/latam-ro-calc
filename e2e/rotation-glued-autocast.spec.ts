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

test('the proc is drawn under its trigger tile, with its chance and its mean damage', async ({ page }) => {
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
  // The mean of one activation, read the way the tiles above read theirs — the per-second
  // figure belongs to the DPS do combo card.
  await expect(glued.locator('.rot-dmg-val')).not.toHaveText('0');
  await expect(glued.locator('.rot-tag--mean')).toHaveText('média');
  await expect(glued.locator('.rot-tag--dps')).toHaveCount(0);
  // The proc’s own slice of the cycle, beside the tile’s: a reading of 0,0% would mean the
  // fold into the cycle never happened.
  await expect(glued.locator('.rot-pct')).not.toHaveText('0,0%');
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

test('clicking the glued mean opens how it is calculated, as a tile’s does', async ({ page }) => {
  const hud = page.locator('app-battle-hud').filter({ visible: true });
  const glued = hud.locator('.rot-item').nth(1).locator('.rot-auto-row');
  await expect(glued).toHaveCount(1, { timeout: 40_000 });

  const mean = glued.locator('.rot-dmg-val');
  const printed = (await mean.innerText()).trim();
  await mean.click();

  // The proc’s mean is weighted the same way a tile’s is, so it opens the same panel — and
  // that panel has to close on the very figure the row prints.
  const panel = page.locator('.ui-overlaypanel').filter({ hasText: 'Como o dano médio é calculado' });
  await expect(panel).toBeVisible();
  await expect(panel).toContainText(printed);
});

test('the glued (i) and its icon open the proc’s own skill details', async ({ page }) => {
  const hud = page.locator('app-battle-hud').filter({ visible: true });
  const glued = hud.locator('.rot-item').nth(1).locator('.rot-auto-row');
  await expect(glued).toHaveCount(1, { timeout: 40_000 });

  await glued.locator('.rot-info').click();

  // The proc’s panel, not the trigger tile’s: it is titled with the skill that fires and
  // it carries the AUTO-CONJURAÇÃO block, which a tile’s own details never have.
  const panel = page.locator('.ui-overlaypanel').filter({ hasText: 'AUTO-CONJURAÇÃO' });
  await expect(panel).toBeVisible();
  await expect(panel).toContainText(PROC);
  await expect(panel).toContainText('Colar Consagrado: Destino');
  // The trigger named, rather than the Auto-conjuração tab’s "habilidade selecionada".
  await expect(panel).toContainText(`Ao usar ${TRIGGER}`);
  await expect(panel).toContainText('Ativações/s');
  await expect(panel).toContainText('Contribuição');

  // The (i) toggles, so a second click is the app’s own way of closing it.
  await glued.locator('.rot-info').click();
  await expect(panel).toBeHidden();

  // Same panel from the skill icon, which is the other half of the ask.
  await glued.locator('.rot-icon').click();
  await expect(page.locator('.ui-overlaypanel').filter({ hasText: 'AUTO-CONJURAÇÃO' })).toBeVisible();
});

test('clicking a glued roll opens how that damage is calculated', async ({ page }) => {
  const hud = page.locator('app-battle-hud').filter({ visible: true });
  const glued = hud.locator('.rot-item').nth(1).locator('.rot-auto-row');
  await expect(glued).toHaveCount(1, { timeout: 40_000 });

  // The rolls the mean is a mean of, each one clickable — the same explanation the tiles
  // above offer for theirs.
  const rolls = glued.locator('.rot-auto-range');
  expect(await rolls.count()).toBeGreaterThan(0);
  const printed = (await rolls.first().innerText()).split('\u2013').map((part) => part.trim());
  await rolls.first().click();

  // The panel carries no skill name, so what ties it to this row is its arithmetic: the
  // derivation has to close on the very figures the roll prints.
  const panel = page.locator('.ui-overlaypanel').filter({ hasText: 'Como o dano é calculado' });
  await expect(panel).toBeVisible();
  for (const figure of printed) await expect(panel).toContainText(figure);
});
