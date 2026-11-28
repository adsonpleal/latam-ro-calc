# ROADMAP 2027 preview

Gravity published a four-quarter roadmap for LATAM. This page records, per roadmap entry,
what the calculator shows today, where each number came from, and what is deliberately
absent — so the next pass starts from what was checked rather than from the roadmap text.

The roadmap entries, in Gravity's own wording:

| Quarter | Entries |
|---|---|
| Q1 | Episódio 20; Renovação das Ecosferas de Varmunt; aumento do nível máximo para 260 |
| Q2 | Guerra de Heroria; Profundezas da Ecosfera |
| Q3 | Episódio 21; Jardim do Tempo; Abismo da Ecosfera |
| Q4 | Capítulo 1: Canção de Yggdrasil; nível máximo 275 (base) e 60 (classe); 14 novas habilidades |

Those are the LATAM names. iRO and kRO have already shipped most of them under their own
names, so the mapping from a roadmap entry to the page it was read from is written down
here rather than left to be re-derived. **iRO is a full episode behind kRO**: it has
Episode 20 but not Episode 21, Herosria or Chapter 1, so some entries are sourced from the
kRO dev-note board and divine-pride instead. Which source applies is stated per entry.

## How the preview works

Nothing here is new machinery and nothing here is a new number. Every id was **already a
complete record** in `item.json` — English name, English description, modelled `script` —
and merely invisible, because `presentInLatam` is derived from the generated
`latam-items.json` and LATAM has not shipped these ids. The change is one `preRelease: true`
per record, which is the one hand-authored source of `presentInLatam`; see the `preRelease`
section of [item-json.md](item-json.md).

The pickers tag those rows **Prévia**, and the cog in the topbar opens Configurações, whose
**Prévias** Sim/Não control hides them again. `pre-release-items.spec.ts` fails the day
LATAM ships any flagged id, and `roadmap-2027-preview.spec.ts` does the same per roadmap
entry, so the quarter that landed is named by the failure.

## What the preview covers

