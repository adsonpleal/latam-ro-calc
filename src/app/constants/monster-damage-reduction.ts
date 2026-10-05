/**
 * "Taking only N% of the damage dealt to it" — a flat reduction the monster itself carries,
 * belonging neither to a skill it casts nor to the aura it spawns with. It cuts every
 * physical and magical hit and nothing the player does lifts it.
 *
 * divine-pride publishes it per monster, in the **Attributes** block of the monster page,
 * and `monster.json` carries the same thing as bits of `stats.attr`: **512** is "only 10%"
 * and **1024** is "only 1%". The targets modelled here are listed below.
 *
 * **Varmundt's Biosphere** (bl_ice, bl_lava, bl_grass, bl_death). hazyforest describes it as
 * a "Map-wide damage reduction (approximately 90%)", adding that it is neither Aliviar nor
 * the MVP green aura (https://hazyforest.com/dungeons:varmundts_biosphere); divine-pride has
 * the exact figures, 10% on the 28 field monsters and 1% on the four MVPs.
 *
 * **Betelgeuse** takes only 1% of the damage (monster 20994). It was left out until
 * 18/09/2026 on the assumption that Aliviar already explained its damage; it does not,
 * and the two **multiply**. Ynk's and @Fawxx's
 * recordings settle it: with Aliviar off and no debuff on the target, @Fawxx's Lâminas
 * Retalhadoras on Betelgeuse sat ~40× below what the engine predicted, against a residual of
 * 2,3× for the same character on Phantom of Amdarais — an ordinary instance MVP in the same
 * afternoon. One per cent brings the two into line (2,5 against 2,3, which is the party buff
 * soup neither simulation models). See ShadowCross.betelgeuse-replay.spec.ts.
 *
 * **Mansão da Desilusão** — Freyja (21361) and Schulang (21360) reduce damage by 90%,
 * corrected from 99% after Ted's report (05/10/2026). The Betelgeuse recordings do not
 * establish the reduction of these other bosses. Freyja's additional Aliviar is separate:
 * https://browiki.org/wiki/Mansão_da_Desilusão (levels 1-8 near the chandelier).
 *
 * **Why an id list and not the bit.** Bit 512 is also set on 23 MVPs outside the Biosphere —
 * Ifrit, Detardeurus, Valkyrie Randgris, Gloom Under Night, Sakray, Tiara and the rest — and
 * most of them are in RED_AURA_MVP_IDS, where the engine already takes 99,9% off. Reading
 * the bit generically would stack the two into 0,01% of the damage. Which of the two is the
 * real mechanic is an open question and wants its own recordings; until then the bit is a
 * lead and this file is the source.
 *
 * Schulang's own record is the reason `attr` cannot be trusted as the source either: it says
 * 0 there, because 20994, 21360 and 21361 are among the 64 monsters absent from the ragassets
 * feed and were added by hand.
 */

/** The four Biosphere MVPs, which take 1% of the damage. */
const BIOSPHERE_MVP_IDS = [21555, 21563, 21571, 21579] as const;

/** Every Biosphere monster: 21548-21579, one field per element, eight monsters each. */
const BIOSPHERE_IDS = Array.from({ length: 21579 - 21548 + 1 }, (_, i) => 21548 + i);

const MONSTER_DAMAGE_REDUCTION_PERCENT: ReadonlyMap<number, number> = new Map([
  ...BIOSPHERE_IDS.map((id) => [id, (BIOSPHERE_MVP_IDS as readonly number[]).includes(id) ? 99 : 90] as const),
  [20994, 99], // Betelgeuse
  [21360, 90], // Schulang — Ted
  [21361, 90], // Freyja — Ted
]);

/** How much the monster itself takes off every hit, as a percentage; 0 when it takes none. */
export const monsterDamageReductionPercent = (monsterId: number): number => MONSTER_DAMAGE_REDUCTION_PERCENT.get(monsterId) ?? 0;

/**
 * The tooltip behind the purple "Redução N%" tag, shared by the battle HUD and the monster
 * card so the two never drift. One wording for every target: what the player needs to know
 * is that the target takes only a fraction of everything, and that nothing they do lifts it.
 */
export const monsterDamageReductionTooltip = (percent: number): string =>
  `O alvo recebe apenas ${100 - percent}% de todo o dano, físico e mágico. É um atributo dele: nada que você faça o remove, `
  + 'e ele se multiplica com Aliviar.';
