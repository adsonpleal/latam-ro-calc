/**
 * Faixas de intimidade do mascote, na ordem e com os nomes que o cliente pt-BR usa nas
 * descrições dos ovos ("Na Lealdade Alta: ..."). Cada faixa **substitui** a anterior —
 * elas não somam —, e é por isso que a condição `LOYALTY[n]` do script casa por
 * igualdade e não por "n ou mais".
 *
 * Os nomes são os mesmos que a Janela de Mascote mostra na linha "Lealdade"; saem do
 * `msgstringtable_ml.csv` do cliente, que traz a escala inteira:
 *
 *   MSI_VERY_AWKWARD  "Awkward"  → "Baixíssima"
 *   MSI_AWKWARD       "Shy"      → "Baixa"
 *   MSI_NORMAL        "Neutral"  → "Nenhuma"
 *   MSI_FRIENDLY      "Cordial"  → "Normal"
 *   MSI_VERY_FRIENDLY "Loyal"    → "Alta"
 *
 * Ou seja, "Lealdade Nenhuma" **não** quer dizer ausência de mascote: é a faixa do meio.
 * As descrições dos ovos juntam as duas primeiras numa linha só ("Baixa ou Baixíssima"),
 * que é por isso que aqui são quatro faixas e não cinco.
 */
export enum PetLoyalty {
  Baixa = 1,
  Nenhuma = 2,
  Normal = 3,
  Alta = 4,
}

/**
 * Converte a intimidade crua da gravação (0 a 1000, contêiner 9 chunk 5308) na faixa.
 * Os limiares são os do servidor (rAthena `PET_INTIMATE_*`), e o cliente usa os mesmos
 * para escolher o rótulo: 1..99 Baixíssima, 100..249 Baixa, 250..749 Nenhuma,
 * 750..909 Normal, 910..1000 Alta.
 *
 * Conferido ponta a ponta numa gravação só: a "Armas + Mira" traz intimidade 850 e a
 * Janela de Mascote do cliente, reproduzindo o replay, escreve "Lealdade Normal" — que é
 * também a faixa cujo bônus (dano físico +4%, dano crítico +1%) faz os críticos da
 * gravação sem equipamento baterem exato.
 */
export function petLoyaltyFromIntimacy(intimacy: number): PetLoyalty {
  if (intimacy >= 910) return PetLoyalty.Alta;
  if (intimacy >= 750) return PetLoyalty.Normal;
  if (intimacy >= 250) return PetLoyalty.Nenhuma;
  return PetLoyalty.Baixa;
}

/**
 * Faixa assumida quando a simulação não diz qual é — inclusive nas que foram salvas
 * antes de o campo existir. É a Alta porque até então todo script de pet no item.json
 * era a faixa máxima, sem condição: qualquer outro padrão mudaria o dano de build salva
 * sem o usuário ter mexido em nada.
 */
export const DEFAULT_PET_LOYALTY = PetLoyalty.Alta;

export const PetLoyaltyList: { label: string; value: PetLoyalty }[] = [
  { label: 'Lealdade Alta', value: PetLoyalty.Alta },
  { label: 'Lealdade Normal', value: PetLoyalty.Normal },
  { label: 'Lealdade Nenhuma', value: PetLoyalty.Nenhuma },
  { label: 'Lealdade Baixa ou Baixíssima', value: PetLoyalty.Baixa },
];
