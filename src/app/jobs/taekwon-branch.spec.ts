/**
 * The Taekwon branch below the Mestre Estelar and the Ceifador de Almas: Taekwon (4046),
 * Mestre Taekwon (4047) and Espiritualista (4049), the first slice of card
 * JgO3Xmd7v4IgfeosqhJ7 ("adicionar as classes transclasse para simulação").
 *
 * All three already existed as inheritance bases — the Mestre Estelar's job tree stands on
 * them — and none of them was selectable, so none of their own attacks had a formula. What
 * this file holds is the two halves of making one playable: the tier caps, which are not
 * the 3rd job's, and the ratio of every attack it brings.
 *
 * **Every ratio is checked against the client's own `Nível l ATQ` / `ATQM` table**, read
 * out of `skill-meta.generated.ts`'s description by `clientRatioTable` — the same source
 * of truth `skill-ratio-client-table.spec.ts` uses, and the one CLAUDE.md names. bROWiki
 * prints the same figures for all eight tabled attacks; where it is the *only* source (the
 * three heat fields, and Esma, whose client table counts spirit circles instead of printing
 * a ratio) the expectation says so and the page is named.
 */
import { describe, expect, it } from 'vitest';
import { ElementType } from '../constants/element-type.const';
import { clientRatioTable } from '../skills/client-ratio-table';
import { AtkSkillFormulaInput, AtkSkillModel, CharacterBase } from './_character-base.abstract';
import { CLASS_CTOR_BY_ID, getClassDropdownList } from './_class-list';
import { ClassName } from './_class-name';
import { SoulAscetic } from './SoulAscetic';
import { SoulReaper } from './SoulReaper';
import { StarEmperor } from './StarEmperor';
import { STAR_GLADIATOR_HEATS } from './StarGladiator';
import { TAEKWON_KICK_NAMES } from './Taekwondo';

const TAEKWON = 4046;
const STAR_GLADIATOR = 4047;
const SOUL_LINKER = 4049;

const job = (id: number): CharacterBase => new CLASS_CTOR_BY_ID[id]();

/** Base level 100 and no stats, which is the state the client's table describes. */
const input = (skillLevel: number, level = 100): AtkSkillFormulaInput =>
  ({ skillLevel, model: { level }, status: {}, stack: 0,
    skills: { isActive: () => false, activeLevel: () => 0, learnedLevel: () => 0 },
    monster: { size: 'm', data: { level: 100 }, isRace: () => false, isElement: () => false },
    weapon: undefined, equipmentBonus: { shield: {} }, totalBonus: {}, maxHp: 0, maxSp: 0,
  } as unknown as AtkSkillFormulaInput);

const atk = (classId: number, name: string): AtkSkillModel => {
  const skill = job(classId).atkSkills.find((entry) => entry.name === name);
  expect(skill, `${name} is not among class ${classId}'s attacks`).toBeDefined();

  return skill!;
};

const ratios = (skill: AtkSkillModel, levels: number) =>
  Object.fromEntries(Array.from({ length: levels }, (_, i) => [i + 1, Math.round(skill.formula(input(i + 1)))]));

const clientRatios = (name: string) => Object.fromEntries(clientRatioTable(name) ?? []);

