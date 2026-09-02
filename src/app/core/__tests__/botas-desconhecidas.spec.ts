import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ImperialGuard, SuperNovice, Windhawk } from 'src/app/jobs';
import { createMainModel } from 'src/app/utils';
import { Calculator } from '../calculator';
import { CalculatorController } from '../calculator-controller';
import { ITEM_DB, wornBonus } from './worn-bonus';

/**
 * The six Botas Desconhecidas (470071-470077, there is no 470075).
 *
 * Reported by BeLL: "o proc bota desconhecida de sorte ta aumentando mais o dano que o
 * proc da bota desconhecida de FOR, inclusive em habilidades que nao critam."
 *
 * Two separate questions, and they get separate describes below.
 *
 * 1. Are the scripts faithful to the pt-BR description? Mostly — but the DES boot was
 *    encoding "SP máx. +10" per 3 refines as `sp: 3---3`.
 * 2. Is the SOR proc really stronger than the FOR one? On a ranged weapon, yes, and that
 *    is the renewal Status ATQ formula rather than a bug: it reads
 *    `floor(BaseLv/4 + secondary/5 + primary + SOR/3)`, and a ranged weapon makes DES the
 *    primary and demotes FOR to the /5 secondary. +175 FOR then buys 35 ATQ where +175 SOR
 *    buys 58. Swap in a melee weapon and it inverts, hard: FOR pays its full 175 into
 *    Status ATQ *and* feeds the weapon's own `baseWeaponAtk × FOR / 200` term, which SOR
 *    never touches.
 *
 * The companion capes and the [Bota Desconhecida] set combos live in
 * capa-desconhecida-set.spec.ts; this file is about the boots' own scripts.
 */

const BOOTS = {
  FOR: 470071,
  DES: 470072,
  VIT: 470073,
  INT: 470074,
  AGI: 470076,
  SOR: 470077,
} as const;

/** Zeroed-out target, so nothing but the boots moves the numbers. */
const INERT_MONSTER = {
  id: 1002, name: 'Poring', spawn: 'x',
  stats: {
    level: 1, health: 50, attack: { min: 7, max: 8 }, range: 1, defense: 0, magicDefense: 0,
    str: 1, int: 0, vit: 1, dex: 6, agi: 1, luk: 30, element: 1, elementName: 'Neutral 1',
    elementShortName: 'W1', race: 4, raceName: 'Plant', scale: 0, scaleName: 'Small', class: 0,
    criShield: 0, softDef: 0, mdef: 0, softMdef: 0, res: 0, mres: 0,
    hitRequireFor100: 182, fleeRequireFor95: 182,
  },
  data: { def: 0, mdef: 0, hitRequireFor100: 182, fleeRequireFor95: 182, criShield: 0, softDef: 0, res: 0, mres: 0 },
} as any;

const worn = (id: number, refine = 0, grade?: string) =>
  wornBonus({ boot: id, bootRefine: refine, bootGrade: grade, cls: new SuperNovice() });

const stat = (t: Record<string, number>, key: string) => t[key] ?? 0;

describe('Botas Desconhecidas — structural fields', () => {
  // "Tipo: Calçado · Nível do Equip.: 2 · Nível necessário: 230", one card slot, gradable.
  it.each(Object.entries(BOOTS))('%s is a level-230 gradable shoe with one slot', (_stat, id) => {
    const r = ITEM_DB[id];
    expect(r, `${id} missing from item.json`).toBeDefined();
    expect(r.itemTypeId).toBe(2);
    expect(r.itemSubTypeId).toBe(516); // Shoes
    expect(r.slots).toBe(1);
    expect(r.itemLevel).toBe(2);
    expect(r.requiredLevel).toBe(230);
    expect(r.canGrade).toBe(true);
  });

  it.each([
    ['FOR', BOOTS.FOR, 60, 70],
    ['DES', BOOTS.DES, 60, 70],
    ['VIT', BOOTS.VIT, 65, 75],
    ['INT', BOOTS.INT, 50, 65],
    ['AGI', BOOTS.AGI, 60, 70],
    ['SOR', BOOTS.SOR, 65, 72],
  ])('%s carries the DEF and weight the description prints', (_stat, id, defense, weight) => {
    expect(ITEM_DB[id].defense).toBe(defense);
    expect(ITEM_DB[id].weight).toBe(weight);
  });
});

