import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AtkSkillFormulaInput, AtkSkillModel, CharacterBase } from './_character-base.abstract';
import { ArchMage } from './ArchMage';
import { ClassName } from './_class-name';
import { Calculator } from '../core/calculator';
import { CalculatorController } from '../core/calculator-controller';
import { TextKey } from '../i18n';
import { catalog as en } from '../i18n/en';
import { catalog as es } from '../i18n/es';
import { ptBR } from '../i18n/pt-br';
import { SkillDamageComponent } from '../models/damage-summary.model';
import { SkillFormulaVersion } from '../skills/skill-formula-version';
import { createMainModel } from '../utils/create-main-model';

/**
 * Magus skills whose damage is two differently-scaled parts rather than one hit repeated —
 * card Vg1sXl7urMKoGe7XcJkF, "Habilidades de magus dano base mais dano por tempo".
 *
 * The boundary is what this spec is for. A skill that lands N identical hits (Abalo
 * Sísmico's ten, Pilares de Pedra's four per level) is not of this shape: its damage is one
 * ratio and `skillTotalHit`/`damageRepeat` already say how often it lands. This shape is one
 * component at one ratio plus a second component at another, and the client's own damage
 * table is what settles it — each skill below has a column per part, which is also where
 * the part names come from.
 *
 * @see https://browiki.org/wiki/Colis%C3%A3o_Astral
 */

const base = (over: { skillLevel: number; totalSpl?: number; baseLevel?: number }) =>
  ({
    model: { level: over.baseLevel ?? 100 },
    skillLevel: over.skillLevel,
    status: { totalPow: 0, totalSpl: over.totalSpl ?? 0, totalCon: 0 },
    skills: { isActive: () => false, activeLevel: () => 0, learnedLevel: () => 0 },
    monster: { size: 'm', data: { level: 100 }, isRace: () => false },
    weapon: { data: { weight: 0, baseWeaponLevel: 4 }, isType: () => false, isSubType: () => false },
    equipmentBonus: {}, totalBonus: {}, maxHp: 0, maxSp: 0,
  }) as unknown as AtkSkillFormulaInput;

function skill(name: string, version: SkillFormulaVersion = 'current'): AtkSkillModel {
  const cls = new ArchMage() as CharacterBase;
  cls.setLearnSkills({ activeSkillIds: cls.activeSkills.map(() => 0), passiveSkillIds: cls.passiveSkills.map(() => 0) }).getSkillBonusAndName();
  const found = cls.getAtkSkills(version).find((entry) => entry.name === name);
  expect(found, `${name} is missing from the Magus catalog`).toBeDefined();

  return found!;
}

