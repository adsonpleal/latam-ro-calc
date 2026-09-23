import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createMainModel } from '../utils';
import { itemBonusScriptEntries } from '../models/item.model';
import { ArchBishop, ArchMage, ImperialGuard, NightWatch, Paladin, RoyalGuard, RuneKnight, Scholar, Sorcerer, Sura } from '../jobs';
import { buildAutoCastSimulation } from './auto-cast';
import { Calculator } from './calculator';
import { makeCalculator } from './__tests__/make-calculator';
import { ITEM_CLASS_AUTO_CAST_SKILLS } from '../skills/item-class-auto-cast-skills';

const ITEMS = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8')) as Record<string, any>;
const LATAM_ITEMS = JSON.parse(readFileSync('src/assets/demo/data/latam-items.json', 'utf8')) as Record<string, any>;
const rules = (id: number) => ITEMS[id].script.autoCast;
const resolved = (overrides: Record<string, any>, learned = new Map<string, number>()) => {
  const calc = makeCalculator(ITEMS).setLearnedSkills(learned);
  calc.loadItemFromModel({ ...createMainModel(), ...overrides }).prepareAllItemBonus();
  return calc.resolvedItemAutoCasts;
};

describe('Renegado and Mandraque replay-backed item auto-casts', () => {
  it('keeps the independently rolled Competidor Poring sources separate', () => {
    expect(rules(420820).map((rule) => [rule.skillId, rule.chance])).toEqual([
      [83, ['EQUIP_ID[19194]7']],
      [19, ['EQUIP_ID[19192]7']],
      [14, ['EQUIP_ID[19192]7']],
      [20, ['EQUIP_ID[19192]7']],
    ]);
  });

  it('captures every direct-damage item source observed in the selected builds', () => {
    const ids = Object.values(ITEMS).filter((item: any) => item.script?.autoCast).map((item: any) => item.id);
    expect(ids).toEqual(expect.arrayContaining([
      1185, 24527, 24728, 510019, 510040, 510034, 300006, 27305, 420820, 700132,
    ]));
  });

  it('maps every Arco Híbrido arrow combo independently', () => {
    expect(rules(700132).map((rule) => [rule.chance[0], rule.skillId, rule.skillLevel[0]])).toEqual([
      ['EQUIP_ID[1751]10', 2038, '5'],
      ['EQUIP_ID[1752]10', 2211, '3'],
      ['EQUIP_ID[1754]10', 2447, '3'],
      ['EQUIP_ID[1755]10', 2214, '3'],
      ['EQUIP_ID[1756]10', 2216, '3'],
      ['EQUIP_ID[1757]10', 2202, '3'],
      ['EQUIP_ID[1762]10', 2450, '3'],
      ['EQUIP_ID[1773]10', 2449, '3'],
    ]);
  });

  it('keeps chained Ritualística damage out of the direct basic-attack catalog', () => {
    expect(rules(510034)).toEqual([
      expect.objectContaining({ skillId: 2450, chance: ['EQUIP_ID[460017]REFINE[weapon,shield==18]===7'], trigger: 'physical-hit' }),
    ]);
  });

  it('sums Manopla Sombria do Desejo chance tiers at +0, +7 and +9', () => {
    const chanceAt = (refine: number) => resolved({ shadowWeapon: 24527, shadowWeaponRefine: refine })[0].chance;
    expect([chanceAt(0), chanceAt(7), chanceAt(9)]).toEqual([4, 5, 7]);
  });

  it('resolves Automagia combined-refine chance and level with highest-learned support', () => {
    const at18 = resolved({ shadowArmor: 24728, shadowArmorRefine: 10, shadowBoot: 24729, shadowBootRefine: 8 });
    const at20 = resolved({ shadowArmor: 24728, shadowArmorRefine: 10, shadowBoot: 24729, shadowBootRefine: 10 });
    const learned = resolved(
      { shadowArmor: 24728, shadowArmorRefine: 10, shadowBoot: 24729, shadowBootRefine: 8 },
      new Map([['Jack Frost', 5]]),
    );
    expect(at18.find((rule) => rule.skillId === 2204)).toMatchObject({ chance: 4, skillLevel: 2 });
    expect(at20.find((rule) => rule.skillId === 2204)).toMatchObject({ chance: 8, skillLevel: 4 });
    expect(learned.find((rule) => rule.skillId === 2204)).toMatchObject({ chance: 4, skillLevel: 5 });
  });

  it('resolves refine, combo and ammunition conditions through the shared script parser', () => {
    expect(resolved({ weapon: 510019, weaponRefine: 11 }).map((rule) => [rule.skillId, rule.chance])).toEqual([[83, 10], [2449, 7]]);
    expect(resolved({ weapon: 510034, weaponRefine: 9, shield: 460017, shieldRefine: 9 })[0]).toMatchObject({ skillId: 2450, chance: 7 });
    expect(resolved({ headLower: 420820, headUpper: 19192 })).toHaveLength(3);
    expect(resolved({ weapon: 700132, ammo: 1752 })).toEqual([
      expect.objectContaining({ skillId: 2211, skillLevel: 3, chance: 10 }),
    ]);
  });

  it('requires the described ammunition or weapon type and honours learned-only levels', () => {
    expect(resolved({ armor: 15180, armorRefine: 9 })).toEqual([]);
    expect(resolved({ armor: 15180, armorRefine: 9, ammo: 1752 })).toEqual([
      expect.objectContaining({ skillId: 46, chance: 1, skillLevel: 3 }),
    ]);

    expect(resolved({ weapon: 510019, weaponCard1: 27086 })).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ skillId: 46 })]),
    );
    expect(resolved({ weapon: 1733, weaponCard1: 27086 })).toEqual(
      expect.arrayContaining([expect.objectContaining({ skillId: 46, chance: 3, skillLevel: 5 })]),
    );

    expect(resolved({ weapon: 600012, weaponRefine: 9 })).toEqual([]);
    expect(resolved(
      { weapon: 600012, weaponRefine: 9 },
      new Map([['Sonic Wave', 6]]),
    )).toEqual([expect.objectContaining({ skillId: 2002, chance: 7, skillLevel: 6 })]);
  });

  it('does not count the Death Guidance debuff as direct autocast damage', () => {
    const calc = makeCalculator(ITEMS);
    calc.loadItemFromModel({ ...createMainModel(), weapon: 1186 }).prepareAllItemBonus();
    expect(ITEMS[1186].script.autoCastPending ?? []).toEqual([]);
    expect(calc.resolvedItemAutoCasts).toEqual([]);
    expect(itemBonusScriptEntries(ITEMS[1186].script).map(([key]) => key)).not.toContain('autoCastPending');
  });
});