| Roadmap entry | Source | Added |
|---|---|---|
| Q1 Episódio 20 | iRO [Episode 20 Update](https://renewal.playragnarok.com/news/updatedetail.aspx?id=422) | Glacier set (11), Dim Glacier set (6), 20 cards, 112 enchants |
| Q1 Renovação das Ecosferas de Varmunt | iRO [Biosphere Part II](https://renewal.playragnarok.com/news/updatedetail.aspx?id=397) | 12 armour pieces and 9 rings at level 230, 88 enchants |
| Q1/Q3 shared | both pages above | the 10 Lv.3 rune crystals and tier-2 Biosphere gems the renewal and the Abismo pools share |
| Q2 Guerra de Heroria | kRO [dev note 2022-10-20](https://ro.gnjoy.com/news/devnote/View.asp?category=3&seq=4154469) | the 3 Dimensional Wanderer accessories (season-1 reward) and their 60 enchants |
| Q2 Profundezas da Ecosfera | iRO [Deep Level 1](https://renewal.playragnarok.com/news/updatedetail.aspx?id=427) | 8 Deep Rune Armors, 80 enchants |
| Q3 Episódio 21 | kRO [dev note 2024-03-19](https://ro.gnjoy.com/news/devnote/View.asp?category=3&seq=4180756) and [2024-09-30](https://ro.gnjoy.com/news/devnote/View.asp?category=3&seq=4186411) | Gaebolg series (10) + 40 enchants, Yorscalp series (12) + 18 enchants, 13 cards |
| Q3 Abismo da Ecosfera | iRO [Deep Level Abyss](https://renewal.playragnarok.com/news/updatedetail.aspx?id=428) | 18 Time Dimensions crowns, 38 Dimensions weapons, 80 enchants |

648 records in all. The id lists are in `src/app/api-services/roadmap-2027-preview.spec.ts`,
one block per entry, each carrying its source in a comment.

Four decisions inside that table are worth stating, because they are not mechanical:

- **The Deep Abyss page names its rewards rather than tabulating them**, calling them the
  "Time Dimension Rune Crown" crafted per class and the "Dimension Weapon" the Enchant
  Master enchants. Those are matched to `Time_DM_R_Crown_*` and `Dimen_*` by name and by
  Required Level 250, which is the page's own entry gate. No item table exists to check
  them against; if that pairing is ever shown wrong, this is the paragraph that was wrong.
- **The Episódio 21 cards are attributed by inference, not by a source.** No official page
  publishes card ids. The 13 are tied to EP21 by their monsters, which spawn only on
  `ra_pol01` and `mjo_wst01` — the two level-260 dungeons — and by the Gaebolg naming on
  the three hero variants. divine-pride's "Added" dates are client-datadump dates and for
  this block predate EP21's live date, so they are no help. Re-checkable, not sourced.
- **Guerra de Heroria is a sliver, not a quarter.** The siege's own exclusive gear — the
  five-piece-per-slot Herosria set, ~60 weapons — has **no records in `item.json` at all**,
  so it cannot be previewed. The three Dimensional Wanderer accessories are the season-one
  reward and the only part of the entry that exists.
- **The already-released Varmundt tier was not touched.** The base rune gear
  (450199-450203, 470107-470111, 480144-480148) and the Grácil rings (490019, 490020) are
  live in LATAM, and the renewal is a new tier beside them, not an edit to them. The spec
  asserts those ids stayed unflagged.

Two invariants in the spec replace what would otherwise be prose promises:

- **every enchant a preview item offers is itself visible.** A record that merely *exists*
  can still be hidden, and then the dropdown silently skips a rung — Lv1, Lv2, Lv4, Lv5.
  An earlier draft of this change held back ten enchants believing live gear offered them;
  it does not (the live base tier draws on `varmundt3`/`varmundt4`, not the crystals), so
  the only effect was a hole on 56 preview items. The invariant is what caught it.
- **no live item gained an option.** Every shipped, unflagged item is checked against the
  set of enchants this change revealed. That is the mechanical proof of the release note's
  "Nada do que já está no jogo foi alterado".

Where a source page and `item.json` disagree on an item's English name — the page's
"Jormungandr Cult Bishop Card" against the record's "Jormungandr Church Bishop Card",
"Ultimate Rasgand" against "Ultimate Lasgand", 게오보르그 romanized "Geoborg" against the
record's "Gaebolg" — the record's own name is kept. These are two transliterations of the
same id, and renaming records would be editing data the next client sync owns.

## What the preview does not cover, and why

### Monsters

Nothing. The three Biosphere expansions above do bring monsters, and divine-pride publishes
all of them: `bl_temple` / `bl_venom` / `bl_soul` (21920–21943, the renewal), `bl_depth1`
(22140–22155) and `bl_depth2` (22252–22261). They are not here for two reasons.

The first is that **`monster.json` has no `preRelease` equivalent**. All 537 records are
plain; neither `monster.ts`, `monster-spawn-mapper.ts` nor the target picker knows the
concept. Adding unreleased mobs today would show them exactly like live ones, with nothing
marking them and no way to hide them — the opposite of what the **Prévia** tag does for
items. That marker is a product decision and wants making before the data lands.

The second is volume. These mobs are not in the ragassets `mobs.json` feed and cannot be:
it is LATAM server data. divine-pride is an accepted source here — `monster-damage-reduction.ts`
records that 20994, 21360 and 21361 "were added by hand", and the original Biosphere block
(21548–21579) is feed-absent too — but 40 records of roughly seventeen engine-read fields
each, transcribed rather than machine-read, is an import that comes out silently wrong. A
`--source divine-pride` mode for `.agents/skills/add-ro-monster/extract.mjs` is the fix.

Two things that pass will need beyond a stat block: each mob publishes its own *"Taking only
N% of the damage dealt to it"* line (10% for field mobs, 1% for the three level-260 MVPs),
which belongs in `monster-damage-reduction.ts` rather than being read off `stats.attr`; and
the ten Deep Abyss mobs have **no English name on any server tab**, only Korean, so they
stay out until a client ships one rather than being transliterated.

### Level caps

Neither cap is modelled. The calculator's level and job-stat tables are unchanged, exactly
as the 275/60 preview already states in [skill-versions.md](skill-versions.md): those
previews "do not add level-275 character progression". The same holds for Q1's 260.

Both caps have long shipped on kRO — base 260/job 55 on 2022-12-21, base 275/job 60 on
2024-08-07 (which also raised the pure trait cap from 100 to 110) — and kRO is now at
285/65 as of 2026-08-19. iRO has never published a cap above 185.

### Q4's "14 novas habilidades"

Already previewed, and then some, but the number is worth explaining. kRO split the 275/60
expansion's skills in two waves: **15** with the cap itself (2024-08-07) and **exactly 14**
in the Q4 follow-up (announced in the 2024-09-30 dev note, which says so in as many words).
15 + 14 = 29, which is the figure the later dev notes quote. So the roadmap's "14 novas
habilidades" most likely means LATAM is taking the second wave — and a further 15 either
precede it or are still to come.

Both waves are in the calculator already: `src/app/skills/preview-275.ts` carries 29 and
`preview-285.ts` a further 36, both marked **Prévia** and documented in
[skill-versions.md](skill-versions.md). Nothing was changed to match the number fourteen.

### Entries with no records to flag

These are published upstream, but nothing in `item.json` corresponds to them, so previewing
them would mean authoring records from a web page — inventing data rather than revealing it.

| Roadmap entry | Status |
|---|---|
| Q2 Guerra de Heroria (the siege gear) | Shipped kRO 2022-10-05. The ~90 exclusive pieces (headgear 400336-400340, armour 450229-450233, shields, shoes, garments, accessories, ~60 weapons) have **no records**. Only the 3 season accessories do, and those are in the preview. |
| Q3 Jardim do Tempo | iRO publishes [Garden of Time](https://renewal.playragnarok.com/news/updatedetail.aspx?id=415), but its only equipment — "Blessing of the Constellation", a level-250 headgear — has no record. Its four bosses are named with no stats. |
| Q4 Capítulo 1: Canção de Yggdrasil | Shipped kRO 2025-03-19 (챕터 1 세계수의 노래; kRO is already on Chapter 2 as of 2026-03-13). The Entwined Magical series (450440, 450441, 470333, 470334, 480545, 480546), the Dimension World shoes (470335-470339) and their crystals have **no records**. divine-pride also indexes no Chapter 1 monsters or cards at all. |

An invented item would be worse than a missing one, so these wait for the records to arrive
through a client sync.
