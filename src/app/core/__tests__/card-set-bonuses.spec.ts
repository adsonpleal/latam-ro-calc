import { describe, expect, it } from 'vitest';
import { ArchMage, ElementalMaster, RuneKnight } from 'src/app/jobs';
import { ACESSORIO_D, ACESSORIO_E, ARMADURA, CALCADO, CAPA, ELMO, ESCUDO, FACA_3, ITEM_DB, Worn, wornBonus } from './worn-bonus';

/**
 * The "Conjunto" blocks — a card's bonus that only pays while the partners it names are
 * equipped too.
 *
 * Written as `EQUIP_ID[...]`, never `EQUIP[<nome>]`: the legacy form matches the partner's
 * English name, which a pt-BR rename breaks and which fires for every generation of a
 * re-issued card whether or not the set means them all. See CLAUDE.md and docs/item-json.md
 * §6. Every clause below is derived from the card's own pt-BR text by
 * tools/register-missing-cards.mjs, and the partners named there are ALL required — that is
 * what a Conjunto block means, and it is what 27396's upstream mirror
 * (`EQUIP[Wolf Lugenburg Card&&Poe Richard Card]`) spells out.
 *
 * The cases here are one per shape the sets take, plus the two the naming gets wrong on its
 * own.
 */

/** What the card adds over the same doll without it. */
function granted(worn: Worn, without: Worn): Record<string, number> {
  const before = wornBonus(without);
  const after = wornBonus(worn);

  const delta: Record<string, number> = {};
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const value = (after[key] || 0) - (before[key] || 0);
    if (value !== 0) delta[key] = value;
  }
  return delta;
}

/** What wearing the partners adds on top of the card alone — the set clause, isolated. */
const setBonusOf = (withSet: Worn, cardAlone: Worn) => granted(withSet, cardAlone);

describe('a pair that declares the set from both sides', () => {
  // 4218 Carta Succubus (armadura): VIT -3. HP máx. +1000. / Conjunto [Carta Inccubus]: VIT +4.
  // 4269 Carta Inccubus (cabeça):   INT -3. SP máx. +150.  / Conjunto [Carta Succubus]: INT +4.
  const doll: Worn = { armor: ARMADURA, headUpper: ELMO };

  it('pays each side only while the other is worn', () => {
    expect(setBonusOf({ ...doll, armorCard: 4218, headUpperCard: 4269 }, { ...doll, armorCard: 4218 })).toEqual({
      // Inccubus' own lines, plus the +4 VIT the Succubus was holding back and the +4 INT
      // the Inccubus grants once the Succubus is there.
      int: 1, // -3 of its own, +4 from the set
      sp: 150,
      vit: 4,
    });
  });

  it('pays neither side alone', () => {
    expect(granted({ ...doll, armorCard: 4218 }, doll)).toEqual({ vit: -3, hp: 1000 });
    expect(granted({ ...doll, headUpperCard: 4269 }, doll)).toEqual({ int: -3, sp: 150 });
  });
});

describe('a set that needs four partners, one per slot', () => {
  // 4246 Carta Agressor (arma): Conjunto [Carta Soldado] [Carta Batedor] [Carta Aquecedor]
  // [Carta Congelador] -> FOR +10. HP máx. +20%.
  //
  // "Carta Soldado" is Carta Solidificador (4220): the client translates Solider two ways,
  // and the four partners sit in the four slots the Agressor does not, which settles it.
  const PARTNERS = { armorCard: 4220, headUpperCard: 4311, accRightCard: 4331, bootCard: 4319 };
  const doll: Worn = { weapon: FACA_3, armor: ARMADURA, headUpper: ELMO, accRight: ACESSORIO_D, boot: CALCADO };
  const alone: Worn = { ...doll, weaponCard: 4246 };

  it('pays the whole set with all four', () => {
    expect(setBonusOf({ ...alone, ...PARTNERS }, { ...doll, ...PARTNERS })).toEqual({
      criDmg: 10, // the Agressor's own line
      str: 10,
      hpPercent: 20,
    });
  });

  it.each(Object.keys(PARTNERS))('pays nothing while %s is empty', (missing) => {
    const worn = { ...PARTNERS } as any;
    delete worn[missing];

    expect(setBonusOf({ ...alone, ...worn }, { ...doll, ...worn })).toEqual({ criDmg: 10 });
  });
});