describe('reviewed LATAM item procs', () => {
  it('implements the newly reviewed damaging casts with class and refine conditions', () => {
    const forClass = (character: Paladin | RoyalGuard | ImperialGuard | Sura | NightWatch, equipment: Record<string, any>) => {
      const calc = makeCalculator(ITEMS, character);
      calc.loadItemFromModel({ ...createMainModel(), ...equipment }).prepareAllItemBonus();
      return calc.resolvedItemAutoCasts;
    };
    expect(forClass(new Paladin(), { weapon: 1486, weaponRefine: 8 })).toEqual([]);
    expect(forClass(new Paladin(), { weapon: 1486, weaponRefine: 9 })).toContainEqual(
      expect.objectContaining({ skillId: 367, skillLevel: 5, chance: 20 }));
    for (const character of [new RoyalGuard(), new ImperialGuard()]) {
      expect(forClass(character, { weapon: 1486, weaponRefine: 9 })).toContainEqual(
        expect.objectContaining({ skillId: 367, chance: 20 }));
    }
    const monk = new Sura();
    expect(forClass(monk, { weapon: 1826, weaponRefine: 8 })).toEqual([]);
    expect(forClass(monk, { weapon: 1826, weaponRefine: 9 })).toContainEqual(
      expect.objectContaining({ skillId: 266, skillLevel: 5, chance: 6 }));
    expect(forClass(monk, { weapon: 1826, weaponRefine: 10 })).toContainEqual(
      expect.objectContaining({ skillId: 266, skillLevel: 5, chance: 7 }));
    for (const id of [13163, 13164]) {
      expect(forClass(new NightWatch(), { weapon: id })).toContainEqual(
        expect.objectContaining({ skillId: 512, skillLevel: 5, chance: 2 }));
    }
  });

  it('ignores the received-hit Drain Life proc without showing a locked tile', () => {
    const calc = makeCalculator(ITEMS).loadItemFromModel({ ...createMainModel(), armor: 15090 }).prepareAllItemBonus();
    expect(calc.resolvedItemAutoCastPending).toEqual([]);
    expect(calc.resolvedItemAutoCasts).toEqual([]);
  });

  it('uses the learned levels and separate rates on Nimbus and the lightning shuriken', () => {
    const learned = new Map([['Cold Bolt', 8], ['Frost Diver', 4]]);
    const nimbus = resolved({ headUpper: 19009 }, learned);
    expect(nimbus.map(({ skillId, skillLevel, chance }) => [skillId, skillLevel, chance]))
      .toEqual([[14, 8, 9], [15, 5, 7]]);
    expect(nimbus.every((entry) => entry.trigger === 'physical-attack')).toBe(true);
    expect(resolved({ weapon: 13315 }, new Map([['Lightning Jolt', 5]])))
      .toContainEqual(expect.objectContaining({ skillId: 541, skillLevel: 5, chance: 3,
        trigger: 'melee-physical-attack' }));
  });

  it('requires the Piamette shield combo and head refine for its selectable transformation', () => {
    expect(resolved({ headUpper: 19098, headUpperRefine: 8 })).toEqual([]);
    expect(resolved({ headUpper: 19098, shield: 28902 })).toEqual([]);
    const model = { ...createMainModel(), headUpper: 19098, headUpperRefine: 8, shield: 28902, shieldRefine: 6 };
    const calc = makeCalculator(ITEMS).loadItemFromModel(model).prepareAllItemBonus();
    expect(calc.resolvedItemAutoCasts).toContainEqual(expect.objectContaining({
      skillId: 5, chance: 10, requiredEffect: 'Transformação Piamette',
    }));
    expect(calc.chanceList).toContainEqual(expect.objectContaining({
      name: 'Transformação Piamette', bonus: { vct: 40, aspdPercent: 24 },
      label2: expect.stringContaining('5 segundos'),
    }));
  });

  it('gates Fumacento skills by transformation, refine and base level', () => {
    const base = resolved({ headUpper: 19265, level: 99 });
    expect(base.map((entry) => entry.skillId)).toEqual([19, 14, 20, 90]);
    const upgraded = resolved({ headUpper: 19265, headUpperRefine: 10, level: 100 });
    expect(upgraded.map((entry) => entry.skillId)).toEqual([19, 14, 20, 90, 88, 21, 2212, 2214]);
    expect(upgraded.every((entry) => entry.requiredEffect === 'Transformação Fumacento')).toBe(true);
  });

  it('keeps the LT transformation bonuses and grade D magic proc separate', () => {
    const model = { ...createMainModel(), headUpper: 400152, headUpperRefine: 11, headUpperGrade: 'D' };
    const character = new RuneKnight();
    const monster = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'))[1038];
    const calc = makeCalculator(ITEMS, character)
      .setHpSpTable([{ jobs: { [character.className]: true }, baseHp: Array(251).fill(20000), baseSp: Array(251).fill(1500) }] as any)
      .setMonster(monster);
    calc.setModel(model).loadItemFromModel(model).prepareAllItemBonus();
    expect(calc.chanceList).toContainEqual(expect.objectContaining({
      name: 'Transformação Fumacento-LT', bonus: { matk: 150, hit: 75 },
    }));
    expect(calc.resolvedItemAutoCasts).toContainEqual(expect.objectContaining({
      skillId: 17, skillLevel: 9, chance: 3, trigger: 'magic-attack',
    }));
    expect(calc.resolvedItemAutoCasts).toContainEqual(expect.objectContaining({
      skillId: 2450, skillLevel: 3, chance: 5, requiredEffect: 'Transformação Fumacento-LT',
    }));
    calc.calcAllAtk();
    const input = { calc, model, hasSelectedEffects: false, summary: {
      calc: { hitPerSecs: 4 }, calcSkill: { dmgType: 'Magical', totalHitPerSec: 2 },
      dmg: { accuracy: 100, criRateToMonster: 0, basicDps: 400 },
      weapon: { rangeType: 'melee' }, monster: { hp: 10000, race: 'plant', type: 'normal' },
    } };
    const magical = buildAutoCastSimulation(input);
    expect(magical.sources).toContainEqual(expect.objectContaining({
      source: expect.objectContaining({ skillId: 17 }), triggerAttacksPerSecond: 2,
    }));
    const physical = buildAutoCastSimulation({ ...input, summary: {
      ...input.summary, calcSkill: { dmgType: 'Melee', totalHitPerSec: 2 },
    } });
    expect(physical.sources.some((source) => source.source.skillId === 17)).toBe(false);
  });

  it('adds the Hatii combo chance to the base Rajada Congelante chance', () => {
    const base = { weapon: 1185, weaponCard1: 4323 };
    expect(resolved(base)).toContainEqual(expect.objectContaining({
      itemId: 4323, skillId: 15, skillLevel: 3, chance: 5,
    }));
    expect(resolved({ ...base, armor: 15180, armorCard: 4324 })).toContainEqual(expect.objectContaining({
      itemId: 4323, skillId: 15, skillLevel: 3, chance: 35,
    }));
  });

  it('offers the Queen Worm transformation and locks Terremoto until selected', () => {
    const model = { ...createMainModel(), weapon: 13090 };
    const character = new RuneKnight();
    const monster = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'))[1038];
    const calc = makeCalculator(ITEMS, character)
      .setHpSpTable([{ jobs: { [character.className]: true }, baseHp: Array(251).fill(20000), baseSp: Array(251).fill(1500) }] as any)
      .setMonster(monster);
    calc.setModel(model).loadItemFromModel(model).prepareAllItemBonus();
    calc.calcAllAtk();
    expect(calc.chanceList).toContainEqual(expect.objectContaining({
      name: 'Transformação Rainha Verme', itemId: 13090, bonus: {},
    }));
    expect(calc.resolvedItemAutoCasts).toContainEqual(expect.objectContaining({
      skillId: 653, skillLevel: 1, chance: 20, requiredEffect: 'Transformação Rainha Verme',
    }));
    const input = { calc, model, hasSelectedEffects: false, summary: {
      calc: { hitPerSecs: 4 }, dmg: { accuracy: 100, criRateToMonster: 0, basicDps: 400 },
      weapon: { rangeType: 'melee' }, monster: { hp: 10000, race: 'plant', type: 'normal' },
    } };
    const locked = buildAutoCastSimulation(input);
    expect(locked.sources.some((source) => source.source.skillId === 653)).toBe(false);
    expect(locked.blockedSources).toContainEqual(expect.objectContaining({
      icon: 653, reason: expect.stringContaining('Selecione Transformação Rainha Verme'),
    }));
    calc.setSelectedChances(['Transformação Rainha Verme']);
    const active = buildAutoCastSimulation({ ...input, hasSelectedEffects: true });
    expect(active.blockedSources.some((source) => source.icon === 653)).toBe(false);
    expect(active.sources).toContainEqual(expect.objectContaining({
      source: expect.objectContaining({ skillId: 653, chance: 20 }),
    }));
  });

  it('uses the explicit rates and levels for Fúria do Furacão and Lança de Caça', () => {
    expect(resolved({ weapon: 1377 })).toContainEqual(expect.objectContaining({
      itemId: 1377, skillId: 661, skillLevel: 5, chance: 1, trigger: 'physical-attack',
    }));
    expect(resolved({ weapon: 1422 })).toContainEqual(expect.objectContaining({
      itemId: 1422, skillId: 399, skillLevel: 3, chance: 10, trigger: 'physical-attack',
    }));
  });

  it('gates Death Note Judgement to Sage and descendants', () => {
    const procsFor = (character: Scholar | Sorcerer | ArchBishop) => {
      const calc = makeCalculator(ITEMS, character);
      calc.loadItemFromModel({ ...createMainModel(), weapon: 1565 }).prepareAllItemBonus();
      return calc.resolvedItemAutoCasts;
    };
    expect(ITEMS[1565].usableClass).toContain('Sage');
    expect(procsFor(new Scholar())).toContainEqual(expect.objectContaining({
      itemId: 1565, skillId: 662, skillLevel: 5, chance: 2,
    }));
    expect(procsFor(new Sorcerer())).toContainEqual(expect.objectContaining({
      itemId: 1565, skillId: 662, skillLevel: 5, chance: 2,
    }));
    expect(procsFor(new ArchBishop())).toEqual([]);
  });

  it('requires both rings and uses rAthena combo rates for direct damage procs', () => {
    expect(resolved({ accRight: 2679 })).toEqual([]);
    const both = resolved({ accRight: 2679, accLeft: 2678 });
    expect(both.filter((rule) => rule.itemId === 2679).map((rule) => [rule.skillId, rule.skillLevel, rule.chance]))
      .toEqual([[271, 1, 0.3], [136, 5, 5], [406, 2, 5], [266, 5, 2]]);
  });
});

