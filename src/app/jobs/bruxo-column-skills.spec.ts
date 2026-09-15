import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createMainModel } from 'src/app/utils';
import { Calculator } from '../core/calculator';
import { CalculatorController } from '../core/calculator-controller';
import { ElementType } from '../constants/element-type.const';
import { SKILL_META, SKILL_ID_BY_NAME } from '../skills';
import {
  EARTH_SPIKE,
  FIRE_PILLAR,
  FROST_NOVA,
  HEAVENS_DRIVE,
  JUPITEL_THUNDER,
  LORD_OF_VERMILION,
  METEOR_STORM,
  SIGHTRASHER,
  STORM_GUST,
  WATER_BALL,
} from '../skills/shared-skills';
import { AtkSkillModel } from './_character-base.abstract';
import { HighWizard } from './HighWizard';
import { ArchMage, ElementalMaster, HyperNovice, Scholar, Sorcerer, SuperNovice, Warlock } from './index';

/**
 * The Bruxo column, shared by the Bruxo line and the Superaprendiz, with the two skills the
 * Sábio learns too. Tracker card simulador-superaprendiz-faltam-sete-habilidades-da-linha-dos-bruxos,
 * reported anonymously: the Superaprendiz was missing Trovão de Júpiter, Coluna de Fogo,
 * Coluna de Pedra, Supernova, Esfera d'Água and Congelar. (Ira de Thor, also on the card,
 * was already there.) None of the six existed for any class, the Bruxo's Ira de Thor was
 * hidden behind `isDevMode`, and Nevasca was the Superaprendiz's alone.
 *
 * Ratios come from each skill's pt-BR client text; bROWiki fills in what the client does
 * not print (Congelar's ratio, Coluna de Fogo's formula, Esfera d'Água's ball count).
 * The cast and delay numbers are held to the client by skill-delay.spec.ts.
 */

const hits = (skill: AtkSkillModel, skillLevel: number) =>
  typeof skill.totalHit === 'function' ? skill.totalHit({ skillLevel } as any) : skill.totalHit ?? 1;
const ratio = (skill: AtkSkillModel, skillLevel: number) => skill.formula({ skillLevel, model: { level: 200 } } as any);

const BRUXO_COLUMN = [
  JUPITEL_THUNDER,
  LORD_OF_VERMILION,
  STORM_GUST,
  METEOR_STORM,
  EARTH_SPIKE,
  HEAVENS_DRIVE,
  FROST_NOVA,
  FIRE_PILLAR,
  SIGHTRASHER,
  WATER_BALL,
];
const SABIO_SKILLS = [EARTH_SPIKE, HEAVENS_DRIVE];

