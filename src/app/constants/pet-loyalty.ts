/**
 * Pet intimacy tiers, in order and under the names the pt-BR client uses in the egg
 * descriptions ("Na Lealdade Alta: ...").
 *
 * A tier's bonus applies at that tier **and above**, and the tiers **replace** one another
 * rather than stacking: an egg listing "Na Lealdade Normal: CRIT +2" and "Na Lealdade
 * Alta: CRIT +3" gives 2 or 3, never 5 — and an egg listing only "Na Lealdade Normal"
 * keeps paying at Alta. Both halves of that rule live in {@link selectLoyaltyLines}:
 * per bonus, the highest tier at or below the current one wins, and only that one.
 *
 * The names are the same ones the Pet Window shows on its "Lealdade" row; they come from
 * the client's `msgstringtable_ml.csv`, which carries the whole scale:
 *
 *   MSI_VERY_AWKWARD  "Awkward"  → "Baixíssima"
 *   MSI_AWKWARD       "Shy"      → "Baixa"
 *   MSI_NORMAL        "Neutral"  → "Nenhuma"
 *   MSI_FRIENDLY      "Cordial"  → "Normal"
 *   MSI_VERY_FRIENDLY "Loyal"    → "Alta"
 *
 * So "Lealdade Nenhuma" does **not** mean the absence of a pet: it is the middle tier.
 * The egg descriptions merge the first two into a single line ("Baixa ou Baixíssima"),
 * which is why there are four tiers here rather than five.
 */
export enum PetLoyalty {
  Baixa = 1,
  Nenhuma = 2,
  Normal = 3,
  Alta = 4,
}

/**
 * Converts the recording's raw intimacy (0 to 1000, container 9 chunk 5308) into a tier.
 * The thresholds are the server's (rAthena `PET_INTIMATE_*`), and the client uses the
 * same ones to pick the label: 1..99 Baixíssima, 100..249 Baixa, 250..749 Nenhuma,
 * 750..909 Normal, 910..1000 Alta.
 *
 * Checked end to end on a single recording: "Armas + Mira" carries intimacy 850 and the
 * client's Pet Window, replaying the file, writes "Lealdade Normal" — which is also the
 * tier whose bonus (physical damage +4%, crit damage +1%) makes the gearless recording's
 * criticals land exactly.
 */
export function petLoyaltyFromIntimacy(intimacy: number): PetLoyalty {
  if (intimacy >= 910) return PetLoyalty.Alta;
  if (intimacy >= 750) return PetLoyalty.Normal;
  if (intimacy >= 250) return PetLoyalty.Nenhuma;
  return PetLoyalty.Baixa;
}

/**
 * The tier assumed when the simulation does not say which — including simulations saved
 * before the field existed. It is Alta because until then every pet script in item.json
 * was the maximum tier, unconditionally: any other default would change the damage of a
 * saved build without the user touching anything.
 */
export const DEFAULT_PET_LOYALTY = PetLoyalty.Alta;

export const PetLoyaltyList: { label: string; value: PetLoyalty }[] = [
  { label: 'Lealdade Alta', value: PetLoyalty.Alta },
  { label: 'Lealdade Normal', value: PetLoyalty.Normal },
  { label: 'Lealdade Nenhuma', value: PetLoyalty.Nenhuma },
  { label: 'Lealdade Baixa ou Baixíssima', value: PetLoyalty.Baixa },
];

/**
 * The `LOYALTY[n]` condition an item.json line carries, if any — the matched text as well
 * as the tier, because the calculator strips the clause after testing it. Stated once so
 * a change to the grammar cannot leave one reader matching and the other silently not.
 */
export const readLoyaltyCondition = (line: string): { clause: string; tier: PetLoyalty } | undefined => {
  const [clause, tier] = line.match(/LOYALTY\[(\d+)]/) ?? [];
  return tier ? { clause, tier: Number(tier) as PetLoyalty } : undefined;
};

const tierOf = (line: string): PetLoyalty | undefined => readLoyaltyCondition(line)?.tier;

/**
 * Narrows one bonus's script lines to the tier that actually applies.
 *
 * An egg spells its bonus out per tier, and a tier reads as "at this intimacy or above":
 *
 *     "agi":    ["LOYALTY[1]===4", "LOYALTY[2]===4", "LOYALTY[3]===4", "LOYALTY[4]===4"]
 *     "criDmg": ["LOYALTY[3]===5", "LOYALTY[4]===7"]
 *
 * At Alta the answer is AGI +4 and crit damage +7 — not +16 and +12. Summing every line
 * whose tier is at or below the current one is therefore wrong; exactly one line per bonus
 * survives, the highest that the pet has reached. An egg that names a single tier keeps
 * paying above it (Ovo de Andarilho: "Na Lealdade Normal: AGI +3. DES -1", still +3/-1 at
 * Alta), and a bonus whose lowest tier is above the pet pays nothing at all (the same
 * egg's crit damage below Normal).
 *
 * Lines without a `LOYALTY[n]` condition are left alone — only pet eggs use it, and they
 * mix nothing else in.
 */
export function selectLoyaltyLines(lines: string[], loyalty: PetLoyalty): string[] {
  if (!lines.some((line) => line.includes('LOYALTY'))) return lines;

  const best = lines.reduce<PetLoyalty | undefined>((top, line) => {
    const tier = tierOf(line);
    if (tier === undefined || tier > loyalty) return top;
    return top === undefined || tier > top ? tier : top;
  }, undefined);

  return lines.filter((line) => {
    const tier = tierOf(line);
    return tier === undefined || tier === best;
  });
}
