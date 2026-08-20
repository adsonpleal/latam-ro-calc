import { describe, expect, it } from 'vitest';
import { wornBonus } from './worn-bonus';

/**
 * Gáleas de Cinzas-LT (400135/400142/400145/400151) and the twelve Gray Spell enchants
 * that ride their third slot.
 *
 * Same story as the Good & Evil crowns and boots: the records and the EnchantTable wiring
 * were already in the repo, hidden by `presentInLatam`, so nothing had ever exercised
 * them. They are surfaced by the `preRelease` opt-in (docs/item-json.md).
 *
 * This file doubles as the behavioural baseline for moving all sixteen records from
 * `EQUIP[<display name>]` to `EQUIP_ID[<id>]` (CLAUDE.md). Every partner weapon gets a
 * case of its own, since a careless rewrite loses exactly one generation at a time — and
 * the Thanos family is precisely the re-issue shape that trap describes: each helmet
 * pairs with the `-AD` weapon, never with the older plain one of the same name.
 * Every expectation here was recorded against the pre-migration `EQUIP[<name>]` records
 * first and holds unchanged after the rewrite.
 *
 * Bonuses are read off the whole worn doll, so the set expectations are stated as a delta
 * against the same build without the helmet: the -AD weapons pay lines of their own.
 *
 * https://hazyforest.com/enchants:thanos_helmet-lt
 */

const WARRIOR = 400135;
const SHOOTER = 400142;
const MAGIC = 400145;
const FIGHTER = 400151;

// The -AD weapons, the only generation any of these sets accepts.
const GREAT_SWORD_AD = 600016;
const AXE_AD = 620009;
const SPEAR_AD = 530012;
const SWORD_AD = 500024;
const BOW_AD = 700029;
const VIOLIN_AD = 570016;
const WHIPSWORD_AD = 580016;
const TWO_HANDED_STAFF_AD = 640017;
const STAFF_AD = 550023;
const DAGGER_AD = 510030;
const HAMMER_AD = 590020;
const KNUCKLE_AD = 560017;
const KATAR_AD = 610019;

// The older plain Thanos weapons, which share the family but never the set.
const GREAT_SWORD = 21009;
const STAFF = 1669;
const KNUCKLE = 1836;

// Slot 3, one flavour per Lv1/Lv2/Lv3.
const GRAY_MELEE = [311367, 311368, 311369];
const GRAY_RANGE = [311370, 311371, 311372];
const GRAY_MAGIC = [311373, 311374, 311375];
const GRAY_FIGHT = [311376, 311377, 311378];

/** The helmet at refine 0 and no grade pays nothing of its own — only the set fires. */
const worn = (helm: number | null, weapon: number, weaponRefine: number, enchant?: number) =>
  wornBonus({
    ...(helm === null ? {} : { headUpper: helm, headUpperRefine: 0, headUpperEnchants: enchant ? [enchant] : [] }),
    weapon,
    weaponRefine,
  });

/** What the helmet (and, when given, its enchant) adds on top of the weapon alone. */
const setDelta = (helm: number, weapon: number, weaponRefine: number, key: string, enchant?: number) =>
  (worn(helm, weapon, weaponRefine, enchant)[key] || 0) - (worn(null, weapon, weaponRefine)[key] || 0);

/** What the enchant adds on top of the very same helmet without it. */
const enchantDelta = (helm: number, enchant: number, weapon: number, weaponRefine: number, key: string) =>
  (worn(helm, weapon, weaponRefine, enchant)[key] || 0) - (worn(helm, weapon, weaponRefine)[key] || 0);