describe('Armadura Desconhecida VIT set autocast', () => {
  it('matches the LATAM description and requires the VIT boots', () => {
    expect(LATAM_ITEMS[450597].description).toContain('Bota Desconhecida VIT');
    expect(LATAM_ITEMS[450597].description).toContain(
      'Ao realizar ataques físicos, 10% de chance de autoconjurar [Espíritos Ancestrais] nv.1.',
    );
    expect(rules(450597)).toEqual([{
      skillId: 5220,
      skillLevel: ['1'],
      chance: ['EQUIP_ID[470073]10'],
      trigger: 'physical-attack',
    }]);
    expect(ITEMS[450597].script.autoCastPending ?? []).toEqual([]);
    expect(resolved({ armor: 450597 })).toEqual([]);
    expect(resolved({ armor: 450597, boot: 470071 })).toEqual([]);
    expect(resolved({ armor: 450597, boot: 470073 })).toContainEqual(expect.objectContaining({
      itemId: 450597, skillId: 5220, skillLevel: 1, chance: 10, trigger: 'physical-attack',
    }));
  });
});

describe('class-independent item skills', () => {
  it('runs every promoted formula through the real damage engine on an unrelated class', () => {
    const character = new NightWatch();
    const monster = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'))[1038];
    const model = createMainModel();
    const calc = makeCalculator(ITEMS, character)
      .setHpSpTable([{ jobs: { [character.className]: true }, baseHp: Array(251).fill(20000), baseSp: Array(251).fill(1500) }] as any)
      .setMonster(monster);
    calc.setModel(model).loadItemFromModel(model).prepareAllItemBonus();
    for (const skill of ITEM_CLASS_AUTO_CAST_SKILLS) {
      const damage = calc.solveAutoCast(`${skill.name}==1`, skill);
      expect(damage.requireTxt, skill.name).toBeFalsy();
      expect(Number.isFinite(damage.skillDpsInputMax), skill.name).toBe(true);
    }
  });

  it('calculates the ring procs with the real damage engine on a Night Watch', () => {
    const model = { ...createMainModel(), accRight: 2678 };
    const character = new NightWatch();
    const monster = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'))[1038];
    const calc = makeCalculator(ITEMS, character)
      .setHpSpTable([{ jobs: { [character.className]: true }, baseHp: Array(251).fill(20000), baseSp: Array(251).fill(1500) }] as any)
      .setMonster(monster);
    calc.setModel(model).loadItemFromModel(model).prepareAllItemBonus();
    calc.calcAllAtk();
    const result = buildAutoCastSimulation({ calc, model, hasSelectedEffects: false, summary: {
      calc: { hitPerSecs: 4 }, dmg: { accuracy: 100, criRateToMonster: 0, basicDps: 400 },
      weapon: { rangeType: 'melee' }, monster: { hp: 10000, race: 'plant', type: 'normal' },
    } });
    expect(result.blockedSources.every((source) => source.key.startsWith('auto-firing-launcher-'))).toBe(true);
    expect(result.sources.map((source) => source.source.skillId)).toEqual([367, 17, 62]);
    expect(result.sources.every((source) => Number.isFinite(source.expectedDamagePerActivation))).toBe(true);
  });

  it('calculates all four original ring-pair damage procs on a Night Watch', () => {
    const model = { ...createMainModel(), accRight: 2679, accLeft: 2678 };
    const character = new NightWatch();
    const monster = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'))[1038];
    const calc = makeCalculator(ITEMS, character)
      .setHpSpTable([{ jobs: { [character.className]: true }, baseHp: Array(251).fill(20000), baseSp: Array(251).fill(1500) }] as any)
      .setMonster(monster);
    calc.setModel(model).loadItemFromModel(model).prepareAllItemBonus();
    calc.calcAllAtk();
    const result = buildAutoCastSimulation({ calc, model, hasSelectedEffects: false, summary: {
      calc: { hitPerSecs: 4 }, dmg: { accuracy: 100, criRateToMonster: 0, basicDps: 400 },
      weapon: { rangeType: 'melee' }, monster: { hp: 10000, race: 'plant', type: 'normal' },
    } });
    expect(result.blockedSources.every((source) => source.key.startsWith('auto-firing-launcher-'))).toBe(true);
    expect(result.sources.filter((source) => source.source.sourceItemId === 2679).map((source) => source.source.skillId))
      .toEqual([271, 136, 406, 266]);
    expect(result.sources.every((source) => Number.isFinite(source.expectedDamagePerActivation))).toBe(true);
  });

  it('lets every equippable class use all three procs from Anel do Senhor das Chamas', () => {
    for (const character of [new ArchMage(), new NightWatch(), new RuneKnight()]) {
      const model = { ...createMainModel(), accRight: 2678 };
      const itemCalc = makeCalculator(ITEMS, character);
      itemCalc.loadItemFromModel(model).prepareAllItemBonus();
      expect(itemCalc.resolvedItemAutoCasts).toEqual(expect.arrayContaining([
        expect.objectContaining({ itemId: 2678, skillId: 17, skillLevel: 1, chance: 15 }),
      ]));
      const selected: string[] = [];
      const calc = {
        atkSkills: character.atkSkills,
        autoCastDefinitions: [],
        resolvedItemAutoCasts: itemCalc.resolvedItemAutoCasts,
        solveAutoCast: (_value: string, skill: { name: string }) => {
          selected.push(skill.name);
          return {
            skillTotalHit: 1, skillDpsInputMin: 100, skillDpsInputMax: 100,
            skillDpsInputCriDmg: 100, skillCriRateToMonster: 0, skillAccuracy: 100,
            skillCanCri: false, skillMinDamage: 100, skillMaxDamage: 100, requireTxt: '',
          };
        },
      } as unknown as Calculator;
      const result = buildAutoCastSimulation({ calc, model, hasSelectedEffects: false, summary: {
        calc: { hitPerSecs: 4 }, dmg: { accuracy: 100, criRateToMonster: 0, basicDps: 400 },
        weapon: { rangeType: 'melee' }, monster: { hp: 10000 },
      } });
      expect(result.blockedSources).toEqual([]);
      expect(result.sources.map((source) => source.source.skillId)).toEqual([367, 17, 62]);
      expect(selected).toEqual(['Gloria Domini', 'Fire Ball', 'Bowling Bash']);
    }
  });
});

