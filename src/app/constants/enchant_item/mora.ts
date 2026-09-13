/**
 * Enchants for the Relíquias de Mora — the Pesquisadora (mora 148, 98), from
 * https://browiki.org/wiki/Encantamentos_de_Mora
 *
 * Tracker card xIlnddHoI4wlYFqVqI2B ("não é possível colocar os encantamentos nas peças do
 * set Manuk"). No Mora relic had an enchant list, the Manuk set being four of 58.
 *
 * Keyed by item id, like the Malangdo list, and for the same reason: item.json carries the
 * client's Korean resource name as the aegisName for most of these, and the five
 * Fortalecido weapons share theirs with the weapon they upgrade (골든로드스태프 is both 2007
 * and 2011) while taking a different pool.
 *
 * The page is read by its labels, never by its item ids: the wiki's ids are copy-pasted and
 * often wrong ("DEF +6" linked to 4761, which is ATQM +2%; "HP +500" to 4796, HP +200).
 *
 * Two page shapes:
 *
 *  - Arcanos and Arcebispos list a pool per slot (Slot 2 / 3 / 4).
 *  - Cavaleiros Rúnicos, Sentinelas, Sicários and the Armas Fortalecidas give a count of
 *    enchants, a base "Pesquisa" and a second one the NPC opens at refine +9. The +9 pool
 *    is folded into every position: the enchant table cannot gate a list on the refine,
 *    and a +9 relic can hold either. Three enchants take positions 2-4, two take 3-4.
 */

// Every name below is an item.json aegisName, so a typo fails mora-enchants.spec.ts.
const stat = (prefix: string, from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => `${prefix}${from + i}`);
const STR = (from: number, to: number) => stat('Strength', from, to);
const AGI = (from: number, to: number) => stat('Agility', from, to);
const VIT = (from: number, to: number) => stat('Vitality', from, to);
const INT = (from: number, to: number) => stat('Inteligence', from, to);
const DEX = (from: number, to: number) => stat('Dexterity', from, to);
const LUK = (from: number, to: number) => stat('Luck', from, to);
const pick = (prefix: string, values: number[]) => values.map((v) => `${prefix}${v}`);

const DEF = (...v: number[]) => pick('Def', v);
const MDEF = (...v: number[]) => pick('Mdef', v);
const HP = (...v: number[]) => pick('HP', v);
const SP = (...v: number[]) => pick('SP', v);
const MHP = (...v: number[]) => pick('MHP', v);
const FLEE = (...v: number[]) => pick('Evasion', v);
const CRIT = (...v: number[]) => pick('Critical', v);
const ATK_PERCENT = (...v: number[]) => pick('Atk', v);
const MATK_PERCENT = (...v: number[]) => pick('Matk', v);
const SHARP = (...v: number[]) => pick('Sharp', v);
const FIGHTING_SPIRIT = (...v: number[]) => pick('Fighting_Spirit', v);
const EXPERT_ARCHER = (...v: number[]) => pick('Expert_Archer', v);
const SPELL = (...v: number[]) => pick('Spell', v);
const HEAL_AMOUNT = (...lv: number[]) => lv.map((l) => `Heal_Amount${l + 1}`); // Fator de Cura N = Heal_Amount(N+1)

const unique = (...lists: string[][]) => [...new Set(lists.flat())];

/** The "Pesquisa" pools, as the Pesquisadora names them. */
const RESEARCH = {
  basica1: unique(DEF(6, 9), MDEF(4, 6), SP(100, 150), HP(200, 300), STR(1, 2), DEX(1, 2), AGI(1, 2), VIT(1, 1)),
  saude: unique(VIT(1, 5), HP(300, 400, 500), DEF(3, 6, 9, 12), MHP(1, 2)),
  corporal: unique(DEF(3, 6, 9), AGI(1, 4), LUK(1, 4), HP(100, 200, 300), ['Atk_Speed1']),
  esquiva: unique(FLEE(1, 3, 6, 12), LUK(1, 5), AGI(1, 5)),
  critico: unique(LUK(1, 5), STR(1, 4), CRIT(5, 7), SHARP(1, 2, 3)),
  ataque: unique(ATK_PERCENT(1, 2, 3), STR(1, 6), FIGHTING_SPIRIT(1, 2, 3, 4, 5, 6)),
  mira: unique(CRIT(5, 7), LUK(1, 4), DEX(1, 5), EXPERT_ARCHER(1, 2, 3, 4)),
  cura: unique(INT(1, 4), DEX(1, 4), HEAL_AMOUNT(1, 2, 3, 4), MATK_PERCENT(1, 2, 3)),
  magia1: unique(INT(1, 4), DEX(1, 4), HP(100, 200, 300), SPELL(1, 2, 3, 4)),
  magia2: unique(INT(2, 5), DEX(2, 5), HP(200), SPELL(2, 3, 4), MATK_PERCENT(1, 2, 3)),
};