describe('400135 Gálea Guerreira de Cinzas-LT', () => {
  it('climbs its own refine ladder', () => {
    const at = (refine: number) => wornBonus({ headUpper: WARRIOR, headUpperRefine: refine });

    expect(at(11)['atkPercent']).toBe(15); // +5% every 3 refines
    expect(at(11)['aspdPercent']).toBe(15); // +7
    expect(at(11)['melee']).toBe(15); // +9
    expect(at(11)['p_element_all']).toBe(15); // +11
    expect(at(11)['fct']).toBe(0.2); // +11
  });

  it('holds the +7, +9 and +11 lines back below their refine', () => {
    const at8 = wornBonus({ headUpper: WARRIOR, headUpperRefine: 8 });

    expect(at8['atkPercent']).toBe(10); // floor(8 / 3) x 5
    expect(at8['aspdPercent']).toBe(15); // +7 is reached
    expect(at8['melee'] ?? 0).toBe(0);
    expect(at8['p_element_all'] ?? 0).toBe(0);
    expect(at8['fct'] ?? 0).toBe(0);
  });

  it('stacks the grade bonuses cumulatively, D then C', () => {
    const graded = wornBonus({ headUpper: WARRIOR, headUpperRefine: 0, headUpperGrade: 'C' });

    expect(graded['melee']).toBe(5); // grade D
    expect(graded['pow']).toBe(2); // grade C
    expect(graded['pAtk']).toBe(2);
  });

  it('[Grande Espada de Cinzas-AD] pays 15% vs all sizes and 12% Vento Cortante per 2 refines', () => {
    expect(setDelta(WARRIOR, GREAT_SWORD_AD, 0, 'p_size_all')).toBe(15);
    expect(setDelta(WARRIOR, GREAT_SWORD_AD, 0, '2005')).toBe(0);
    expect(setDelta(WARRIOR, GREAT_SWORD_AD, 1, '2005')).toBe(0);
    expect(setDelta(WARRIOR, GREAT_SWORD_AD, 2, '2005')).toBe(12);
    expect(setDelta(WARRIOR, GREAT_SWORD_AD, 10, '2005')).toBe(60);
  });

  it('[Machado de Cinzas-AD] pays 15% vs all races and 12% Fúria do Furacão per 2 refines', () => {
    expect(setDelta(WARRIOR, AXE_AD, 0, 'p_race_all')).toBe(15);
    expect(setDelta(WARRIOR, AXE_AD, 10, '2280')).toBe(60);
  });

  it('[Lança de Cinzas-AD] cuts 15% global cooldown and pays 12% Trindade per 2 refines', () => {
    expect(setDelta(WARRIOR, SPEAR_AD, 0, 'acd')).toBe(15);
    expect(setDelta(WARRIOR, SPEAR_AD, 10, '2324')).toBe(60);
  });

  it('takes the -AD generation only, never the plain Grande Espada de Cinzas', () => {
    expect(setDelta(WARRIOR, GREAT_SWORD, 10, 'p_size_all')).toBe(0);
    expect(setDelta(WARRIOR, GREAT_SWORD, 10, '2005')).toBe(0);
  });

  it('keeps its three sets apart', () => {
    expect(setDelta(WARRIOR, AXE_AD, 10, 'p_size_all')).toBe(0);
    expect(setDelta(WARRIOR, AXE_AD, 10, 'acd')).toBe(0);
    expect(setDelta(WARRIOR, SPEAR_AD, 10, 'p_race_all')).toBe(0);
  });
});

describe('400142 Gálea Afiada de Cinzas-LT', () => {
  it('climbs its own refine ladder, with ranged where the Warrior has melee', () => {
    const at11 = wornBonus({ headUpper: SHOOTER, headUpperRefine: 11 });

    expect(at11['atkPercent']).toBe(15);
    expect(at11['aspdPercent']).toBe(15);
    expect(at11['range']).toBe(15); // +9
    expect(at11['p_element_all']).toBe(15);
    expect(at11['fct']).toBe(0.2);
    expect(at11['melee'] ?? 0).toBe(0);
  });

  it('[Espada de Cinzas-AD] pays 15% vs all sizes and 12% Canhão de Prótons per 2 refines', () => {
    expect(setDelta(SHOOTER, SWORD_AD, 0, 'p_size_all')).toBe(15);
    expect(setDelta(SHOOTER, SWORD_AD, 10, '2477')).toBe(60);
  });

  it('[Arco de Cinzas-AD] pays 15% vs all races and 12% Tiro Preciso per 2 refines', () => {
    expect(setDelta(SHOOTER, BOW_AD, 0, 'p_race_all')).toBe(15);
    expect(setDelta(SHOOTER, BOW_AD, 10, '382')).toBe(60);
  });

  it('[Violino de Cinzas-AD] pays 15% ranged and 12% Temporal de Flechas per 2 refines', () => {
    expect(setDelta(SHOOTER, VIOLIN_AD, 0, 'range')).toBe(15);
    expect(setDelta(SHOOTER, VIOLIN_AD, 10, '2418')).toBe(60);
  });

  it('[Chicote de Cinzas-AD] pays the same set as the violin', () => {
    // One clause, two accepted partners — the `||` the migration had to carry across.
    expect(setDelta(SHOOTER, WHIPSWORD_AD, 0, 'range')).toBe(15);
    expect(setDelta(SHOOTER, WHIPSWORD_AD, 10, '2418')).toBe(60);
  });
});