describe('Carta Marquês Coruja set autocast', () => {
  it('uses the documented 2% chance only with Carta Visconde Coruja', () => {
    expect(LATAM_ITEMS[4632].description).toContain(
      '2% de chance de autoconjurar [Ira de Thor] nv. 1.',
    );
    expect(rules(4632)).toEqual([{
      skillId: 85,
      skillLevel: ['1'],
      chance: ['EQUIP_ID[4631]2'],
      trigger: 'physical-attack',
    }]);
    expect(ITEMS[4632].script.autoCastPending ?? []).toEqual([]);
    expect(resolved({ accRight: 2607, accRightCard: 4632 })).toEqual([]);
    expect(resolved({ accRight: 2607, accRightCard: 4632, accLeft: 2621, accLeftCard: 4631 })).toContainEqual(expect.objectContaining({
      itemId: 4632, skillId: 85, skillLevel: 1, chance: 2,
    }));
  });
});

describe('autocast rates documented by Divine Pride scripts', () => {
  // LATAM descriptions list the skills and levels, but omit these percentages.
  // https://www.divine-pride.net/database/item/2678/ring-of-flame-lord
  // https://www.divine-pride.net/database/item/2957/advanced-ring-of-flame-lord
  it.each([2678, 2957])('%i has the three separately rolled base procs', (id) => {
    expect(rules(id).map((rule) => [rule.skillId, rule.skillLevel[0], rule.chance[0]])).toEqual([
      [367, '2', '3'], [17, '1', '15'], [62, '5', '2'],
    ]);
    expect(ITEMS[id].script.autoCastPending ?? []).toEqual([]);
  });

  // https://www.divine-pride.net/database/item/2679/ring-of-resonance
  // https://www.divine-pride.net/database/item/2958/advanced-ring-of-resonance
  it('gates the original and advanced ring pair procs separately', () => {
    expect(resolved({ accRight: 2679 })).toEqual([]);
    expect(resolved({ accRight: 2679, accLeft: 2678 }).map((r) => [r.skillId, r.chance])).toEqual([[271, 0.3], [136, 5], [406, 5], [266, 2], [367, 3], [17, 15], [62, 2]]);
    expect(resolved({ accRight: 2958, accLeft: 2957 }).filter((r) => r.itemId === 2958)).toEqual([
      expect.objectContaining({ skillId: 406, skillLevel: 2, chance: 5 }),
    ]);
    expect(resolved({ accRight: 2958, accLeft: 2678 }).filter((r) => r.itemId === 2958)).toEqual([]);
  });

  // https://www.divine-pride.net/database/item/24698/LATAM
  // https://www.divine-pride.net/database/item/24703
  it('requires the full advanced Éden shadow set for each 7% melee proc', () => {
    const set = { shadowArmor: 24694, shadowShield: 24693, shadowBoot: 24695, shadowEarring: 24696, shadowPendant: 24697 };
    expect(resolved({ shadowWeapon: 24698, ...set }).map((r) => [r.skillId, r.skillLevel, r.chance, r.trigger])).toEqual([
      [2006, 3, 7, 'melee-physical-hit'],
    ]);
    expect(resolved({ shadowWeapon: 24703, ...set }).map((r) => [r.skillId, r.skillLevel, r.chance, r.trigger])).toEqual([
      [2449, 3, 7, 'melee-physical-hit'],
    ]);
    expect(resolved({ shadowWeapon: 24698, ...set, shadowPendant: undefined })).toEqual([]);
    expect(resolved({ shadowWeapon: 24698, ...set }, new Map([['Ignition Break', 5]]))[0].skillLevel).toBe(5);
  });
});

