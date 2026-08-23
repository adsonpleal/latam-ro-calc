import { describe, expect, it } from 'vitest';
import { ElementType } from '../constants';
import { SKILL_ID_BY_NAME } from '../skills';
import { AtkSkillModel } from './_character-base.abstract';
import { ElementalMaster } from './ElementalMaster';

/**
 * Elemental Master — the bonuses a summoned elemental grants, and the Domínio Elemental
 * mode that gates them. Tracker card UKzvObIl4JWIKGGcWFbY (reported by Ted).
 *
 * Two separate things are asserted here:
 *
 *  1. **Modo Passivo bonuses land, keyed by skill id.** `setSpiritBonus` used to write
 *     `totalBonus['Cold Bolt']`, while `getSkillBonus` reads
 *     `totalBonus[SKILL_ID_BY_NAME[name] ?? name]` — i.e. `totalBonus[14]`. Every entry
 *     in that table was therefore dead. The name-key cases below are the regression
 *     guard: if someone reverts to a name key, the id assertions fail *and* the
 *     "no name key" assertions fail.
 *
 *  2. **They apply only at Domínio Elemental nv.1 (Passivo).** browiki puts them inside
 *     each elemental's "Modo Passivo / Domínio Elemental nv.1" block, alongside the
 *     Onda Psíquica element change. Modo Defensivo and Modo Ofensivo grant nothing the
 *     engine can measure today.
 *
 * Values from browiki, one page per elemental (Invocar_Diluvium, Invocar_Ardor,
 * Invocar_Procella, Invocar_Terremotus, Invocar_Serpens). Note Procella is **+80**,
 * not the +100 this table used to carry.
 *
 * The `Dano mágico de propriedade X +10%` half is granted by the summon itself and is
 * mode-independent (client: "Enquanto estiver ativo, fornece: ... +10%"), so it is
 * asserted in every mode.
 */

/** ElementalMaster._spirit dropdown values. */
const SPIRIT = { Divulio: 1, Ardor: 2, Procella: 3, Terramotus: 4, Serpens: 5 } as const;

/** Domínio Elemental dropdown values; 0 = no mode selected. */
const MODE = { None: 0, Passive: 1, Defensive: 2, Offensive: 3 } as const;

const NON_PASSIVE_MODES = [MODE.None, MODE.Defensive, MODE.Offensive];

/** Modo Passivo: which skill each elemental boosts, by how much, and its element. */
const PASSIVE = {
  Divulio: { skill: 'Cold Bolt', bonus: 100, eleKey: 'm_my_element_water', element: ElementType.Water },
  Ardor: { skill: 'Fire Bolt', bonus: 100, eleKey: 'm_my_element_fire', element: ElementType.Fire },
  Procella: { skill: 'Lightening Bolt', bonus: 80, eleKey: 'm_my_element_wind', element: ElementType.Wind },
  Terramotus: { skill: 'Earth Spike', bonus: 80, eleKey: 'm_my_element_earth', element: ElementType.Earth },
  Serpens: { skill: 'Killing Cloud', bonus: 50, eleKey: 'm_my_element_poison', element: ElementType.Poison },
} as const;

const stubBonuses = (spirit: number, mode: number) =>
  ({
    activeSkillNames: new Set<string>(),
    equipAtks: {},
    masteryAtks: {},
    learnedSkillMap: new Map<string, number>(),
    usedSkillMap: new Map<string, number>([
      ...(spirit ? ([['_ElementalMaster_spirit', spirit]] as [string, number][]) : []),
      ...(mode ? ([['_ElementalMaster_el_control', mode]] as [string, number][]) : []),
    ]),
  } as any);

const em = (spirit = 0, mode = 0): ElementalMaster => {
  const c = new ElementalMaster();
  (c as any).bonuses = stubBonuses(spirit, mode);
  return c;
};

/** Run the class hook the way the engine does and hand back the summed bonus. */
function bonusOf(spirit: number, mode: number): Record<string, number> {
  const totalBonus: any = {};
  // No weapon type matters here: Magic Book Mastery is gated on a learned level of 0.
  em(spirit, mode).setAdditionalBonus({ totalBonus, weapon: { isType: () => false } } as any);

  return totalBonus;
}

const psychicWaveElement = (spirit: number, mode: number) => {
  const skill = em(spirit, mode).atkSkills.find((s) => s.name === 'Psychic Wave') as AtkSkillModel;

  return skill.getElement('Psychic Wave==5' as any);
};

describe('Elemental Master — Modo Passivo skill bonus', () => {
  for (const [name, value] of Object.entries(SPIRIT)) {
    const { skill, bonus } = PASSIVE[name as keyof typeof PASSIVE];
    const id = SKILL_ID_BY_NAME[skill];

    it(`${name} at Passivo grants ${skill} +${bonus}% under id ${id}`, () => {
      expect(bonusOf(value, MODE.Passive)[id]).toBe(bonus);
    });

    it(`${name} grants nothing outside Passivo`, () => {
      for (const mode of NON_PASSIVE_MODES) {
        expect(bonusOf(value, mode)[id]).toBeUndefined();
      }
    });

    it(`${name} never writes the bonus under a skill name`, () => {
      const totalBonus = bonusOf(value, MODE.Passive);

      expect(totalBonus[skill]).toBeUndefined();
    });
  }

  it('Procella is +80, not the +100 the table used to carry', () => {
    expect(bonusOf(SPIRIT.Procella, MODE.Passive)[SKILL_ID_BY_NAME['Lightening Bolt']]).toBe(80);
  });

  it('the misspelled "Kiling Cloud" key is gone', () => {
    expect(bonusOf(SPIRIT.Serpens, MODE.Passive)['Kiling Cloud']).toBeUndefined();
  });

  it('no spirit summoned grants nothing, even at Passivo', () => {
    const totalBonus = bonusOf(0, MODE.Passive);

    for (const { skill } of Object.values(PASSIVE)) {
      expect(totalBonus[SKILL_ID_BY_NAME[skill]]).toBeUndefined();
    }
  });
});

describe('Elemental Master — elemental magic bonus is mode-independent', () => {
  for (const [name, value] of Object.entries(SPIRIT)) {
    const { eleKey } = PASSIVE[name as keyof typeof PASSIVE];

    it(`${name} grants ${eleKey} +10 in every mode`, () => {
      for (const mode of [MODE.None, MODE.Passive, MODE.Defensive, MODE.Offensive]) {
        expect(bonusOf(value, mode)[eleKey]).toBe(10);
      }
    });
  }

  it('no spirit summoned grants no elemental bonus', () => {
    const totalBonus = bonusOf(0, MODE.Passive);

    for (const { eleKey } of Object.values(PASSIVE)) {
      expect(totalBonus[eleKey]).toBeUndefined();
    }
  });
});

describe('Elemental Master — Onda Psíquica element follows Modo Passivo', () => {
  for (const [name, value] of Object.entries(SPIRIT)) {
    const { element } = PASSIVE[name as keyof typeof PASSIVE];

    it(`${name} at Passivo turns Onda Psíquica to its element`, () => {
      expect(psychicWaveElement(value, MODE.Passive)).toBe(element);
    });

    it(`${name} leaves Onda Psíquica Neutral outside Passivo`, () => {
      for (const mode of NON_PASSIVE_MODES) {
        expect(psychicWaveElement(value, mode)).toBe(ElementType.Neutral);
      }
    });
  }
});
