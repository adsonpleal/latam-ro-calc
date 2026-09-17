import { ITEM_DB, wornBonus } from './__tests__/worn-bonus';

/**
 * The "Elmos Reformáveis" of the Equipe Licht reform — every "-LT" headgear bROWiki lists
 * under that heading on its "Reforma" page (https://browiki.org/wiki/Reforma), checked line
 * by line against the pt-BR client description.
 *
 *   400152 Chapéu Transformacento-LT     400155 Chapéu de Dourado-LT
 *   400153 Orelhinhas da Wickebine-LT    400156 Chapéu de Imp-LT
 *   400154 Diadema do Sobrevivente-LT    400245 Chapéu de Eddga-LT
 *   420066 Esferas do Sobrevivente-LT    400246 Boneca da Lady Branca-LT
 *   400445 Chapéu de Oficial-LT          400465 Marionete de Thanatos-LT
 *
 * Reported by Incarcerous: Orelhinhas da Wickebine-LT did not change when the grade did.
 * The record had been registered while the pt-BR text carried only its three refine tiers,
 * so it had no grade clause at all — nor the base block (Esquiva, dano crítico, dano mágico
 * de todas as propriedades) and the two procs. The client text now states all of it.
 *
 * The same pass found, on the others:
 *   - Dourado / Imp: the [Santa Rainha] / [Rainha das Chamas] procs now state their chance
 *     (7%), so their +20% own-element magic registers as a chance bonus;
 *   - Diadema do Sobrevivente-LT named its set partner by English name; now EQUIP_ID;
 *   - Chapéu de Eddga-LT was missing the Doram half of "raças Bruto e Doram";
 *   - Boneca da Lady Branca-LT gave S.ATQM +3 at Grau B where the text says +2;
 *   - Marionete de Thanatos-LT was missing its Grau A race resistance;
 *   - Chapéu de Oficial-LT was missing its refine +9 HP/SP drain (display-only keys).
 *
 * Still left out, for want of an engine stage: the weapon endows ([Imperador Divino],
 * [Imperador do Fogo]), the autocasts, "A conjuração não pode ser interrompida", the
 * Smokie transformation's autocasts and the Oficial's per-second regeneration.
 */

const TRANSFORMACENTO = 400152;
const WICKEBINE = 400153;
const DIADEMA = 400154;
const ESFERAS = 420066;
const DOURADO = 400155;
const IMP = 400156;
const EDDGA = 400245;
const LADY_BRANCA = 400246;
const OFICIAL = 400445;
const THANATOS = 400465;

const ALL = [TRANSFORMACENTO, WICKEBINE, DIADEMA, DOURADO, IMP, EDDGA, LADY_BRANCA, OFICIAL, THANATOS];

const worn = (id: number, refine = 0, grade?: string, level = 200) =>
  wornBonus({ headUpper: id, headUpperRefine: refine, headUpperGrade: grade, level });

const stat = (t: Record<string, number>, key: string) => t[key] ?? 0;

/** Assert a bonus key reads `before` one refine short of `tier` and `after` on it. */
const refineTier = (id: number, key: string, tier: number, before: number, after: number, grade?: string) => {
  expect(stat(worn(id, tier - 1, grade), key), `${key} at +${tier - 1}`).toBe(before);
  expect(stat(worn(id, tier, grade), key), `${key} at +${tier}`).toBe(after);
};

