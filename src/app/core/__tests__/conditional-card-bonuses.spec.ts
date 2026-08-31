import { describe, expect, it } from 'vitest';
import { ArchBishop, ArchMage, CharacterBase, ElementalMaster, HyperNovice, Minstrel, RuneKnight, Troubadour, Trouvere, Wanderer } from 'src/app/jobs';
import { ACESSORIO_D, ARMADURA, CALCADO, CAPA, ELMO, ITEM_DB, Worn, wornBonus } from './worn-bonus';

/**
 * The cards whose bonus is real but conditional — the half of the catalogue that was held
 * back from a54f32e6's batch because "ATQ +20" under "FOR base 80 ou mais:" is not a flat
 * script entry.
 *
 * It is not new engine work: item.json's script grammar already writes a refine step, a
 * refine threshold, a base-attribute gate, a base level and a class lineage
 * (docs/item-json.md §4-5). What it needed was a reading — which pt-BR wording becomes
 * which entry form — and that reading is what this file pins.
 *
 * Every bonus below is quoted from the card's own pt-BR description, which is the source of
 * truth. The entries are written by tools/register-missing-cards.mjs; these are the cases
 * that prove the translation, one per wording, plus the two the wording alone gets wrong.
 */

/** What the card, and only the card, adds — the host's own DEF/stats cancel out. */
function granted(worn: Worn, cardField: keyof Worn, cardId: number): Record<string, number> {
  const without = wornBonus(worn);
  const withCard = wornBonus({ ...worn, [cardField]: cardId });

  const delta: Record<string, number> = {};
  for (const key of new Set([...Object.keys(without), ...Object.keys(withCard)])) {
    const value = (withCard[key] || 0) - (without[key] || 0);
    if (value !== 0) delta[key] = value;
  }
  return delta;
}

const inArmor = (cardId: number, extra: Worn = {}) => granted({ armor: ARMADURA, ...extra }, 'armorCard', cardId);
const inGarment = (cardId: number, extra: Worn = {}) => granted({ garment: CAPA, ...extra }, 'garmentCard', cardId);

describe('a refine threshold — "Refino +N ou mais:" is the "N===Y" entry', () => {
  // 4150 Carta Bode:  DEF +2. DEFM +5.  /  Refino +6 ou mais: DEF -2. DEFM -5.
  // The refine a card reads is the refine of the equipment it sits in — the engine resolves
  // "armorCard" through "armor" (getRefineLevelByItemType), same as the game.
  it('pays the plain half below the threshold', () => {
    expect(inArmor(4150, { armorRefine: 5 })).toEqual({ def: 2, mdef: 5 });
  });

  it('cancels itself out at the threshold, which is what the card says', () => {
    expect(inArmor(4150, { armorRefine: 6 })).toEqual({});
  });

  // 4159 Carta Nove Caudas: AGI +2. / Refino +9 ou mais: Esquiva +20.
  it('reads the threshold off the host the card is compounded into', () => {
    expect(inGarment(4159, { garmentRefine: 8 })).toEqual({ agi: 2 });
    expect(inGarment(4159, { garmentRefine: 9 })).toEqual({ agi: 2, flee: 20 });
  });
});

describe('a refine step — "A cada N refinos:" is the "N---Y" entry', () => {
  // 27160 Carta Baba-Yaga: A cada refino: Esquiva +2.
  it('scales with the host refine', () => {
    expect(granted({ boot: CALCADO, bootRefine: 0 }, 'bootCard', 27160)).toEqual({});
    expect(granted({ boot: CALCADO, bootRefine: 7 }, 'bootCard', 27160)).toEqual({ flee: 14 });
  });

  // 4353 Carta Remover: HP máx. +800. / A cada refino: HP máx. -40.
  it('carries a negative step, which is the "1----40" spelling', () => {
    // Four hyphens, not a typo: "1---" is the separator and "-40" the magnitude. The engine
    // splits on the first "---", so this is the only way to write a step that costs.
    expect(ITEM_DB[4353].script.hp).toEqual(['800', '1----40']);
    expect(inArmor(4353, { armorRefine: 0 })).toEqual({ hp: 800, hpRecovRate: 10 });
    expect(inArmor(4353, { armorRefine: 10 })).toEqual({ hp: 400, hpRecovRate: 10 });
  });
});

