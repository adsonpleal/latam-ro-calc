---
name: triage-rrf-uploads
description: Pulls the .rrf recordings the community submitted through the "Ajude o simulador" dialog from the tracker's private inbox, sorts out which are worth checking, and hands each one over ready for review-rrf-class (with the traits the recorder reported). Use when someone asks to see new submissions, to go through the community replay queue, or after announcing a call for recordings.
---

# Triage of community-submitted recordings

The **Ajude o simulador** dialog (the red button in the top bar) takes a `.rrf` recording,
validates it on the spot and files it in the shared issue tracker
(**issues.latam-tools.com.br**, Firebase project `issues-latam-tools`), in its `gravacoes`
collection — an inbox, not the board. This skill is the other end: fetch, choose, forward.

It used to write to this repo's own `replay_submissions` collection, and then, for a
while, straight onto the tracker's board as a card born `arquivado`. Both are retired; the
recordings kept their ids through every move.

**This skill checks no formulas.** It stops the moment the file is on disk with the traits
in hand; the checking belongs to [`review-rrf-class`](../review-rrf-class/SKILL.md).

## 0. The one thing to get right

**A recording is not a card, and nothing in the inbox is public.** `gravacoes` is
admin-read-only, so no URL returns the entry or the file — deliberately, because that is
the privacy the old write-only collection had, and because the consent the sender ticked
promises the file may become public *as a test in the open repository*, not that it gets
published on a board.

**`--promover` is what publishes**, and it does it by *creating* a card: ticket in backlog,
`.rrf` attached, nick credited, all world-readable from that moment. Do it only for a
recording that is genuinely going to be used. Every other decision (`--marcar`) stays
inside the inbox, and can be taken back.

The same button exists on the tracker's `/admin/gravacoes` page, for when the triage is
being done by hand instead of from here.

## 1. What the browser already validated

Do not repeat these checks — if the entry exists, it already passed them
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

Shows the recordings still waiting (`estado: fila`), newest first, without downloading any
bytes — the `.rrf` lives in a subdocument, so the listing never touches it. Per entry:
character, class, levels, duration, hit count, **equipment changes**, learned skills,
traits, the credit nick, the recorder's note, any triage note, and the items that fell
outside the database. A `[card <id>]` marker means that one was promoted.

`--estado conferida|descartada|promovida|todas` and `--limit N` also exist.

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
combined with skills the class does not have here. In that case mark it `descartada` with
the note — nothing about it ever leaves the inbox.

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
node .claude/skills/triage-rrf-uploads/fetch-submissions.mjs --promover <id> --nota "boa gravação: virou a fixture nw-ult, achou o buraco na maestria"
node .claude/skills/triage-rrf-uploads/fetch-submissions.mjs --marcar <id> --estado descartada --nota "gravação de outro servidor: 40 itens fora do banco"
```

| what you decided | command | what happens |
|---|---|---|
| good recording, worth using | `--promover` | **publishes**: creates the card in backlog with the `.rrf` downloadable, and stamps the entry `promovida` |
| already used as a test, not worth a card | `--marcar --estado conferida` | stays in the inbox |
| not usable | `--marcar --estado descartada` | stays in the inbox |
| not looked at yet | `fila` | the state it arrives in |

`--nota` on `--marcar` is a **private** annotation on the entry. `--nota` on `--promover`
becomes a comment on the card, public from the moment the card is — write that one as
something a stranger can read.

The card takes the recording's id and its upload date, so `/t/<id>` is the same id you
triaged, and the board credits the day it was recorded.

If the recording led to a fix and the sender left a **nick**, credit them in the Novidades
entry (`src/app/layout/app.topbar.component.ts`, `updates` array): impersonal voice, and
"por Fulano" — not "pelo Fulano". See [[changelog-passive-voice]] and
[[novidades-reportado-por]].

## Document format

Collection `gravacoes` in project `issues-latam-tools`, 10-character id still chosen by
the client, so an id from the old collection still resolves.

| field | what it is |
|---|---|
| `estado` | `fila` on arrival; `conferida`/`descartada` by `--marcar`; `promovida` by `--promover` |
| `issueId` | the card `--promover` created. Present only once promoted, and equal to the entry's own id |
| `titulo` | derived from the parser's summary |
| `notas` | what the sender typed in the dialog. The card's wording is composed by the tracker at promotion — this end sends what happened, not how it should read |
| `resumo` | the parser's summary, denormalised so the listing need not download the recording: class, levels, duration, hits, equip changes, skills, `skippedItems`, `appVersion`, `fileName`, plus `traits` and `traitsSource` |
| `nick` | the credit nick, if the sender gave one. Reaches the public only as the promoted card's `autor` |
| `contato` | the sender's Discord. Never published; it rides the document because the whole collection is admin-only |
| `nome`, `tamanho` | the file's name and size, so the listing can show them without reading the bytes |
| `notaTriagem` | private annotation from `--marcar --nota` |
| `arquivo/rrf` | the recording, in a subdocument: `bytes` (≤ 900 KB — a Firestore document holds 1 MiB), `nome`, `tipo: "rrf"`, `tamanho`. Same shape as an attachment on a card, so promoting is a field copy |

The promoted card is an ordinary ticket in `issues`: `tipo: "replay"`, `projeto:
"simulador"`, `status: "backlog"`, the summary denormalised in `replay`, the file at
`issues/<id>/anexos/gravacao` and the Discord at `issues/<id>/privado/contato`. From there
on it moves around the board like any other card.