describe('Elmos Reformáveis: structure', () => {
  it.each(ALL)('%i is a Topo headgear of item level 2 with one slot, so it takes a grade', (id) => {
    const r = ITEM_DB[id];
    expect(r, `${id} missing from item.json`).toBeDefined();
    expect(r.itemTypeId).toBe(2);
    expect(r.itemSubTypeId).toBe(512);
    expect(r.location).toBe('Upper');
    expect(r.slots).toBe(1);
    expect(r.itemLevel).toBe(2); // what canGradeItem reads to enable the Grau dropdown
  });

  it('Esferas do Sobrevivente-LT sits on Baixo, level 2, no slot', () => {
    const r = ITEM_DB[ESFERAS];
    expect([r.location, r.itemLevel, r.slots, r.requiredLevel]).toEqual(['Lower', 2, 0, 150]);
  });

  it.each([
    [TRANSFORMACENTO, 7, 60, 150],
    [WICKEBINE, 0, 20, 150],
    [DIADEMA, 10, 50, 150],
    [DOURADO, 2, 40, 150],
    [IMP, 1, 40, 150],
    [EDDGA, 6, 40, 150],
    [OFICIAL, 35, 40, 100],
    [THANATOS, 30, 10, 210],
  ])('%i keeps the DEF, weight and required level its description prints', (id, def, weight, level) => {
    const r = ITEM_DB[id];
    expect([r.defense, r.weight, r.requiredLevel]).toEqual([def, weight, level]);
  });

  it.each(ALL)('%i changes its bonuses when the grade changes', (id) => {
    // The reported bug, stated for every member: some bonus must differ between no grade
    // and Grau A at a refine that clears every tier.
    const ungraded = worn(id, 15, undefined, 210);
    const graded = worn(id, 15, 'A', 210);
    expect(graded).not.toEqual(ungraded);
  });
});

describe('400152 Chapéu Transformacento-LT', () => {
  const id = TRANSFORMACENTO;

  it('a cada refino: dano mágico de todas as propriedades +1%', () => {
    expect(stat(worn(id, 0), 'm_my_element_all')).toBe(0);
    expect(stat(worn(id, 12), 'm_my_element_all')).toBe(12);
  });

  it('a cada 3 refinos: dano mágico +2%; a cada 5: velocidade de ataque +1', () => {
    expect(stat(worn(id, 5), 'matkPercent')).toBe(2);
    expect(stat(worn(id, 9), 'matkPercent')).toBe(6);
    expect(stat(worn(id, 4), 'aspd')).toBe(0);
    expect(stat(worn(id, 10), 'aspd')).toBe(2);
  });

  it('transformation: ATQM +100 and Precisão +50, +50/+25 more from refine +7', () => {
    refineTier(id, 'chance__matk', 7, 100, 150);
    refineTier(id, 'chance__hit', 7, 50, 75);
  });

  it('Nv. base 210: P.ATQ e S.ATQM +2', () => {
    expect(stat(worn(id, 0, undefined, 209), 'pAtk')).toBe(0);
    expect(stat(worn(id, 0, undefined, 210), 'pAtk')).toBe(2);
    expect(stat(worn(id, 0, undefined, 210), 'sMatk')).toBe(2);
  });

  it('Grau C: P.ATQ e S.ATQM +2, stacking with the base-level clause', () => {
    expect(stat(worn(id, 0, 'D'), 'pAtk')).toBe(0);
    expect(stat(worn(id, 0, 'C'), 'pAtk')).toBe(2);
    expect(stat(worn(id, 0, 'A', 210), 'sMatk')).toBe(4);
  });

  it('Grau B, refino +12: conjuração fixa -0,5s', () => {
    refineTier(id, 'fct', 12, 0, 0.5, 'B');
    expect(stat(worn(id, 12, 'C'), 'fct')).toBe(0);
  });
});