describe('the Taekwon branch is selectable', () => {
  it('offers the three jobs under the names the client gives them', () => {
    const picker = new Map(getClassDropdownList().map((entry) => [entry.value, entry.label]));

    expect(picker.get(TAEKWON)).toBe('Taekwon');
    expect(picker.get(STAR_GLADIATOR)).toBe('Mestre Taekwon');
    expect(picker.get(SOUL_LINKER)).toBe('Espiritualista');
  });

  it('places each one right before the promotion it leads to', () => {
    const order = getClassDropdownList().map((entry) => entry.value);
    const after = (id: number) => order[order.indexOf(id) + 1];

    expect(after(TAEKWON)).toBe(STAR_GLADIATOR);
    expect(after(STAR_GLADIATOR)).toBe(33); // Mestre Estelar
    expect(after(SOUL_LINKER)).toBe(3); // Ceifador de Almas
  });

  /**
   * bROWiki states the pair on each class page — the Taekwon's two promotions both read
   * "ao atingirem o nível de base 99 e classe 50". A 3rd job's 99..200 / 130 / 193 would
   * be wrong here, and the Mestre Estelar below must keep them even though it inherits
   * from these classes, which is what `JOB_TIER_CAPS` is for.
   */
  it.each([TAEKWON, STAR_GLADIATOR, SOUL_LINKER])('caps class %i at base 99, job 50, stat 99 and ASPD 190', (id) => {
    const instance = job(id);

    expect(instance.minMaxLevelCap).toEqual({ minMaxLevel: [1, 99], maxJob: 50 });
    expect(instance.maxBaseStat).toBe(99);
    expect(instance.maxAspd).toBe(190);
    // Job levels run 1..50 with no hole; only the 3rd and 4th jobs skip 66..69.
    expect(instance.excludedJobLevels).toEqual([]);
  });

  /**
   * The unarmed base is the one number that separates the three in `AspdTable`: the
   * Taekwon carries no weapon at all, so bROWiki lists only "Sem arma 156 / Escudo -6";
   * the Mestre Taekwon adds "Livro -10"; the Espiritualista sits ten lower at 146.
   */
  it.each([[TAEKWON, 156, -6], [STAR_GLADIATOR, 156, -6], [SOUL_LINKER, 146, -8]])(
    'gives class %i base ASPD %i with a %i shield penalty', (id, baseAspd, shieldPenalty) => {
      expect(job(id).calcBaseAspd({ isEquipShield: false } as never)).toEqual({ baseAspd, shieldPenalty });
    },
  );
});

describe("the Taekwon's five kicks", () => {
  const KICKS = TAEKWON_KICK_NAMES;

  it.each(KICKS)('%s matches the client ATQ table at every level', (name) => {
    expect(ratios(atk(TAEKWON, name), 7)).toEqual(clientRatios(name));
  });

  it('reads the tables the client actually publishes', () => {
    // Guards the expectations above against a parser that silently finds nothing: these
    // are the figures bROWiki prints too (browiki.org/wiki/Chute_do_Tornado and siblings).
    expect(clientRatios('Tornado Kick')).toEqual({ 1: 180, 2: 200, 3: 220, 4: 240, 5: 260, 6: 280, 7: 300 });
    expect(clientRatios('Heel Drop')).toEqual(clientRatios('Tornado Kick'));
    expect(clientRatios('Roundhouse')).toEqual({ 1: 220, 2: 250, 3: 280, 4: 310, 5: 340, 6: 370, 7: 400 });
    expect(clientRatios('Counter Kick')).toEqual(clientRatios('Roundhouse'));
    expect(clientRatios('Flying Kick')).toEqual({ 1: 40, 2: 50, 3: 60, 4: 70, 5: 80, 6: 90, 7: 100 });
  });

  it('never misses with Contrachute, which the client says ignores Esquiva', () => {
    expect(atk(TAEKWON, 'Counter Kick').isHit100).toBe(true);
    expect(KICKS.filter((name) => atk(TAEKWON, name).isHit100)).toEqual(['Counter Kick']);
  });

  it('counts only Chute Aéreo as ranged, the one kick the client does not call corpo a corpo', () => {
    expect(KICKS.filter((name) => atk(TAEKWON, name).isMelee !== true)).toEqual(['Flying Kick']);
  });

  it('hands every kick down to the Mestre Taekwon line and to none of the Espiritualista line', () => {
    const names = (instance: CharacterBase) => new Set(instance.atkSkills.map((skill) => skill.name));
    const kicksOf = (instance: CharacterBase) => KICKS.filter((name) => names(instance).has(name));

    for (const instance of [job(STAR_GLADIATOR), new StarEmperor()]) expect(kicksOf(instance)).toEqual([...KICKS]);
    // "Não pode ser usada por Espiritualistas", on all five client descriptions.
    for (const instance of [job(SOUL_LINKER), new SoulReaper(), new SoulAscetic()]) expect(kicksOf(instance)).toEqual([]);
  });
});

