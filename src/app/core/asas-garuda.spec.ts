import { readFileSync } from 'node:fs';
import { AbyssChaser, ArchMage, CharacterBase, Inquisitor, RuneKnight, ShadowCross, Sura, Trouvere, Wanderer } from 'src/app/jobs';
import { createMainModel } from 'src/app/utils';
import { Calculator } from './calculator';

/**
 * 480278 Asas de Garuda — reported by Luís: the +13 line was missing entirely and the
 * doubling clause was never registered, so Musa/Diva, Renegado/Mandraque,
 * Sicário/Executor and Shura/Inquisidor got the plain values.
 *
 * pt-BR (the source of truth):
 *   A cada 2 refinos:  ATQ e ATQM +8.
 *   A cada 4 refinos:  EXP adquirida por monstros +3%.        (not modelled)
 *   Refino +7 ou mais: Dano físico e mágico +4%.
 *   Refino +9 ou mais: Dano físico a distância +7%.
 *                      Dano físico corpo a corpo +7%.
 *                      Dano mágico de todas as propriedades +7%.
 *   Refino +13 ou mais: Ignora 10% da DEF e DEFM de monstros normais.
 *   ------
 *   Odaliscas, Arruaceiros, Monges, Mercenários e evoluções:
 *   Todos os efeitos descritos acima serão dobrados.
 *
 * The four lineages are gated with USED[...] listing every class name rather than the
 * lineage root, because the job tree does not follow the in-game lineage: Wanderer
 * (Musa) extends Bard, so USED[Dancer] would silently miss it.
 */

const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));

const WINGS = 480278;

const monster = {
  id: 1002, name: 'Poring', spawn: 'x',
  stats: { level: 1, health: 50, attack: { min: 7, max: 8 }, range: 1, defense: 0, magicDefense: 0, str: 1, int: 0, vit: 1, dex: 6, agi: 1, luk: 30, element: 1, elementName: 'Water', elementShortName: 'W1', race: 4, raceName: 'Plant', scale: 0, scaleName: 'Small', class: 0, criShield: 0, softDef: 0, mdef: 0, softMdef: 0, res: 0, mres: 0 },
  data: { def: 0, mdef: 0, criShield: 0, softDef: 0, res: 0, mres: 0 },
} as any;

function totals(cls: CharacterBase, refine: number, withWings: boolean): Record<string, number> {
  cls.setLearnSkills({ activeSkillIds: [], passiveSkillIds: [] }).getSkillBonusAndName();
  const calc = new Calculator();
  calc
    .setMasterItems(withWings ? { [WINGS]: { ...db[WINGS] } } : ({} as any))
    .setHpSpTable([{ jobs: {}, baseHp: Array(251).fill(1000), baseSp: Array(251).fill(100) }] as any)
    .setClass(cls)
    .setMonster(monster);

  const model = createMainModel();
  model.level = 200;
  if (withWings) {
    model.garment = WINGS;
    model.garmentRefine = refine;
  }

  calc.loadItemFromModel(model).prepareAllItemBonus();
  return (calc as any).totalEquipStatus as Record<string, number>;
}

const KEYS = ['atk', 'matk', 'atkPercent', 'matkPercent', 'range', 'melee', 'm_my_element_all', 'p_pene_class_normal', 'm_pene_class_normal'];

/** What the wings alone add, so the class's own passives cancel out of the comparison. */
function granted(cls: () => CharacterBase, refine: number): Record<string, number> {
  const withWings = totals(cls(), refine, true);
  const without = totals(cls(), refine, false);
  return Object.fromEntries(KEYS.map((k) => [k, (withWings[k] || 0) - (without[k] || 0)]));
}

describe('Asas de Garuda 480278 — plain values (a class outside the four lineages)', () => {
  it('gives ATQ/ATQM +8 per 2 refines', () => {
    expect(granted(() => new RuneKnight(), 4).atk).toBe(16);
    expect(granted(() => new RuneKnight(), 13).atk).toBe(48); // floor(13/2) * 8
    expect(granted(() => new RuneKnight(), 13).matk).toBe(48);
  });

  it('gives Dano físico e mágico +4% from +7', () => {
    expect(granted(() => new RuneKnight(), 6).atkPercent).toBe(0);
    expect(granted(() => new RuneKnight(), 7).atkPercent).toBe(4);
    expect(granted(() => new RuneKnight(), 7).matkPercent).toBe(4);
  });

  it('gives melee/ranged/magic-property +7% from +9', () => {
    const at8 = granted(() => new RuneKnight(), 8);
    expect([at8.melee, at8.range, at8.m_my_element_all]).toEqual([0, 0, 0]);

    const at9 = granted(() => new RuneKnight(), 9);
    expect([at9.melee, at9.range, at9.m_my_element_all]).toEqual([7, 7, 7]);
  });

  it('ignores 10% of a normal monster\'s DEF and MDEF from +13', () => {
    const at12 = granted(() => new RuneKnight(), 12);
    expect([at12.p_pene_class_normal, at12.m_pene_class_normal]).toEqual([0, 0]);

    const at13 = granted(() => new RuneKnight(), 13);
    expect([at13.p_pene_class_normal, at13.m_pene_class_normal]).toEqual([10, 10]);
  });
});

describe('Asas de Garuda 480278 — doubled for the four lineages', () => {
  const doubled = [
    ['Musa', () => new Wanderer()],
    ['Diva', () => new Trouvere()],
    ['Mandraque', () => new AbyssChaser()],
    ['Executor', () => new ShadowCross()],
    ['Shura', () => new Sura()],
    ['Inquisidor', () => new Inquisitor()],
  ] as const;

  it.each(doubled)('%s gets every effect doubled at +13', (_name, cls) => {
    expect(granted(cls, 13)).toEqual({
      atk: 96, // floor(13/2) * 8 * 2
      matk: 96,
      atkPercent: 8,
      matkPercent: 8,
      range: 14,
      melee: 14,
      m_my_element_all: 14,
      p_pene_class_normal: 20,
      m_pene_class_normal: 20,
    });
  });

  it('leaves a class outside the four lineages on the plain values', () => {
    expect(granted(() => new ArchMage(), 13)).toEqual({
      atk: 48,
      matk: 48,
      atkPercent: 4,
      matkPercent: 4,
      range: 7,
      melee: 7,
      m_my_element_all: 7,
      p_pene_class_normal: 10,
      m_pene_class_normal: 10,
    });
  });
});