describe('400153 Orelhinhas da Wickebine-LT', () => {
  const id = WICKEBINE;

  it('base: Esquiva +20, dano crítico +15%, dano mágico de todas as propriedades +15%', () => {
    const t = worn(id, 0);
    expect([stat(t, 'flee'), stat(t, 'criDmg'), stat(t, 'm_my_element_all')]).toEqual([20, 15, 15]);
  });

  it('procs: [Felina Sortuda] CRÍT +30, [Felina Mística] ignores 100% of monster DEFM', () => {
    expect(stat(worn(id, 0), 'chance__cri')).toBe(30);
    expect(stat(worn(id, 0), 'chance__m_pene_race_all')).toBe(100);
  });

  it('refino +7: dano crítico e dano mágico de todas as propriedades +10%', () => {
    refineTier(id, 'criDmg', 7, 15, 25);
    refineTier(id, 'm_my_element_all', 7, 15, 25);
  });

  it('refino +9: dano físico e mágico +5%', () => {
    refineTier(id, 'atkPercent', 9, 0, 5);
    refineTier(id, 'matkPercent', 9, 0, 5);
  });

  it('refino +11: pós-conjuração -5%', () => {
    refineTier(id, 'acd', 11, 0, 5);
  });

  it('Grau D, refino +11: pós-conjuração -5% adicional', () => {
    refineTier(id, 'acd', 11, 0, 10, 'D');
    expect(stat(worn(id, 11, 'A'), 'acd')).toBe(10);
  });

  it('Grau C: P.ATQ e S.ATQM +2, and +2 more from Nv. base 210', () => {
    expect(stat(worn(id, 0), 'pAtk')).toBe(0);
    expect(stat(worn(id, 0, 'D'), 'pAtk')).toBe(0);
    expect(stat(worn(id, 0, 'C'), 'pAtk')).toBe(2);
    expect(stat(worn(id, 0, 'C'), 'sMatk')).toBe(2);
    expect(stat(worn(id, 0, 'B', 210), 'pAtk')).toBe(4);
    expect(stat(worn(id, 0, undefined, 210), 'sMatk')).toBe(2);
  });

  it('Grau B, refino +12: conjuração fixa -0,5s', () => {
    refineTier(id, 'fct', 12, 0, 0.5, 'B');
    expect(stat(worn(id, 12, 'C'), 'fct')).toBe(0);
  });
});

describe('400154 Diadema do Sobrevivente-LT', () => {
  const id = DIADEMA;

  it('base: INT +3, ATQM +50, and ATQM +10 a cada 2 refinos', () => {
    expect(stat(worn(id, 0), 'int')).toBe(3);
    expect(stat(worn(id, 0, undefined, 179), 'matk')).toBe(50);
    expect(stat(worn(id, 5, undefined, 179), 'matk')).toBe(70);
  });

  it('refine tiers: +7 VCT -10%, +9 all-element magic +15%, +10 dano mágico +5%, +11 vs Chefes +20%', () => {
    refineTier(id, 'vct', 7, 0, 10);
    refineTier(id, 'm_my_element_all', 9, 0, 15);
    refineTier(id, 'matkPercent', 10, 0, 5);
    refineTier(id, 'm_class_boss', 11, 0, 20);
  });

  it('Nv. base 180: ATQM +50; Nv. base 210: P.ATQ e S.ATQM +2', () => {
    expect(stat(worn(id, 0, undefined, 179), 'matk')).toBe(50);
    expect(stat(worn(id, 0, undefined, 180), 'matk')).toBe(100);
    expect(stat(worn(id, 0, undefined, 210), 'pAtk')).toBe(2);
  });

  it('Grau D: pós-conjuração -5%, with no refine condition', () => {
    expect(stat(worn(id, 0), 'acd')).toBe(0);
    expect(stat(worn(id, 0, 'D'), 'acd')).toBe(5);
  });

  it('Grau C: P.ATQ e S.ATQM +2; Grau B, refino +12: conjuração fixa -0,5s', () => {
    expect(stat(worn(id, 0, 'C'), 'sMatk')).toBe(2);
    refineTier(id, 'fct', 12, 0, 0.5, 'B');
  });

  it('set with Esferas do Sobrevivente-LT: magic vs every element +10%, pós-conjuração -12% from +11', () => {
    const set = (refine: number) => wornBonus({ headUpper: id, headUpperRefine: refine, headLower: ESFERAS });
    expect(stat(worn(id, 11), 'm_element_all')).toBe(0);
    expect(stat(set(0), 'm_element_all')).toBe(10);
    expect(stat(set(10), 'acd')).toBe(0);
    expect(stat(set(11), 'acd')).toBe(12);
  });

  it('names the set partner by id', () => {
    expect(JSON.stringify(ITEM_DB[id].script)).not.toContain('EQUIP[');
    expect(ITEM_DB[id].script.m_element_all).toEqual(['EQUIP_ID[420066]===10']);
  });
});

