---
name: triage-rrf
description: Works the queue of community .rrf recordings on the shared issue tracker — reads the recording cards, judges which are usable and which are worth a review pass, and hands the chosen ones to review-rrf-class with the file on disk and the traits in hand. Use when someone asks to go through the replay queue, to see what recordings came in, which classes have evidence waiting, or after announcing a call for recordings.
---

# Triage of the .rrf recording queue

The board is **issues.latam-tools.com.br** (Firebase project `issues-latam-tools`,
collection `issues`), filtered to `projeto: "simulador"` and `tipo: "replay"`. Those are
the recording cards: a title, a status, a credit, a `gravação` block of decoded metadata,
and the `.rrf` itself stored inline in the card's `anexos` subcollection.

**This skill checks no formulas.** It stops the moment the right files are on disk with
their traits; the checking is [`review-rrf-class`](../review-rrf-class/SKILL.md)'s job.
It is the recording half of [`triage-backlog`](../triage-backlog/SKILL.md), which owns the
same board and the same script — use that one for `tipo: "bug"` and `tipo: "feature"`, and
read its **§0 on the two credit fields** before writing any release note.

## 0. Where recordings come from, and what is already decided

A player submits through the **Ajude o simulador** dialog. The browser validates it on the
spot (opens in `rrfparser`, under 900 KB, class exists in the calculator, skill tree
present, LATAM + public-use consent ticked — `src/app/replay/validate-submission.ts`), and
it lands in the tracker's private `gravacoes` inbox. **Do not re-run those checks.**

The inbox is not the queue and is not readable from here. Someone promotes an entry by
hand on the tracker's `/admin/gravacoes` page, and *that* is what creates the card — public
from that moment, `.rrf` attached, nick credited. There is no longer a skill that reads the
inbox; the skill that did was removed once the board became the single queue.

So everything this skill sees is already accepted in principle. The judgement left is
narrower and it is the only judgement that matters: **is this file usable, and is it worth
a pass?**

## 1. Read the queue

```
node .claude/skills/triage-rrf/queue.mjs
```

It pulls every `replay` card in `status: "backlog"` and joins it against the spec coverage
this repo already has for the class, then groups and ranks. The join is the point: a
recording is worth a pass in proportion to what `src/app/jobs/` **cannot already tell
you**, so classes with no specs at all sort first. It flags duplicates, thin files, missing
items and the traits verdict per card.

```
node .claude/skills/triage-rrf/queue.mjs --class ArchMage    # one class
node .claude/skills/triage-rrf/queue.mjs --json              # the joined data
```

It reads the board through `triage-backlog/backlog.mjs --list --json` rather than talking
to Firestore itself — one credential, one query, two readers. The credential is the token
`firebase login` already left on the machine; set `GOOGLE_APPLICATION_CREDENTIALS` to a
service-account `.json` to override.

For one card in full — description, comments, credit, the `gravação` block:

```
node .claude/skills/triage-backlog/backlog.mjs --get <id>
```

## 2. The rule that decides usability: traits exist only for 4th classes

**Traits (POD/STA/SAB/FEI/CON/CRV) unlock at base 200, so a 3rd class does not have
them at all.** A Sicário 180/64 or a Renegado 170/58 whose card reads `talentos: NÃO
INFORMADOS` is **complete** — there is nothing missing and nothing to ask the reporter
for. Getting this backwards benches perfectly good recordings; it once benched five at
once, including the only Renegado file on the board for a class with no specs.

The real blocker is narrower:

| class | traits on the card | verdict |
|---|---|---|
| 3rd class (`classId` < 4252) | absent | **fine** — they do not exist |
| 4th class (`classId` >= 4252) | all six | **usable** |
| 4th class | absent | **blocked** — the build cannot be reconstructed |
| 4th class | partial | **blocked** — the gaps are unknown, not zero |

A 4th-class recording made entirely inside one map never fires `ZC_COUPLESTATUS`, so the
`.rrf` carries no traits and the dialog collects them by hand instead. When even that is
absent, `review-rrf-class` §0 cannot reconstruct the build: ask the reporter, or bench the
card. `queue.mjs` decides this per card from `classId` and prints it — do not eyeball it.

`traitsSource` matters as much as the values. **`lidos da gravação`** is the game's own
number and can be trusted; **`informados por quem gravou`** was typed by a human into a
form and should be checked against the status window in the recording before anything is
concluded from it.

## 3. What makes a recording worth a pass

Ranked by how often each actually decided the call:

1. **The class has no specs.** Far and away the strongest signal. A class with a
   characterization spec and two replay specs learns little from a fourth file; a class
   with nothing learns everything from the first.
2. **Equipment swaps in a single session.** Five or more and the file is a gear-state
   matrix by itself — one character, one build, gear changing under it, which is exactly
   what separates "the class formula is wrong" from "an item is missing". These are the
   most valuable files on the board and they are rare.
3. **Damage events against a dummy.** Volume is signal. Under ~10 events a file cannot
   carry a conclusion on its own; it can still corroborate one.
4. **`dummyHits: 0` is a real discount.** Damage against live mobs or inside an instance
   means unknown target DEF, so a 385-event file on a real map can be worth less than a
   50-event file on `tra_fild`. Read the event count together with the dummy count, never
   alone.
5. **Several files for one class, from different characters.** Different trait spreads and
   levels across three recordings is a matrix assembled by accident — worth more than the
   sum of the three.
6. **Recency of `appVersion`.** A recording made against a much older build may already be
   fixed; one on the current build is a live regression check.

## 4. What is not a review, but comes out of the same read

- **Duplicates.** The dialog gets submitted twice. `queue.mjs` matches on file name,
  player, duration and event count. Close one of each pair.
- **`itens fora do banco`.** The importer lists ids it could not resolve. That is a
  genuine data gap for [`add-ro-item`](../add-ro-item/SKILL.md), independent of whether the
  recording is ever reviewed, and it is worth fixing on its own because it degrades every
  future import of that item.
- **Credits.** `autor` is the public credit; `contato` is **never** published. Blank
  `autor` means "usuário anônimo" — a name in the contact field is not a credit. `autor:
  "Adson"` is the maintainer and gets no credit line. Full rules in `triage-backlog` §0.

## 5. Report, then stop

The run is **read → judge → report → stop**. Produce a table grouped by class, with the
coverage each already has, the usable material on the board, and a ranked recommendation of
what to tackle and what to skip. Say which cards are blocked and on what, which are
duplicates, and which data gaps fell out.

Then **stop**. Nothing is decoded, nothing is written to the repo, no card is marked and
nothing is committed until that report is approved. A triage that ends in six review passes
nobody asked for is worse than one that ends in a table.

## 6. Hand over

For each approved card, put the file on disk and pass it on:

```
node .claude/skills/triage-backlog/backlog.mjs --anexos <id> --out .scratch/<id>.rrf
```

Give `review-rrf-class` the path, the class, the level, and **the traits with their
source** — that is the input its §0 asks for, and the card is where it comes from. When a
recording earns a fixture, move it into
`src/app/replay/__tests__/fixtures/<class>-<scenario>.rrf` and name the spec after the
**behaviour** it pins, never after the card or the month it arrived (CLAUDE.md, and
[[spec-names-describe-subject]]).

Once a card is actually done:

```
node .claude/skills/triage-backlog/backlog.mjs --mark <id> --status resolvido --note "..."
node .claude/skills/triage-backlog/backlog.mjs --mark <id> --status nao_sera_feito --note "duplicata de <id>"
```
