/**
 * Pet intimacy tiers, in order and under the names the pt-BR client uses in the egg
 * descriptions ("Na Lealdade Alta: ..."). Each tier **replaces** the previous one — they
 * do not stack — which is why the script's `LOYALTY[n]` condition matches by equality and
 * not by "n or above".
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