describe('400145 Gálea Mágica de Cinzas-LT', () => {
  it('climbs a magic refine ladder', () => {
    const at11 = wornBonus({ headUpper: MAGIC, headUpperRefine: 11 });

    expect(at11['matkPercent']).toBe(15); // +5% every 3 refines
    expect(at11['vct']).toBe(15); // +7
    expect(at11['m_my_element_all']).toBe(15); // +9
    expect(at11['m_element_all']).toBe(15); // +11
    expect(at11['fct']).toBe(0.2);
  });

  it('grades into SPL and S.MATK, not POW and P.ATK', () => {
    const graded = wornBonus({ headUpper: MAGIC, headUpperRefine: 0, headUpperGrade: 'C' });

    expect(graded['m_my_element_all']).toBe(5); // grade D
    expect(graded['spl']).toBe(2); // grade C
    expect(graded['sMatk']).toBe(2);
    expect(graded['pow'] ?? 0).toBe(0);
  });

  it('[Cajado Duplo Cinzas-AD] pays 15% magic vs all sizes and 12% Meteoro Escarlate per 2 refines', () => {
    expect(setDelta(MAGIC, TWO_HANDED_STAFF_AD, 0, 'm_size_all')).toBe(15);
    expect(setDelta(MAGIC, TWO_HANDED_STAFF_AD, 10, '2211')).toBe(60);
  });

  it('[Cajado de Cinzas-AD] pays 15% magic vs all races and 12% Lanças dos Aesir per 2 refines', () => {
    expect(setDelta(MAGIC, STAFF_AD, 0, 'm_race_all')).toBe(15);
    expect(setDelta(MAGIC, STAFF_AD, 10, '2454')).toBe(60);
  });

  it('[Adaga de Cinzas-AD] pays 15% all-property magic and 12% Onda Psíquica per 2 refines', () => {
    expect(setDelta(MAGIC, DAGGER_AD, 0, 'm_my_element_all')).toBe(15);
    expect(setDelta(MAGIC, DAGGER_AD, 10, '2449')).toBe(60);
  });

  it('takes the -AD generation only, never the plain Cajado de Cinzas', () => {
    expect(setDelta(MAGIC, STAFF, 10, 'm_race_all')).toBe(0);
    expect(setDelta(MAGIC, STAFF, 10, '2454')).toBe(0);
  });
});

describe('400151 Gálea Lutadora de Cinzas-LT', () => {
  it('[Maça de Cinzas-AD] pays 15% physical *and* magical vs all sizes', () => {
    expect(setDelta(FIGHTER, HAMMER_AD, 0, 'p_size_all')).toBe(15);
    expect(setDelta(FIGHTER, HAMMER_AD, 0, 'm_size_all')).toBe(15);
    expect(setDelta(FIGHTER, HAMMER_AD, 10, '2054')).toBe(60); // Gemini Lumen
  });

  it('[Punho de Cinzas-AD] pays MHP +15% and 12% Garra de Tigre per 2 refines', () => {
    expect(setDelta(FIGHTER, KNUCKLE_AD, 0, 'hpPercent')).toBe(15);
    expect(setDelta(FIGHTER, KNUCKLE_AD, 10, '2330')).toBe(60);
  });

  it('[Katar de Cinzas-AD] cuts 15% global cooldown and pays 12% Lâminas de Loki per 2 refines', () => {
    expect(setDelta(FIGHTER, KATAR_AD, 0, 'acd')).toBe(15);
    expect(setDelta(FIGHTER, KATAR_AD, 10, '2036')).toBe(60);
  });

  it('takes the -AD generation only, never the plain Punho de Cinzas', () => {
    expect(setDelta(FIGHTER, KNUCKLE, 10, 'hpPercent')).toBe(0);
    expect(setDelta(FIGHTER, KNUCKLE, 10, '2330')).toBe(0);
  });
});

