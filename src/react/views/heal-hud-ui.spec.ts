/**
 * The Cura panel has to keep *looking* like the Batalha panel, and the only way it can is
 * by being built out of the same classes rather than its own lookalikes. Nothing in a
 * rendering test catches a fork: a panel with its own `.heal-row` renders perfectly and
 * simply drifts, a few pixels at a time, every time `battle-hud.css` is touched.
 *
 * So this spec reads both files as text and pins the seam:
 *
 *  - the panel declares the battle scope, which is what makes those rules apply to it;
 *  - every structural class it uses is one `battle-hud.css` defines;
 *  - `heal-hud.css` never re-declares one of them, so there is a single definition of each;
 *  - what `heal-hud.css` does define is themed, not hard-coded colours.
 *
 * It fails loudly on a rename in `battle-hud.css` too, which is the point: whoever renames
 * `joined_caption` should learn here that two panels use it, not from a screenshot later.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (name: string) => readFileSync(join(process.cwd(), 'src/react/views', name), 'utf8');
const panel = read('heal-hud.tsx');
const panelCss = read('heal-hud.css');
const battleCss = read('battle-hud.css');

/**
 * The classes the Cura panel borrows, by what each one does. Every one of them has to be
 * defined by the battle stylesheet and used by the panel.
 */
const SHARED_CLASSES = [
  'hud-selectors-row', 'hud-selectors-col', 'joined_field', 'joined_caption',
  'hud-cards', 'hud-card-col', 'hud-card',
  'psec', 'pstats', 'kv', 'ptitle',
  'hud-help',
];

/** Strip comments so a class named in prose is not mistaken for a declaration. */
const withoutComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** Every rule's selector, with comments and declaration bodies dropped. */
const selectors = (css: string) => withoutComments(css)
  .split('}')
  .map(block => block.split('{')[0].trim())
  .filter(selector => selector && !selector.startsWith('@'));

/** True when the stylesheet has a rule whose selector names this class. */
const declares = (css: string, className: string) =>
  selectors(css).some(selector => new RegExp('\\.' + className + '(?![\\w-])').test(selector));

describe('the Cura panel is built out of the Batalha panel', () => {
  it('declares the battle scope, which is what makes those rules reach it', () => {
    expect(panel).toContain('ui-scope-app-battle-hud');
    expect(panel).toContain("import './battle-hud.css'");
    // The scope class is the one `battle-hud.css` itself writes its rules against.
    expect(battleCss).toContain('.ui-scope-app-battle-hud');
  });

  it.each(SHARED_CLASSES)('uses the shared %s instead of one of its own', (className) => {
    expect(panel, className + ' is no longer used by the Cura panel — it has grown its own markup.')
      .toContain(className);
    expect(declares(battleCss, className),
      className + ' is no longer declared in battle-hud.css. Renamed? The Cura panel uses it too.')
      .toBe(true);
  });

  it('scopes every one of its own rules, so it can never restyle the Batalha panel', () => {
    const unscoped = selectors(panelCss)
      .filter(selector => selector !== 'app-heal-hud')
      .filter(selector => !selector.includes('app-heal-hud') && !selector.includes('.heal-'));
    expect(unscoped, 'Scope the rule to `app-heal-hud` or name it `heal-…`: as written it '
      + 'reaches the Batalha panel too.').toEqual([]);
  });

  it('overrides only these shared classes, and borrows the rest untouched', () => {
    // Nudging a borrowed class inside this panel is fair — the caption chips hold longer
    // words than the Batalha row's, and the help circle sits beside an input rather than a
    // heading. Re-declaring the look of one is not, so the list is pinned: a new entry
    // here is a deliberate edit, and a reviewer gets to ask why the shared rule would not do.
    const overridden = SHARED_CLASSES.filter(className => declares(panelCss, className));
    expect(overridden).toEqual(['hud-selectors-col', 'hud-help']);
  });

  it('themes every colour it does define', () => {
    const hardCoded = withoutComments(panelCss)
      .split('\n')
      .filter(line => /(color|background|border)[^:]*:/.test(line))
      .filter(line => !line.includes('var(--'))
      .filter(line => !/:\s*(none|0|transparent|inherit|unset)\b/.test(line))
      .map(line => line.trim());
    expect(hardCoded, 'Use the theme tokens the Batalha panel uses, so both follow the theme.')
      .toEqual([]);
  });

  it('keeps its own stylesheet to what the battle one does not give', () => {
    // A guard on size rather than content: 150 lines of "own" CSS is a second panel, not
    // a handful of additions to a shared one.
    const rules = withoutComments(panelCss).split('{').length - 1;
    expect(rules).toBeLessThan(20);
  });
});