describe('a base-attribute gate — "FOR base 80 ou mais:" is the "str:80===Y" entry', () => {
  // 4303 Carta Cochicho: Esquiva +10. / FOR base 80 ou mais: ATQ +20. / VIT base 80 ou
  // mais: HP máx. +3%. / SOR base 80 ou mais: CRIT +3.
  it('pays nothing but the plain line under the threshold', () => {
    expect(inGarment(4303, { stats: { str: 79, vit: 79, luk: 79 } })).toEqual({ flee: 10 });
  });

  it('pays each of the three gates on its own attribute', () => {
    expect(inGarment(4303, { stats: { str: 80, vit: 1, luk: 1 } })).toEqual({ flee: 10, atk: 20 });
    expect(inGarment(4303, { stats: { str: 1, vit: 80, luk: 1 } })).toEqual({ flee: 10, hpPercent: 3 });
    expect(inGarment(4303, { stats: { str: 1, vit: 1, luk: 80 } })).toEqual({ flee: 10, cri: 3 });
  });

  // 4338 Carta Obsidiana: A cada 18 de DES base: VIT +1.
  it('steps by an attribute too — "A cada 18 de DES base:" is "dex:18---1"', () => {
    expect(inArmor(4338, { stats: { dex: 17 } })).toEqual({});
    expect(inArmor(4338, { stats: { dex: 90 } })).toEqual({ vit: 5 });
  });
});

describe('a base-level gate — "Nv. base 100 ou maior:" is the "level:100===Y" entry', () => {
  // 4635 Carta Amdarais Imortal: A cada refino: DEF +10. Esquiva -2. / Nv. base 100 ou
  // maior: HP máx. +500.
  it('withholds the HP below level 100 and pays it from 100 up', () => {
    expect(inArmor(4635, { armorRefine: 4, level: 99 })).toEqual({ def: 40, flee: -8 });
    expect(inArmor(4635, { armorRefine: 4, level: 100 })).toEqual({ def: 40, flee: -8, hp: 500 });
  });
});

describe('the two-band refine wording, folded into one entry pair', () => {
  // 27214 Carta Professora Celia Selada:
  //   Nos refinos entre 0 e +14:  Dano mágico +3%.
  //   Refino +15 ou mais:         Dano mágico +5%.
  //
  // "+15 ou mais" is a threshold the grammar writes; "0 to +14" is a ceiling it does not.
  // `["3", "15===2"]` sums to exactly the card at every refine, because the lower band
  // starts at 0 and is therefore always true. Registering only the "+15" half would have
  // been wrong at every refine under 15, which is most of them.
  it('pays the lower band below +15', () => {
    expect(inArmor(27214, { armorRefine: 0 })).toEqual({ matkPercent: 3 });
    expect(inArmor(27214, { armorRefine: 14 })).toEqual({ matkPercent: 3 });
  });

  it('pays the upper band from +15 up, and not both at once', () => {
    expect(inArmor(27214, { armorRefine: 15 })).toEqual({ matkPercent: 5 });
  });
});

describe('a class lineage — "X e evoluções:" is the "USED[...]" clause', () => {
  // 4405 Carta Frus: Magos e evoluções: DEFM +3.
  // `USED[...]` matches against classNameSet, which carries every ancestor, so the lineage
  // root reaches the whole tree without listing it.
  it('4405 Carta Frus pays the Mage tree', () => {
    expect(inArmor(4405, { cls: new ArchMage() })).toEqual({ mdef: 3 });
  });

  it('4405 Carta Frus pays a class outside it nothing', () => {
    expect(inArmor(4405, { cls: new RuneKnight() })).toEqual({});
  });

  // 4438 Carta Banshee: Magos e evoluções: HP máx. -100. SP máx. +100.
  it('4438 Carta Banshee keeps the lineage on the penalty as well as the bonus', () => {
    expect(granted({ headUpper: ELMO, cls: new ArchMage() }, 'headUpperCard', 4438)).toEqual({ hp: -100, sp: 100 });
    expect(granted({ headUpper: ELMO, cls: new RuneKnight() }, 'headUpperCard', 4438)).toEqual({});
  });

  // 4185 Carta Rideword: INT +1. / Noviços e evoluções: DEFM +1.
  it('4185 Carta Rideword reads "Noviços" as the Acolyte line, not the Novice one', () => {
    // The client calls the Novice "Aprendiz"; "Noviço" is the Acolyte. Reading it the other
    // way is the mistranslation that once hid 56 items from the Acolyte tree.
    const worn = { headUpper: ELMO };
    expect(granted({ ...worn, cls: new ArchBishop() }, 'headUpperCard', 4185)).toEqual({ int: 1, mdef: 1 });
    expect(granted({ ...worn, cls: new HyperNovice() }, 'headUpperCard', 4185)).toEqual({ int: 1 });
  });
});

