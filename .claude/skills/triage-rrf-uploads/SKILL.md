---
name: triage-rrf-uploads
description: Pulls the .rrf recordings the community submitted through the "Ajude o simulador" dialog, sorts out which are worth checking, and hands each one over ready for review-rrf-class (with the traits the recorder reported). Use when someone asks to see new submissions, to go through the community replay queue, or after announcing a call for recordings.
---

# Triage of community-submitted recordings

The **Ajude o simulador** dialog (the red button in the top bar) takes a `.rrf` recording,
validates it on the spot and writes it to the Firestore of project `simulador-latam-ro`,
collection `replay_submissions`. This skill is the other end: fetch, choose, forward.

**This skill checks no formulas.** It stops the moment the file is on disk with the traits
in hand; the checking belongs to [`review-rrf-class`](../review-rrf-class/SKILL.md).

## 0. What the browser already validated

Do not repeat these checks — if the submission exists, it already passed them
(`src/app/replay/validate-submission.ts`, tested in `validate-submission.spec.ts`):

- the file opens in `rrfparser` and is under 900 KB;
- the class exists in the calculator (the strongest filter against another server's
  recording);
- **the skill tree is in the file** (`learnedSkills` is not empty);
- the recorder confirmed it is from RO LATAM and authorised using the file as a test in
  the public repository.

What you still have to judge, because it cannot be validated from outside: whether the
recording really is from LATAM (the `.rrf` does not name the server), and whether it has
enough material.

## 1. Credential

Client reads are denied by the rules (`firestore.rules`), so the script uses a service
account:

1. Firebase console → project **simulador-latam-ro** → Project settings → Service
   accounts → **Generate new private key**.
2. Save it as `.firebase-admin.json` at the repo root. It is already in `.gitignore`.

## 2. List what came in

```
node .claude/skills/triage-rrf-uploads/fetch-submissions.mjs --list
```

Shows the submissions with `status: new`, newest first, without downloading the bytes.
Per submission: character, class, levels, duration, hit count, **equipment changes**,
learned skills, traits, nick/Discord, the recorder's note and the items that fell outside
the database.

`--status reviewed|rejected` and `--limit N` also exist.

### How to choose

Prioritise, in this order:

1. **A rarely tested class.** Check which ones already have a `*.replay.spec.ts` in
   `src/app/jobs/` — one that has none is worth far more than the tenth Night Watch
   recording.
2. **Equipment changes > 0.** That is what separates "the class formula is wrong" from
   "an item is missing from the database": the same character, with and without each
   piece, in one recording. Zero changes still helps, but yields less.
3. **Many hits.** Repetition is what produces criticals, which are deterministic and are
   what closes the check (see `review-rrf-class` §6).
4. **A recorder note pointing at a specific number.** "Implosão Tóxica looks 10% higher
   in game" is a ready-made hypothesis.

Signs it is probably **not** LATAM despite the checkbox: many items outside the database
combined with skills the class does not have here. In that case mark it `rejected` with
the note.

## 3. Download

```
node .claude/skills/triage-rrf-uploads/fetch-submissions.mjs --get <id>
```

Writes to `.scratch/<id>.rrf` (git-ignored) and prints the header — including the
**TRAITS**, which is the information `review-rrf-class` §0 normally tells you to ask the
player for. Here it arrived with the submission: use exactly those numbers, they are the
invested value (0-100), without the job bonus.

To promote the recording to a fixture once it has proved its worth:

```
node .claude/skills/triage-rrf-uploads/fetch-submissions.mjs --get <id> --out src/app/replay/__tests__/fixtures/<class>-<scenario>.rrf
```

The naming pattern is `<class abbreviation>-<scenario>.rrf` (`nw-ult.rrf`,
`hn-magic-lv1.rrf`).

## 4. Check

Call `review-rrf-class` with the file path and the traits. Skip its "ask the player for
the traits" part — you already have them.

One thing to do first, if the listing reported **items outside the database**: run the
`add-ro-item` skill with those ids. Without them the imported build is incomplete and the
damage residual will look like a formula error.

## 5. Close the loop

```
node .claude/skills/triage-rrf-uploads/fetch-submissions.mjs --mark <id> --status reviewed --note "became the nw-ult fixture; found the mastery gap"
node .claude/skills/triage-rrf-uploads/fetch-submissions.mjs --mark <id> --status rejected --note "recording from another server: 40 items outside the database"
```

If the recording led to a fix and the sender left a **nick**, credit them in the Novidades
entry (`src/app/layout/app.topbar.component.ts`, `updates` array): impersonal voice, and
"por Fulano" — not "pelo Fulano". See [[changelog-passive-voice]] and
[[novidades-reportado-por]].

## Document format

Collection `replay_submissions`, 10-character id chosen by the client.

| field | what it is |
|---|---|
| `bytes` | the raw `.rrf` (≤ 900 KB — a Firestore document holds 1 MiB) |
| `fileName`, `uploadedAt`, `appVersion`, `latamConfirmed` | provenance |
| `status` | `new` on creation; `reviewed`/`rejected` afterwards, set by this skill |
| `traits` | `{pow,sta,wis,spl,con,crt}`, invested value 0-100. Absent for a class without traits |
| `nick`, `discord`, `notes` | optional, from the sender |
| `summary` | what the parser read, denormalised so the listing need not download the bytes |
| `triagedAt`, `triageNote` | written by `--mark` |
