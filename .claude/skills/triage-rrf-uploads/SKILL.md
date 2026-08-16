---
name: triage-rrf-uploads
description: Pulls the .rrf recordings the community submitted through the "Ajude o simulador" dialog, sorts out which are worth checking, and hands each one over ready for review-rrf-class (with the traits the recorder reported). Use when someone asks to see new submissions, to go through the community replay queue, or after announcing a call for recordings.
---

# Triage of community-submitted recordings

The **Ajude o simulador** dialog (the red button in the top bar) takes a `.rrf` recording,
validates it on the spot and files it in the shared issue tracker
(**issues.latam-tools.com.br**, Firebase project `issues-latam-tools`) as a card of
`tipo: "replay"`, with the recording as an attachment. This skill is the other end:
fetch, choose, forward.

It used to write to this repo's own `replay_submissions` collection. That collection is
retired; the 24 recordings it held were migrated, keeping their ids.

**This skill checks no formulas.** It stops the moment the file is on disk with the traits
in hand; the checking belongs to [`review-rrf-class`](../review-rrf-class/SKILL.md).

## 0. The one thing to get right

**A recording arrives archived, and archived means invisible.** It is not on the public
board and the tracker's rules refuse to serve its `.rrf` to anyone who is not the admin —
deliberately, because that is the privacy the old write-only collection had, and because
the consent the sender ticked promises the file may become public *as a test in the open
repository*, not that it gets published on a board.

Moving a card to **`backlog` is what publishes it** — card, description, nick and the
`.rrf` all become world-readable. Do that only for a recording that is genuinely going to
be used. Every other status leaves it archived.

## 1. What the browser already validated

Do not repeat these checks — if the card exists, it already passed them
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

## 2. Credential

The tracker's rules deny writes to everyone but the admin account, so the script
authenticates as an administrator. It reuses the token `firebase login` already left on
the machine — **no `.firebase-admin.json` needed any more**. If you prefer a service
account, point `GOOGLE_APPLICATION_CREDENTIALS` at the `.json` and it wins.

If you are decommissioning: the old `.firebase-admin.json` at the repo root was for
`simulador-latam-ro` and is no longer used by anything. Revoke that key.

## 3. List what came in

```
node .claude/skills/triage-rrf-uploads/fetch-submissions.mjs --list
```

Shows the recordings still waiting (`status: reportado`), newest first, without
downloading any bytes — the `.rrf` lives in a subcollection now, so the listing never
touches it. Per card: character, class, levels, duration, hit count, **equipment
changes**, learned skills, traits, the credit nick, the recorder's note and the items that
fell outside the database. A `[no quadro público]` marker means that one is already
published.

`--status backlog|em_progresso|resolvido|nao_sera_feito|todas` and `--limit N` also exist.

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
combined with skills the class does not have here. In that case mark it `nao_sera_feito`
with the note — it stays archived.

## 4. Download

```
node .claude/skills/triage-rrf-uploads/fetch-submissions.mjs --get <id>
```

Writes to `.scratch/<id>.rrf` (git-ignored) and prints the header — including the
**TRAITS**, which is the information `review-rrf-class` §0 normally tells you to ask the
player for. Here it arrived with the submission: use exactly those numbers, they are the
invested value (0-100), without the job bonus.

The header says where they came from. **`lidos da própria gravação`** is the server's own
`ZC_COUPLESTATUS`, and is as good as the numbers get. **`informados por quem gravou`** is
somebody reading their own status window into a form, which is where a wrong trait comes
from — if a residual will not close and the traits are from the form, that is a thing worth
doubting, and worth asking the sender to confirm.

To promote the recording to a fixture once it has proved its worth:

```
node .claude/skills/triage-rrf-uploads/fetch-submissions.mjs --get <id> --out src/app/replay/__tests__/fixtures/<class>-<scenario>.rrf
```

The naming pattern is `<class abbreviation>-<scenario>.rrf` (`nw-ult.rrf`,
`hn-magic-lv1.rrf`).

## 5. Check

Call `review-rrf-class` with the file path and the traits. Skip its "ask the player for
the traits" part — you already have them.

One thing to do first, if the listing reported **items outside the database**: run the
`add-ro-item` skill with those ids. Without them the imported build is incomplete and the
damage residual will look like a formula error.

## 6. Close the loop

```
node .claude/skills/triage-rrf-uploads/fetch-submissions.mjs --mark <id> --status backlog --note "boa gravação: virou a fixture nw-ult, achou o buraco na maestria"
node .claude/skills/triage-rrf-uploads/fetch-submissions.mjs --mark <id> --status nao_sera_feito --note "gravação de outro servidor: 40 itens fora do banco"
```

| what you decided | status | what happens |
|---|---|---|
| good recording, worth using | `backlog` | **published**: goes onto the public board with the `.rrf` downloadable |
| already used and done | `resolvido` | stays archived — move it on from backlog once the check is finished |
| not usable | `nao_sera_feito` | stays archived |
| not looked at yet | `reportado` | stays archived (the default it arrives in) |

`--note` becomes a comment on the card, which is public from the moment the card is. Write
it as something a stranger can read.

If the recording led to a fix and the sender left a **nick**, credit them in the Novidades
entry (`src/app/layout/app.topbar.component.ts`, `updates` array): impersonal voice, and
"por Fulano" — not "pelo Fulano". See [[changelog-passive-voice]] and
[[novidades-reportado-por]].

## Document format

Collection `issues` in project `issues-latam-tools`, 10-character id still chosen by the
client, so an id from the old collection still resolves.

| field | what it is |
|---|---|
| `tipo` | always `replay` for these — this is the tag that separates them from the bug/suggestion cards people file by hand |
| `projeto` | always `simulador` |
| `status` | `reportado` on arrival; `backlog`/`resolvido`/`nao_sera_feito` afterwards, set by this skill |
| `arquivado` | `true` on arrival. `false` only once promoted to `backlog` — this is the switch that publishes |
| `titulo`, `descricao` | derived from the parser's summary; the sender's note is the first paragraph of the description |
| `autor` | the credit nick, if the sender gave one. Public once the card is |
| `replay` | the parser's summary, denormalised so the listing need not download the recording: class, levels, duration, hits, equip changes, skills, `skippedItems`, `appVersion`, `fileName`, plus `traits` and `traitsSource` |
| `anexos` | count; the recording itself is at `issues/<id>/anexos/gravacao` as a `bytes` field (≤ 900 KB — a Firestore document holds 1 MiB) |
| `privado/contato` | the sender's Discord, in a subdocument only the admin can read. Never published |
| `comentarios` | count of triage notes, in `issues/<id>/comentarios` |
