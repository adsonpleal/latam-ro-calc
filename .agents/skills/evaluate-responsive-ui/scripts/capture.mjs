#!/usr/bin/env node
// Initial browser evidence only. This intentionally never computes UX ratings.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { profiles, requiredChecks, workflowIds } from './contract.mjs';
import { verifyBuild } from './verify-build.mjs';

const args = process.argv.slice(2);
const allowed = new Set(['--url', '--baseline-url', '--out', '--executable', '--candidate-build', '--baseline-build', '--candidate-contract', '--baseline-contract']);
const options = {};
for (let i = 0; i < args.length; i += 2) {
  if (!allowed.has(args[i]) || !args[i + 1] || args[i + 1].startsWith('--')) {
    throw new Error(`Expected option/value pair; supported options: ${[...allowed].join(', ')}`);
  }
  options[args[i]] = args[i + 1];
}
for (const key of ['--url', '--baseline-url', '--out']) {
  if (!options[key]) throw new Error(`Missing ${key}`);
}
for (const key of ['--url', '--baseline-url']) {
  const url = new URL(options[key]);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error(`${key} must be an HTTP(S) URL`);
}
const out = resolve(options['--out']);
const contracts = {};
for (const target of ['candidate', 'baseline']) {
  if (options[`--${target}-contract`]) contracts[target] = JSON.parse(await readFile(options[`--${target}-contract`], 'utf8'));
}
await mkdir(resolve(out, 'captures'), { recursive: true });
// Preserve the managed proxy for remote assets. Loopback serves local builds.
const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const browser = await chromium.launch({
  headless: true,
  ...(options['--executable'] ? { executablePath: options['--executable'] } : {}),
  ...(proxy ? { proxy: { server: proxy, bypass: '127.0.0.1,localhost' } } : {}),
});
const evidence = {
  captured_at: new Date().toISOString(),
  browser: { engine: 'chromium', version: browser.version(), actual_browser: true },
  candidate_build_id: options['--candidate-build'] || contracts.candidate?.build_id || null,
  baseline_build_id: options['--baseline-build'] || contracts.baseline?.build_id || null,
  notice: 'Initial states only: workflow interactions and agent visual judgment are still required.',
  captures: [], sweep: [],
};

async function metrics(page, requestedWidth) {
  return page.evaluate(requestedWidth => {
    const visible = window.visualViewport;
    const screenLeft = visible?.offsetLeft || 0;
    const screenTop = visible?.offsetTop || 0;
    const screenRight = screenLeft + (visible?.width || innerWidth);
    const screenBottom = screenTop + (visible?.height || innerHeight);
    const shown = element => {
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return box.width > 0 && box.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    };
    const rect = element => {
      const b = element.getBoundingClientRect();
      return { x: b.x, y: b.y, width: b.width, height: b.height };
    };
    const targets = [...document.querySelectorAll('button, a[href], input, select, textarea, [role="button"], [role="combobox"], [role="checkbox"]')]
      .filter(shown).filter(element => {
        const b = element.getBoundingClientRect();
        return b.bottom > screenTop && b.top < screenBottom;
      }).map(element => ({
        label: (element.getAttribute('aria-label') || element.textContent || element.getAttribute('placeholder') || element.id || element.tagName).trim().slice(0, 100),
        tag: element.tagName,
        disabled: element.matches(':disabled') || element.getAttribute('aria-disabled') === 'true',
        ...rect(element),
      }));
    return {
      layout_viewport: { width: innerWidth, height: innerHeight },
      visual_viewport: window.visualViewport ? { width: visualViewport.width, height: visualViewport.height, scale: visualViewport.scale } : null,
      css_media_width_matches_request: matchMedia(`(width: ${requestedWidth}px)`).matches,
      document_width: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      client_width: document.documentElement.clientWidth,
      no_hover: matchMedia('(hover: none)').matches,
      coarse_pointer: matchMedia('(pointer: coarse)').matches,
      max_touch_points: navigator.maxTouchPoints,
      visual_scroll: window.visualViewport ? { offset_left: visualViewport.offsetLeft, offset_top: visualViewport.offsetTop, page_left: visualViewport.pageLeft, page_top: visualViewport.pageTop } : null,
      window_scroll: { x: scrollX, y: scrollY },
      visible_targets: targets,
      undersized_touch_candidates: targets.filter(t => !t.disabled && (t.width < 44 || t.height < 44)),
      offscreen_horizontal_targets: targets.filter(t => t.x < screenLeft - 1 || t.x + t.width > screenRight + 1),
      broken_visible_images: [...document.images].filter(shown).filter(img => img.complete && img.naturalWidth === 0).map(img => img.getAttribute('src')),
      pending_visible_images: [...document.images].filter(shown).filter(img => !img.complete).length,
    };
  }, requestedWidth);
}

async function boot(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.locator('#ro-splash').waitFor({ state: 'hidden', timeout: 45_000 });
  await page.getByRole('button', { name: 'Importar', exact: true }).waitFor({ timeout: 20_000 });
  await page.evaluate(() => document.fonts.ready);
  // A bounded wait records unavailable assets instead of hiding them.
  await page.waitForFunction(() => [...document.images].every(img => img.complete), undefined, { timeout: 5_000 }).catch(() => {});
}