describe('a set whose partners are all weapon cards', () => {
  // 4153 Carta Caranguejo + [Carta Molusco] + [Carta Estrela-do-Mar] -> Dano físico contra
  // oponentes de propriedade Água +30%. Three weapon cards, so it needs a three-socket
  // weapon and nothing else — the one set in the catalogue whose partners share a slot.
  const doll: Worn = { weapon: FACA_3 };

  it('pays the water damage with all three in the same weapon', () => {
    const full = granted({ ...doll, weaponCards: [4153, 4273, 4247] }, doll);

    expect(full['p_element_water']).toBe(30);
    expect(full['atk']).toBe(15); // ATQ +5 from each of the three
  });

  it('pays nothing with only one partner', () => {
    expect(granted({ ...doll, weaponCards: [4153, 4273] }, doll)['p_element_water'] ?? 0).toBe(0);
  });
});

describe('a set that then asks for a class', () => {
  // 4382 Carta Novus Dourado: Conjunto [Carta Harpia] [Carta Ninfa Perversa] [Carta Miyabi
  // Ningyo] [Carta Borboleta Sanguinária] -> INT +3, and "Sábios e evoluções: Conjuração
  // variável -20%". The class gate is nested INSIDE the Conjunto, so it needs both.
  const PARTNERS = { garmentCard: 4325, headUpperCard: 4258, bootCard: 4208, accRightCard: 4327 };
  const doll: Worn = { armor: ARMADURA, garment: CAPA, headUpper: ELMO, boot: CALCADO, accRight: ACESSORIO_D };

  // The partners are worn in BOTH runs, so their own lines cancel and what is left is the
  // Novus' own text plus the set — "HP máx. +500" and whatever the Conjunto pays.
  const setFor = (cls: any) =>
    granted({ ...doll, cls, armorCard: 4382, ...PARTNERS }, { ...doll, cls, ...PARTNERS });

  it('pays the INT to any class and the cast time only to the Sage line', () => {
    // vct stores a reduction as a positive number — docs/item-json.md §3.
    expect(setFor(new ElementalMaster())).toEqual({ hp: 500, int: 3, vct: 20 });
  });

  it('pays a Mage outside the Sage branch the INT alone', () => {
    expect(setFor(new ArchMage())).toEqual({ hp: 500, int: 3 });
  });

  it('pays a class outside the Mage tree the INT alone', () => {
    expect(setFor(new RuneKnight())).toEqual({ hp: 500, int: 3 });
  });
});

describe('a set that scales with a partner slot\'s refine', () => {
  // 27114 Carta Solidificador Ominoso (armadura): "Conjunto [Carta Batedor Ominoso] / A cada
  // 3 refinos da armadura: HP máx. +1%". The step names the slot rather than reading the
  // card's own, because that is how the set is worded.
  //
  // The pair is also where a set was registered on the wrong side: 27115 carried this very
  // clause, and its own text promises SP per two helm refines instead. Both sides holding
  // it would have paid the HP twice — see the prune in this batch's commit.
  const doll: Worn = { armor: ARMADURA, headUpper: ELMO };

  it('scales the set half with the armour refine', () => {
    expect(ITEM_DB[27114].script.hpPercent).toEqual(['10', '3---1', 'EQUIP_ID[27115]REFINE[armor==3]---1']);
    // +10 flat and floor(9/3) = 3 from its own step, before the partner is on.
    expect(granted({ ...doll, armorRefine: 9, armorCard: 27114 }, { ...doll, armorRefine: 9 })['hpPercent']).toBe(13);
    // …and 3 more once it is, paid once and not once per card.
    expect(setBonusOf({ ...doll, armorRefine: 9, armorCard: 27114, headUpperCard: 27115 }, { ...doll, armorRefine: 9, armorCard: 27114 })['hpPercent']).toBe(3);
  });

  it('pays nothing from the set at refine 0', () => {
    expect(setBonusOf({ ...doll, armorCard: 27114, headUpperCard: 27115 }, { ...doll, armorCard: 27114 })['hpPercent'] ?? 0).toBe(0);
  });
});