describe("the Mestre Taekwon's three heat fields", () => {
  const HEATS = STAR_GLADIATOR_HEATS.map(([name]) => name);

  it.each(HEATS)('%s deals a flat 100% of ATQ, as bROWiki states in words', (name) => {
    const skill = atk(STAR_GLADIATOR, name);

    // bROWiki: "causa dano físico corpo a corpo equivalente a 100% do ATQ", unchanged by
    // the level — only the duration grows (10 / 20 / 60 s).
    expect([1, 2, 3].map((level) => skill.formula(input(level)))).toEqual([100, 100, 100]);
    expect(skill.isMelee).toBe(true);
  });

  it('has no client ratio table to check against, which is why bROWiki is the source', () => {
    // The client prints `Nível l Duração` for all three. If a client update starts
    // publishing an ATQ column, this fails and the number above gets re-checked.
    expect(HEATS.map(clientRatioTable)).toEqual([null, null, null]);
  });

  /**
   * It has to be `labelSuffix`: `localize` replaces `label` with the client's pt-BR name
   * for every skill that resolves in `skill-meta.generated.ts`, and these three do — put
   * the map in `label` and the picker simply reads "Calor Solar".
   */
  it('says which map each one needs in the one field localization keeps', () => {
    expect(HEATS.map((name) => atk(STAR_GLADIATOR, name).labelSuffix))
      .toEqual(['mapa SOLAR', 'mapa LUNAR', 'mapa ESTELAR']);
  });

  it('withholds a DPS instead of reading its four zeroed timings as full Vel.Atq.', () => {
    // Nothing publishes how often a standing field re-hits, so there is no figure to put
    // here; `timingUnknown` is how the app says "damage per use only".
    expect(HEATS.map((name) => atk(STAR_GLADIATOR, name).timingUnknown)).toEqual([true, true, true]);
  });
});

describe("the Espiritualista's Es- attacks", () => {
  it.each([['Estin', 7], ['Estun', 7]] as const)('%s matches the client ATQM table at every level', (name, levels) => {
    expect(ratios(atk(SOUL_LINKER, name), levels)).toEqual(clientRatios(name));
  });

  it('reads the tables the client actually publishes', () => {
    expect(clientRatios('Estin')).toEqual({ 1: 10, 2: 20, 3: 30, 4: 40, 5: 50, 6: 60, 7: 70 });
    expect(clientRatios('Estun')).toEqual({ 1: 5, 2: 10, 3: 15, 4: 20, 5: 25, 6: 30, 7: 35 });
  });

  /**
   * Esma is the one attack here whose client table does not print a ratio: its column
   * counts spirit circles (1..10). bROWiki supplies the missing half as a formula —
   * "ATQM por círculo = [Nv. de base + 40]%" — so the level drives how many times the
   * ratio lands, not how big it is.
   */
  it('casts one Esma circle per level, each worth base level + 40 percent', () => {
    const esma = atk(SOUL_LINKER, 'Esma');
    const circles = (level: number) => (esma.totalHit as (i: AtkSkillFormulaInput) => number)(input(level));

    expect(clientRatioTable('Esma')).toBeNull();
    expect([1, 5, 10].map(circles)).toEqual([1, 5, 10]);
    expect(esma.formula(input(10, 1))).toBe(41);
    expect(esma.formula(input(10, 99))).toBe(139);
  });

  it('says Estin only lands on Small targets, in the field localization keeps', () => {
    expect(atk(SOUL_LINKER, 'Estin').labelSuffix).toBe('alvo Pequeno');
  });

  it('casts all three as Neutro magic', () => {
    for (const name of ['Estin', 'Estun', 'Esma']) {
      expect(atk(SOUL_LINKER, name).isMatk).toBe(true);
      // "A propriedade muda conforme Brisa Leve" is not modelled: the engine's Brisa Leve
      // moves the physical attack property only.
      expect(atk(SOUL_LINKER, name).element).toBe(ElementType.Neutral);
    }
  });

  it('hands all three down to the Ceifador de Almas and the Asceta das Almas', () => {
    for (const instance of [new SoulReaper(), new SoulAscetic()]) {
      const names = new Set(instance.atkSkills.map((skill) => skill.name));

      expect(['Estin', 'Estun', 'Esma'].filter((name) => names.has(name))).toEqual(['Estin', 'Estun', 'Esma']);
    }
  });

  it('keeps the Espiritualista out of the classes that still kick', () => {
    expect(job(SOUL_LINKER).classNameSet.has(ClassName.StarGladiator)).toBe(false);
    expect(job(SOUL_LINKER).classNameSet.has(ClassName.Taekwondo)).toBe(true);
  });
});
