import { ITEM_DB, wornBonus } from './__tests__/worn-bonus';

/**
 * Three "-LT" reformed headgears from the 01/09/2026 client update: 400153 Orelhinhas da
 * Wickebine-LT, 400155 Chapéu de Dourado-LT and 400156 Chapéu de Imp-LT.
 *
 * "-LT" is the Equipe Licht reform (bROWiki, "Reforma"), and the family is already in the
 * DB — 400152 Smokie Transformation Leaf-LT, 400154 Survivor's Circlet-LT, 400445
 * Officer's Hat-LT, 400791 Evil Marcher Hat-LT. They all share the same shape, followed
 * here: `itemLevel: 2`, level 150, Topo, one card slot, `SUM[level==210]===2` for the
 * base-level trait clause and `GRADE[me==B]12===0.5` for the Grade B fixed-cast cut.
 *
 * SOURCE, and it differs per item — worth reading before editing:
 *
 *   400153 — the pt-BR client text states three refine tiers and nothing else, so that is
 *            what is encoded. The iRO text for the same id carries a base block (Esquiva
 *            +20, dano crítico +15%, dano mágico de todas as propriedades +15%, two procs
 *            and the grade bonuses) that the pt-BR translation does not; whether LATAM
 *            actually ships those is a question for the maintainer, not a guess to make
 *            here.
 *   400155 / 400156 — the pt-BR text is flavour only, with no effect lines at all, so on
 *            the maintainer's instruction the iRO description is the source. Both are the
 *            same design with the element swapped: Dourado is Holy/Shadow, Imp is
 *            Fire/Earth.
 *
 * Left out of both: "There's a chance to grant the weapon <element> property" and
 * "There's a chance to increase <element> magical damage by 20%" — the description never
 * states the chance, so there is no figure to register.
 */

const WICKEBINE = 400153;
const DOURADO = 400155;
const IMP = 400156;

const worn = (id: number, refine = 0, grade?: string) =>
  wornBonus({ headUpper: id, headUpperRefine: refine, headUpperGrade: grade });

const stat = (t: Record<string, number>, key: string) => t[key] ?? 0;

describe('The three share the -LT family\'s structural shape', () => {
  it.each([WICKEBINE, DOURADO, IMP])('%i is a level-150 Topo headgear, item level 2, one slot', (id) => {
    const r = ITEM_DB[id];
    expect(r, `${id} missing from item.json`).toBeDefined();
    expect(r.itemTypeId).toBe(2);
    expect(r.itemSubTypeId).toBe(512);
    expect(r.location).toBe('Upper');
    expect(r.slots).toBe(1);
    expect(r.itemLevel).toBe(2); // enables Grau de Encantamento, as on 400152/400154
    expect(r.requiredLevel).toBe(150);
  });

  it('keeps each one\'s own DEF and weight', () => {
    expect([ITEM_DB[WICKEBINE].defense, ITEM_DB[WICKEBINE].weight]).toEqual([0, 20]);
    expect([ITEM_DB[DOURADO].defense, ITEM_DB[DOURADO].weight]).toEqual([2, 40]);
    expect([ITEM_DB[IMP].defense, ITEM_DB[IMP].weight]).toEqual([1, 40]);
  });
});

describe('400153 Orelhinhas da Wickebine-LT — the three pt-BR tiers', () => {
  it('Refino +7: Dano crítico +10%', () => {
    expect(stat(worn(WICKEBINE, 6), 'criDmg')).toBe(0);
    expect(stat(worn(WICKEBINE, 7), 'criDmg')).toBe(10);
  });

  it('Refino +9: Dano físico e mágico +5%', () => {
    expect(stat(worn(WICKEBINE, 8), 'atkPercent')).toBe(0);
    expect(stat(worn(WICKEBINE, 8), 'matkPercent')).toBe(0);
    expect(stat(worn(WICKEBINE, 9), 'atkPercent')).toBe(5);
    expect(stat(worn(WICKEBINE, 9), 'matkPercent')).toBe(5);
  });

  it('Refino +11: Pós-conjuração -5%', () => {
    expect(stat(worn(WICKEBINE, 10), 'acd')).toBe(0);
    expect(stat(worn(WICKEBINE, 11), 'acd')).toBe(5);
  });

  it('registers nothing the pt-BR text does not state', () => {
    expect(Object.keys(ITEM_DB[WICKEBINE].script).sort()).toEqual(['acd', 'atkPercent', 'criDmg', 'matkPercent']);
  });
});

describe.each([
  ['400155 Chapéu de Dourado-LT', DOURADO, 'm_my_element_holy', 'p_element_dark', 'm_element_dark'],
  ['400156 Chapéu de Imp-LT', IMP, 'm_my_element_fire', 'p_element_earth', 'm_element_earth'],
] as const)('%s', (_label, id, ownElement, physVsElement, magicVsElement) => {
  it('base level 210+: P.ATQ +2 and S.ATQM +2', () => {
    expect(stat(wornBonus({ headUpper: id, level: 209 }), 'pAtk')).toBe(0);
    expect(stat(wornBonus({ headUpper: id, level: 210 }), 'pAtk')).toBe(2);
    expect(stat(wornBonus({ headUpper: id, level: 210 }), 'sMatk')).toBe(2);
  });

  it('Refino +7: melee +10% and own-element magic +10%', () => {
    expect(stat(worn(id, 6), 'melee')).toBe(0);
    expect(stat(worn(id, 7), 'melee')).toBe(10);
    expect(stat(worn(id, 6), ownElement)).toBe(0);
    expect(stat(worn(id, 7), ownElement)).toBe(10);
  });

  it('Refino +9: ATQ e ATQM +5%', () => {
    expect(stat(worn(id, 8), 'atkPercent')).toBe(0);
    expect(stat(worn(id, 9), 'atkPercent')).toBe(5);
    expect(stat(worn(id, 9), 'matkPercent')).toBe(5);
  });

  it('Refino +11: +20% physical and magical against the opposed element', () => {
    expect(stat(worn(id, 10), physVsElement)).toBe(0);
    expect(stat(worn(id, 11), physVsElement)).toBe(20);
    expect(stat(worn(id, 11), magicVsElement)).toBe(20);
  });

  it('Grau D adds melee +5% and own-element magic +5% on top of the +7 tier', () => {
    expect(stat(worn(id, 7, 'D'), 'melee')).toBe(15);
    expect(stat(worn(id, 7, 'D'), ownElement)).toBe(15);
    // Grade tiers stack: C and B still carry D's clause.
    expect(stat(worn(id, 7, 'B'), 'melee')).toBe(15);
  });

  it('Grau C adds P.ATQ +2 and S.ATQM +2, on top of the base-level clause', () => {
    expect(stat(wornBonus({ headUpper: id, level: 200, headUpperGrade: 'C' }), 'pAtk')).toBe(2);
    expect(stat(wornBonus({ headUpper: id, level: 210, headUpperGrade: 'C' }), 'pAtk')).toBe(4);
  });

  it('Grau B cuts 0,5s of fixed cast, but only from refine +12', () => {
    expect(stat(worn(id, 11, 'B'), 'fct')).toBe(0);
    expect(stat(worn(id, 12, 'B'), 'fct')).toBe(0.5);
    expect(stat(worn(id, 12, 'C'), 'fct')).toBe(0);
  });
});