describe('420066 Esferas do Sobrevivente-LT', () => {
  it('conjuração variável -3%, dano mágico de todas as propriedades +7%', () => {
    const t = wornBonus({ headLower: ESFERAS });
    expect([stat(t, 'vct'), stat(t, 'm_my_element_all')]).toEqual([3, 7]);
  });
});

describe.each([
  ['400155 Chapéu de Dourado-LT', DOURADO, 'm_my_element_holy', 'p_element_dark', 'm_element_dark'],
  ['400156 Chapéu de Imp-LT', IMP, 'm_my_element_fire', 'p_element_earth', 'm_element_earth'],
] as const)('%s', (_label, id, ownElement, physVsElement, magicVsElement) => {
  it('queen proc: +20% own-element magic, as a chance bonus', () => {
    expect(stat(worn(id, 0), `chance__${ownElement}`)).toBe(20);
    expect(stat(worn(id, 0), ownElement)).toBe(0);
  });

  it('Nv. base 210: P.ATQ e S.ATQM +2', () => {
    expect(stat(worn(id, 0, undefined, 209), 'pAtk')).toBe(0);
    expect(stat(worn(id, 0, undefined, 210), 'pAtk')).toBe(2);
    expect(stat(worn(id, 0, undefined, 210), 'sMatk')).toBe(2);
  });

  it('refino +7: corpo a corpo +10% and own-element magic +10%', () => {
    refineTier(id, 'melee', 7, 0, 10);
    refineTier(id, ownElement, 7, 0, 10);
  });

  it('refino +9: dano físico e mágico +5%', () => {
    refineTier(id, 'atkPercent', 9, 0, 5);
    refineTier(id, 'matkPercent', 9, 0, 5);
  });

  it('refino +11: +20% physical and magical against the opposed element', () => {
    refineTier(id, physVsElement, 11, 0, 20);
    refineTier(id, magicVsElement, 11, 0, 20);
  });

  it('Grau D: corpo a corpo +5% and own-element magic +5%, stacking with the +7 tier', () => {
    expect(stat(worn(id, 0, 'D'), 'melee')).toBe(5);
    expect(stat(worn(id, 7, 'D'), 'melee')).toBe(15);
    expect(stat(worn(id, 7, 'D'), ownElement)).toBe(15);
    expect(stat(worn(id, 7, 'A'), 'melee')).toBe(15);
  });

  it('Grau C: P.ATQ e S.ATQM +2, on top of the base-level clause', () => {
    expect(stat(worn(id, 0, 'D'), 'pAtk')).toBe(0);
    expect(stat(worn(id, 0, 'C'), 'pAtk')).toBe(2);
    expect(stat(worn(id, 0, 'C', 210), 'sMatk')).toBe(4);
  });

  it('Grau B, refino +12: conjuração fixa -0,5s', () => {
    refineTier(id, 'fct', 12, 0, 0.5, 'B');
    expect(stat(worn(id, 12, 'C'), 'fct')).toBe(0);
  });
});

