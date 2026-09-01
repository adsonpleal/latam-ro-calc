import { readFileSync } from 'node:fs';
import { ArchBishop, RuneKnight } from 'src/app/jobs';
import { createMainModel } from 'src/app/utils';
import { createRawTotalBonus } from 'src/app/utils/create-raw-total-bonus';
import { ITEM_BONUS_LABELS } from './bonus-key-label';
import { equipStatusOf, makeCalculator } from './__tests__/make-calculator';

/**
 * The two healing stats: `healReceived` ("Cura recebida", the heal cast ON you, 20 items)
 * and `healPower` ("Efetividade de cura", the heal you cast, 105 items). The game words
 * them apart and they are not interchangeable — 2387 Armadura de Corrida prints
 * "Efetividade de cura *recebida*", which is the first, not the second.
 *
 * Both are DISPLAY ONLY: the calculator models damage dealt, so there is no stage for a
 * healing multiplier to enter and none was added. They exist so the Recursos panel can
 * show numbers the game grants and the build screen was dropping in silence. The tests
 * below therefore assert two things and only two: that each key sums off the equipment
 * the way its pt-BR description words it, and that neither touches the damage pipeline.
 */

const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));

const stat = (ids: number[], model: Record<string, any>, key = 'healReceived', characterClass?: any): number => {
  const items: any = {};
  for (const id of ids) {
    expect(db[id], `item ${id} missing from item.json`).toBeDefined();
    items[id] = { ...db[id], usableClass: ['all'] };
  }

  return equipStatusOf(makeCalculator(items, characterClass), { ...createMainModel(), level: 200, ...model })[key] || 0;
};

describe('healReceived is wired as a stat', () => {
  it('starts at zero on a bare bonus sheet', () => {
    expect(createRawTotalBonus().healReceived).toBe(0);
  });

  it('has a pt-BR label, so the breakdown dialog can name it', () => {
    expect(ITEM_BONUS_LABELS['healReceived']).toBe('Cura recebida');
  });
});

describe('healReceived — flat lines', () => {
  it.each([
    [2450, 'Sapatos da Árvore da Vida', { boot: 2450 }, 5],
    [2911, 'Tatuagem Amuleto de Bangungot', { accRight: 2911 }, 7],
    [5490, 'Elmo de Anubis', { headUpper: 5490 }, 10],
    [20946, 'Capa Dracônica', { garment: 20946 }, 15],
    [450149, 'Uniforme Anti-Magia', { armor: 450149 }, 10],
    [450150, 'Bata Mágica de Geffen', { armor: 450150 }, 10],
  ])('%i %s: +%o%% ', (id, _name, model, expected) => {
    expect(stat([id as number], model as any)).toBe(expected);
  });

  it('Armadura de Corrida 2387: "Efetividade de cura recebida" is the same stat, +3%', () => {
    expect(stat([2387], { armor: 2387 })).toBe(3);
  });

  it.each([
    [300099, 'Carta Papilia Violeta', 15],
    [300100, 'Carta Papilia Rubra', 30],
  ])('%i %s: +%i%% through the shield slot', (id, _name, expected) => {
    // 2124 Escudo: a plain slotted shield, so the number is the card's alone.
    expect(stat([id as number, 2124], { shield: 2124, shieldCard: id as number })).toBe(expected);
  });
});

describe('healReceived — refine-scaled lines', () => {
  it('Roupa de Aniagem de Buwaya 2590: floor(refino/3) at +9', () => {
    expect(stat([2590], { garment: 2590, garmentRefine: 9 })).toBe(3);
    expect(stat([2590], { garment: 2590, garmentRefine: 2 })).toBe(0);
  });

  it('Roupa de Aniagem de Buwaya Bayani 2591 reads the same', () => {
    expect(stat([2591], { garment: 2591, garmentRefine: 9 })).toBe(3);
  });

  it('Colar Sombrio de Tensão 24362: 2 flat + floor(refino/3)', () => {
    expect(stat([24362], { accLeft: 24362, accLeftRefine: 0 })).toBe(2);
    expect(stat([24362], { accLeft: 24362, accLeftRefine: 9 })).toBe(5);
  });

  it('Colar Sombrio Elegante 24365 reads the same', () => {
    expect(stat([24365], { accLeft: 24365, accLeftRefine: 9 })).toBe(5);
  });

  it('Placa de Cerco 15046: nothing at +5, +12% at +6', () => {
    expect(stat([15046], { armor: 15046, armorRefine: 5 })).toBe(0);
    expect(stat([15046], { armor: 15046, armorRefine: 6 })).toBe(12);
  });

  it('Escudo Ilusión B 460014: nothing at +6, +10% at +7', () => {
    expect(stat([460014], { shield: 460014, shieldRefine: 6 })).toBe(0);
    expect(stat([460014], { shield: 460014, shieldRefine: 7 })).toBe(10);
  });
});

