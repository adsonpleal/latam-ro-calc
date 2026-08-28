#!/usr/bin/env node
// The recording queue: every `tipo: "replay"` card on the board, joined against the
// spec coverage this repo already has for the class, and ranked.
//
//   node .claude/skills/triage-rrf/queue.mjs                 (the queue, grouped by class)
//   node .claude/skills/triage-rrf/queue.mjs --class ArchMage
//   node .claude/skills/triage-rrf/queue.mjs --json          (the joined data, for a script)
//
// It reads the board through `triage-backlog/backlog.mjs --list --json` rather than
// talking to Firestore itself: one credential, one query, two readers. Pulling a file is
// that script's job too (`--anexos <id> --out <caminho>`), so nothing here downloads.
//
// The join is the whole point. A recording is worth a review pass in proportion to what
// the repo *cannot* already tell you, and that is a fact about `src/app/jobs/`, not about
// the card. A class with no spec at all is where a recording buys the most.
//
// Printed text is pt-BR where it quotes the tracker's own schema (the card fields the
// operator reads on the site) and English elsewhere, per CLAUDE.md.

import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';

const JOBS = 'src/app/jobs';

// A 4th class is 4252+ (4252-4264, plus the Expanded 4th at 4302-4308); everything below
// is a 3rd class or an expanded 2nd. The split matters for exactly one reason — see
// `traitsVerdict`.
const FOURTH_CLASS_MIN_ID = 4252;

const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const value = (f) => {
  const i = args.indexOf(f);
  return i > -1 ? args[i + 1] : undefined;
};

// --- the repo side of the join ---------------------------------------------

/**
 * `classId` -> the name of the class's source file in src/app/jobs.
 *
 * Derived from ClassIDEnum rather than hardcoded, because a hardcoded pt-BR map is the
 * one thing here guaranteed to rot: the tracker stores the client's pt-BR `className`,
 * and pt-BR class names are a known trap (Sicário is GuillotineCross, Executor is
 * ShadowCross, Renegado is ShadowChaser, Mandraque is AbyssChaser, Magus is ArchMage).
 * The enum member name is also the source file name, so the id resolves straight to it.
 */
function classFilesById() {
  const src = readFileSync(`${JOBS}/_class-name.ts`, 'utf8');
  const block = src.slice(src.indexOf('enum ClassIDEnum'));
  const body = block.slice(0, block.indexOf('\n}'));
  const out = new Map();
  for (const [, name, id] of body.matchAll(/(\w+)\s*=\s*(\d+),/g)) out.set(Number(id), name);
  return out;
}

/** Every spec file that belongs to a class, split into replay-backed and the rest. */
function coverageFor(classFile) {
  if (!classFile) return { replay: [], other: [] };
  const specs = readdirSync(JOBS).filter((f) => f.startsWith(`${classFile}.`) && f.endsWith('.spec.ts'));
  return {
    replay: specs.filter((f) => /replay|gear-states|matrix/.test(f)),
    other: specs.filter((f) => !/replay|gear-states|matrix/.test(f)),
  };
}

// --- the card side ----------------------------------------------------------

/**
 * Whether the absence of traits is a defect or the normal state of the class.
 *
 * This is the rule that decides whether a card is usable, and getting it backwards
 * benches good recordings. Traits (POD/STA/SAB/FEI/CON/CRV) exist only for 4th classes,
 * which unlock them at base 200. A 3rd class does not have them at all, so a Sicário 180
 * or a Renegado 170 whose card says `NÃO INFORMADOS` is complete, not incomplete — there
 * is nothing to ask the reporter for and nothing missing from the build.
 *
 * The real blocker is narrower: a *4th* class with no traits. Those ride on
 * ZC_COUPLESTATUS, which the server sends on map load, so a session recorded entirely
 * inside one map carries none — and review-rrf-class §0 is explicit that a 4th-class
 * build cannot be reconstructed without all six. A partial set does not help: the missing
 * fields are unknown, not zero.
 */
function traitsVerdict({ classId, traits, traitsSource }) {
  const fourth = classId >= FOURTH_CLASS_MIN_ID;
  if (!fourth) return { ok: true, label: 'n/a — 3rd class, traits do not exist' };
  if (!traits) return { ok: false, label: 'MISSING — a 4th class needs all six (blocks the review)' };
  const keys = ['pow', 'sta', 'wis', 'spl', 'con', 'crt'];
  if (keys.some((k) => traits[k] == null)) {
    return { ok: false, label: 'PARTIAL — the gaps are unknown, not zero (blocks the review)' };
  }
  const spread = `POD ${traits.pow} STA ${traits.sta} SAB ${traits.wis} FEI ${traits.spl} CON ${traits.con} CRV ${traits.crt}`;
  return traitsSource === 'form'
    ? { ok: true, label: `${spread}  (typed by hand — check against the status window)` }
    : { ok: true, label: `${spread}  (read off the recording)` };
}

/**
 * What the file is good for, one line each. These are the axes that actually separated the
 * useful recordings from the thin ones the first time this queue was worked by hand.
 */