describe('400245 Chapéu de Eddga-LT', () => {
  const id = EDDGA;

  it('base: FOR, DES, POD e CON +2; velocidade de ataque +10%', () => {
    const t = worn(id, 0);
    expect(['str', 'dex', 'pow', 'con', 'aspdPercent'].map((k) => stat(t, k))).toEqual([2, 2, 2, 2, 10]);
  });

  it('dano físico contra as raças Bruto e Doram +10%', () => {
    expect(stat(worn(id, 0), 'p_race_brute')).toBe(10);
    expect(stat(worn(id, 0), 'p_race_player_doram')).toBe(10);
  });

  it('[Despertar do Tigre]: ATQ +35 a cada refino, P.ATQ +20 from refine +10', () => {
    expect(stat(worn(id, 4), 'chance__atk')).toBe(140);
    refineTier(id, 'chance__pAtk', 10, 0, 20);
  });

  it('refine tiers: +7 corpo a corpo +15%, +9 dano físico +10%, +11 corpo a corpo +10% adicional', () => {
    refineTier(id, 'melee', 7, 0, 15);
    refineTier(id, 'atkPercent', 9, 0, 10);
    refineTier(id, 'melee', 11, 15, 25);
  });

  it('Grau D: POD +3, dano físico +5%', () => {
    expect(stat(worn(id, 0, 'D'), 'pow')).toBe(5);
    expect(stat(worn(id, 0, 'D'), 'atkPercent')).toBe(5);
  });

  it('Grau C: STA +2, conjuração fixa -0,5s with no refine condition', () => {
    expect(stat(worn(id, 0, 'D'), 'sta')).toBe(0);
    expect(stat(worn(id, 0, 'C'), 'sta')).toBe(2);
    expect(stat(worn(id, 0, 'C'), 'fct')).toBe(0.5);
  });

  it('Grau B: P.ATQ +2, TEN +20; Grau A: P.ATQ +7 adicional', () => {
    expect(stat(worn(id, 0, 'C'), 'pAtk')).toBe(0);
    expect(stat(worn(id, 0, 'B'), 'pAtk')).toBe(2);
    expect(stat(worn(id, 0, 'B'), 'res')).toBe(20);
    expect(stat(worn(id, 0, 'A'), 'pAtk')).toBe(9);
  });
});

describe('400246 Boneca da Lady Branca-LT', () => {
  const id = LADY_BRANCA;

  it('base: INT, DES, FEI e CON +2; conjuração variável -10%; vs Morto-Vivo +10%', () => {
    const t = worn(id, 0);
    expect(['int', 'dex', 'spl', 'con', 'vct', 'm_race_undead'].map((k) => stat(t, k))).toEqual([2, 2, 2, 2, 10, 10]);
  });

  it('[Dama de Branco]: ATQM +35 a cada refino, S.ATQM +20 from refine +10', () => {
    expect(stat(worn(id, 4), 'chance__matk')).toBe(140);
    refineTier(id, 'chance__sMatk', 10, 0, 20);
  });

  it('refine tiers: +7 all-element magic +15%, +9 dano mágico +10%, +11 all-element +10% adicional', () => {
    refineTier(id, 'm_my_element_all', 7, 0, 15);
    refineTier(id, 'matkPercent', 9, 0, 10);
    refineTier(id, 'm_my_element_all', 11, 15, 25);
  });

  it('Grau D: FEI +3, dano mágico +5%', () => {
    expect(stat(worn(id, 0, 'D'), 'spl')).toBe(5);
    expect(stat(worn(id, 0, 'D'), 'matkPercent')).toBe(5);
  });

  it('Grau C: SAB +2, conjuração fixa -0,5s with no refine condition', () => {
    expect(stat(worn(id, 0, 'C'), 'wis')).toBe(2);
    expect(stat(worn(id, 0, 'C'), 'fct')).toBe(0.5);
  });

  it('Grau B: S.ATQM +2 (not 3), TENM +20; Grau A: S.ATQM +7 adicional', () => {
    expect(stat(worn(id, 0, 'C'), 'sMatk')).toBe(0);
    expect(stat(worn(id, 0, 'B'), 'sMatk')).toBe(2);
    expect(stat(worn(id, 0, 'B'), 'mres')).toBe(20);
    expect(stat(worn(id, 0, 'A'), 'sMatk')).toBe(9);
  });
});

