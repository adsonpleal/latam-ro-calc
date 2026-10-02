import { build } from 'esbuild';
import { basename, resolve } from 'node:path';
import { expect, test } from '@playwright/test';

// This fixture tests real React controls before the application cutover. It is
// served through Playwright routes and never included in production assets.
const assets = new Map<string, { body: Uint8Array; contentType: string }>();
test.beforeAll(async () => {
  const result = await build({
    entryPoints: ['e2e/fixtures/react-controls.tsx'], absWorkingDir: process.cwd(),
    bundle: true, format: 'esm', jsx: 'automatic', write: false,
    outdir: resolve('.tmp/react-controls'), entryNames: 'controls',
    define: { 'process.env.NODE_ENV': '"development"' },
  });
  for (const file of result.outputFiles!) assets.set(basename(file.path), {
    body: file.contents,
    contentType: file.path.endsWith('.css') ? 'text/css' : 'text/javascript',
  });
});
test.beforeEach(async ({ page }) => {
  await page.route('**/__react__/**', async route => {
    const name = basename(new URL(route.request().url()).pathname);
    const asset = assets.get(name);
    if (asset) { await route.fulfill({ body: Buffer.from(asset.body), contentType: asset.contentType }); return; }
    await route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><head><link rel="stylesheet" href="/__react__/controls.css"></head><body><div id="root"></div><script type="module" src="/__react__/controls.js"></script></body></html>' });
  });
  await page.goto('/__react__/');
  await expect(page.getByRole('combobox', { name: 'Number', exact: true })).toBeVisible();
});

test('React controlled selectors preserve falsy values, filtering and keyboard focus', async ({ page }) => {
  const number = page.getByRole('combobox', { name: 'Number', exact: true });
  await expect(number).toHaveText('0');
  await number.click();
  const filter = page.getByRole('searchbox', { name: 'Filtrar opções' });
  await expect(filter).toBeFocused();
  await filter.fill('99');
  await filter.press('Enter');
  await expect(number).toHaveText('99');
  await expect(number).toBeFocused();
  await number.press('ArrowDown');
  await expect(filter).toHaveValue('');
  await filter.press('Home');
  await filter.press('Enter');
  await expect(number).toHaveText('0');
  await page.getByRole('group', { name: 'Segments' }).getByRole('button', { name: 'false', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Selected value' })).toHaveText('false');
});

test('migrated model bindings and controller popover handles update and restore focus', async ({ page }) => {
  await page.getByRole('spinbutton', { name: 'Bound number' }).fill('12');
  await expect(page.getByRole('status', { name: 'Bound value' })).toHaveText('12');
  const opener = page.getByRole('button', { name: 'Bound popover', exact: true });
  await opener.click();
  await expect(page.getByRole('button', { name: 'Bound panel content' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Bound panel content' })).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test('React nested overlays consume one Escape and restore focus', async ({ page }) => {
  const opener = page.getByRole('button', { name: 'Open dialog' });
  await opener.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('combobox', { name: 'Nested number' }).click();
  await expect(page.getByRole('searchbox')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('searchbox')).toHaveCount(0);
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(opener).toBeFocused();
  await expect(page.locator('.ui-overlay-host')).toHaveCount(0);
});

test('React virtualization reveals keyboard targets and respects disabled options', async ({ page }) => {
  const number = page.getByRole('combobox', { name: 'Virtual number' });
  await number.click();
  await expect(page.getByRole('option').count()).resolves.toBeLessThan(30);
  await page.getByRole('searchbox').press('End');
  await expect(page.getByRole('option', { name: '299', exact: true })).toBeVisible();
  await page.getByRole('searchbox').press('Enter');
  await expect(number).toHaveText('299');
  await number.click();
  await page.getByRole('searchbox').press('Home');
  await page.getByRole('searchbox').press('ArrowDown');
  await page.getByRole('searchbox').press('ArrowDown');
  await page.getByRole('searchbox').press('Enter');
  await expect(number).toHaveText('3');
});

test('React multiselect and cascades retain selection and keyboard navigation', async ({ page }) => {
  await page.getByRole('combobox', { name: 'Multiple', exact: true }).click();
  await page.getByRole('button', { name: 'Selecionar todos' }).click();
  await expect(page.getByRole('status', { name: 'Multiple values' })).toHaveText('0,1,3');
  await page.keyboard.press('Escape');
  const tree = page.getByRole('combobox', { name: 'Tree', exact: true });
  await tree.click();
  await tree.press('ArrowDown');
  const category = page.getByRole('button', { name: 'Category', exact: true });
  await expect(category).toBeFocused();
  await category.press('ArrowRight');
  const leaf = page.getByRole('button', { name: 'Leaf', exact: true });
  await expect(leaf).toBeFocused();
  await leaf.press('Enter');
  await expect(tree).toHaveText('Leaf');
});

test('React controls release portals on parent unmount and sanitize rich descriptions', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.getByRole('combobox', { name: 'Number', exact: true }).click();
  await page.getByRole('button', { name: 'Unmount controls' }).click();
  await expect(page.locator('.ui-overlay-host')).toHaveCount(0);
  const description = page.getByTestId('sanitized');
  await expect(description.locator('font')).toHaveAttribute('color', '#ff0000');
  await expect(description.locator('b')).toHaveText('Safe');
  await expect(description.locator('script,svg,[onerror],[onload],a[href]')).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { __unsafe?: boolean }).__unsafe)).toBeUndefined();
  expect(errors).toEqual([]);
});

test('React Strict Mode preserves an initial confirmation and settles it once', async ({ page }) => {
  await page.goto('/__react__/?pending');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('status', { name: 'Rejected confirmations' })).toHaveText('0');
  const accept = page.getByRole('button', { name: 'Sim', exact: true });
  await expect(accept).toBeFocused();
  await accept.click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('status', { name: 'Accepted confirmations' })).toHaveText('1');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('status', { name: 'Rejected confirmations' })).toHaveText('0');
});

