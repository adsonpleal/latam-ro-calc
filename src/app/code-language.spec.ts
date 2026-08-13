import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Code is written in English — comments, JSDoc and test names included.
 *
 * Only *content* is pt-BR: strings the user reads (UI labels, changelog entries, toast
 * messages) and the game data itself (item/skill/monster names and descriptions).
 * Naming a skill or item in English prose is fine — "Fúria Estelar only applies to Large
 * targets" is an English sentence with a proper noun in it. Writing the prose itself in
 * pt-BR is not. Quoting pt-BR content inside an English comment is fine too, as long as
 * it sits inside "double quotes", `backticks` or «guillemets» — those are stripped
 * before the check runs.
 *
 * This test exists because the rule kept eroding: language drift is invisible in a diff
 * review, so it has to be mechanical.
 *
 * **A heuristic, deliberately.** It looks for high-signal Portuguese function words that
 * essentially never appear inside an item or skill name. Words that DO show up in game
 * data are excluded on purpose — `com` (Perícia com Livro), `dos`/`das` (Manto dos
 * Esquecidos), `de`, `do`, `da`, `sem`, `em`.
 *
 * `LEGACY` is the backlog that predates the rule being enforced. It only ever shrinks:
 * translate a file, delete its line. Never add to it — translate the file instead.
 * `npx vitest run src/app/code-language.spec.ts -t backlog` prints what is left.
 */

const SRC = 'src';

/** Portuguese function words that would not appear inside a pt-BR proper noun. */
const PT_MARKERS = [
  'não', 'são', 'está', 'estão', 'também', 'porque', 'então', 'isso', 'aqui', 'quando',
  'pelo', 'pela', 'seja', 'foi', 'era', 'eram', 'tem', 'têm', 'cada', 'mesmo', 'mesma',
  'muito', 'sempre', 'nunca', 'ainda', 'apenas', 'depois', 'antes', 'quem', 'onde',
  'mas', 'porém', 'além', 'através', 'dele', 'dela', 'deles', 'delas', 'neste', 'nesta',
  'nesse', 'nessa', 'aquele', 'aquela', 'todos', 'todas', 'outro', 'outra', 'outros',
  'outras', 'dentro', 'desde', 'até', 'uma', 'umas', 'que', 'para', 'por', 'ser',
  'ter', 'fazer', 'faz', 'vai', 'já', 'só', 'assim', 'entre', 'sobre', 'qual', 'quais',
];

const PT_RE = new RegExp(`(^|[^\\p{L}])(${PT_MARKERS.join('|')})([^\\p{L}]|$)`, 'iu');

/** Files still holding pt-BR prose from before this check existed. Shrink only. */
const LEGACY = new Set<string>([
  'app/api-services/item-description.store.spec.ts',
  'app/api-services/item-description.store.ts',
  'app/api-services/item-script-keys.spec.ts',
  'app/constants/pet-loyalty.ts',
  'app/core/__tests__/dano-fisico-percent.spec.ts',
  'app/core/__tests__/size-resistance.spec.ts',
  'app/core/bonus-key-label.spec.ts',
  'app/core/bonus-key-label.ts',
  'app/core/calculator.ts',
  'app/core/coroa-scaraba-combo.spec.ts',
  'app/core/damage-calculator.ts',
  'app/core/latam-items-2026-08.spec.ts',
  'app/jobs/NightWatch.job-bonus.spec.ts',
  'app/jobs/NightWatch.replay.spec.ts',
  'app/jobs/NightWatch.ts',
  'app/jobs/Shinkiro.shadow-flash-replay.spec.ts',
  'app/jobs/Shinkiro.ts',
  'app/jobs/Shiranui.ts',
  'app/jobs/SkyEmperor.replay-arma.spec.ts',
  'app/jobs/SkyEmperor.replay.spec.ts',
  'app/jobs/SkyEmperor.ts',
  'app/jobs/Sorcerer.ts',
  'app/jobs/StarEmperor.ts',
  'app/jobs/Taekwondo.ts',
  'app/jobs/Windhawk.replay.spec.ts',
  'app/layout/app.topbar.component.ts',
  'app/layout/pages/ro-calculator/battle-hud/battle-hud.component.ts',
  'app/layout/pages/ro-calculator/equipment-cos-enchant/equipment-cos-enchant.component.ts',
  'app/layout/pages/ro-calculator/equipment-shadow/equipment-shadow.component.ts',
  'app/layout/pages/ro-calculator/equipment/equipment.component.ts',
  'app/layout/pages/ro-calculator/item-desc-tooltip-fit.directive.ts',
  'app/layout/pages/ro-calculator/item-desc-tooltip-hover.directive.spec.ts',
  'app/layout/pages/ro-calculator/item-desc-tooltip-hover.directive.ts',
  'app/layout/pages/ro-calculator/item-desc-tooltip.pipe.spec.ts',
  'app/layout/pages/ro-calculator/item-desc-tooltip.pipe.ts',
  'app/layout/pages/ro-calculator/item-search/item-search.component.ts',
  'app/layout/pages/ro-calculator/reduction-breakdown.ts',
  'app/layout/pages/ro-calculator/ro-calculator.component.ts',
  'app/models/main.model.ts',
  'app/replay/__tests__/decode.spec.ts',
  'app/replay/nw-mastery-gap.spec.ts',
  'app/replay/nw-mira-damage.spec.ts',
  'app/replay/pet-and-shadow-atk.spec.ts',
  'app/replay/pet-egg-map.ts',
  'app/replay/random-option-map.ts',
  'app/replay/replay-to-model.ts',
  'app/replay/validate-submission.ts',
  'app/utils/pretty-item-desc.ts',
  'app/utils/wait-rxjs.ts',
]);