describe('a Conjunto block, whose gate reaches the lines nested inside it', () => {
  // 4191 Carta Loli Ruri prints "Magos e evoluções: Dano mágico +3%" INSIDE its Conjunto
  // block, so the bonus needs the five partner cards equipped AS WELL AS the class. Reading
  // the inner gate as a replacement for the outer one — which is what a gate that does not
  // stack does — would hand +3% magic damage to every Mage wearing the card alone.
  //
  // The set itself is registered; card-set-bonuses.spec.ts covers the Conjunto shapes.
  it('4191 Carta Loli Ruri keeps both halves of the condition on one entry', () => {
    expect(ITEM_DB[4191].script.matkPercent).toEqual(['EQUIP_ID[4325&&4309&&4258&&4208&&4327]USED[Mage]3']);
  });

  it('4191 Carta Loli Ruri gives a Mage nothing without the five partners', () => {
    expect(inArmor(4191, { cls: new ArchMage() })).toEqual({});
  });

  // 4382 Carta Novus Dourado, same shape: "Sábios e evoluções: Conjuração variável -20%"
  // sits inside the Conjunto with Harpia, Ninfa Perversa, Miyabi Ningyo and Borboleta.
  it('4382 Carta Novus Dourado keeps its flat line outside the Conjunto', () => {
    // "HP máx. +500" and "Regeneração natural de HP +10%" are both unconditional; the
    // second is a display-only stat (healing-stats.spec.ts) but it still sums here.
    expect(ITEM_DB[4382].script.hp).toEqual(['500']);
    expect(inArmor(4382, { cls: new ElementalMaster() })).toEqual({ hp: 500, hpRecovRate: 10 });
  });
});

describe('a cast-time line, which the engine stores as a reduction', () => {
  // 4327 Carta Borboleta Sanguinária: Conjuração variável +30%. A cast-time PENALTY, and
  // `vct` counts reductions positive — docs/item-json.md §3 — so it is stored negative.
  // Flipping the sign would turn the card's cost into its benefit.
  it('4327 Carta Borboleta Sanguinária stores "+30%" as vct -30', () => {
    expect(ITEM_DB[4327].script.vct).toEqual(['-30']);
    expect(granted({ accRight: ACESSORIO_D }, 'accRightCard', 4327)).toEqual({ vct: -30 });
  });
});

describe('the Bardo and Odalisca lines, which the job tree crosses', () => {
  // Wanderer (Musa) extends Bard and Minstrel (Trovador) extends Dancer, so each inherits
  // the OTHER lineage's token and `USED[Bard]` / `USED[Dancer]` would land on the wrong
  // half. These two cards name their four classes instead. Same note in asas-garuda.spec.ts.
  //
  // 4567 Carta Alphoccio: Esquiva +10. / Bardos e evoluções: HP máx. +10%. SP máx. +5%.
  // 4573 Carta Trentini:  Esquiva +10. / Odaliscas e evoluções: HP máx. +10%. SP máx. +5%.
  const paid = { flee: 10, hpPercent: 10, spPercent: 5 };
  const plain = { flee: 10 };

  it.each<[string, () => CharacterBase]>([
    ['Trovador', () => new Minstrel()],
    ['Maestro', () => new Troubadour()],
  ])('4567 Carta Alphoccio pays the Bardo line — %s', (_name, cls) => {
    expect(inGarment(4567, { cls: cls() })).toEqual(paid);
    expect(inGarment(4573, { cls: cls() })).toEqual(plain);
  });

  it.each<[string, () => CharacterBase]>([
    ['Musa', () => new Wanderer()],
    ['Diva', () => new Trouvere()],
  ])('4573 Carta Trentini pays the Odalisca line — %s', (_name, cls) => {
    expect(inGarment(4573, { cls: cls() })).toEqual(paid);
    expect(inGarment(4567, { cls: cls() })).toEqual(plain);
  });

  it('pays neither to a class outside both lines', () => {
    expect(inGarment(4567, { cls: new RuneKnight() })).toEqual(plain);
    expect(inGarment(4573, { cls: new RuneKnight() })).toEqual(plain);
  });
});