describe('healReceived — combos', () => {
  it('Escudo Ilusión A 460004: only with the Turbina Ilusión A 32207', () => {
    expect(stat([460004], { shield: 460004 })).toBe(0);
    expect(stat([460004, 32207], { shield: 460004, accRight: 32207 })).toBe(10);
  });

  it('Escudo Ilusión A 460004: the Soquete 32209 is the OTHER combo, not this one', () => {
    expect(stat([460004, 32209], { shield: 460004, accRight: 32209 })).toBe(0);
  });

  it('Armadura de Assalto 2376: only with Grevas de Batalha 2435 + Manteau do Capitão 2538', () => {
    expect(stat([2376], { armor: 2376 })).toBe(0);
    expect(stat([2376, 2435], { armor: 2376, boot: 2435 })).toBe(0);
    expect(stat([2376, 2435, 2538], { armor: 2376, boot: 2435, garment: 2538 })).toBe(10);
  });

  it('Sapatos Perene 22075: nothing without the Manto 20779 and the Cota 15141', () => {
    expect(stat([22075], { boot: 22075, bootRefine: 10 })).toBe(0);
  });

  it('Sapatos Perene 22075: 5 flat plus one point per refine summed over the three pieces', () => {
    const worn = (b: number, g: number, a: number) =>
      stat([22075, 20779, 15141], {
        boot: 22075, bootRefine: b, garment: 20779, garmentRefine: g, armor: 15141, armorRefine: a,
      });

    expect(worn(0, 0, 0)).toBe(5);
    expect(worn(10, 5, 3)).toBe(5 + 18);
  });

  it('Sapatos Perene 22075: the summed refine stops counting at 30', () => {
    const worn = (r: number) =>
      stat([22075, 20779, 15141], {
        boot: 22075, bootRefine: r, garment: 20779, garmentRefine: r, armor: 15141, armorRefine: r,
      });

    expect(worn(9)).toBe(5 + 27); // 3 x 9 = 27, under the cap
    expect(worn(15)).toBe(5 + 30); // 3 x 15 = 45, held at the "(30)" in the REFINE token
  });
});

describe('healReceived — Armadura Nebulosa STA 450170', () => {
  const worn = (refine: number, grade?: string) =>
    stat([450170], { armor: 450170, armorRefine: refine, armorGrade: grade });

  it('the +9 threshold pays 10%', () => {
    expect(worn(8)).toBe(0);
    expect(worn(9)).toBe(10);
  });

  it('the grade tiers add on top, in the same shape this record already uses for DEF', () => {
    // "Grau D ou mais: a cada 2 refinos, Cura recebida +2%" — floor(10/2) x 2 = 10.
    expect(worn(10, 'D') - worn(10)).toBe(10);
  });
});

describe('healReceived stays out of the damage pipeline', () => {
  it('a build carrying 30% of it deals exactly the same damage as one carrying none', () => {
    const model = { ...createMainModel(), level: 200, shield: 2124 };
    const withHeal = { ...model, shieldCard: 300100 };

    const bare = makeCalculator({ 2124: db[2124] });
    const healed = makeCalculator({ 2124: db[2124], 300100: db[300100] });
    const bareSummary: any = equipStatusOf(bare, model);
    const healedSummary: any = equipStatusOf(healed, withHeal);

    expect(healedSummary.healReceived).toBe(30);
    expect(bareSummary.healReceived || 0).toBe(0);
    // Everything the damage side reads is untouched.
    for (const key of ['atk', 'matk', 'atkPercent', 'matkPercent', 'melee', 'range', 'criDmg', 'flatDmg']) {
      expect(healedSummary[key] || 0, key).toBe(bareSummary[key] || 0);
    }
  });
});