describe('Encanto Feitiço Cinzento (Guerreiro) 311367-311369', () => {
  const [LV1, , LV3] = GRAY_MELEE;

  it.each([
    [GRAY_MELEE[0], 15, 2, 6],
    [GRAY_MELEE[1], 20, 4, 9],
    [GRAY_MELEE[2], 25, 6, 12],
  ])('%i pays its level of the three sets', (enchant, flat, meleePerTwo, skillPerTwo) => {
    // [Grande Espada de Cinzas-AD]: Vento Cortante + Espada Alada flat, melee per 2 refines.
    expect(enchantDelta(WARRIOR, enchant, GREAT_SWORD_AD, 0, '2005')).toBe(flat);
    expect(enchantDelta(WARRIOR, enchant, GREAT_SWORD_AD, 0, '5201')).toBe(flat);
    expect(enchantDelta(WARRIOR, enchant, GREAT_SWORD_AD, 10, 'melee')).toBe(meleePerTwo * 5);

    // [Machado de Cinzas-AD]: Fúria do Furacão + Machado Esmagador, Arremesso per 2.
    expect(enchantDelta(WARRIOR, enchant, AXE_AD, 0, '2280')).toBe(flat);
    expect(enchantDelta(WARRIOR, enchant, AXE_AD, 0, '5295')).toBe(flat);
    expect(enchantDelta(WARRIOR, enchant, AXE_AD, 10, '2278')).toBe(skillPerTwo * 5);

    // [Lança de Cinzas-AD]: Trindade + Golpe do Destino, Lança do Destino per 2.
    expect(enchantDelta(WARRIOR, enchant, SPEAR_AD, 0, '2324')).toBe(flat);
    expect(enchantDelta(WARRIOR, enchant, SPEAR_AD, 0, '5266')).toBe(flat);
    expect(enchantDelta(WARRIOR, enchant, SPEAR_AD, 10, '2317')).toBe(skillPerTwo * 5);
  });

  it('grades into POW and P.ATK, by enchant level', () => {
    const graded = (enchant: number, key: string) =>
      wornBonus({ headUpper: WARRIOR, headUpperRefine: 0, headUpperGrade: 'C', headUpperEnchants: [enchant] })[key] -
      wornBonus({ headUpper: WARRIOR, headUpperRefine: 0, headUpperGrade: 'C' })[key];

    expect(graded(LV1, 'pow')).toBe(1);
    expect(graded(LV3, 'pow')).toBe(3);
    expect(graded(LV3, 'pAtk')).toBe(3);
  });

  it('pays nothing on a weapon outside its three sets', () => {
    expect(enchantDelta(WARRIOR, LV3, BOW_AD, 10, '2005')).toBe(0);
    expect(enchantDelta(WARRIOR, LV3, BOW_AD, 10, 'melee')).toBe(0);
  });

  it('takes the -AD generation only', () => {
    expect(enchantDelta(WARRIOR, LV3, GREAT_SWORD, 10, '2005')).toBe(0);
    expect(enchantDelta(WARRIOR, LV3, GREAT_SWORD, 10, 'melee')).toBe(0);
  });
});

