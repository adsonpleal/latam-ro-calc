// pt-BR monster races, sizes and elements — terms from browiki.org/wiki/Monstros.
// Display-only: the calc derives its logic keys (race/element/size) from the raw
// English values, so these maps are applied at render time, never to the data.

export const RaceNamePtBr: Record<string, string> = {
  Formless: 'Amorfo',
  Undead: 'Morto-Vivo',
  Brute: 'Bruto',
  Plant: 'Planta',
  Insect: 'Inseto',
  Fish: 'Peixe',
  Demon: 'Demônio',
  DemiHuman: 'Humanoide',
  'Demi-Human': 'Humanoide',
  Angel: 'Anjo',
  Dragon: 'Dragão',
  // PVP targets only: a player is Humano (or Doram), never Humanoide. See docs/pvp.md §2.
  Human: 'Humano',
  Doram: 'Doram',
};

export const SizeNamePtBr: Record<string, string> = {
  Small: 'Pequeno',
  Medium: 'Médio',
  Large: 'Grande',
};

// Some places carry only the size initial (S/M/L) — map those to pt-BR initials.
const SizeLetterPtBr: Record<string, string> = { S: 'P', M: 'M', L: 'G' };

export const ElementNamePtBr: Record<string, string> = {
  Neutral: 'Neutro',
  Water: 'Água',
  Earth: 'Terra',
  Fire: 'Fogo',
  Wind: 'Vento',
  Poison: 'Veneno',
  Holy: 'Sagrado',
  Shadow: 'Sombrio',
  Dark: 'Sombrio',
  Ghost: 'Fantasma',
  Undead: 'Morto-Vivo',
};

export const MonsterTypePtBr: Record<string, string> = {
  Boss: 'Chefe',
  Normal: 'Normal',
};

export const racePtBr = (en: string): string => RaceNamePtBr[en] ?? en;
export const sizePtBr = (en: string): string => SizeNamePtBr[en] ?? SizeLetterPtBr[en] ?? en;
export const monsterTypePtBr = (en: string): string => MonsterTypePtBr[en] ?? en;

// "Neutral 1" -> "Neutro 1" (keeps the element level if present).
export const elementPtBr = (en: string): string => {
  if (!en) return en;
  const [word, ...rest] = String(en).split(' ');
  return [ElementNamePtBr[word] ?? word, ...rest].join(' ');
};