try {
  for (const target of ['baseline', 'candidate']) {
    const selected = target === 'baseline' ? profiles.filter(p => p.family === 'desktop' && !p.touch) : profiles;
    for (const profile of selected) {
      const context = await browser.newContext({
        viewport: { width: profile.width, height: profile.height },
        hasTouch: profile.touch, isMobile: profile.touch && profile.family !== 'desktop', deviceScaleFactor: 1,
        locale: 'pt-BR', timezoneId: 'America/Sao_Paulo',
      });
      const page = await context.newPage();
      const row = { target, profile, console_errors: [], request_failures: [] };
      page.on('pageerror', error => row.console_errors.push(error.message));
      page.on('requestfailed', request => {
        if (row.request_failures.length < 50) row.request_failures.push({ url: request.url(), error: request.failure()?.errorText });
      });
      await context.tracing.start({ screenshots: true, snapshots: true });
      try {
        await boot(page, target === 'baseline' ? options['--baseline-url'] : options['--url']);
        if (contracts[target] && !evidence[`${target}_build_verification`]) {
          evidence[`${target}_build_verification`] = { before: await verifyBuild(page, options[target === 'baseline' ? '--baseline-url' : '--url'], contracts[target]) };
        }
        row.metrics = await metrics(page, profile.width);
        row.geometry_issues = [];
        if (Math.abs(row.metrics.layout_viewport.width - profile.width) > 1) row.geometry_issues.push('Layout viewport differs from requested width');
        if (row.metrics.document_width > row.metrics.client_width + 1) row.geometry_issues.push('Document exceeds client width');
        if (row.metrics.visual_viewport && Math.abs(row.metrics.visual_viewport.scale - 1) > 0.01) row.geometry_issues.push('Unexpected initial visual viewport scale');
        if (!row.metrics.css_media_width_matches_request) row.geometry_issues.push('CSS media width differs from requested width');
        if (profile.touch && (!row.metrics.no_hover || !row.metrics.coarse_pointer || row.metrics.max_touch_points === 0)) {
          throw new Error('Touch/no-hover/coarse-pointer emulation not verified');
        }
        row.screenshot = `captures/${target}-${profile.id}.png`;
        await page.screenshot({ path: resolve(out, row.screenshot), animations: 'disabled' });
        row.full_page_screenshot = `captures/${target}-${profile.id}-full.png`;
        await page.screenshot({ path: resolve(out, row.full_page_screenshot), fullPage: true, animations: 'disabled' });
        row.status = 'captured';
        if (contracts[target] && profile.id === selected.at(-1).id) evidence[`${target}_build_verification`].after = await verifyBuild(page, options[target === 'baseline' ? '--baseline-url' : '--url'], contracts[target]);
      } catch (error) { row.status = 'blocked'; row.error = error.message; }
      await context.tracing.stop({ path: resolve(out, `captures/${target}-${profile.id}.zip`) });
      await context.close();
      evidence.captures.push(row);
      console.log(`${target}/${profile.id}: ${row.status}${row.geometry_issues?.length ? ` (${row.geometry_issues.length} geometry issues; not a pass)` : ''}`);
    }
  }
  const context = await browser.newContext({ viewport: { width: 320, height: 800 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
  try {
    const page = await context.newPage();
    await boot(page, options['--url']);
    for (let width = 320; width <= 1920; width += 40) {
      await page.setViewportSize({ width, height: 800 });
      await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
      const observed = await metrics(page, width);
      evidence.sweep.push({ width, layout_viewport: observed.layout_viewport, visual_viewport: observed.visual_viewport, css_media_width_matches_request: observed.css_media_width_matches_request, document_width: observed.document_width, client_width: observed.client_width, no_hover: observed.no_hover, coarse_pointer: observed.coarse_pointer });
    }
    if (contracts.candidate && evidence.candidate_build_verification) evidence.candidate_build_verification.after = await verifyBuild(page, options['--url'], contracts.candidate);
  } catch (error) { evidence.sweep_error = error.message; }
  finally { await context.close(); }
} finally {
  await browser.close();
  await writeFile(resolve(out, 'metrics.json'), JSON.stringify(evidence, null, 2) + '\n');
  await writeFile(resolve(out, 'suggested-matrix.json'), JSON.stringify({
    baseline_build_id: options['--baseline-build'] || contracts.baseline?.build_id || 'SET_FROZEN_BASELINE_BUILD_ID',
    workflow_ids: workflowIds,
    baseline_resource_digest: contracts.baseline?.resource_digest || 'SET_FROZEN_BASELINE_RESOURCE_DIGEST',
    baseline_resource_count: contracts.baseline ? Object.keys(contracts.baseline.files).length : null,
    breakpoints: [768, 1536],
    engines: ['chromium'],
    required_checks: requiredChecks(),
  }, null, 2) + '\n');
}
if (evidence.captures.some(row => row.status === 'blocked') || evidence.sweep_error) process.exitCode = 2;
console.log(`Initial evidence: ${resolve(out, 'metrics.json')} (no quality verdict)`);