describe('Encanto Feitiço Cinzento (Atirador) 311370-311372', () => {
  const LV3 = GRAY_RANGE[2];
  const ACID_ZONES = ['5340', '5341', '5342', '5343'];

  it.each([
    [GRAY_RANGE[0], 15, 2],
    [GRAY_RANGE[1], 20, 4],
    [GRAY_RANGE[2], 25, 6],
  ])('%i pays its level of the three sets', (enchant, flat, rangedPerTwo) => {
    // [Espada de Cinzas-AD]: Canhão de Prótons + all four Atirar Ácido.
    expect(enchantDelta(SHOOTER, enchant, SWORD_AD, 0, '2477')).toBe(flat);
    for (const zone of ACID_ZONES) expect(enchantDelta(SHOOTER, enchant, SWORD_AD, 0, zone)).toBe(flat);
    expect(enchantDelta(SHOOTER, enchant, SWORD_AD, 10, 'range')).toBe(rangedPerTwo * 5);

    // [Arco de Cinzas-AD]: Tiro Preciso + Tiro Crescente.
    expect(enchantDelta(SHOOTER, enchant, BOW_AD, 0, '382')).toBe(flat);
    expect(enchantDelta(SHOOTER, enchant, BOW_AD, 0, '5334')).toBe(flat);
    expect(enchantDelta(SHOOTER, enchant, BOW_AD, 10, 'range')).toBe(rangedPerTwo * 5);

    // [Violino de Cinzas-AD]: Temporal de Flechas + Disparo Rítmico.
    expect(enchantDelta(SHOOTER, enchant, VIOLIN_AD, 0, '2418')).toBe(flat);
    expect(enchantDelta(SHOOTER, enchant, VIOLIN_AD, 0, '5355')).toBe(flat);
    expect(enchantDelta(SHOOTER, enchant, VIOLIN_AD, 10, 'range')).toBe(rangedPerTwo * 5);
  });

  it('accepts the whip as well as the violin, on the same clause', () => {
    expect(enchantDelta(SHOOTER, LV3, WHIPSWORD_AD, 0, '2418')).toBe(25);
    expect(enchantDelta(SHOOTER, LV3, WHIPSWORD_AD, 0, '5355')).toBe(25);
    expect(enchantDelta(SHOOTER, LV3, WHIPSWORD_AD, 10, 'range')).toBe(30);
  });

  it('grades into CON, not POW', () => {
    const graded = wornBonus({ headUpper: SHOOTER, headUpperRefine: 0, headUpperGrade: 'C', headUpperEnchants: [LV3] });
    const bare = wornBonus({ headUpper: SHOOTER, headUpperRefine: 0, headUpperGrade: 'C' });

    expect(graded['con'] - (bare['con'] ?? 0)).toBe(3);
    expect(graded['pAtk'] - bare['pAtk']).toBe(3);
    expect(graded['pow'] - bare['pow']).toBe(0);
  });
});

describe('Encanto Feitiço Cinzento (Mágico) 311373-311375', () => {
  const LV3 = GRAY_MAGIC[2];

  it.each([
    [GRAY_MAGIC[0], 15, 6, 2],
    [GRAY_MAGIC[1], 20, 9, 4],
    [GRAY_MAGIC[2], 25, 12, 6],
  ])('%i pays its level of the three sets', (enchant, flat, skillPerTwo, magicPerTwo) => {
    // [Cajado Duplo Cinzas-AD]: Meteoro Escarlate + Vereda Floral + Stratum Tremor,
    // Abalo Sísmico per 2 refines.
    expect(enchantDelta(MAGIC, enchant, TWO_HANDED_STAFF_AD, 0, '2211')).toBe(flat);
    expect(enchantDelta(MAGIC, enchant, TWO_HANDED_STAFF_AD, 0, '5229')).toBe(flat);
    expect(enchantDelta(MAGIC, enchant, TWO_HANDED_STAFF_AD, 0, '5221')).toBe(flat);
    expect(enchantDelta(MAGIC, enchant, TWO_HANDED_STAFF_AD, 10, '2216')).toBe(skillPerTwo * 5);

    // [Cajado de Cinzas-AD]: Lanças dos Aesir + Tormenta, Onda Psíquica per 2 refines.
    expect(enchantDelta(MAGIC, enchant, STAFF_AD, 0, '2454')).toBe(flat);
    expect(enchantDelta(MAGIC, enchant, STAFF_AD, 0, '5370')).toBe(flat);
    expect(enchantDelta(MAGIC, enchant, STAFF_AD, 10, '2449')).toBe(skillPerTwo * 5);

    // [Adaga de Cinzas-AD]: Onda Psíquica + Invocação do Abismo flat, all-property per 2.
    expect(enchantDelta(MAGIC, enchant, DAGGER_AD, 0, '2449')).toBe(flat);
    expect(enchantDelta(MAGIC, enchant, DAGGER_AD, 0, '5317')).toBe(flat);
    expect(enchantDelta(MAGIC, enchant, DAGGER_AD, 10, 'm_my_element_all')).toBe(magicPerTwo * 5);
  });

  it('keeps the staff and the dagger legs of Onda Psíquica apart', () => {
    // "2449" carries both a flat dagger clause and a per-refine staff clause; the staff
    // must never pay the flat one, nor the dagger the per-refine one.
    expect(enchantDelta(MAGIC, LV3, STAFF_AD, 0, '2449')).toBe(0);
    expect(enchantDelta(MAGIC, LV3, DAGGER_AD, 0, '2449')).toBe(25);
    expect(enchantDelta(MAGIC, LV3, DAGGER_AD, 10, '2449')).toBe(25);
  });

  it('grades into SPL and S.MATK', () => {
    const graded = wornBonus({ headUpper: MAGIC, headUpperRefine: 0, headUpperGrade: 'C', headUpperEnchants: [LV3] });
    const bare = wornBonus({ headUpper: MAGIC, headUpperRefine: 0, headUpperGrade: 'C' });

    expect(graded['spl'] - bare['spl']).toBe(3);
    expect(graded['sMatk'] - bare['sMatk']).toBe(3);
  });
});

