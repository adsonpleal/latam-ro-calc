import { describe, expect, it } from 'vitest';
import { Calculator } from './calculator';
import {
  applyGuaranaCandy,
  BuffDef,
  CalcChainInput,
  CalculatorController,
  collectAspdPotionSources,
  collectBuffBonuses,
  collectConsumables,
  GUARANA_CANDY,
} from './calculator-controller';

const items = {
  100: { script: 'a' },
  101: { script: 'b' },
  200: { script: 'c' },
  12791: { script: 'regular-pill' },
  12792: { script: 'superior-pill' },
  12424: { script: 'hp-l' },
} as Record<number, { script?: any }>;

describe('collectConsumables', () => {
  it('flattens consumables, secondary consumables and aspd potions into scripts', () => {
    const sel = collectConsumables({ consumables: [100], consumables2: [101], aspdPotions: [200] }, items);
    expect(sel.scripts).toEqual(['a', 'b', 'c']);
  });

  it('flags HP Increase Potion (L)', () => {
    expect(collectConsumables({ consumables: [12424], consumables2: [], aspdPotions: [] }, items).usedHpL).toBe(true);
    expect(collectConsumables({ consumables: [100], consumables2: [], aspdPotions: [] }, items).usedHpL).toBe(false);
  });

  it('suppresses the regular Battle Pill when the Superior one is active', () => {
    const sel = collectConsumables({ consumables: [12792, 12791], consumables2: [], aspdPotions: [] }, items);
    expect(sel.usedSupBattlePill).toBe(true);
    expect(sel.scripts).toEqual(['superior-pill']); // regular (12791) dropped
  });

  it('keeps both pills when only the regular Battle Pill is active', () => {
    const sel = collectConsumables({ consumables: [12791], consumables2: [], aspdPotions: [] }, items);
    expect(sel.usedSupBattlePill).toBe(false);
    expect(sel.scripts).toEqual(['regular-pill']);
  });

  it('ignores falsy ids and tolerates missing arrays', () => {
    const sel = collectConsumables({ consumables: [0, 100] as any, consumables2: undefined as any, aspdPotions: undefined as any }, items);
    expect(sel.scripts).toEqual(['a']);
  });

  describe('per-consumable breakdown sources', () => {
    const numericItems = {
      500: { script: { agi: ['7'], aspdPercent: ['5'] } },
      501: { script: { atk: ['30'], hpPercent: ['-3'] } },
      502: { script: {} },
      503: { script: { atk: ['EQUIP_ID[1]10'] } },
      12791: { script: { matkPercent: ['5'] } },
      12792: { script: { matkPercent: ['10'] } },
    } as Record<number, { script?: any }>;

    it('exposes each consumable as a `consumable_<id>` numeric map', () => {
      const sel = collectConsumables({ consumables: [500], consumables2: [501], aspdPotions: [] }, numericItems);
      expect(sel.sources).toEqual({
        consumable_500: { agi: 7, aspdPercent: 5 },
        consumable_501: { atk: 30, hpPercent: -3 },
      });
    });

    it('skips empty scripts and non-numeric entries', () => {
      const sel = collectConsumables({ consumables: [502, 503], consumables2: [], aspdPotions: [] }, numericItems);
      expect(sel.sources).toEqual({});
    });

    it('applies the Superior Battle Pill suppression to sources too', () => {
      const sel = collectConsumables({ consumables: [12792, 12791], consumables2: [], aspdPotions: [] }, numericItems);
      expect(sel.sources).toEqual({ consumable_12792: { matkPercent: 10 } });
    });
  });
});

