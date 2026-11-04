import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AtkSkillFormulaInput, AtkSkillModel, CharacterBase } from './_character-base.abstract';
import { ArchMage } from './ArchMage';
import { ClassName } from './_class-name';
import { Calculator } from '../core/calculator';
import { CalculatorController } from '../core/calculator-controller';
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
    ['Astral Strike', 'Asteroide', 'Meteoritos', 10, 18300, 6500],
    // "Nível l ATQM l ATQM (Explosão)": 1.500% and 3.000% at Nv5.
    ['Crimson Arrow', 'Flecha', 'Explosão', 5, 1500, 3000],
    // "Nível l ATQM": 6.750% at Nv5, carried whole by each of the two attacks.
    ['Crystal Impact', '1º ataque', '2º ataque', 5, 6750, 6750],
  ])('%s deals %s at one ratio and %s at another', (name, part1Label, part2Label, level, ratio1, ratio2) => {
    const entry = skill(name as string);
    expect(entry.part1Label).toBe(part1Label);
    expect(entry.part2?.label).toBe(part2Label);
    expect(entry.formula(base({ skillLevel: level as number }))).toBeCloseTo(ratio1 as number);
    expect(entry.part2!.formula(base({ skillLevel: level as number }))).toBeCloseTo(ratio2 as number);
  });

  // Colisão Astral's passage stays open for a fixed time, so the meteors are a count the
  // asteroid does not have: 19 falls on the current bundle.
  it('repeats Colisão Astral\'s meteors and nothing else', () => {
    const astral = skill('Astral Strike');
    expect(astral.damageRepeat).toBeUndefined();
    expect(astral.part2!.damageRepeat).toBe(19);
  });

  // "Nv.5: Quando todas as flores explodirem, causa dano mágico [...] equivalente a
  // 85.000% do ATQM", on top of the flowers' own 6.200% each at Nv5.
  it('Florescer burns the garden once after its flowers, each at its own ratio', () => {
    const bloom = skill('All Bloom');
    const climax5 = { ...base({ skillLevel: 5 }), skills: { isActive: () => true, activeLevel: () => 5, learnedLevel: () => 0 } } as AtkSkillFormulaInput;
    expect(bloom.part1Label).toBe('Flores');
    expect(bloom.part2?.label).toBe('Queima do Jardim');
    expect(bloom.formula(climax5)).toBeCloseTo(6200);
    expect(bloom.part2!.formula(climax5)).toBe(85000);
    // The client's "Flores" column: 4 per skill level, 20 at Nv5.
    expect((bloom.damageRepeat as (input: AtkSkillFormulaInput) => number)(climax5)).toBe(20);
  });

  // "Nv.1: Golpe adicional de 12.500% do ATQM", next to the hurricane's own 14.250% at Nv5.
  it('Tufão Destrutivo adds its extra strike at a ratio of its own', () => {
    const hurricane = skill('Destructive Hurricane');
    const climax1 = { ...base({ skillLevel: 5 }), skills: { isActive: () => true, activeLevel: () => 1, learnedLevel: () => 0 } } as AtkSkillFormulaInput;
    expect(hurricane.part1Label).toBe('Tufão');
    expect(hurricane.part2?.label).toBe('Golpe Adicional');
    expect(hurricane.formula(climax1)).toBeCloseTo(14250);
    expect(hurricane.part2!.formula(climax1)).toBe(12500);
  });

  // Inherited from the Bruxo, and its table has the two columns too:
  // "Nível l ATQM (Fogo) l ATQM (Sombrio)" — 2.000% and 3.000% at Nv5.
  it('Chamas de Hela deals its Fogo and Sombrio parts at different ratios', () => {
    const inferno = skill('Hell Inferno');
    expect(inferno.part1Label).toBe('Fogo');
    expect(inferno.part2?.label).toBe('Sombrio');
    expect(inferno.formula(base({ skillLevel: 5 }))).toBeCloseTo(2000);
    expect(inferno.part2!.formula(base({ skillLevel: 5 }))).toBeCloseTo(3000);
  });

  // A patch replaces `part2` wholesale, which used to drop the client's name for it and
  // leave every one of these reading "Dano adicional"; `current` is the bundle every case
  // above already runs on.
  it.each(['rebalance-2026-02', 'pre-rebalance'] as const)('keeps the names on the %s bundle', (version) => {
    expect(skill('Astral Strike', version).part2?.label).toBe('Meteoritos');
    expect(skill('Crimson Arrow', version).part2?.label).toBe('Explosão');
    expect(skill('All Bloom', version).part2?.label).toBe('Queima do Jardim');
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
    expect(damage.skillComponents.map((component: SkillDamageComponent) => [component.label, component.hits])).toEqual([
      ['Asteroide', 1],
      ['Meteoritos', 19],
    ]);
    // The asteroid is the figure the headline shows; the meteors are the second packet.
    expect(damage.skillComponents[0].perHitMin).toBe(damage.skillMinDamage);
    expect(damage.skillComponents[1].perHitMin * 19).toBe(damage.skillMinDamage2);
  });

  // Chamas de Hela folds its second packet into the headline (`isIncludeMain`), so the
  // parts have to add up to that same number rather than to something larger.
  it('adds Chamas de Hela\'s parts back up to the damage it reports', () => {
    const damage = solve('Hell Inferno==5');
    expect(damage.skillComponents.map((component: SkillDamageComponent) => component.label)).toEqual(['Fogo', 'Sombrio']);
    expect(sum(damage.skillComponents, 'Min')).toBe(damage.skillMinDamage);
    expect(sum(damage.skillComponents, 'Max')).toBe(damage.skillMaxDamage);
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
      // A node per part, each carrying its own complete derivation, then the sum.
      expect(nodes.map((node: any) => node.label)).toEqual([...components.map((component) => component.label), 'Dano total']);
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