describe('Encanto Feitiço Cinzento (Lutador) 311376-311378', () => {
  const LV3 = GRAY_FIGHT[2];

  it.each([
    [GRAY_FIGHT[0], 15, 2, 6, 2],
    [GRAY_FIGHT[1], 20, 4, 9, 3],
    [GRAY_FIGHT[2], 25, 6, 12, 5],
  ])('%i pays its level of the three sets', (enchant, flat, rangedPerTwo, skillPerTwo, hpPerTwo) => {
    // [Maça de Cinzas-AD]: Gemini Lumen + Petitio, ranged per 2 refines.
    expect(enchantDelta(FIGHTER, enchant, HAMMER_AD, 0, '2054')).toBe(flat);
    expect(enchantDelta(FIGHTER, enchant, HAMMER_AD, 0, '5283')).toBe(flat);
    expect(enchantDelta(FIGHTER, enchant, HAMMER_AD, 10, 'range')).toBe(rangedPerTwo * 5);

    // [Punho de Cinzas-AD]: Garra de Tigre + Fogueira Espiritual, MHP per 2 refines.
    expect(enchantDelta(FIGHTER, enchant, KNUCKLE_AD, 0, '2330')).toBe(flat);
    expect(enchantDelta(FIGHTER, enchant, KNUCKLE_AD, 0, '5252')).toBe(flat);
    expect(enchantDelta(FIGHTER, enchant, KNUCKLE_AD, 10, 'hpPercent')).toBe(hpPerTwo * 5);

    // [Katar de Cinzas-AD]: Lâminas de Loki + Impacto Cratera, Retaliação per 2 refines.
    expect(enchantDelta(FIGHTER, enchant, KATAR_AD, 0, '2036')).toBe(flat);
    expect(enchantDelta(FIGHTER, enchant, KATAR_AD, 0, '5292')).toBe(flat);
    expect(enchantDelta(FIGHTER, enchant, KATAR_AD, 10, '2029')).toBe(skillPerTwo * 5);
  });

  it('grades into STA and P.ATK', () => {
    const graded = wornBonus({ headUpper: FIGHTER, headUpperRefine: 0, headUpperGrade: 'C', headUpperEnchants: [LV3] });
    const bare = wornBonus({ headUpper: FIGHTER, headUpperRefine: 0, headUpperGrade: 'C' });

    expect(graded['sta'] - (bare['sta'] ?? 0)).toBe(3);
    expect(graded['pAtk'] - bare['pAtk']).toBe(3);
  });

  it('takes the -AD generation only, never the plain Punho de Cinzas', () => {
    expect(enchantDelta(FIGHTER, LV3, KNUCKLE, 10, '2330')).toBe(0);
    expect(enchantDelta(FIGHTER, LV3, KNUCKLE, 10, 'hpPercent')).toBe(0);
  });
});

describe('the four Gray Spell flavours are one shared pool', () => {
  // Hazy Forest lists all four against all four helmets, so a Fighter spell in a Warrior
  // helmet is a legal roll — and pays, because the clause is gated on the weapon alone.
  it('pays a Fighter spell worn in the Warrior helmet', () => {
    expect(enchantDelta(WARRIOR, GRAY_FIGHT[2], KATAR_AD, 0, '2036')).toBe(25);
  });

  it('pays a Warrior spell worn in the Magic helmet', () => {
    expect(enchantDelta(MAGIC, GRAY_MELEE[2], GREAT_SWORD_AD, 0, '2005')).toBe(25);
  });
});