/**
 * "Efetividade de cura +N%" — `healPower`, the heal a character CASTS. Same display-only
 * terms as healReceived above; a different line on 105 items, of which 99 are registered.
 * The six left out are named in the last describe.
 *
 * The cases below are one per condition shape the descriptions use, since between them
 * they exercise every token the sweep leaned on — refine step, refine threshold,
 * per-refine-from-N, class gate, combo, summed-refine gate, base-trait scale, grade tier,
 * pet loyalty and learned-skill level.
 */
describe('healPower — "Efetividade de cura"', () => {
  const power = (ids: number[], model: Record<string, any>) => stat(ids, model, 'healPower');

  it('is wired as a stat, with a label of its own', () => {
    expect(createRawTotalBonus().healPower).toBe(0);
    expect(ITEM_BONUS_LABELS['healPower']).toBe('Efetividade de cura');
  });

  it('flat: Cajado de Cinzas 1669 gives +15%', () => {
    expect(power([1669], { weapon: 1669 })).toBe(15);
  });

  it('decimal step: Cajado Restaurador 1625 gives 1,5% per refine', () => {
    expect(power([1625], { weapon: 1625, weaponRefine: 4 })).toBe(6);
  });

  it('step: Cruz Decadente 590015 gives 5% every 2 refines', () => {
    expect(power([590015], { garment: 590015, garmentRefine: 7 })).toBe(15);
  });

  it('thresholds stack: Cetro Indígena 26107 is 10 / 15 / 25 at +0 / +7 / +9', () => {
    expect(power([26107], { weapon: 26107, weaponRefine: 0 })).toBe(10);
    expect(power([26107], { weapon: 26107, weaponRefine: 7 })).toBe(15);
    expect(power([26107], { weapon: 26107, weaponRefine: 9 })).toBe(25);
  });

  it('per refine from +6 to +14: Varinha Gloriosa de Cura 1641 stops climbing at +14', () => {
    // 14 base, +5 at +6, +10 at +10, plus 2 per refine over the +6..+14 window.
    expect(power([1641], { weapon: 1641, weaponRefine: 5 })).toBe(14);
    expect(power([1641], { weapon: 1641, weaponRefine: 6 })).toBe(14 + 5 + 2);
    expect(power([1641], { weapon: 1641, weaponRefine: 14 })).toBe(14 + 5 + 10 + 18);
    expect(power([1641], { weapon: 1641, weaponRefine: 16 })).toBe(14 + 5 + 10 + 18);
  });

  it('class gate: Carta Arcebispa Margaretha 4675 pays only the ArchBishop line', () => {
    const worn = (cls: any) => stat([4675, 2515], { garment: 2515, garmentCard: 4675 }, 'healPower', cls);
    expect(worn(new ArchBishop())).toBe(15);
    expect(worn(new RuneKnight())).toBe(0);
  });

  it('class gate with a step: Carta Chapim 4512 adds 1% per 2 refines only for Acolytes', () => {
    const worn = (cls: any) => stat([4512, 18878], { headUpper: 18878, headUpperRefine: 8, headUpperCard: 4512 }, 'healPower', cls);
    expect(worn(new RuneKnight())).toBe(3); // the flat line alone
    expect(worn(new ArchBishop())).toBe(3 + 4); // + floor(8/2) x 1
  });

  it('combo: Robe Puente Ilusional 15195 needs the Maça Longa Ilusional 16063', () => {
    expect(power([15195], { armor: 15195, armorRefine: 10 })).toBe(5 + 10);
    expect(power([15195, 16063], { armor: 15195, armorRefine: 10, weapon: 16063, weaponRefine: 0 })).toBe(5 + 10 + 20);
  });

  it('summed-refine gate: the same set adds 15% once the two refines reach 18', () => {
    const worn = (armorRefine: number, weaponRefine: number) =>
      power([15195, 16063], { armor: 15195, armorRefine, weapon: 16063, weaponRefine });

    expect(worn(9, 8)).toBe(5 + 9 + 20); // 17 summed — under the gate
    expect(worn(9, 9)).toBe(5 + 9 + 20 + 15); // 18 summed
  });

  it('base-trait scale: Constelação da Sabedoria 3 310691 gives 5% per 15 SAB base', () => {
    const enchanted = (wis: number) => power([310691, 15047], { armor: 15047, armorEnchant1: 310691, wis });
    expect(enchanted(45)).toBe(15);
    expect(enchanted(14)).toBe(0);
  });

  it('pet loyalty: Ovo de Angeling 9088 climbs 2/4/6/8 across the four tiers', () => {
    const egg = (petLoyalty: number) => power([9088], { pet: 9088, petLoyalty });
    expect([1, 2, 3, 4].map(egg)).toEqual([2, 4, 6, 8]);
  });

  it('learned-skill scale: Sumo Sacerdote (Topo) 29513 gives 1% per level of Meditatio', () => {
    // `SKILL_ID[363==1]---1` reads learnedSkillIdMap, which the controller fills from the
    // learned-skill map — makeCalculator does not, so this one is wired by hand.
    const skills = (level: number) =>
      equipStatusOf(
        makeCalculator({ 29513: { ...db[29513] } }, new ArchBishop()).setLearnedSkills(new Map([['Meditation', level]])),
        { ...createMainModel(), level: 200, costumeEnchantUpper: 29513 },
      )['healPower'] || 0;

    expect(skills(10)).toBe(10);
    expect(skills(4)).toBe(4);
    expect(skills(0)).toBe(0);
  });
});