describe('The per-refine scaling', () => {
  // "A cada 2 refinos: ATQ +15" — the VIT boot splits it into ATQ e ATQM +10, the INT one
  // is ATQM only. floor(refine / 2) steps.
  it.each([
    ['FOR', BOOTS.FOR, 15, 0],
    ['DES', BOOTS.DES, 15, 0],
    ['VIT', BOOTS.VIT, 10, 10],
    ['INT', BOOTS.INT, 0, 15],
    ['AGI', BOOTS.AGI, 15, 0],
    ['SOR', BOOTS.SOR, 15, 0],
  ])('%s: ATQ/ATQM every 2 refines', (_stat, id, atk, matk) => {
    expect(stat(worn(id, 9), 'atk')).toBe(atk * 4); // floor(9 / 2)
    expect(stat(worn(id, 9), 'matk')).toBe(matk * 4);
    expect(stat(worn(id, 1), 'atk')).toBe(0);
    expect(stat(worn(id, 1), 'matk')).toBe(0);
  });

  // "A cada 3 refinos: HP máx. +N. SP máx. +N." — floor(refine / 3) steps.
  it.each([
    ['FOR', BOOTS.FOR, 120, 8],
    ['DES', BOOTS.DES, 110, 10],
    ['VIT', BOOTS.VIT, 150, 15],
    ['INT', BOOTS.INT, 80, 20],
    ['AGI', BOOTS.AGI, 120, 8],
    ['SOR', BOOTS.SOR, 100, 8],
  ])('%s: HP and SP every 3 refines', (_stat, id, hp, sp) => {
    expect(stat(worn(id, 9), 'hp')).toBe(hp * 3);
    expect(stat(worn(id, 9), 'sp')).toBe(sp * 3);
    expect(stat(worn(id, 2), 'hp')).toBe(0);
    expect(stat(worn(id, 2), 'sp')).toBe(0);
  });

  it('INT also gains Efetividade de cura +2% every 2 refines', () => {
    expect(stat(worn(BOOTS.INT, 9), 'healPower')).toBe(8); // floor(9 / 2) * 2
    expect(stat(worn(BOOTS.INT, 1), 'healPower')).toBe(0);
  });

  it('is the only boot with the heal line', () => {
    for (const [name, id] of Object.entries(BOOTS)) {
      if (id === BOOTS.INT) continue;
      expect(stat(worn(id, 15), 'healPower'), name).toBe(0);
    }
  });
});

describe('The +9 clause', () => {
  it.each([
    ['FOR', BOOTS.FOR, { aspdPercent: 7 }],
    ['DES', BOOTS.DES, { aspdPercent: 7 }],
    ['VIT', BOOTS.VIT, { aspdPercent: 5, vct: 5 }],
    ['INT', BOOTS.INT, { vct: 7 }],
    ['AGI', BOOTS.AGI, { aspdPercent: 7 }],
    ['SOR', BOOTS.SOR, { aspdPercent: 7 }],
  ])('%s pays from +9, nothing at +8', (_stat, id, expected) => {
    const at8 = worn(id, 8);
    const at9 = worn(id, 9);
    for (const [key, value] of Object.entries(expected)) {
      expect(stat(at8, key), `${key} at +8`).toBe(0);
      expect(stat(at9, key), `${key} at +9`).toBe(value);
    }
  });
});

describe('The +13 clause', () => {
  it('FOR: Dano físico corpo a corpo +7%', () => {
    expect(stat(worn(BOOTS.FOR, 12), 'melee')).toBe(0);
    expect(stat(worn(BOOTS.FOR, 13), 'melee')).toBe(7);
  });

  it('DES: Conjuração fixa -0,5 segundos', () => {
    expect(stat(worn(BOOTS.DES, 12), 'fct')).toBe(0);
    expect(stat(worn(BOOTS.DES, 13), 'fct')).toBe(0.5);
  });

  it('VIT: Pós-conjuração -5%', () => {
    expect(stat(worn(BOOTS.VIT, 12), 'acd')).toBe(0);
    expect(stat(worn(BOOTS.VIT, 13), 'acd')).toBe(5);
  });

  it('INT: Dano mágico de todas as propriedades +7%', () => {
    expect(stat(worn(BOOTS.INT, 12), 'm_my_element_all')).toBe(0);
    expect(stat(worn(BOOTS.INT, 13), 'm_my_element_all')).toBe(7);
  });

  it('AGI: +4% melee and +4% ranged, not +7% of either', () => {
    expect(stat(worn(BOOTS.AGI, 12), 'melee')).toBe(0);
    expect(stat(worn(BOOTS.AGI, 13), 'melee')).toBe(4);
    expect(stat(worn(BOOTS.AGI, 13), 'range')).toBe(4);
  });

  it('SOR: CRÍT +7, Dano físico +7%, Dano crítico +7%', () => {
    const at12 = worn(BOOTS.SOR, 12);
    const at13 = worn(BOOTS.SOR, 13);
    for (const key of ['cri', 'atkPercent', 'criDmg']) {
      expect(stat(at12, key), `${key} at +12`).toBe(0);
      expect(stat(at13, key), `${key} at +13`).toBe(7);
    }
  });
});