describe('collectAspdPotionSources', () => {
  // Concentração 4, Despertar 6, Fúria 9, Poção de Ouro 3
  const fixBonus = new Map([[645, 4], [656, 6], [657, 9], [12684, 3]]);

  it('exposes the single-select potion as its AGI-scaled aspd, keyed consumable_<id>', () => {
    // AGI 200 → × AGI/200 = ×1, so the scaled value equals the nominal bonus.
    const { sources } = collectAspdPotionSources({ aspdPotion: 656, aspdPotions: [] }, fixBonus, 200);
    expect(sources).toEqual({ consumable_656: { aspd: 6 } });
  });

  it('scales the potion aspd by AGI/200 (with a formula tooltip)', () => {
    const { sources, tooltips } = collectAspdPotionSources({ aspdPotion: 656, aspdPotions: [] }, fixBonus, 100);
    expect(sources).toEqual({ consumable_656: { aspd: 3 } }); // 6 × 100/200 = 3
    expect(tooltips.consumable_656).toContain('6 × AGI 100 ÷ 200 ≈ 3');
  });

  it('includes multi-select potions and ignores ids without a fixed bonus', () => {
    const { sources } = collectAspdPotionSources({ aspdPotion: 645, aspdPotions: [12684, 12437] }, fixBonus, 200);
    expect(sources).toEqual({ consumable_645: { aspd: 4 }, consumable_12684: { aspd: 3 } });
  });

  it('is empty when nothing is selected', () => {
    expect(collectAspdPotionSources({ aspdPotion: undefined, aspdPotions: [] }, fixBonus, 200).sources).toEqual({});
  });
});

describe('collectBuffBonuses', () => {
  const defs: BuffDef[] = [
    { name: 'Blessing', dropdown: [{ value: 1, isUse: true, bonus: { str: 10 } }] },
    { name: 'WeaponMastery', isMasteryAtk: true, dropdown: [{ value: 2, isUse: true, bonus: { atk: 20 } }] },
    { name: 'Unused', dropdown: [{ value: 0, isUse: false, bonus: { x: 1 } }] },
  ];

  it('splits selected buffs into equip vs mastery bonus maps', () => {
    const { equipAtk, masteryAtk } = collectBuffBonuses(defs, [1, 2, 0], new Set());
    expect(equipAtk).toEqual({ Blessing: { str: 10 } });
    expect(masteryAtk).toEqual({ WeaponMastery: { atk: 20 } });
  });

  it('skips buffs the character already casts as an active skill', () => {
    const { equipAtk } = collectBuffBonuses(defs, [1, 2, 0], new Set(['Blessing']));
    expect(equipAtk).toEqual({});
  });

  it('skips dropdown values not marked isUse, or with no matching selection', () => {
    expect(collectBuffBonuses(defs, [0, 0, 0], new Set())).toEqual({ equipAtk: {}, masteryAtk: {} });
    expect(collectBuffBonuses(defs, [99, 99, 99], new Set())).toEqual({ equipAtk: {}, masteryAtk: {} });
  });
});