describe('healPower — the six items deliberately left unregistered', () => {
  it.each([
    [1586, 'Bíblia de Vellum', 'gated on "Em mapas de GdE e PvP" — the engine has no map context'],
    [1667, '[Aluguel] Cajado TE', 'gated on "Apenas nos Castelos TE"'],
    [2019, '[Aluguel] Cajado de Duas Mãos TE', 'gated on "Apenas nos Castelos TE"'],
    [2743, 'Anel Angelical', 'a proc whose chance the description never states'],
    [25451, 'Pedra de Criador (Meio)', 'scales on [Arremessar Poção], absent from the skill catalog'],
    [29465, 'Criador (Meio)', 'scales on [Arremessar Poção], absent from the skill catalog'],
  ])('%i %s: %s', (id) => {
    expect(db[id].script.healPower).toBeUndefined();
  });
});

/**
 * The rest of the sustain family — `hpRecovRate`, `spRecovRate`, `hpDrain`, `spDrain`,
 * `reduceDamageReturn`, `magicHealHp`, `magicHealSp`, `hpRestoreOnKill`,
 * `spRestoreOnKill`. Display only, same terms.
 *
 * These are the keys behind the eight "automódulos que o cálculo não mede" of
 * automatron-enchant-pools.spec.ts. Registering them meant sweeping every record whose
 * pt-BR description carries one of the lines, ~180 in all, so the cases here are one per
 * condition shape plus the eight modules that started it.
 *
 * The two `*RestoreOnKill` keys joined later, with 490863 Moeda Lançável (tracker
 * Cuqd4OU0tGQ2D8dQvr0d): the flat "Ao derrotar monstros: Regenera N de HP/SP" line, in
 * HP (SP) per kill. 36 other records carry it and have not been swept yet.
 */
