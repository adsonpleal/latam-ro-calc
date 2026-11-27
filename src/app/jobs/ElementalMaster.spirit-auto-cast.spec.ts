import { describe, expect, it } from 'vitest';
import { AutoCastSource, BlockedAutoCastSource, ClassAutoCastResolution } from '../models/auto-cast.model';
import { ElementalMaster } from './ElementalMaster';

/**
 * Elemental Master — the auto-cast half of Modo Passivo. Tracker card
 * CtXQg4od5V0TyV78zIet.
 *
 * `setSpiritBonus` already applied the flat skill-damage bonus of that same browiki
 * block (pinned by ElementalMaster.spirit-bonus.spec.ts); the roll on the Elementalista's
 * own melee attacks was missing entirely, which is what the card reported.
 *
 * Every number here is quoted from browiki, one page per elemental, under "Efeitos no
 * Elementalista" — e.g. https://browiki.org/wiki/Invocar_Ardor:
 *
 *   "Ao realizar ataques físicos corpo a corpo, 7% de chance de autoconjurar
 *    [Lanças de Fogo] nv.1 ou no maior nível aprendido."
 *
 * The pairing below is the point of the table: the spell that is auto-cast is *not*
 * always the one the damage bonus boosts. Serpens boosts Maldição de Jormungand (2450)
 * and auto-casts Implosão Tóxica (2448).
 */

/** `_ElementalMaster_spirit` dropdown values. */
const SPIRIT = { Divulio: 1, Ardor: 2, Procella: 3, Terramotus: 4, Serpens: 5 } as const;

/** Domínio Elemental dropdown values; 0 = no mode selected. */
const MODE = { None: 0, Passive: 1, Defensive: 2, Offensive: 3 } as const;

const NON_PASSIVE_MODES = [MODE.None, MODE.Defensive, MODE.Offensive];

/** Spirit → the spell Modo Passivo auto-casts, its id, and the status browiki names. */
const AUTO_CAST = {
  Divulio: { skillId: 14, skillName: 'Cold Bolt', status: 'Força Gélida' },
  Ardor: { skillId: 19, skillName: 'Fire Bolt', status: 'Técnica das Chamas' },
  Procella: { skillId: 20, skillName: 'Lightening Bolt', status: 'Brisa Refrescante' },
  Terramotus: { skillId: 90, skillName: 'Earth Spike', status: 'Cuidado com a Terra' },
  Serpens: { skillId: 2448, skillName: 'Poison Burst', status: 'Serpente Venenosa' },
} as const;

const definitionOf = (character = new ElementalMaster()) =>
  character.autoCastDefinitions.find(({ key }) => key === 'elemental-spirit-passive')!;

/**
 * Resolve the rule the way `classSources` does. `learned` is the level the build has put
 * into the spell being auto-cast, which is the only input besides the two dropdowns.
 */
function resolve(spirit: number, mode: number, learned = 0): ClassAutoCastResolution {
  return definitionOf().resolve({
    skillState: {
      isActive: () => false,
      activeLevel: (skill: any) => {
        const name = typeof skill === 'string' ? skill : skill.name;
        if (name === '_ElementalMaster_spirit') return spirit;
        if (name === '_ElementalMaster_el_control') return mode;
        return 0;
      },
      learnedLevel: () => learned,
    },
    skillById: (id: number) => ({ name: `skill-${id}` } as any),
  } as any);
}

const sourcesOf = (resolution: ClassAutoCastResolution): AutoCastSource[] => resolution.sources ?? [];
const blockedOf = (resolution: ClassAutoCastResolution): BlockedAutoCastSource[] => resolution.blocked ?? [];

describe('Elemental Master — Modo Passivo auto-cast', () => {
  for (const [name, spirit] of Object.entries(SPIRIT)) {
    const { skillId, skillName, status } = AUTO_CAST[name as keyof typeof AUTO_CAST];

    it(`${name} at Passivo auto-casts ${skillName} (${skillId}) at 7% on melee physical attacks`, () => {
      const sources = sourcesOf(resolve(spirit, MODE.Passive));

      expect(sources).toHaveLength(1);
      expect(sources[0]).toMatchObject({
        skillId,
        chance: 7,
        trigger: 'melee-physical-attack',
        kind: 'passive',
        sourceName: status,
        // Domínio Elemental is what gates the status, so it is the enabling skill.
        enablingSkillId: 2456,
      });
    });

    it(`${name} auto-casts nothing outside Passivo`, () => {
      for (const mode of NON_PASSIVE_MODES) {
        expect(sourcesOf(resolve(spirit, mode))).toHaveLength(0);
        expect(blockedOf(resolve(spirit, mode))).toContainEqual(
          expect.objectContaining({ reason: 'Selecione Domínio Elemental: Passivo' }),
        );
      }
    });
  }

  it('fires at Nv. 1 when no points went into the spell, and at the learned level otherwise', () => {
    // "nv.1 ou no maior nível aprendido" — the floor is 1, not 0.
    expect(sourcesOf(resolve(SPIRIT.Ardor, MODE.Passive, 0))[0].skillLevel).toBe(1);
    expect(sourcesOf(resolve(SPIRIT.Ardor, MODE.Passive, 10))[0].skillLevel).toBe(10);
  });

  it('every spirit auto-casts its own element, never a shared default', () => {
    const ids = Object.values(SPIRIT).map((spirit) => sourcesOf(resolve(spirit, MODE.Passive))[0].skillId);

    expect(ids).toEqual([14, 19, 20, 90, 2448]);
    expect(new Set(ids).size).toBe(5);
    // Serpens is the one elemental whose auto-cast spell differs from the spell its
    // damage bonus boosts (Implosão Tóxica 2448, not Maldição de Jormungand 2450).
    expect(ids).not.toContain(2450);
  });

  it('asks for a summon when none is out, instead of dropping the row silently', () => {
    // A row the panel never draws reads as "not modelled", so both halves of the gate
    // have to say what is missing.
    expect(blockedOf(resolve(0, MODE.Passive))).toContainEqual(
      expect.objectContaining({ name: 'Espírito Elemental', reason: 'Invoque um Espírito Elemental' }),
    );
    expect(blockedOf(resolve(0, MODE.None))[0].reason)
      .toBe('Invoque um Espírito Elemental · Selecione Domínio Elemental: Passivo');
    expect(sourcesOf(resolve(0, MODE.Passive))).toHaveLength(0);
  });
});
