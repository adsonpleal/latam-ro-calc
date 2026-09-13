import { describe, expect, it } from 'vitest';
import { SKILL_ID_BY_NAME } from 'src/app/skills';
import { Inquisitor } from './Inquisitor';
import { ActiveSkillModel, AtkSkillModel } from './_character-base.abstract';

/**
 * The three Auréolas of the Inquisidor (tracker card oNlijThpU24tnEVE91wv, "colocar as
 * auréolas do inquisidor na lista de buffs").
 *
 * They are states, not damage buffs: the client text gives each a single effect (Ruína,
 * then also Combo Rápido, then also Garra de Tigre cast without spending spheres) and
 * rAthena's status.cpp and battle.cpp never read the three status effects. What they
 * decide is which brand skills can be cast at all — every one of the six follow-ups
 * prints "Apenas durante [Auréola ...]" — so that is what the toggles model: a chosen
 * aura marks the skills it does not cover with "Requer:", a higher aura covers the lower
 * ones, and no aura chosen leaves every skill available, which is what every build saved
 * before the toggles existed needs.
 */
const AURAS = ['First Faith Power', 'Judge', 'Third Exor Flame'];
const BRANDS: Record<string, string> = {
  'Second Faith': 'First Faith Power',
  'Third Punish': 'First Faith Power',
  'Second Judgement': 'Judge',
  'Third Consecration': 'Judge',
  'Second Flame': 'Third Exor Flame',
  'Third Flame Bomb': 'Third Exor Flame',
};

/** An Inquisidor with exactly `aura` on (or none), and the "Requer:" text of each brand skill. */
function requirements(aura: string | null): Record<string, string> {
  const cls: any = new Inquisitor();
  const activeIds = (cls.activeSkills as ActiveSkillModel[]).map((a) => (a.name === aura ? 5 : 0));
  cls.setLearnSkills({ activeSkillIds: activeIds, passiveSkillIds: [] }).getSkillBonusAndName();

  const out: Record<string, string> = {};
  for (const name of Object.keys(BRANDS)) {
    const skill = (cls.atkSkills as AtkSkillModel[]).find((s) => s.name === name);
    out[name] = skill.verifyItemFn({} as any);
  }

  return out;
}

const NONE = Object.fromEntries(Object.keys(BRANDS).map((k) => [k, '']));

describe('Inquisidor — the three Auréolas', () => {
  it('are in the buff list, one at a time, under their pt-BR names', () => {
    const cls: any = new Inquisitor();
    const toggles = (cls.activeSkills as ActiveSkillModel[]).filter((a) => AURAS.includes(a.name));

    expect(toggles.map((a) => a.name)).toEqual(AURAS);
    for (const t of toggles) expect(t.exclusiveGroup).toBe('aura');
    expect([5246, 5247, 5254]).toEqual(AURAS.map((a) => SKILL_ID_BY_NAME[a]));
  });

  it('gate nothing while none is chosen', () => {
    expect(requirements(null)).toEqual(NONE);
  });

  it('Auréola das Chamas allows every brand skill', () => {
    expect(requirements('Third Exor Flame')).toEqual(NONE);
  });

  it('Auréola do Juiz leaves out the two flame skills', () => {
    expect(requirements('Judge')).toEqual({
      ...NONE,
      'Second Flame': 'Auréola das Chamas',
      'Third Flame Bomb': 'Auréola das Chamas',
    });
  });

  it('Auréola do Poder allows only Golpe Pantocrator and Soco Guilhotina', () => {
    expect(requirements('First Faith Power')).toEqual({
      'Second Faith': '',
      'Third Punish': '',
      'Second Judgement': 'Auréola do Juiz ou das Chamas',
      'Third Consecration': 'Auréola do Juiz ou das Chamas',
      'Second Flame': 'Auréola das Chamas',
      'Third Flame Bomb': 'Auréola das Chamas',
    });
  });

  it('leave the skills that need no aura alone', () => {
    const cls: any = new Inquisitor();
    for (const name of ['First Brand', 'Explosion Blaster', 'Massive Flame Blaster']) {
      expect((cls.atkSkills as AtkSkillModel[]).find((s) => s.name === name).verifyItemFn).toBeUndefined();
    }
  });
});