describe('the Magus skills whose damage splits in two', () => {
  // Every pair below is one row of the client's own table, read at the level the dropdown
  // offers, base 100 and no FEI — the two columns the skill prints side by side.
  it.each([
    // "Nível l ATQM l Bônus l Meteoritos": 18.300% and 6.500% at Nv10.
    ['Astral Strike', 'skd.part.astralStrike1', 'skd.part.astralStrike2', 10, 18300, 6500],
    // "Nível l ATQM l ATQM (Explosão)": 1.500% and 3.000% at Nv5.
    ['Crimson Arrow', 'skd.part.crimsonArrow1', 'skd.part.crimsonArrow2', 5, 1500, 3000],
    // "Nível l ATQM": 6.750% at Nv5, carried whole by each of the two attacks.
    ['Crystal Impact', 'skd.part.crystalImpact1', 'skd.part.crystalImpact2', 5, 6750, 6750],
  ])('%s deals one ratio as %s and another as %s', (name, part1Key, part2Key, level, ratio1, ratio2) => {
    const entry = skill(name as string);
    expect(entry.part1LabelKey).toBe(part1Key);
    expect(entry.part2?.labelKey).toBe(part2Key);
    expect(entry.formula(base({ skillLevel: level as number }))).toBeCloseTo(ratio1 as number);
    expect(entry.part2!.formula(base({ skillLevel: level as number }))).toBeCloseTo(ratio2 as number);
  });

  // Colisão Astral's passage stays open for a fixed time, so the meteors are a count the
  // asteroid does not have: 19 falls on the current bundle. Since the row now lets the
  // player say how many of them landed, that count is a function of the choice —
  // scattered-hits.spec.ts holds the picker itself.
  it('repeats Colisão Astral\'s meteors and nothing else', () => {
    const astral = skill('Astral Strike');
    expect(astral.damageRepeat).toBeUndefined();
    expect((astral.part2!.damageRepeat as (input: AtkSkillFormulaInput) => number)(base({ skillLevel: 10 }))).toBe(19);
  });

  // "Nv.5: Quando todas as flores explodirem, causa dano mágico [...] equivalente a
  // 85.000% do ATQM", on top of the flowers' own 6.200% each at Nv5. The client names that
  // burst in none of the three languages — it only describes it — so the part carries no
  // key and takes the same words as any other unnamed second packet.
  it('Florescer burns the garden once after its flowers, each at its own ratio', () => {
    const bloom = skill('All Bloom');
    const climax5 = { ...base({ skillLevel: 5 }), skills: { isActive: () => true, activeLevel: () => 5, learnedLevel: () => 0 } } as AtkSkillFormulaInput;
    expect(bloom.part1LabelKey).toBe('skd.part.allBloom1');
    expect(bloom.part2?.labelKey).toBeUndefined();
    expect(bloom.formula(climax5)).toBeCloseTo(6200);
    expect(bloom.part2!.formula(climax5)).toBe(85000);
    // The client's "Flores" column: 4 per skill level, 20 at Nv5.
    expect((bloom.damageRepeat as (input: AtkSkillFormulaInput) => number)(climax5)).toBe(20);
  });

  // "Nv.1: Golpe adicional de 12.500% do ATQM", next to the hurricane's own 14.250% at Nv5.
  it('Tufão Destrutivo adds its extra strike at a ratio of its own', () => {
    const hurricane = skill('Destructive Hurricane');
    const climax1 = { ...base({ skillLevel: 5 }), skills: { isActive: () => true, activeLevel: () => 1, learnedLevel: () => 0 } } as AtkSkillFormulaInput;
    expect(hurricane.part1LabelKey).toBe('skd.part.destructiveHurricane1');
    expect(hurricane.part2?.labelKey).toBe('skd.part.destructiveHurricane2');
    expect(hurricane.formula(climax1)).toBeCloseTo(14250);
    expect(hurricane.part2!.formula(climax1)).toBe(12500);
  });

  // Inherited from the Bruxo, and its table has the two columns too:
  // "Nível l ATQM (Fogo) l ATQM (Sombrio)" — 2.000% and 3.000% at Nv5.
  it('Chamas de Hela deals its Fogo and Sombrio parts at different ratios', () => {
    const inferno = skill('Hell Inferno');
    expect(inferno.part1LabelKey).toBe('skd.part.hellInferno1');
    expect(inferno.part2?.labelKey).toBe('skd.part.hellInferno2');
    expect(inferno.formula(base({ skillLevel: 5 }))).toBeCloseTo(2000);
    expect(inferno.part2!.formula(base({ skillLevel: 5 }))).toBeCloseTo(3000);
  });

  // A patch replaces `part2` wholesale, which used to drop the client's name for it and
  // leave every one of these reading "Dano adicional"; `current` is the bundle every case
  // above already runs on.
  it.each(['rebalance-2026-02', 'pre-rebalance'] as const)('keeps the names on the %s bundle', (version) => {
    expect(skill('Astral Strike', version).part2?.labelKey).toBe('skd.part.astralStrike2');
    expect(skill('Crimson Arrow', version).part2?.labelKey).toBe('skd.part.crimsonArrow2');
  });

  // The ones the report asks about and the ones it does not. Each of these lands the same
  // ratio several times, so there is nothing to split — only a hit count.
  it.each([
    'Mystery Illusion', 'Floral Flare Road', 'Rain of Crystal', 'Tornado Storm', 'Stratum Tremor',
    'Frozen Slash', 'Storm Cannon', 'Rock Down', 'Violent Quake', 'Soul Vulcan Strike',
    'Earth Strain', 'Comet', 'Crimson Rock', 'Frost Misty', 'Tetra Vortex',
  ])('%s repeats one ratio and has no second part', (name) => {
    expect(skill(name).part2).toBeUndefined();
  });
});

