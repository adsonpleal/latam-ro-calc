import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { HELP_IMPROVE_DIALOG_STYLE, UPDATE_DIALOG_STYLE } from './dialog-geometry';

/**
 * Guard on a regression that already happened: the Novidades dialog shipped with only a
 * height, so PrimeNG let it grow to the viewport and the changelog's paragraphs ran the
 * full width of the screen, left-aligned instead of centred.
 *
 * Two halves, because either one alone can be undone on its own: the constants have to
 * carry a bounded width, and the template has to actually bind them and leave `position`
 * off so PrimeNG centres the dialog.
 */
const topbarHtml = readFileSync('src/app/layout/app.topbar.component.html', 'utf8');

/** The p-dialog element that holds the changelog. */
function updateDialogTag(): string {
  const start = topbarHtml.indexOf('[(visible)]="visibleUpdate"');
  expect(start, 'the Novidades dialog is still in the template').toBeGreaterThan(-1);
  const open = topbarHtml.lastIndexOf('<p-dialog', start);
  const close = topbarHtml.indexOf('>', start);
  return topbarHtml.slice(open, close + 1);
}

describe('dialog geometry', () => {
  it.each([
    ['Novidades', UPDATE_DIALOG_STYLE],
    ['Ajude o simulador', HELP_IMPROVE_DIALOG_STYLE],
  ])('%s is bounded on both axes', (_name, style) => {
    // A width in rem/px is a reading measure; one in vw would just be the viewport again.
    expect(style.width).toMatch(/^\d+(\.\d+)?(rem|px)$/);
    // And it still has to fit on a phone.
    const max = Number(style.maxWidth.replace('vw', ''));
    expect(style.maxWidth).toMatch(/^\d+(\.\d+)?vw$/);
    expect(max).toBeLessThanOrEqual(100);
  });

  it('keeps the changelog narrow enough to read', () => {
    // 60rem ~= 960px. Past roughly this, running prose gets hard to track line to line.
    expect(Number(UPDATE_DIALOG_STYLE.width.replace('rem', ''))).toBeLessThanOrEqual(64);
  });

  it('binds the geometry from the template instead of inlining it', () => {
    expect(updateDialogTag()).toContain('[style]="updateDialogStyle"');
  });

  /**
   * `position` is what broke the centring: PrimeNG centres a dialog only when no position
   * is given, and the Novidades dialog had `[position]="'top'"` pinning it to the edge.
   */
  it('leaves the Novidades dialog at PrimeNG default position, which is centred', () => {
    expect(updateDialogTag()).not.toContain('position');
  });
});