/**
 * "Refino +11 ou mais: ... 5% de chance de ativar um [efeito] por 10 segundos", the effect
 * being +175 of the boot's own stat, with "+25 adicional" at Grau D and again at Grau C.
 * The grade tiers add, so a Grau C boot procs +225.
 */
describe('The +11 proc', () => {
  const procOf = (id: number, refine: number, grade?: string) => {
    const items = { [id]: { ...ITEM_DB[id], itemTypeId: 2, itemSubTypeId: 516 } };
    const cls = new SuperNovice();
    cls.setLearnSkills({ activeSkillIds: [], passiveSkillIds: [] }).getSkillBonusAndName();

    const calc = new Calculator()
      .setMasterItems(items as any)
      .setHpSpTable([{ jobs: {}, baseHp: Array(251).fill(1000), baseSp: Array(251).fill(100) }] as any)
      .setClass(cls)
      .setMonster(INERT_MONSTER);

    const model: any = createMainModel();
    model.level = 230;
    model.boot = id;
    model.bootRefine = refine;
    if (grade) model.bootGrade = grade;
    calc.loadItemFromModel(model).prepareAllItemBonus();

    return calc.chanceList.find((c) => c.itemId === id)?.bonus;
  };

  const STAT_KEY: [string, number, string][] = [
    ['FOR', BOOTS.FOR, 'str'],
    ['DES', BOOTS.DES, 'dex'],
    ['VIT', BOOTS.VIT, 'vit'],
    ['INT', BOOTS.INT, 'int'],
    ['AGI', BOOTS.AGI, 'agi'],
    ['SOR', BOOTS.SOR, 'luk'],
  ];

  it.each(STAT_KEY)('%s procs its own stat, +175 from +11 and nothing at +10', (_stat, id, key) => {
    expect(procOf(id, 10)).toBeUndefined();
    expect(procOf(id, 11)).toEqual({ [key]: 175 });
  });

  it.each(STAT_KEY)('%s: Grau D adds 25 and Grau C adds 25 more', (_stat, id, key) => {
    expect(procOf(id, 11, 'D')).toEqual({ [key]: 200 });
    expect(procOf(id, 11, 'C')).toEqual({ [key]: 225 });
  });
});

/**
 * BeLL's report, measured. The proc is a flat +175 of one stat and nothing else, so what it
 * is worth is entirely the Status ATQ formula's business — and that formula ranks FOR and
 * SOR differently depending on the weapon's range type.
 */