describe('the sets that were registered on the wrong side of the pair', () => {
  // A record declares only the combos its OWN description names — docs/item-json.md §6.
  // Five carried the partner's half instead, which cost nothing while the side that does
  // declare it had no clause at all. Now that it has one, both would have paid.
  //
  // The bonus is not lost: each owner below carries it, and the pruned side keeps whatever
  // its own text does promise.
  it('4168 Carta Senhor das Trevas keeps nothing — its text is one proc', () => {
    expect(ITEM_DB[4168].script).toEqual({});
    expect(ITEM_DB[4169].script.hpPercent).toEqual(['-10', 'EQUIP_ID[4168]20']);
  });

  it('27115 Carta Batedor Ominoso keeps its own SP, not the partner HP', () => {
    expect(ITEM_DB[27115].script).toEqual({
      int: ['1'],
      sp: ['80', '2---10', 'EQUIP_ID[27114]2---5'],
    });
  });

  it('27165 Carta Verme Sombrio keeps VIT/INT and drops AGI/DES', () => {
    // Its own set line is "VIT e INT +2"; "AGI e DES +2" is 27163's, and 27163 has it.
    expect(Object.keys(ITEM_DB[27165].script).sort()).toEqual(['acd', 'int', 'vit']);
    expect(ITEM_DB[27163].script.agi).toEqual(['-1', 'EQUIP_ID[27165]2']);
  });

  it('27326 Carta Necromante de Morroc keeps only its own three lines', () => {
    // Its description has no Conjunto at all; the +50% HP belongs to 27321 Deus Morroc.
    expect(ITEM_DB[27326].script).toEqual({ atk: ['100'], aspdPercent: ['25'], hpPercent: ['-20'] });
    expect(ITEM_DB[27321].script.hpPercent).toEqual(['-50', 'EQUIP_ID[27326]50']);
  });

  it('31026 Carta Jack Wolf drops the cast time 31025 declares', () => {
    expect(ITEM_DB[31026].script.vct).toBeUndefined();
    expect(ITEM_DB[31025].script.vct).toEqual(['EQUIP_ID[31026]10']);
  });
});

describe('a partner two different cards answer to', () => {
  // 4183 Carta Lobo Errante (capa) names "[Carta Lobo]", and LATAM ships that name twice:
  // 4029, the animal (ATQ +15, CRIT +1), and 27390, Wolf Lugenburg, a person from the EP17
  // autograph set. Vagabond Wolf + Wolf -> Esquiva +18 is the animal pair.
  const doll: Worn = { garment: CAPA, weapon: FACA_3 };

  it('pays with the Wolf the set means', () => {
    expect(setBonusOf({ ...doll, garmentCard: 4183, weaponCard: 4029 }, { ...doll, garmentCard: 4183 })).toEqual({
      atk: 15,
      cri: 1,
      flee: 18,
    });
  });

  it('pays nothing with the other card of the same name', () => {
    expect(setBonusOf({ ...doll, garmentCard: 4183, weaponCard: 27390 }, { ...doll, garmentCard: 4183 })).toEqual({
      p_race_insect: 15,
      m_race_insect: 15,
    });
  });
});

describe('both records that answer to the name "Carta Poe"', () => {
  // 27392 (S_Poe_Card_E) and 300130 (S_Poe_Card) print the same pt-BR text and each declares
  // the same set with [Carta Wolf] (300128), so each pays it. Registering the set on one and
  // not the other is the trap CLAUDE.md names: it would stop paying for whoever holds the id
  // nobody wrote down.
  //
  // Being NAMED by a set is the other direction, and there the two are not interchangeable:
  // the card called Poe Richard is 300130, and that is the id `EQUIP[Poe Richard Card]`
  // resolved to and the migration wrote.
  const doll: Worn = { weapon: FACA_3 };

  it.each([27392, 300130])('pays the set from generation %i', (poe) => {
    const withSet = granted({ ...doll, weaponCards: [poe, 300128] }, { ...doll, weaponCards: [poe] });

    expect(withSet['atkPercent']).toBe(5);
    expect(withSet['matkPercent']).toBe(5);
  });
});

describe('a set whose partner is not a card', () => {
  // 27102 Carta Mattiliar names "[Gaiola Vampírica]" (28510), an accessory. A set the player
  // can really wear is not less real for being a card plus a piece of gear.
  it('pays with the accessory equipped', () => {
    const doll: Worn = { headUpper: ELMO };

    expect(granted({ ...doll, headUpperCard: 27102, accRight: 28510 }, { ...doll, accRight: 28510 })).toEqual({ perfectDodge: 5 });
    expect(granted({ ...doll, headUpperCard: 27102 }, doll)).toEqual({});
  });
});