describe('400445 Chapéu de Oficial-LT', () => {
  const id = OFICIAL;

  it('a cada 2 refinos: ATQ e ATQM +10', () => {
    expect(stat(worn(id, 1), 'atk')).toBe(0);
    expect(stat(worn(id, 9), 'atk')).toBe(40);
    expect(stat(worn(id, 9), 'matk')).toBe(40);
  });

  it('refino +7: dano físico e mágico +5%', () => {
    refineTier(id, 'atkPercent', 7, 0, 5);
    refineTier(id, 'matkPercent', 7, 0, 5);
  });

  it('refino +9: converts 5% of physical damage into HP and 3% into SP (display-only)', () => {
    refineTier(id, 'hpDrain', 9, 0, 5);
    refineTier(id, 'spDrain', 9, 0, 3);
  });

  it('refino +11: conjuração variável -10%, velocidade de ataque +10%', () => {
    refineTier(id, 'vct', 11, 0, 10);
    refineTier(id, 'aspdPercent', 11, 0, 10);
  });

  it('Grau D: à distância, corpo a corpo e all-element magic +5%', () => {
    const t = worn(id, 0, 'D');
    expect(['range', 'melee', 'm_my_element_all'].map((k) => stat(t, k))).toEqual([5, 5, 5]);
    expect(stat(worn(id, 0), 'melee')).toBe(0);
  });

  it('Grau C, refino +12: conjuração fixa -0,5s', () => {
    refineTier(id, 'fct', 12, 0, 0.5, 'C');
    expect(stat(worn(id, 12, 'D'), 'fct')).toBe(0);
  });

  it('Grau B: P.ATQ e S.ATQM +5', () => {
    expect(stat(worn(id, 0, 'C'), 'pAtk')).toBe(0);
    expect(stat(worn(id, 0, 'B'), 'pAtk')).toBe(5);
    expect(stat(worn(id, 0, 'A'), 'sMatk')).toBe(5);
  });
});

describe('400465 Marionete de Thanatos-LT', () => {
  const id = THANATOS;
  const AGAINST = [
    'p_race_dragon', 'p_race_angel', 'm_race_dragon', 'm_race_angel',
    'p_element_holy', 'p_element_dark', 'm_element_holy', 'm_element_dark',
  ];

  it('base: HP máx. +10%, SP máx. +7%', () => {
    expect(stat(worn(id, 0), 'hpPercent')).toBe(10);
    expect(stat(worn(id, 0), 'spPercent')).toBe(7);
  });

  it('+10% vs Dragão, Anjo, Sagrado e Sombrio, and +2% a cada 3 refinos', () => {
    for (const key of AGAINST) {
      expect(stat(worn(id, 2), key), key).toBe(10);
      expect(stat(worn(id, 9), key), key).toBe(16);
    }
  });

  it('refine tiers: +7 dano físico e mágico +5%, +9 VCT -15%, +11 pós-conjuração -15%', () => {
    refineTier(id, 'atkPercent', 7, 0, 5);
    refineTier(id, 'matkPercent', 7, 0, 5);
    refineTier(id, 'vct', 9, 0, 15);
    refineTier(id, 'acd', 11, 0, 15);
  });

  it('Grau D: todos os talentos +2; Grau C: TEN e TENM +50', () => {
    expect(stat(worn(id, 0), 'allTrait')).toBe(0);
    expect(stat(worn(id, 0, 'D'), 'allTrait')).toBe(2);
    expect(stat(worn(id, 0, 'D'), 'res')).toBe(0);
    expect(stat(worn(id, 0, 'C'), 'res')).toBe(50);
    expect(stat(worn(id, 0, 'C'), 'mres')).toBe(50);
  });

  it('Grau B: dano físico e mágico contra todos os tamanhos +10%', () => {
    expect(stat(worn(id, 0, 'C'), 'p_size_all')).toBe(0);
    expect(stat(worn(id, 0, 'B'), 'p_size_all')).toBe(10);
    expect(stat(worn(id, 0, 'B'), 'm_size_all')).toBe(10);
  });

  it('Grau A: resistência às raças Dragão e Anjo +5%', () => {
    expect(stat(worn(id, 0, 'B'), 'subrace_dragon')).toBe(0);
    expect(stat(worn(id, 0, 'A'), 'subrace_dragon')).toBe(5);
    expect(stat(worn(id, 0, 'A'), 'subrace_angel')).toBe(5);
  });
});