type Positions = (string[] | null)[];

/** A "Nº de Encantos" relic: its base pool and the +9 one, folded into every position. */
const researched = (count: 2 | 3, base: string[], atRefine9: string[] = []): Positions => {
  const pool = unique(base, atRefine9);
  return count === 3 ? [null, pool, pool, pool] : [null, null, pool, pool];
};

// Arcanos — Slot 3 / Slot 4 for the staves, Slot 2 / 3 / 4 for the armour pieces.
const arcanoStaff: Positions = [
  null,
  null,
  unique(INT(5, 5), MATK_PERCENT(2), SP(50, 100), HP(100, 200)),
  unique(INT(5, 5), DEX(5, 5), MATK_PERCENT(2), MDEF(2, 4), DEF(3, 6)),
];
const arcanoGear: Positions = [
  null,
  unique(INT(1, 3), DEX(1, 3)),
  unique(HP(100, 200, 500), SP(50, 100, 150), MATK_PERCENT(2)),
  unique(MDEF(2, 4, 8), DEF(3, 6, 12), MATK_PERCENT(1, 2)),
];

// Arcebispos.
const arcebispoGear: Positions = [
  null,
  unique(ATK_PERCENT(3), MATK_PERCENT(2), INT(1, 3), DEX(1, 3)),
  unique(MATK_PERCENT(2), ATK_PERCENT(2, 3), STR(4, 4), VIT(1, 1), INT(2, 2), INT(4, 4), DEX(1, 2), DEX(4, 4)),
  unique(CRIT(5), HP(500), MDEF(6), STR(4, 4), INT(4, 4), DEX(4, 4), MATK_PERCENT(2), ATK_PERCENT(1, 2, 3)),
];
const wandOfAffection = unique(SP(100), VIT(1, 2), INT(1, 2), INT(5, 5), DEX(1, 2), DEX(4, 4), MATK_PERCENT(1, 2));
const maceOfJudgement = unique(ATK_PERCENT(2), VIT(1, 2), DEX(1, 2), DEX(4, 4), STR(1, 2), STR(5, 5));
const archbishopAccessorySlot3 = unique(VIT(1, 1), INT(2, 2), DEX(1, 2));
const archbishopAccessory = (signature: string): Positions => [
  null,
  null,
  archbishopAccessorySlot3,
  unique([signature], HP(500), ATK_PERCENT(1), MDEF(6)),
];

