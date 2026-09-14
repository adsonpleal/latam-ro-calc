/**
 * Map-wide damage reduction — a reduction that belongs to where the monster lives rather
 * than to a skill it casts or an aura it spawns with. It cuts every physical and magical
 * hit the monster takes, and nothing the player does lifts it.
 *
 * Varmundt's Biosphere (bl_ice, bl_lava, bl_grass, bl_death) is the only case today.
 * hazyforest describes it as a "Map-wide damage reduction (approximately 90%)", adding that it
 * is neither Aliviar nor the MVP green aura
 * (https://hazyforest.com/dungeons:varmundts_biosphere). divine-pride carries the exact
 * figures as a per-monster attribute: the 28 field monsters take "only 10% of dealt damage",
 * the four MVPs "only 1%" — the ~99% hazyforest reports the MVPs compounding to.
 *
 * The same attribute bits appear on monster.json records (`stats.attr` 512 and 1024), but
 * the 1024 bit is also set on Betelgeuse and Twisted God Freyja, whose damage is already
 * modelled another way (Betelgeuse was matched against recordings through Aliviar). Reading
 * the bit would reduce them a second time, so the list is by id, like RED_AURA_MVP_IDS.
 */

/** The four Biosphere MVPs, which take 1% of the damage. */
const BIOSPHERE_MVP_IDS = [21555, 21563, 21571, 21579] as const;

/** Every Biosphere monster: 21548-21579, one field per element, eight monsters each. */
const BIOSPHERE_IDS = Array.from({ length: 21579 - 21548 + 1 }, (_, i) => 21548 + i);

const MAP_DAMAGE_REDUCTION_PERCENT: ReadonlyMap<number, number> = new Map(
  BIOSPHERE_IDS.map((id) => [id, (BIOSPHERE_MVP_IDS as readonly number[]).includes(id) ? 99 : 90]),
);

/** How much of the damage the monster's map takes off, as a percentage; 0 for no reduction. */
export const mapDamageReductionPercent = (monsterId: number): number => MAP_DAMAGE_REDUCTION_PERCENT.get(monsterId) ?? 0;