describe('FOR proc vs SOR proc', () => {
  const BOW = 700016; // Sharpbolt Booster Bow
  const ARROW = 1773; // steel arrow
  const SPEAR = 630028; // Muqaddas Banjiiraa, twohandSpear

  /**
   * How much basic-attack damage the boot's proc adds. Basic attack on purpose: no skill's
   * own melee/ranged flag can colour the comparison, only the weapon's range type does.
   */
  const procGain = (bootId: number, weapon: number, ammo?: number) => {
    const items: any = { [weapon]: { ...ITEM_DB[weapon] }, [bootId]: { ...ITEM_DB[bootId] } };
    if (ammo) items[ammo] = { ...ITEM_DB[ammo] };

    const solveOnce = (selectedChances: string[]) => {
      const cls = new Windhawk();
      const { equipAtks, masteryAtks, activeSkillNames, learnedSkillMap } = cls
        .setLearnSkills({ activeSkillIds: [], passiveSkillIds: [] })
        .getSkillBonusAndName();

      const calc = new Calculator()
        .setMasterItems(items)
        .setHpSpTable([{ jobs: { [cls.className]: true }, baseHp: Array(251).fill(100000), baseSp: Array(251).fill(10000) }] as any)
        .setClass(cls)
        .setMonster(INERT_MONSTER);

      const model: any = createMainModel();
      model.class = 4257;
      model.level = 250;
      model.jobLevel = 50;
      model.str = 100; model.agi = 1; model.vit = 1; model.int = 1; model.dex = 100; model.luk = 100;
      model.weapon = weapon;
      model.weaponRefine = 11;
      if (ammo) model.ammo = ammo;
      model.boot = bootId;
      model.bootRefine = 11;

      calc.loadItemFromModel(model);
      new CalculatorController().runChain(calc, {
        monster: INERT_MONSTER, equipAtks, masteryAtks, buffEquips: {}, buffMasterys: {},
        consumeData: [], aspdPotion: 0, extraOptionScripts: [], activeSkillNames, learnedSkillMap,
        selectedAtkSkill: '', selectedChances, usedHpL: false,
      } as any);

      return calc;
    };

    const name = solveOnce([]).chanceList[0].name;
    const dmg = solveOnce([name]).getTotalSummary().dmg;

    return dmg.effectedBasicDamageMax - dmg.basicMaxDamage;
  };

  it('ranks FOR far above SOR on a melee weapon', () => {
    // FOR pays into Status ATQ 1:1 and into the weapon's own stat term; SOR only reaches
    // Status ATQ, and only at floor(SOR / 3).
    expect(procGain(BOOTS.FOR, SPEAR)).toBeGreaterThan(procGain(BOOTS.SOR, SPEAR) * 3);
  });

  it('ranks SOR above FOR on a ranged weapon — floor(175/3) beats floor(175/5)', () => {
    // Not a bug, and the reason BeLL sees it: with a bow the primary stat is DES, so FOR is
    // demoted to the /5 secondary slot and stops feeding the weapon stat term at all.
    const str = procGain(BOOTS.FOR, BOW, ARROW);
    const luk = procGain(BOOTS.SOR, BOW, ARROW);
    expect(luk).toBeGreaterThan(str);
    // 58 ATQ against 35 — the whole of the difference, and no crit anywhere in it.
    expect(luk / str).toBeCloseTo(58 / 35, 1);
  });

  it('AGI procs nothing into damage at all — AGI is not in the ATQ formula', () => {
    expect(procGain(BOOTS.AGI, SPEAR)).toBe(0);
    expect(procGain(BOOTS.AGI, BOW, ARROW)).toBe(0);
  });
});

/**
 * The build BeLL shared (short.latam-tools.com.br/9bTM5J), asked a second time as "SOR
 * seems to be impacting too much on the damage": Guardião Imperial 230/47, Claymore-OSAD,
 * Lança do Destino 5, FOR 130 / DES 130 / SOR 1 / POD 100, the two boots at +11 in a
 * compare slot. Nothing else equipped, so the boots are the only thing moving.
 *
 * The SOR proc is worth about +6% there, and the arithmetic below is the whole of it:
 * SOR pays `floor(SOR/3)` into ATQ Status, and the skill formula counts ATQ Status twice
 * (`getStatusAtk() * 2` in calcTotalAtk), so +175 SOR is 2 x 58 = 116 ATQ on a pool of
 * 1931 — 6,0%. bROWiki's Atributos page states the term outright: "Cada 3 pontos em SOR
 * oferecem ... Ataque físico base +1".
 *
 * It reaches damage through that one channel and no other. SOR also buys +58 ATQM and
 * lifts Crítico from 14% to 67% on the panel, and neither touches Lança do Destino: the
 * skill is physical and cannot crit. The FOR proc on the same build is worth six times
 * more, because FOR is the primary stat here (1:1 into ATQ Status, so 2 x 175) *and* buys
 * "Ataque físico influenciado pela arma equipada +0,5%" per point, which SOR has no
 * equivalent for.
 */