describe('remaining rates cross-checked against rAthena and LATAM', () => {
  // rAthena item_combos.yml gives independent 1% rolls with Hurt Mind (2977).
  it('resolves both Coração Bondoso rolls only with Coração Partido', () => {
    expect(resolved({ accRight: 2978 }).filter((r) => r.itemId === 2978)).toEqual([]);
    expect(resolved({ accRight: 2978, accLeft: 2977 }).filter((r) => r.itemId === 2978)
      .map((r) => [r.skillId, r.skillLevel, r.chance])).toEqual([[88, 10, 1], [2449, 1, 1]]);
  });

  // rAthena item_db_equip.yml confirms the base + per-refine rate for each roll.
  // LATAM specifies physical attacks, so its trigger takes precedence here.
  it('scales Armadura Heroica Nevasca by 0.3% per refine', () => {
    expect([0, 1, 10].map((armorRefine) => resolved({ armor: 15093, armorRefine })
      .find((r) => r.itemId === 15093))).toEqual([
      expect.objectContaining({ skillId: 89, chance: 0.3, trigger: 'physical-attack' }),
      expect.objectContaining({ skillId: 89, chance: 0.6, trigger: 'physical-attack' }),
      expect.objectContaining({ skillId: 89, chance: 3.3, trigger: 'physical-attack' }),
    ]);
  });

  // Divine Pride's Scripts section splits LATAM's "ou" into independent 1% effects.
  // https://www.divine-pride.net/database/item/2980
  it('resolves Luva dos Espíritos Malignos as two independent LATAM 1% rolls', () => {
    expect(resolved({ accRight: 2980 }).filter((r) => r.itemId === 2980)
      .map((r) => [r.skillId, r.skillLevel, r.chance, r.trigger])).toEqual([
      [88, 10, 1, 'physical-attack'], [2449, 1, 1, 'physical-attack'],
    ]);
    expect(ITEMS[2980].script.autoCastPending ?? []).toEqual([]);
  });
});