export const MORA_ENCHANTS_BY_ID: Record<number, Positions> = {
  // Arcanos
  2007: arcanoStaff, // Cajado do Açoite de Ouro
  2008: arcanoStaff, // Cajado Aquático
  2009: arcanoStaff, // Cajado Vermelho
  2010: arcanoStaff, // Cajado Florestal
  2859: arcanoGear, // Orbe do Açoite de Ouro
  15025: arcanoGear, // Manto do Açoite de Ouro
  2467: arcanoGear, // Sapatos do Açoite de Ouro
  2860: arcanoGear, // Orbe Aquática
  15026: arcanoGear, // Manto Aquático
  2468: arcanoGear, // Sapatos Aquáticos
  2861: arcanoGear, // Orbe Vermelha
  15027: arcanoGear, // Manto Vermelho
  2469: arcanoGear, // Sapatos Vermelhos
  2862: arcanoGear, // Orbe Florestal
  15028: arcanoGear, // Manto Florestal
  2470: arcanoGear, // Sapatos Florestais

  // Arcebispos
  2471: arcebispoGear, // Sapatos da Afeição
  15029: arcebispoGear, // Túnica da Afeição
  2569: arcebispoGear, // Xale da Afeição
  2472: arcebispoGear, // Sapatos do Julgamento
  15030: arcebispoGear, // Túnica do Julgamento
  2570: arcebispoGear, // Xale do Julgamento
  2156: arcebispoGear, // Bíblia da Promessa (Vol. 1)
  1657: [null, null, wandOfAffection, wandOfAffection], // Cajado da Afeição
  16013: [null, null, maceOfJudgement, maceOfJudgement], // Maça do Julgamento
  2864: archbishopAccessory('Highness_Heal_3sec'), // Luz da Cura — Cura 1
  2865: archbishopAccessory('Coluceo_Heal30'), // Selo da Catedral — Catolicismo 1
  2866: archbishopAccessory('Heal_Amount2'), // Anel do Arcebispo — Fator de Cura 1

  // Cavaleiros Rúnicos
  2475: researched(3, RESEARCH.basica1, RESEARCH.saude), // Grevas de Ur
  2476: researched(3, RESEARCH.basica1, RESEARCH.corporal), // Grevas de Peuz
  2574: researched(3, RESEARCH.esquiva, RESEARCH.saude), // Manteau de Ur
  2575: researched(3, RESEARCH.esquiva, RESEARCH.critico), // Manteau de Peuz
  15036: researched(3, RESEARCH.saude, RESEARCH.ataque), // Armadura de Ur
  15037: researched(3, RESEARCH.corporal, RESEARCH.critico), // Armadura de Peuz
  2883: researched(2, RESEARCH.basica1), // Selo de Ur
  2884: researched(2, RESEARCH.basica1), // Selo de Peuz

  // Sentinelas
  2479: researched(3, RESEARCH.basica1, RESEARCH.critico), // Sapatos das Asas da Luz
  2480: researched(3, RESEARCH.basica1, RESEARCH.ataque), // Sapatos das Asas das Sombras
  2580: researched(3, RESEARCH.esquiva, RESEARCH.ataque), // Sobrepeliz das Asas da Luz
  2581: researched(3, RESEARCH.esquiva, RESEARCH.ataque), // Sobrepeliz das Asas das Sombras
  15042: researched(3, RESEARCH.critico, RESEARCH.mira), // Malha das Asas da Luz
  15043: researched(3, RESEARCH.ataque, RESEARCH.mira), // Malha das Asas das Sombras
  2890: researched(2, RESEARCH.basica1), // Broche das Asas da Luz
  2891: researched(2, RESEARCH.basica1), // Broche das Asas das Sombras

  // Sicários — the Manuk set of the card, and its Nab twin
  2477: researched(3, RESEARCH.basica1, RESEARCH.critico), // Botas dos Manuks
  2478: researched(3, RESEARCH.basica1, RESEARCH.ataque), // Botas de Nab
  2577: researched(3, RESEARCH.esquiva, RESEARCH.critico), // Capuz dos Manuks
  2578: researched(3, RESEARCH.esquiva, RESEARCH.critico), // Capuz de Nab
  15038: researched(3, RESEARCH.critico, RESEARCH.corporal), // Vestimenta dos Manuks
  15039: researched(3, RESEARCH.ataque, RESEARCH.critico), // Vestimenta de Nab
  2886: researched(2, RESEARCH.basica1), // Anel dos Manuks
  2887: researched(2, RESEARCH.basica1), // Anel de Nab

  // Armas Fortalecidas
  1660: researched(3, RESEARCH.cura, RESEARCH.magia1), // Cajado da Afeição Fortalecido
  16018: researched(3, RESEARCH.ataque, RESEARCH.magia1), // Maça do Julgamento Fortalecida
  2011: researched(3, RESEARCH.magia1, RESEARCH.magia2), // Cajado do Açoite de Ouro Fortalecido
  2012: researched(3, RESEARCH.magia1, RESEARCH.magia2), // Cajado Aquático Fortalecido
  2013: researched(3, RESEARCH.magia1, RESEARCH.magia2), // Cajado Vermelho Fortalecido
  2014: researched(3, RESEARCH.magia1, RESEARCH.magia2), // Cajado Florestal Fortalecido
};

/** The Mora enchant positions for an item, or undefined when it is not a Mora relic. */
export const getMoraEnchants = (id: number): Positions | undefined => MORA_ENCHANTS_BY_ID[id];