describe('BeLL\'s Guardião Imperial build', () => {
  const CLAYMORE_OSAD = 600028;
  const DUMMY_ID = 21067;

  const monsters = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));
  const dummy = {
    id: DUMMY_ID,
    name: monsters[DUMMY_ID].name,
    spawn: 'x',
    stats: { ...monsters[DUMMY_ID].stats },
    data: monsters[DUMMY_ID].data,
  } as any;

  /**
   * The shared build with one boot on. `procOn` ticks the boot's Efeito; `baseStats`
   * instead raises an allocated stat, which is how the same +175 gets measured on the
   * traced (non-effected) pass — the trace only ever records the base solve.
   */
  const solve = (bootId: number, opts: { procOn?: boolean; baseStats?: Record<string, number> } = {}) => {
    const items: any = { [CLAYMORE_OSAD]: { ...ITEM_DB[CLAYMORE_OSAD] }, [bootId]: { ...ITEM_DB[bootId] } };
    const cls = new ImperialGuard();
    const { equipAtks, masteryAtks, activeSkillNames, learnedSkillMap } = cls
      .setLearnSkills({ activeSkillIds: [], passiveSkillIds: [] })
      .getSkillBonusAndName();

    const calc = new Calculator()
      .setMasterItems(items)
      .setHpSpTable([{ jobs: { [cls.className]: true }, baseHp: Array(251).fill(40000), baseSp: Array(251).fill(2500) }] as any)
      .setClass(cls)
      .setMonster(dummy);

    const model: any = createMainModel();
    Object.assign(model, {
      class: 4258, level: 230, jobLevel: 47,
      str: 130, jobStr: 9, agi: 1, jobAgi: 3, vit: 1, jobVit: 9,
      int: 1, jobInt: 10, dex: 130, jobDex: 9, luk: 1, jobLuk: 3,
      pow: 100, jobPow: 5, jobSta: 6, jobWis: 5, jobSpl: 7, jobCon: 2, jobCrt: 3,
      weapon: CLAYMORE_OSAD, boot: bootId, bootRefine: 11,
      selectedAtkSkill: 'Over Brand==5',
    }, opts.baseStats ?? {});

    calc.loadItemFromModel(model);
    new CalculatorController().runChain(calc, {
      monster: dummy, equipAtks, masteryAtks, buffEquips: {}, buffMasterys: {},
      consumeData: [], aspdPotion: 0, extraOptionScripts: [], activeSkillNames, learnedSkillMap,
      selectedAtkSkill: 'Over Brand==5',
      selectedChances: opts.procOn ? [ITEM_DB[bootId].name] : [],
      usedHpL: false,
    } as any);

    return calc;
  };

  /** The "ATQ" row of the per-hit formula — everything that feeds the skill ratio. */
  const totalAtk = (calc: Calculator) => {
    const trace = (calc.getTotalSummary().dmg as any).skillFormulaTrace.min as { label: string; value: number }[];

    return trace[0].value;
  };

  /** Damage with the boot's Efeito off, and the same build with it on. */
  const damage = (bootId: number) => {
    const dmg = solve(bootId, { procOn: true }).getTotalSummary().dmg;

    return { off: dmg.skillMinDamage, on: dmg.effectedSkillDamageMin };
  };

  it('the skill cannot crit, so SOR\'s crit half never reaches it', () => {
    expect(solve(BOOTS.SOR, { procOn: true }).getTotalSummary().dmg.skillCriRateToMonster).toBe(0);
  });

  it('SOR\'s whole contribution is floor(175/3) of ATQ Status, counted twice', () => {
    const off = totalAtk(solve(BOOTS.SOR));
    const on = totalAtk(solve(BOOTS.SOR, { baseStats: { luk: 1 + 175 } }));

    expect(on - off).toBe(2 * Math.floor(175 / 3)); // 116, on a pool of 1931
  });

  it('the proc pays exactly what the same +175 of allocated SOR pays', () => {
    const viaProc = damage(BOOTS.SOR);
    const viaStat = solve(BOOTS.SOR, { baseStats: { luk: 1 + 175 } }).getTotalSummary().dmg;

    expect(viaProc.on).toBe(viaStat.skillMinDamage);
  });

  it('which is about +6% of damage, not more', () => {
    const { off, on } = damage(BOOTS.SOR);
    expect(on / off).toBeCloseTo(1.06, 2);
  });

  it('FOR on the same build is worth six times as much', () => {
    const sor = damage(BOOTS.SOR);
    const forr = damage(BOOTS.FOR);

    expect(forr.off).toBe(sor.off); // at +11 the two boots are identical without the proc
    expect(forr.on - forr.off).toBeGreaterThan((sor.on - sor.off) * 6);
  });
});