function notes(r) {
  const out = [];
  if (r.equipChangeCount >= 5) {
    out.push(`${r.equipChangeCount} equipment swaps — a gear-state matrix in a single file, the most valuable kind`);
  }
  if (!r.dummyHits && r.damageEvents) {
    out.push(`0 dummy hits across ${r.damageEvents} events — the targets have unknown DEF, harder than the size suggests`);
  }
  if (r.damageEvents < 10) out.push(`only ${r.damageEvents} damage events — too thin to carry a conclusion on its own`);
  if (r.skippedItems?.length) {
    out.push(`itens fora do banco: ${r.skippedItems.join(', ')} — a data gap for add-ro-item, independent of any review`);
  }
  return out;
}

/** Same character, same file, same length: the dialog was submitted twice. */
const dupKey = (r) => [r.fileName, r.player, r.durationMs, r.damageEvents].join('|');

// --- assemble ---------------------------------------------------------------

const raw = execFileSync(
  process.execPath,
  ['.claude/skills/triage-backlog/backlog.mjs', '--list', '--status', 'backlog', '--limit', '500', '--json'],
  { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
);

const files = classFilesById();
const seen = new Map();

let cards = JSON.parse(raw)
  .filter((c) => c.d.tipo === 'replay' && c.d.replay)
  .map(({ id, d }) => {
    const r = d.replay;
    const classFile = files.get(r.classId);
    const cov = coverageFor(classFile);
    const key = dupKey(r);
    const duplicateOf = seen.get(key) ?? null;
    if (!duplicateOf) seen.set(key, id);
    return {
      id,
      classFile: classFile ?? `(unknown class id ${r.classId})`,
      classPtBr: r.className,
      player: r.player,
      level: `${r.baseLevel}/${r.jobLevel}`,
      seconds: Math.round((r.durationMs ?? 0) / 1000),
      damageEvents: r.damageEvents ?? 0,
      dummyHits: r.dummyHits ?? 0,
      equipChangeCount: r.equipChangeCount ?? 0,
      map: r.map,
      fileName: r.fileName,
      appVersion: r.appVersion,
      autor: d.autor ?? null,
      createdAt: String(d.criadoEm ?? '').slice(0, 10),
      coverage: cov,
      uncovered: cov.replay.length === 0 && cov.other.length === 0,
      traits: traitsVerdict(r),
      notes: notes(r),
      duplicateOf,
    };
  });

const only = value('--class');
if (only) cards = cards.filter((c) => c.classFile === only || c.classPtBr === only);

if (flag('--json')) {
  console.log(JSON.stringify(cards, null, 2));
  process.exit(0);
}

const groups = new Map();
for (const c of cards) {
  if (!groups.has(c.classFile)) groups.set(c.classFile, []);
  groups.get(c.classFile).push(c);
}

const usable = (c) => !c.duplicateOf && c.traits.ok;
const events = (g) => g.filter(usable).reduce((n, c) => n + c.damageEvents, 0);

// Order the groups the way the work should be picked up: classes with no coverage at all
// first, then by how much usable material the board actually holds for them.
const ranked = [...groups.entries()].sort(([, a], [, b]) => {
  if (a[0].uncovered !== b[0].uncovered) return a[0].uncovered ? -1 : 1;
  return events(b) - events(a);
});

console.log(`${cards.length} recording card(s) in backlog, across ${groups.size} class(es).`);
console.log('Ordered by what the repo cannot already tell you: uncovered classes first.\n');

for (const [classFile, group] of ranked) {
  const { coverage, classPtBr } = group[0];
  const cov = coverage.replay.length
    ? `${coverage.replay.length} replay spec(s) + ${coverage.other.length} other`
    : coverage.other.length
      ? `${coverage.other.length} spec(s), NONE replay-backed`
      : 'NO SPECS AT ALL';

  console.log('='.repeat(78));
  console.log(`${classFile}  —  "${classPtBr}"`);
  console.log(`coverage: ${cov}   ·   ${group.length} card(s)   ·   ${events(group)} usable damage events`);
  if (coverage.replay.length) console.log(`  ${coverage.replay.join(', ')}`);
  console.log('');

  for (const c of [...group].sort((x, y) => y.damageEvents - x.damageEvents)) {
    const dup = c.duplicateOf ? `   [DUPLICATE of ${c.duplicateOf} — close one]` : '';
    console.log(`  ${c.id}${dup}`);
    console.log(
      `    ${c.player} nv ${c.level} · ${c.seconds}s · ${c.damageEvents} events · ` +
        `${c.dummyHits} dummy hits · mapa ${c.map}`,
    );
    console.log(
      `    ${c.fileName} · sim ${c.appVersion} · ${c.createdAt}` + (c.autor ? ` · crédito: ${c.autor}` : ''),
    );
    console.log(`    talentos: ${c.traits.label}`);
    for (const n of c.notes) console.log(`    · ${n}`);
    console.log('');
  }
}

const blocked = cards.filter((c) => !c.traits.ok && !c.duplicateOf);
const dups = cards.filter((c) => c.duplicateOf);
const gaps = [...new Set(cards.flatMap((c) => c.notes.filter((n) => n.startsWith('itens fora do banco'))))];

console.log('='.repeat(78));
if (blocked.length) console.log(`blocked on traits (${blocked.length}): ${blocked.map((c) => c.id).join(', ')}`);
if (dups.length) console.log(`duplicates to close (${dups.length}): ${dups.map((c) => c.id).join(', ')}`);
for (const g of gaps) console.log(g);
if (!blocked.length && !dups.length && !gaps.length) console.log('No blockers, duplicates or data gaps.');
