/**
 * "Defesa de Ferro" — a multiple of the DEF the monster's own record carries, handed to it
 * by the instance it is fought in and active for the whole fight. It is not a skill, not an
 * aura and not something the party can switch off; it simply means the published DEF is not
 * the DEF the player hits.
 *
 * The targets modelled here are the two Schmidt Corrompido, who exist nowhere outside their
 * instance — so the multiplier is always on, the same way the red aura is for an MVP that
 * always spawns with it. bROWiki lists the mechanic among the ones the main hall runs
 * ("O MVP possui N vezes mais DEF que sua versão normal"):
 *
 * - 20386 `MD_GH_KING_SCHMIDT_N`, 10x, Ruína de Glastheim (level 130 mode) —
 *   https://browiki.org/wiki/Ruína_de_Glastheim
 * - 20387 `MD_GH_KING_SCHMIDT_H`, 33x, Queda de Glastheim (level 170 mode) —
 *   https://browiki.org/wiki/Queda_de_Glastheim
 *
 * "Sua versão normal" is the record itself, not the other difficulty: the sentence appears
 * on both pages with a different multiplier, and neither 340 nor 680 is a multiple of the
 * other (nor of King Schmidt's 148, divine-pride 20385). The DEF in `monster.json` is the
 * unbuffed one — 680 is an ordinary figure for a level-175 MVP, and the whole feed tops out
 * at 1176 (Valquíria Randgris), nowhere near the 22.440 the hall produces.
 *
 * Only DEF. The two pages say nothing about DEFM, and the instance's other two mechanics —
 * 0,5% HP regenerated every 3 seconds, and the boss walking off mid-fight — are about how
 * long the kill takes, not about the damage of a hit, which is what the simulator shows.
 *
 * Kept as an id list rather than a column in `monster.json` for the reason mvp.ts and
 * monster-relieve.ts give: that file is generated from the ragassets feed, and the feed has
 * no notion of what an instance script does to a mob, so the next `sync-monster-db` run
 * would erase anything written there.
 */
const MONSTER_DEF_MULTIPLIER: ReadonlyMap<number, number> = new Map([
  [20386, 10], // Schmidt Corrompido — Ruína de Glastheim
  [20387, 33], // Schmidt Corrompido — Queda de Glastheim
]);

/** How many times its published DEF the monster really has; 1 when the instance adds nothing. */
export const monsterDefMultiplier = (monsterId: number): number => MONSTER_DEF_MULTIPLIER.get(monsterId) ?? 1;
