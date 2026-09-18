import { describe, expect, it } from 'vitest';
import { ElementType, RED_AURA_MVP_IDS } from '../constants';
import { MonsterModel } from '../models/monster.model';
import { Monster } from './monster';

const monster = (statsOver: Record<string, any> = {}, nameOver = 'Test Mob'): MonsterModel =>
  ({
    name: nameOver,
    stats: {
      level: 100,
      health: 50000,
      str: 10,
      agi: 10,
      vit: 50,
      int: 40,
      dex: 60,
      luk: 30,
      defense: 100,
      magicDefense: 20,
      res: 5,
      mres: 6,
      elementName: 'Ghost 3',
      raceName: 'Formless',
      scaleName: 'Large',
      class: 0,
      mvp: 0,
      ...statsOver,
    },
  } as any);

describe('Monster.setData', () => {
  it('splits the element name into element + level', () => {
    const m = new Monster().setData(monster());
    expect(m.data.element).toBe('ghost');
    expect(m.data.elementUpper).toBe(ElementType.Ghost);
    expect(m.data.elementName).toBe('Ghost 3');
    expect(m.data.elementLevelN).toBe(3);
    expect(m.elementType).toBe(ElementType.Ghost);
  });

  it('normalises race and size casings', () => {
    const m = new Monster().setData(monster());
    expect(m.data.race).toBe('formless');
    expect(m.data.raceUpper).toBe('Formless');
    expect(m.data.size).toBe('l');
    expect(m.data.sizeUpper).toBe('L');
    expect(m.data.sizeFullUpper).toBe('Large');
  });

  it('derives soft def/mdef, crit shield and hit requirement from level + stats', () => {
    const m = new Monster().setData(monster());
    expect(m.data.softDef).toBe(75); // floor((100 + 50) / 2)
    expect(m.data.softMDef).toBe(35); // floor((100 + 40) / 4)
    expect(m.data.criShield).toBe(6); // floor(30 / 5)
    expect(m.data.hitRequireFor100).toBe(310); // 200 + 100 + 10(agi)
  });

  it('marks class 0 as a normal (non-boss) monster', () => {
    const m = new Monster().setData(monster({ class: 0, mvp: 0 }));
    expect(m.type).toBe('normal');
    expect(m.isBoss).toBe(false);
    expect(m.isMVP).toBe(false);
    expect(m.data.typeUpper).toBe('Normal');
  });

  it('marks a non-zero class as boss and reads the mvp flag', () => {
    const m = new Monster().setData(monster({ class: 1, mvp: 1 }));
    expect(m.type).toBe('boss');
    expect(m.isBoss).toBe(true);
    expect(m.isMVP).toBe(true);
  });

  it('exposes type predicates', () => {
    const m = new Monster().setData(monster());
    expect(m.isRace('formless', 'undead')).toBe(true);
    expect(m.isRace('demon')).toBe(false);
    expect(m.isElement(ElementType.Ghost)).toBe(true);
    expect(m.isElement(ElementType.Holy)).toBe(false);
    expect(m.isSize('l')).toBe(true);
    expect(m.isSize('s', 'm')).toBe(false);
  });

  it('setData is chainable', () => {
    const m = new Monster();
    expect(m.setData(monster())).toBe(m);
  });

  describe('red aura', () => {
    it('flags MVPs that are in the red-aura list (Orc Hero 1087)', () => {
      expect(RED_AURA_MVP_IDS.has(1087)).toBe(true);
      const m = new Monster().setData({ ...monster({ class: 1, mvp: 1 }), id: 1087 } as MonsterModel);
      expect(m.isRedAura).toBe(true);
      expect(m.data.isRedAura).toBe(true);
    });

    it('does not flag MVPs without a red aura (Gemaring 3505)', () => {
      expect(RED_AURA_MVP_IDS.has(3505)).toBe(false);
      const m = new Monster().setData({ ...monster({ class: 1, mvp: 1 }), id: 3505 } as MonsterModel);
      expect(m.isRedAura).toBe(false);
    });

    it('does not flag ordinary monsters (Poring 1002)', () => {
      const m = new Monster().setData({ ...monster(), id: 1002 } as MonsterModel);
      expect(m.isRedAura).toBe(false);
    });
  });

  describe('map-wide damage reduction', () => {
    const reductionOf = (id: number, overrides: Partial<MonsterModel['stats']> = {}) =>
      new Monster().setData({ ...monster(overrides), id } as MonsterModel).data.damageReduction;

    it('takes 90% off every Varmundt Biosphere field monster', () => {
      expect(reductionOf(21548)).toBe(90); // Cornus of Prairie, bl_grass
      expect(reductionOf(21564)).toBe(90); // Ice Titan of Iceberg, bl_ice
      expect(reductionOf(21578)).toBe(90); // Knight of Abyss in Death, bl_death
    });

    it('takes 99% off the four Biosphere MVPs', () => {
      for (const id of [21555, 21563, 21571, 21579]) expect(reductionOf(id, { class: 1, mvp: 1 })).toBe(99);
    });

    it('leaves everything outside the Biosphere alone', () => {
      expect(reductionOf(1002)).toBe(0); // Poring
      expect(reductionOf(21547)).toBe(0);
      expect(reductionOf(21580)).toBe(0);
    });
  });
});