describe('the sustain family', () => {
  const sustain = (ids: number[], model: Record<string, any>, key: string) => stat(ids, model, key);

  it('every key starts at zero and has a pt-BR label', () => {
    const bare: any = createRawTotalBonus();
    for (const key of ['hpRecovRate', 'spRecovRate', 'hpDrain', 'spDrain', 'reduceDamageReturn', 'magicHealHp', 'magicHealSp', 'hpRestoreOnKill', 'spRestoreOnKill']) {
      expect(bare[key], key).toBe(0);
      expect(ITEM_BONUS_LABELS[key], key).toBeTruthy();
    }
  });

  describe('the eight automódulos that used to score nothing', () => {
    // They sit in Automatron sockets; the harness reads them straight off the enchant slot.
    const orb = (id: number, key: string, refine = 0) =>
      sustain([id, 15047], { armor: 15047, armorRefine: refine, armorEnchant1: id }, key);

    it('M-HPR 310090: Regen. natural de HP +30%', () => expect(orb(310090, 'hpRecovRate')).toBe(30));
    it('M-SPR 310091: Regen. natural de SP +30%', () => expect(orb(310091, 'spRecovRate')).toBe(30));
    it('P-Vida 310113: converte 3% do dano em HP', () => expect(orb(310113, 'hpDrain')).toBe(3));
    it('P-Alma 310114: converte 2% do dano em SP', () => expect(orb(310114, 'spDrain')).toBe(2));
    it('P-Mental 310115: [Cura Mágica] = 500 HP a cada 0,4 s = 1250 HP/s', () => expect(orb(310115, 'magicHealHp')).toBe(1250));
    it('P-Mana 310116: [Cura Espiritual] = 120 SP a cada 0,4 s = 300 SP/s', () => expect(orb(310116, 'magicHealSp')).toBe(300));

    it.each([
      [310178, 'P-Espelho', 2, 4, 7],
      [310179, 'P-Refletor', 3, 5, 9],
    ])('%i %s: %i / %i / %i as the refine crosses +9 and +11', (id, _name, base, at9, at11) => {
      // rAthena writes these as an else-if chain (2 / 4 / 7); the pt-BR words them as
      // "adicional" steps that add up to the same three totals.
      expect(orb(id as number, 'reduceDamageReturn', 8)).toBe(base);
      expect(orb(id as number, 'reduceDamageReturn', 9)).toBe(at9);
      expect(orb(id as number, 'reduceDamageReturn', 11)).toBe(at11);
    });
  });

  it('flat: Carta Eggyra 4070 gives Regen. natural de SP +15%', () => {
    expect(sustain([4070, 15047], { armor: 15047, armorCard: 4070 }, 'spRecovRate')).toBe(15);
  });

  it('a penalty stays negative: Carta Ghostring 4047 is Regen. natural de HP -25%', () => {
    expect(sustain([4047, 15047], { armor: 15047, armorCard: 4047 }, 'hpRecovRate')).toBe(-25);
  });

  it('one line, two keys: Carta Tritão 4199 gives HP and SP +10% each', () => {
    const worn = (key: string) => sustain([4199, 15047], { armor: 15047, armorCard: 4199 }, key);
    expect(worn('hpRecovRate')).toBe(10);
    expect(worn('spRecovRate')).toBe(10);
  });

  it('base-stat gate: Carta ArchAngeling 4241 wants SOR base 77', () => {
    const worn = (luk: number) => sustain([4241, 15047], { armor: 15047, armorCard: 4241, luk }, 'hpRecovRate');
    expect(worn(76)).toBe(0);
    expect(worn(77)).toBe(100);
  });

  it('pet loyalty: Ovo de Metaller 9106 climbs 5/10/15/20 across the four tiers', () => {
    const egg = (petLoyalty: number) => sustain([9106], { pet: 9106, petLoyalty }, 'hpRecovRate');
    expect([1, 2, 3, 4].map(egg)).toEqual([5, 10, 15, 20]);
  });

  it('combo: Carta Succubus 4218 and Carta Inccubus 4269 answer each other', () => {
    // The Succubus costs 20% of HP regen on its own; the Inccubus (a head card) pays it
    // back with 30 on top, so the pair is +10 rather than the 30 the set line prints.
    const alone = sustain([4218, 15047], { armor: 15047, armorCard: 4218 }, 'hpRecovRate');
    const paired = sustain([4218, 4269, 15047, 18878], {
      armor: 15047, armorCard: 4218, headUpper: 18878, headUpperCard: 4269,
    }, 'hpRecovRate');
    expect(alone).toBe(-20);
    expect(paired).toBe(10);
  });

  it('drain holds the conversion rate, not the trigger chance', () => {
    // Carta Mosca Caçadora: "20% de chance de converter 15% do dano físico causado em HP".
    expect(sustain([4115, 2124], { shield: 2124, shieldCard: 4115 }, 'hpDrain')).toBe(15);
  });
});

describe('the sustain family stays out of the damage pipeline', () => {
  it('a build stacked with every sustain key deals the same damage as one with none', () => {
    const SUSTAIN = ['hpRecovRate', 'spRecovRate', 'hpDrain', 'spDrain', 'reduceDamageReturn', 'magicHealHp', 'magicHealSp', 'hpRestoreOnKill', 'spRestoreOnKill'];
    const model = { ...createMainModel(), level: 200, shield: 2124 };
    const loaded = { ...model, shieldCard: 4115 }; // Carta Mosca Caçadora — hpDrain 15

    const bare: any = equipStatusOf(makeCalculator({ 2124: db[2124] }), model);
    const withIt: any = equipStatusOf(makeCalculator({ 2124: db[2124], 4115: db[4115] }), loaded);

    expect(withIt.hpDrain).toBe(15);
    for (const key of ['atk', 'matk', 'atkPercent', 'matkPercent', 'melee', 'range', 'criDmg', 'flatDmg', 'def', 'mdef', 'res', 'mres']) {
      expect(withIt[key] || 0, key).toBe(bare[key] || 0);
    }
    for (const key of SUSTAIN) expect(bare[key] || 0, key).toBe(0);
  });
});