test('React tooltips and popovers close and release their layers', async ({ page }) => {
  const target = page.getByRole('button', { name: 'Tooltip target' });
  await target.hover();
  await expect(page.getByRole('tooltip')).toHaveText('Delayed description');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  const opener = page.getByRole('button', { name: 'Open popover' });
  await opener.click();
  await expect(page.getByRole('button', { name: 'Popover content' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Popover content' })).toHaveCount(0);
  await expect(opener).toBeFocused();
  await target.hover();
  await expect(page.getByRole('tooltip')).toBeVisible();
  await page.getByRole('button', { name: 'Unmount controls' }).click();
  await expect(page.locator('.ui-overlay-host')).toHaveCount(0);
});

test('React reordering commits keyed rows and Escape restores the original order', async ({ page }) => {
  const first = await page.getByRole('button', { name: 'Move A' }).boundingBox();
  const last = await page.getByRole('button', { name: 'Move C' }).boundingBox();
  expect(first).not.toBeNull(); expect(last).not.toBeNull();
  await page.mouse.move(first!.x + 5, first!.y + 5);
  await page.mouse.down();
  await page.mouse.move(last!.x + 5, last!.y + last!.height + 20, { steps: 5 });
  await expect(page.locator('.ui-drag-preview')).toHaveCount(1);
  await page.mouse.up();
  await expect(page.getByRole('status', { name: 'Row order' })).toHaveText('B,C,A');
  await expect(page.getByTestId('drag-rows').locator('.rot-row')).toHaveText(['Move B', 'Move C', 'Move A']);
  const start = await page.getByRole('button', { name: 'Move B' }).boundingBox();
  const end = await page.getByRole('button', { name: 'Move A' }).boundingBox();
  await page.mouse.move(start!.x + 5, start!.y + 5); await page.mouse.down();
  await page.mouse.move(end!.x + 5, end!.y + 50, { steps: 5 });
  await page.keyboard.press('Escape'); await page.mouse.up();
  await expect(page.getByRole('status', { name: 'Row order' })).toHaveText('B,C,A');
  await expect(page.locator('.ui-drag-preview,.ui-drag-placeholder')).toHaveCount(0);
});

test('React damage values preserve hit multipliers and comparison percentages', async ({ page }) => {
  const damage = page.getByTestId('damage-value');
  await expect(damage).toContainText('10 - 20');
  await expect(damage).toContainText('20 - 40 HP');
  await expect(damage).toContainText('(+200 %)');
  await expect(damage.locator('.compare_greater').last()).toHaveText('(+200 %)');
});

test('React stat badges preserve keyboard activation and comparison labels', async ({ page }) => {
  const input = page.locator('app-status-input');
  await expect(input.locator('.status_other')).toHaveText('20');
  await input.getByRole('button', { name: '+5', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status', { name: 'Breakdown side' })).toHaveText('main');
  await input.getByRole('button', { name: '+8', exact: true }).focus();
  await page.keyboard.press('Space');
  await expect(page.getByRole('status', { name: 'Breakdown side' })).toHaveText('compare');
  await input.getByRole('combobox').click();
  await page.getByRole('searchbox').fill('20');
  await page.getByRole('searchbox').press('Enter');
  await expect(input.locator('.status_other')).toHaveCount(0);
});

test('React equipment chips refresh delayed descriptions and clear independently', async ({ page }) => {
  const item = page.getByRole('button', { name: 'Fixture sword', exact: true });
  await item.hover();
  await expect(page.getByRole('tooltip')).toContainText('Fixture sword');
  await page.getByRole('button', { name: 'Load descriptions' }).click();
  await item.hover();
  await expect(page.getByRole('tooltip')).toContainText('Delayed description');
  await expect(page.getByRole('tooltip').locator('font')).toHaveAttribute('color', '#ff0000');
  await page.getByRole('button', { name: 'Remover Fixture sword', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Arma', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Remover Fixture sword' })).toHaveCount(0);
});

test('React attack speed chart retains marker order, cap and gain text', async ({ page }) => {
  const graph = page.getByRole('img', { name: 'Vel.Atq 190 → 5 golpes/s.' });
  await expect(graph).toBeVisible();
  await expect(graph.locator('.curve_dot_label')).toHaveText(['180 → 2,5/s', '190 → 5/s']);
  await expect(graph.locator('.curve_dot_halo')).toHaveCount(1);
  await expect(page.locator('.curve_caption_next')).toContainText('+3 de Vel.Atq (chegar a 193)');
  await expect(page.locator('.curve_table tbody tr').last()).toHaveText('7193 (teto)');
});