/** The skill catalog is game data: its `description` fields are the client's pt-BR text. */
const DATA_FILES = new Set<string>(['app/skills/skill-meta.generated.ts']);

const rel = (file: string) => relative(SRC, file).split('\\').join('/');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.ts')) out.push(full);
  }
  return out;
}

function walkMd(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walkMd(full, out);
    else if (entry.name.endsWith('.md')) out.push(full);
  }
  return out;
}

const lineAt = (src: string, idx: number) => src.slice(0, idx).split('\n').length;

/**
 * Comment bodies, found by walking the source and skipping over string literals — so an
 * apostrophe inside a comment cannot swallow the rest of the file, and a `https://` URL
 * inside a string is never mistaken for a comment.
 */
function commentsOf(src: string): { line: number; text: string }[] {
  const out: { line: number; text: string }[] = [];
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    const d = src[i + 1];
    if (c === '/' && d === '/') {
      const end = src.indexOf('\n', i);
      const stop = end === -1 ? src.length : end;
      out.push({ line: lineAt(src, i), text: src.slice(i + 2, stop) });
      i = stop;
    } else if (c === '/' && d === '*') {
      const end = src.indexOf('*/', i + 2);
      const stop = end === -1 ? src.length : end;
      out.push({ line: lineAt(src, i), text: src.slice(i + 2, stop) });
      i = stop + 1;
    } else if (c === '"' || c === "'" || c === '`') {
      i++;
      while (i < src.length && src[i] !== c) {
        if (src[i] === '\\') i++;
        i++;
      }
    }
  }
  return out;
}

/** First string argument of describe/it/test — the human-readable test name. */
function testNamesOf(src: string): { line: number; text: string }[] {
  const out: { line: number; text: string }[] = [];
  const re = /\b(?:describe|it|test)(?:\.each\([\s\S]*?\))?\s*\(\s*(['"`])((?:\\.|(?!\1)[\s\S])*)\1/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) out.push({ line: lineAt(src, m.index), text: m[2] });
  return out;
}

/** pt-BR inside quotes is content being cited, not prose. `[[links]]` are memory names. */
const unquote = (t: string) => t.replace(/"[^"]*"|«[^»]*»|`[^`]*`|\[\[[^\]]*\]\]/g, ' ');

function violationsIn(file: string): string[] {
  const src = readFileSync(file, 'utf8');
  const name = rel(file);
  const found: string[] = [];
  for (const { line, text } of [...commentsOf(src), ...testNamesOf(src)]) {
    const hit = unquote(text).match(PT_RE);
    if (hit) found.push(`${name}:${line}  «${hit[2]}»  ${text.trim().slice(0, 70)}`);
  }
  return found;
}

const files = walk(SRC).filter((f) => !DATA_FILES.has(rel(f)));

describe('code is written in English', () => {
  it('has no pt-BR prose in comments or test names outside the legacy backlog', () => {
    const offenders: string[] = [];
    for (const file of files) {
      if (LEGACY.has(rel(file))) continue;
      offenders.push(...violationsIn(file));
    }

    expect(
      offenders,
      'Comments, JSDoc and test names must be English; only UI strings and game data stay pt-BR.\n' +
        'Quote pt-BR content you are citing. Do NOT add files to LEGACY — translate them.\n\n' +
        offenders.join('\n'),
    ).toEqual([]);
  });

  it('keeps the legacy list honest — every entry still exists and still has pt-BR', () => {
    const known = new Set(files.map(rel));
    const stale: string[] = [];
    for (const name of LEGACY) {
      if (!known.has(name)) stale.push(`${name} — file is gone, drop it from LEGACY`);
      else if (violationsIn(join(SRC, name)).length === 0) stale.push(`${name} — already translated, drop it from LEGACY`);
    }

    expect(stale, `LEGACY only shrinks. Remove these entries:\n${stale.join('\n')}`).toEqual([]);
  });

  // The agent-facing docs are where the drift started: an instruction file written in
  // pt-BR quietly teaches every later session to answer in kind.
  it('keeps the agent docs (CLAUDE.md, .claude skills) in English', () => {
    const docs = ['CLAUDE.md', ...walkMd('.claude')];
    const offenders: string[] = [];
    for (const doc of docs) {
      readFileSync(doc, 'utf8')
        .split('\n')
        .forEach((text, i) => {
          const hit = unquote(text).match(PT_RE);
          if (hit) offenders.push(`${doc.split('\\').join('/')}:${i + 1}  «${hit[2]}»  ${text.trim().slice(0, 70)}`);
        });
    }

    expect(
      offenders,
      `Agent-facing docs must be English. Quote pt-BR content you are citing.\n\n${offenders.join('\n')}`,
    ).toEqual([]);
  });

  it('backlog — prints what is left to translate', () => {
    const perFile = [...LEGACY]
      .map((name) => ({ name, n: violationsIn(join(SRC, name)).length }))
      .sort((a, b) => b.n - a.n);
    const total = perFile.reduce((sum, f) => sum + f.n, 0);
    console.log(`pt-BR backlog: ${total} lines across ${perFile.length} files`);
    for (const { name, n } of perFile) console.log(`  ${String(n).padStart(4)}  ${name}`);
    expect(total).toBeGreaterThanOrEqual(0);
  });
});