describe('Bruxo column skills', () => {
  it('resolves every skill in the catalog under its client id and pt-BR name', () => {
    const expected: Record<string, [number, string]> = {
      'Jupitel Thunder': [84, 'Trovão de Júpiter'],
      'Lord of Vermilion': [85, 'Ira de Thor'],
      'Storm Gust': [89, 'Nevasca'],
      'Meteor Storm': [83, 'Chuva de Meteoros'],
      'Earth Spike': [90, 'Coluna de Pedra'],
      "Heaven's Drive": [91, 'Fúria da Terra'],
      'Frost Nova': [88, 'Congelar'],
      'Fire Pillar': [80, 'Coluna de Fogo'],
      Sightrasher: [81, 'Supernova'],
      'Water Ball': [86, "Esfera d'Água"],
    };

    for (const skill of BRUXO_COLUMN) {
      const [id, label] = expected[skill.name];
      expect(SKILL_ID_BY_NAME[skill.name], skill.name).toBe(id);
      expect((SKILL_META as any)[skill.name].label, skill.name).toBe(label);
    }
  });

  describe('who gets them', () => {
    const offered = (cls: { atkSkills: AtkSkillModel[] }, skill: AtkSkillModel) => cls.atkSkills.includes(skill);

    it.each([
      ['Superaprendiz', new SuperNovice()],
      ['Hiperaprendiz', new HyperNovice()],
      ['Bruxo', new HighWizard()],
      ['Arcano', new Warlock()],
      ['Magus', new ArchMage()],
    ])('the %s gets the whole column, as the one shared definition', (_, cls) => {
      for (const skill of BRUXO_COLUMN) expect(offered(cls, skill), skill.name).toBe(true);
    });

    it.each([
      ['Sábio', new Scholar()],
      ['Feiticeiro', new Sorcerer()],
      ['Elementalista', new ElementalMaster()],
    ])('the %s gets Coluna de Pedra and Fúria da Terra and nothing else of it', (_, cls) => {
      for (const skill of BRUXO_COLUMN) {
        expect(offered(cls, skill), skill.name).toBe(SABIO_SKILLS.includes(skill));
      }
    });

    it('defines each skill once per class', () => {
      for (const cls of [new SuperNovice(), new HyperNovice(), new Warlock(), new ArchMage(), new ElementalMaster()]) {
        const names = cls.atkSkills.map((s) => s.name).filter((n) => BRUXO_COLUMN.some((s) => s.name === n));
        expect(names.length, cls.constructor.name).toBe(new Set(names).size);
      }
    });

    it('no longer hides Ira de Thor from the Bruxo line', () => {
      expect(LORD_OF_VERMILION.isDevMode).toBeUndefined();
    });
  });

  it('offers every level of every skill', () => {
    const maxLevel: Record<string, number> = { 'Earth Spike': 5, "Heaven's Drive": 5, 'Water Ball': 5 };
    for (const skill of BRUXO_COLUMN) {
      const max = maxLevel[skill.name] ?? 10;
      expect(skill.value, skill.name).toBe(`${skill.name}==${max}`);
      expect(skill.levelList.map((l) => l.value), skill.name).toEqual(Array.from({ length: max }, (_, i) => `${skill.name}==${i + 1}`));
    }
  });

  it('is magic damage of the skill\'s own element', () => {
    const element: Record<string, ElementType> = {
      'Jupitel Thunder': ElementType.Wind,
      'Lord of Vermilion': ElementType.Wind,
      'Storm Gust': ElementType.Water,
      'Meteor Storm': ElementType.Fire,
      'Earth Spike': ElementType.Earth,
      "Heaven's Drive": ElementType.Earth,
      'Frost Nova': ElementType.Water,
      'Fire Pillar': ElementType.Fire,
      Sightrasher: ElementType.Fire,
      'Water Ball': ElementType.Water,
    };
    for (const skill of BRUXO_COLUMN) {
      expect(skill.isMatk, skill.name).toBe(true);
      expect(skill.element, skill.name).toBe(element[skill.name]);
    }
  });

  describe('ratios and hit counts', () => {
    it('Trovão de Júpiter: 100% per shock, 3 shocks at Nv1 to 12 at Nv10', () => {
      expect(ratio(JUPITEL_THUNDER, 1)).toBe(100);
      expect(ratio(JUPITEL_THUNDER, 10)).toBe(100);
      expect([1, 5, 10].map((lv) => hits(JUPITEL_THUNDER, lv))).toEqual([3, 7, 12]);
    });

    it('Coluna de Pedra: 200% per spike, one spike per level', () => {
      expect(ratio(EARTH_SPIKE, 1)).toBe(200);
      expect([1, 3, 5].map((lv) => hits(EARTH_SPIKE, lv))).toEqual([1, 3, 5]);
    });

    it('Fúria da Terra: 125% per spike, one spike per level — 625% at Nv5 as before', () => {
      expect(ratio(HEAVENS_DRIVE, 5)).toBe(125);
      expect([1, 5].map((lv) => hits(HEAVENS_DRIVE, lv))).toEqual([1, 5]);
    });

    it('Congelar: 110% at Nv1 to 200% at Nv10, one hit (bROWiki)', () => {
      expect(ratio(FROST_NOVA, 1)).toBe(110);
      expect(ratio(FROST_NOVA, 10)).toBe(200);
      expect(hits(FROST_NOVA, 10)).toBe(1);
    });

    it('Supernova: 120% at Nv1 to 300% at Nv10, one hit', () => {
      expect(ratio(SIGHTRASHER, 1)).toBe(120);
      expect(ratio(SIGHTRASHER, 10)).toBe(300);
      expect(hits(SIGHTRASHER, 10)).toBe(1);
    });

    it("Esfera d'Água: 130% to 250% per ball, the full ball count for the level's water area", () => {
      expect([1, 2, 3, 4, 5].map((lv) => ratio(WATER_BALL, lv))).toEqual([130, 160, 190, 220, 250]);
      expect([1, 2, 3, 4, 5].map((lv) => hits(WATER_BALL, lv))).toEqual([1, 9, 9, 25, 25]);
    });

    it('Coluna de Fogo: 20% of MATK per flame, +50 on each, 3 flames at Nv1 to 12 at Nv10', () => {
      expect(ratio(FIRE_PILLAR, 1)).toBe(20);
      expect(ratio(FIRE_PILLAR, 10)).toBe(20);
      expect(FIRE_PILLAR.finalDmgFormula({ damage: 1000 } as any)).toBe(1050);
      expect([1, 10].map((lv) => hits(FIRE_PILLAR, lv))).toEqual([3, 12]);
    });

    it('keeps Ira de Thor and Nevasca on the numbers they had', () => {
      expect(ratio(LORD_OF_VERMILION, 10)).toBe(1400);
      expect(LORD_OF_VERMILION.hit).toBe(20);
      expect(ratio(STORM_GUST, 1)).toBe(120);
      expect(ratio(STORM_GUST, 10)).toBe(570);
      expect(STORM_GUST.totalHit).toBe(10);
    });
  });

  describe('through the calculator', () => {
    const monsters = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));
    const DUMMY_ID = 21067; // Training Dummy (Neutral): no MDEF of either kind
    const target = (stats: Record<string, number>) => {
      const base = monsters[DUMMY_ID];
      return { id: DUMMY_ID, name: base.name, spawn: 'x', stats: { ...base.stats, ...stats } } as any;
    };
    const NO_MDEF = target({});
    // Hard MDEF 300 and a soft MDEF off INT/VIT/level — enough to move any magic hit.
    const HIGH_MDEF = target({ magicDefense: 300, int: 250, vit: 200, level: 150 });

    const solve = (skillValue: string, monster: any) => {
      const cls = new SuperNovice();
      const { equipAtks, masteryAtks, activeSkillNames, learnedSkillMap } = cls
        .setLearnSkills({ activeSkillIds: [], passiveSkillIds: [] })
        .getSkillBonusAndName();
      const calc = new Calculator()
        .setMasterItems({})
        .setHpSpTable([{ jobs: { [cls.className]: true }, baseHp: Array(251).fill(20000), baseSp: Array(251).fill(1500) }] as any)
        .setClass(cls)
        .setMonster(monster);
      const model: any = createMainModel();
      Object.assign(model, {
        class: 30, level: 200, jobLevel: 70,
        str: 1, agi: 1, vit: 1, int: 130, dex: 100, luk: 1,
        selectedAtkSkill: skillValue,
      });
      calc.loadItemFromModel(model);
      new CalculatorController().runChain(calc, {
        monster, equipAtks, masteryAtks, buffEquips: {}, buffMasterys: {},
        consumeData: [], aspdPotion: 0, extraOptionScripts: [], activeSkillNames, learnedSkillMap,
        selectedAtkSkill: skillValue, selectedChances: [], usedHpL: false,
      } as any);

      return calc.getTotalSummary().dmg as any;
    };

    /** The value of one step of the max-damage trace, by its label. */
    const step = (dmg: any, label: string) => dmg.skillFormulaTrace.max.find((s: any) => s.label.startsWith(label))?.value;

    it('the high-MDEF target does cut an ordinary magic skill', () => {
      // The control: without this the next case would pass on a target with no MDEF.
      expect(solve('Frost Nova==10', HIGH_MDEF).skillMaxDamage).toBeLessThan(solve('Frost Nova==10', NO_MDEF).skillMaxDamage);
    });

    it('Coluna de Fogo ignores both halves of MDEF', () => {
      const bare = solve('Fire Pillar==10', NO_MDEF);
      const armoured = solve('Fire Pillar==10', HIGH_MDEF);

      expect(armoured.skillMinDamage).toBe(bare.skillMinDamage);
      expect(armoured.skillMaxDamage).toBe(bare.skillMaxDamage);
      // The soft MDEF step is skipped, not run at zero.
      expect(step(armoured, 'DEFM -')).toBeUndefined();
      expect(step(solve('Frost Nova==10', HIGH_MDEF), 'DEFM -')).toBeDefined();
    });

    it('Coluna de Fogo reports its flames as the hit count', () => {
      expect(solve('Fire Pillar==1', NO_MDEF).skillTotalHit).toBe(3);
      expect(solve('Fire Pillar==10', NO_MDEF).skillTotalHit).toBe(12);
    });

    it('Coluna de Fogo is 20% of the MATK chain plus 50 per flame', () => {
      // Bare build, neutral dummy: nothing between the ratio and the end of the chain moves
      // the number, so each flame is the "Hab. Base 20%" step plus the flat 50.
      const dmg = solve('Fire Pillar==10', NO_MDEF);
      const matk = step(dmg, 'MATK');
      const base = step(dmg, 'Hab. Base 20%');

      expect(base).toBe(Math.floor(matk * 0.2));
      expect(dmg.skillMaxDamage).toBe(base + 50);
    });
  });
});