/**
 * A part names itself with a catalog key, so the reader gets the word their own client
 * uses. Each row is [key, pt-BR, Spanish, English], and every value is quoted from the
 * matching language tree of the LATAM client's `skillinfoz/skilldescript.lub` — the pt-BR
 * one that skill-meta.generated.ts is built from, plus its `data/spanish` and
 * `data/english` siblings.
 *
 * Where a language's description names a part with no noun of its own, the row carries
 * that language's words for an unnamed extra packet rather than a translation of the
 * Portuguese: Cacos de Gelo's two attacks are "1er/2do ataque" in Spanish but an "ice
 * wave" and its "additional damage" in English, and Colisão Astral drops an asteroid
 * trailing meteors in Portuguese and Spanish but "a massive meteor" whose "impact [...]
 * causes additional damage at regular intervals" in English.
 */
describe('the three languages of a part name', () => {
  it.each([
    ['skd.part.astralStrike1', 'Asteroide', 'Asteroide', 'Meteor'],
    ['skd.part.astralStrike2', 'Meteoritos', 'Meteoritos', 'Impacts'],
    ['skd.part.crimsonArrow1', 'Flecha', 'Flecha', 'Arrow'],
    ['skd.part.crimsonArrow2', 'Explosão', 'Explosión', 'Explosion'],
    ['skd.part.crystalImpact1', '1º ataque', '1er ataque', 'Ice wave'],
    ['skd.part.crystalImpact2', '2º ataque', '2do ataque', 'Additional damage'],
    ['skd.part.allBloom1', 'Flores', 'Flores', 'Flower buds'],
    ['skd.part.destructiveHurricane1', 'Tufão', 'Huracán', 'Hurricane'],
    ['skd.part.destructiveHurricane2', 'Golpe adicional', 'Golpe adicional', 'Additional hit'],
    ['skd.part.hellInferno1', 'Fogo', 'Fuego', 'Fire'],
    ['skd.part.hellInferno2', 'Sombrio', 'Sombra', 'Shadow'],
    ['skd.part.additional', 'Dano adicional', 'Daño adicional', 'Additional damage'],
    ['skd.damageTotal', 'Dano total', 'Daño total', 'Total damage'],
  ])('%s reads %s, %s and %s', (key, ptbr, spanish, english) => {
    expect(ptBR[key as TextKey]).toBe(ptbr);
    expect(es[key as TextKey]).toBe(spanish);
    expect(en[key as TextKey]).toBe(english);
  });
});