describe('applyGuaranaCandy', () => {
  const AWAKENING_POTION = 656;
  const incAgiDefs: BuffDef[] = [
    {
      name: 'Cantocandidus',
      dropdown: [
        { value: 0, isUse: false },
        { value: 3, isUse: true, bonus: { agi: 5, aspdPercent: 3 } },
        { value: 10, isUse: true, bonus: { agi: 12, aspdPercent: 10 } },
      ],
    },
  ];
  const base = (over: Partial<Parameters<typeof applyGuaranaCandy>[0]> = {}) =>
    applyGuaranaCandy({
      consumables: [GUARANA_CANDY],
      aspdPotion: undefined,
      buffDefs: incAgiDefs,
      selectedBuffValues: [0],
      activeSkillNames: new Set<string>(),
      buffBonuses: { equipAtk: {}, masteryAtk: {} },
      ...over,
    });

  it('does nothing when the candy is not consumed', () => {
    const buffBonuses = { equipAtk: {}, masteryAtk: {} };
    const out = base({ consumables: [], buffBonuses });
    expect(out.aspdPotion).toBeUndefined();
    expect(out.buffBonuses).toBe(buffBonuses);
  });

  it('grants the Concentration Potion effect when no ASPD potion is selected', () => {
    expect(base().aspdPotion).toBe(645);
  });

  it('lets a selected ASPD potion replace the Concentration part', () => {
    expect(base({ aspdPotion: AWAKENING_POTION }).aspdPotion).toBe(AWAKENING_POTION);
  });

  it('applies Increase Agility Lv 5 when no (or a lower) buff level is selected', () => {
    expect(base().buffBonuses.equipAtk).toEqual({ Cantocandidus: { agi: 7, aspdPercent: 5 } });

    // Lv 3 selected → replaced (not stacked) by the candy's Lv 5
    const lv3 = base({ selectedBuffValues: [3], buffBonuses: { equipAtk: { Cantocandidus: { agi: 5, aspdPercent: 3 } }, masteryAtk: {} } });
    expect(lv3.buffBonuses.equipAtk).toEqual({ Cantocandidus: { agi: 7, aspdPercent: 5 } });
  });

  it('yields to a higher-level Increase Agility buff', () => {
    const lv10Bonuses = { equipAtk: { Cantocandidus: { agi: 12, aspdPercent: 10 } }, masteryAtk: {} };
    const out = base({ selectedBuffValues: [10], buffBonuses: lv10Bonuses });
    expect(out.buffBonuses).toBe(lv10Bonuses);
    expect(out.aspdPotion).toBe(645); // Concentration part still applies
  });

  it('yields when the character casts Increase Agility itself', () => {
    const buffBonuses = { equipAtk: {}, masteryAtk: {} };
    const out = base({ activeSkillNames: new Set(['Cantocandidus']), buffBonuses });
    expect(out.buffBonuses).toBe(buffBonuses);
  });
});

// A recording stand-in for the engine: every method returns the spy and logs
// the call, so we can assert the controller drives the pipeline correctly
// without standing up the real Calculator.
function makeCalcSpy() {
  const calls: { method: string; args: any[] }[] = [];
  const spy: any = new Proxy(
    {},
    {
      get(_t, prop: string) {
        return (...args: any[]) => {
          calls.push({ method: prop, args });
          return spy;
        };
      },
    },
  );
  return { spy: spy as Calculator, calls };
}

describe('CalculatorController.runChain', () => {
  const input: CalcChainInput = {
    monster: { id: 1002 } as any,
    equipAtks: { e: 1 },
    masteryAtks: { m: 1 },
    buffEquips: { be: 1 },
    buffMasterys: { bm: 1 },
    consumeData: ['s'],
    aspdPotion: 'pot',
    extraOptionScripts: ['opt'],
    activeSkillNames: new Set(['Skill']),
    learnedSkillMap: new Map([['Skill', 5]]),
    selectedAtkSkill: 'Cross Impact',
    selectedChances: { crit: 1 },
    usedHpL: true,
  };

  it('drives the full solve pipeline in order and returns the calculator', () => {
    const { spy, calls } = makeCalcSpy();
    const result = new CalculatorController().runChain(spy, input);

    expect(result).toBe(spy);
    expect(calls.map((c) => c.method)).toEqual([
      'setMonster',
      'setEquipAtkSkillAtk',
      'setBuffBonus',
      'setMasterySkillAtk',
      'setConsumables',
      'setAspdPotion',
      'setExtraOptions',
      'setUsedSkillNames',
      'setLearnedSkills',
      'setOffensiveSkill',
      'prepareAllItemBonus',
      'calcAllAtk',
      'setSelectedChances',
      'calcAllDefs',
      'calculateHpSp',
      'calculateAllDamages',
    ]);
  });

  it('passes the key inputs to the right pipeline steps', () => {
    const { spy, calls } = makeCalcSpy();
    new CalculatorController().runChain(spy, input);
    const arg = (method: string) => calls.find((c) => c.method === method)!.args[0];

    expect(arg('setMonster')).toBe(input.monster);
    expect(arg('setBuffBonus')).toEqual({ masteryAtk: input.buffMasterys, equipAtk: input.buffEquips });
    expect(arg('setConsumables')).toBe(input.consumeData);
    expect(arg('calculateHpSp')).toEqual({ isUseHpL: true });
    expect(arg('calculateAllDamages')).toBe(input.selectedAtkSkill);
  });
});