describe('the sets that could never fire, because the partner was named in English', () => {
  // `EQUIP[<nome>]` matches the partner's ENGLISH name, and these four named partners that
  // item.json holds under their pt-BR name — every one a card registered in the batch
  // before this, which turned "partner missing from the database" into "partner in the
  // database and the clause still cannot see it". 22 references, four cards, none paying.
  it('4172 Carta Papel pays the set of its four partners', () => {
    // Conjunto [Carta Shinobi] [Carta Andarilho] [Carta Zhu Po Long] [Carta Rosa Selvagem]
    // -> AGI +5. FOR +5. Velocidade de ataque +5%. The legacy clause also demanded "The
    // Paper Card", which is 4172 itself.
    const doll: Worn = { weapon: FACA_3, garment: CAPA, boot: CALCADO, accRight: ACESSORIO_D, accLeft: ACESSORIO_E };
    const partners = { accRightCard: 4230, garmentCard: 4210, accLeftCard: 4272, bootCard: 4257 };

    const set = setBonusOf({ ...doll, weaponCard: 4172, ...partners }, { ...doll, ...partners });
    expect(set['agi']).toBe(5);
    expect(set['str']).toBe(5);
    expect(set['aspdPercent']).toBe(5);
    expect(set['criDmg']).toBe(20); // its own line
  });

  it('27328 Carta Caídos pays each of its nine blocks off its own partner', () => {
    const doll: Worn = { headUpper: ELMO, shield: ESCUDO, accRight: ACESSORIO_D };
    const alone: Worn = { ...doll, headUpperCard: 27328 };

    // [Carta Megalodon] (escudo) -> DEF +100; [Carta Fen] (acessório) -> Conjuração
    // variável -25%, which the engine stores positive.
    expect(setBonusOf({ ...alone, shieldCard: 4067 }, { ...doll, shieldCard: 4067 })['def']).toBe(100);
    expect(setBonusOf({ ...alone, accRightCard: 4077 }, { ...doll, accRightCard: 4077 })['vct']).toBe(25);
  });

  it('300002 Carta Nuvem Perigosa pays the +5% HP with Carta Nuvem Tóxica', () => {
    const doll: Worn = { armor: ARMADURA, garment: CAPA };

    expect(setBonusOf({ ...doll, armorCard: 300002, garmentCard: 4334 }, { ...doll, garmentCard: 4334 })['hpPercent']).toBe(15);
  });

  it('300004 Carta Neo Mineral now asks for the partner before paying per refine', () => {
    // "Conjunto [Carta Mineral]: DEF +20 adicional. A cada refino da capa: DEF +3." The
    // per-refine half was registered ungated, so it paid with no Mineral in the armour.
    const doll: Worn = { garment: CAPA, garmentRefine: 9, armor: ARMADURA };

    expect(granted({ ...doll, garmentCard: 300004 }, doll)['def']).toBe(30);
    // Everything the card contributes once the Mineral is in the armour: 30 flat, the
    // +20 the set promises, and 3 per cape refine — 30 + 20 + 9*3.
    expect(setBonusOf({ ...doll, garmentCard: 300004, armorCard: 4339 }, { ...doll, armorCard: 4339 })['def']).toBe(77);
  });
});

describe('the sets that stay out', () => {
  it('300128 Carta Wolf, whose partner the client does not ship', () => {
    // Its Conjunto is [Carta Po] + [Carta Isaac]; Isaac Wigner (27396) exists only as an
    // inherited upstream record with no latam-items.json entry, so the set can never fire.
    // Same call as wolf-poe-combo.spec.ts, which is where it was first left out.
    expect(ITEM_DB[300128].script).toEqual({ p_race_insect: ['15'], m_race_insect: ['15'] });
  });

  it('writes every set this batch added by id, never by name', () => {
    // `EQUIP[<nome>]` matches the partner's English name: a pt-BR rename breaks it, and a
    // re-issue makes it fire for a generation nobody meant. The legacy clauses still in
    // item.json are older records, ratcheted down by item-script-keys.spec.ts.
    const ADDED = [4153, 4161, 4169, 4179, 4183, 4191, 4197, 4199, 4211, 4218, 4246, 4248, 4266, 4268, 4269, 4280, 4294, 4296, 4306, 4321, 4332, 4343, 4348, 4371, 4382, 4488, 4605, 4606, 27016, 27102, 27114, 27120, 27163, 27197, 27321, 27357, 27383, 27392, 31025];

    for (const id of ADDED) {
      const entries = (Object.values(ITEM_DB[id].script) as string[][]).flat();
      expect(entries.some((entry) => entry.includes('EQUIP_ID[')), `${id} has no set clause`).toBe(true);
    }
  });
});