describe('the parts a solved Magus skill reports', () => {
  const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
  const monsters = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));
  const hpSpTable = JSON.parse(readFileSync('src/assets/demo/data/hp_sp_table.json', 'utf8'));

  function solve(selectedAtkSkill: string, climax = 0) {
    const cls = new ArchMage() as CharacterBase;
    const activeSkillIds = cls.activeSkills.map((entry) => (entry.name === 'Climax' ? climax : 0));
    cls.setLearnSkills({ activeSkillIds, passiveSkillIds: cls.passiveSkills.map(() => 0) });
    const bonuses = cls.getSkillBonusAndName();
    const model = { ...createMainModel(), class: ClassName.ArchMage, level: 250, jobLevel: 70, int: 130, dex: 130, spl: 100, selectedAtkSkill };
    const calc = new Calculator().setMasterItems(items).setHpSpTable(hpSpTable).setClass(cls);
    calc.loadItemFromModel(model as any);
    new CalculatorController().runChain(calc, {
      monster: monsters['21077'], ...bonuses, buffEquips: {}, buffMasterys: {}, consumeData: [],
      aspdPotion: undefined, extraOptionScripts: [], selectedAtkSkill, selectedChances: [], usedHpL: false,
    } as any);

    return (calc as any).damageSummary;
  }

  const sum = (components: SkillDamageComponent[], side: 'Min' | 'Max') =>
    components.reduce((total, component) => total + component[`perHit${side}`] * component.hits, 0);

  it('reports the asteroid and the 19 meteors of Colisão Astral apart', () => {
    const damage = solve('Astral Strike==10');
    expect(damage.skillComponents.map((component: SkillDamageComponent) => [component.labelKey, component.hits])).toEqual([
      ['skd.part.astralStrike1', 1],
      ['skd.part.astralStrike2', 19],
    ]);
    // The asteroid is the figure the headline shows; the meteors are the second packet.
    expect(damage.skillComponents[0].perHitMin).toBe(damage.skillMinDamage);
    expect(damage.skillComponents[1].perHitMin * 19).toBe(damage.skillMinDamage2);
  });

  // Chamas de Hela folds its second packet into the headline (`isIncludeMain`), so the
  // parts have to add up to that same number rather than to something larger.
  it('adds Chamas de Hela\'s parts back up to the damage it reports', () => {
    const damage = solve('Hell Inferno==5');
    expect(damage.skillComponents.map((component: SkillDamageComponent) => component.labelKey))
      .toEqual(['skd.part.hellInferno1', 'skd.part.hellInferno2']);
    expect(sum(damage.skillComponents, 'Min')).toBe(damage.skillMinDamage);
    expect(sum(damage.skillComponents, 'Max')).toBe(damage.skillMaxDamage);
  });

  // Florescer's burst has no name of its own, so the engine's own key stands in for it.
  it('falls back to the unnamed-packet key where the client names no second part', () => {
    const damage = solve('All Bloom==5', 5);
    expect(damage.skillComponents.map((component: SkillDamageComponent) => component.labelKey))
      .toEqual(['skd.part.allBloom1', 'skd.part.additional']);
  });

  it.each([
    ['Astral Strike==10', 0],
    ['Crimson Arrow==5', 0],
    ['Crystal Impact==5', 0],
    ['All Bloom==5', 5],
    ['Destructive Hurricane==5', 1],
    ['Hell Inferno==5', 0],
  ])('closes %s\'s formula graph on the sum of its parts', (selectedAtkSkill, climax) => {
    const damage = solve(selectedAtkSkill as string, climax as number);
    const components: SkillDamageComponent[] = damage.skillComponents;
    expect(components).toHaveLength(2);

    for (const side of ['Min', 'Max'] as const) {
      const nodes = damage.skillFormulaGraph[side.toLowerCase()].nodes;
      // A node per part, each carrying its own complete derivation, then the sum. The
      // nodes name themselves with keys too, so the graph switches language with the page.
      expect(nodes.map((node: any) => node.labelKey)).toEqual([...components.map((component) => component.labelKey), 'skd.damageTotal']);
      expect(nodes.slice(0, 2).map((node: any) => node.value)).toEqual(components.map((component) => component[`perHit${side}`] * component.hits));
      expect(nodes.slice(0, 2).every((node: any) => node.detail?.graph?.min?.nodes?.length)).toBe(true);
      expect(nodes.at(-1).value).toBe(sum(components, side));
      expect(nodes.at(-1).inputs).toEqual(['component0', 'component1']);
    }
  });

  // The other half of the boundary, through the real pipeline: ten identical hits report
  // no parts, and their graph stays the single chain it always was.
  it('leaves a plain multi-hit skill alone', () => {
    const damage = solve('Earth Strain==5');
    expect(damage.skillComponents).toBeUndefined();
    expect(damage.skillFormulaGraph.min.nodes.some((node: any) => node.id.startsWith('component'))).toBe(false);
  });
});