describe('old Rifle Primordial-LT report', () => {
  it('uses the LATAM item identity, +9 autocasts and Primordial boots combo', () => {
    expect(ITEMS[810009].name).toBe(LATAM_ITEMS[810009].name);
    expect(ITEMS[810009].description).toBe(LATAM_ITEMS[810009].description);
    expect(resolved({ weapon: 810009, weaponRefine: 8 }).filter((r) => r.itemId === 810009)).toEqual([]);
    expect(resolved({ weapon: 810009, weaponRefine: 9 }).filter((r) => r.itemId === 810009)
      .map((r) => [r.skillId, r.skillLevel, r.chance])).toEqual([
      [13, 10, 15], [400, 5, 15], [2202, 5, 15],
    ]);
    expect(ITEMS[810009].script.matkPercent).toContain('EQUIP_ID[470094]===10');
  });

  it('can calculate all three rifle spell procs for Night Watch', () => {
    const model = { ...createMainModel(), weapon: 810009, weaponRefine: 9 };
    const itemCalc = makeCalculator(ITEMS);
    itemCalc.loadItemFromModel(model).prepareAllItemBonus();
    const calc = {
      atkSkills: new NightWatch().atkSkills,
      autoCastDefinitions: [],
      resolvedItemAutoCasts: itemCalc.resolvedItemAutoCasts,
      solveAutoCast: () => ({
        skillTotalHit: 1, skillDpsInputMin: 100, skillDpsInputMax: 100,
        skillDpsInputCriDmg: 100, skillCriRateToMonster: 0, skillAccuracy: 100,
        skillCanCri: false, skillMinDamage: 100, skillMaxDamage: 100, requireTxt: '',
      }),
    } as unknown as Calculator;
    const simulation = buildAutoCastSimulation({
      calc, model, hasSelectedEffects: false,
      summary: {
        calc: { hitPerSecs: 4 }, dmg: { accuracy: 100, criRateToMonster: 0, basicDps: 400 },
        weapon: { rangeType: 'range' }, monster: { hp: 10000 },
      },
    });
    expect(simulation.sources.map((s) => s.source.skillId)).toEqual([13, 400, 2202]);
    expect(simulation.blockedSources).toEqual([]);
  });
});
