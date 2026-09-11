import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { decodeReplay } from 'rrfparser';
import { Calculator } from 'src/app/core/calculator';
import { CalculatorController } from 'src/app/core/calculator-controller';
import { parseOptionScripts } from 'src/app/core/option-scripts';
import { SKILL_ID_BY_NAME } from 'src/app/skills';
import { loadReplayFixture } from 'src/app/replay/__tests__/load-fixture';
import { replayToModel } from 'src/app/replay/replay-to-model';
import { Biolo } from './Biolo';

/**
 * Two Cientista recordings of Canhão de Prótons. Biolo inherits the skill from Genetic
 * unchanged, and the formula itself is settled next door in
 * `Genetic.cart-cannon-gear-states.spec.ts`, which reproduces a gearless Bioquímico to the
 * unit. What these two add is the one number nobody has: **what Pyroclastic is worth**.
 *
 *   `bio-cart-cannon-two-sizes.rrf`  "Musty LTDA" 212/35, card cVfBmHUQzf, anonymous.
 *   `bio-pyroclastic.rrf`            "Alquimiro"  230/48, card uoyYvxyRYP, by Dijey.
 *
 * Both carry Cultivar Bárbaro, so every packet is `count` 2 and divides by two (review
 * skill §5), and both carry Pyroclastic (EFST 607) over every packet — which is why the
 * first file reads as 39% short until the buff is priced in, and is not a formula problem
 * at all.
 *
 * Neither file carries the six traits: a Cientista is a 4th class, so they exist and the
 * dialog collected them by hand, which makes the card's values a person's typing rather
 * than the game's own report (review skill §2).
 */

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const monsters = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));
const hpSpTable = JSON.parse(readFileSync('src/assets/demo/data/hp_sp_table.json', 'utf8'));

const CART_CANNON = 2477;
const EFST_CART_BOOST = 461;
const EFST_PYROCLASTIC = 607;

function load(name: string) {
  const replay: any = decodeReplay(loadReplayFixture(name));
  const aid = replay.sessionInfo.aid;
  return {
    replay,
    /** Canhão de Prótons packets the recorder itself produced, grouped by target entity. */
    porAlvo(): Map<number, number[]> {
      const out = new Map<number, number[]>();
      for (const d of replay.damage ?? []) {
        if (d.source !== aid || d.skillId !== CART_CANNON) continue;
        if (!out.has(d.target)) out.set(d.target, []);
        out.get(d.target)!.push(d.damage);
      }
      return out;
    },
    /** One of the recorder's own status toggles, as [time, isOn] pairs. */
    efst(id: number): [number, boolean][] {
      return (replay.statusEvents ?? [])
        .filter((s: any) => s.aid === aid && s.statusId === id)
        .map((s: any) => [Number(s.time), s.isOn] as [number, boolean]);
    },
    /** A ZC_PAR_CHANGE series. The decoder hands these back as BigInt. */
    paramOf(sp: number, at?: number): number[] {
      return (replay.paramChanges ?? [])
        .filter((p: any) => p.type === sp && (at === undefined || Number(p.time) === at))
        .map((p: any) => Number(p.value));
    },
  };
}

/** `equipAtkBonus` stands in for a buff the picker cannot express, in ATQ Equip. */
function sim(
  replay: any,
  traits: Record<string, number>,
  mob: string,
  actives: Record<string, number>,
  equipAtkBonus = 0,
) {
  const m = replayToModel(replay, items).model as any;
  Object.assign(m, traits);
  const cls: any = new Biolo();
  const b = cls.getJobBonusStatus(m.jobLevel);
  Object.assign(m, {
    jobStr: b.str, jobAgi: b.agi, jobVit: b.vit, jobInt: b.int, jobDex: b.dex, jobLuk: b.luk,
    jobPow: b.pow, jobSta: b.sta, jobWis: b.wis, jobSpl: b.spl, jobCon: b.con, jobCrt: b.crt,
  });

  const learned: Record<number, number> = {};
  for (const [id, lv] of replay.learnedSkills) learned[id] = lv;
  const passiveIds = cls.passiveSkills.map((p: any) => {
    const sid = SKILL_ID_BY_NAME[p.name];
    return sid ? learned[sid] ?? 0 : 0;
  });
  const activeIds = cls.activeSkills.map((a: any) => actives[a.name] ?? 0);
  const { equipAtks, masteryAtks, activeSkillNames, learnedSkillMap } = cls
    .setLearnSkills({ activeSkillIds: activeIds, passiveSkillIds: passiveIds })
    .getSkillBonusAndName();

  const value = 'Cart Cannon==5';
  m.selectedAtkSkill = value;
  const calc = new Calculator().setMasterItems(items).setHpSpTable(hpSpTable).setClass(cls);
  calc.loadItemFromModel(m);
  const scripts = parseOptionScripts((m.rawOptionTxts ?? []).filter(Boolean));
  if (equipAtkBonus) scripts.push({ atk: equipAtkBonus } as any);
  new CalculatorController().runChain(calc, {
    monster: monsters[mob], equipAtks, masteryAtks, buffEquips: {}, buffMasterys: {},
    consumeData: [], aspdPotion: undefined, extraOptionScripts: scripts,
    activeSkillNames, learnedSkillMap, selectedAtkSkill: value, selectedChances: [], usedHpL: false,
  } as any);

  const ds: any = (calc as any).damageSummary;
  const tot: any = calc.getTotalSummary();
  return {
    hits: ds.skillTotalHit as number,
    sizePenalty: ds.skillSizePenalty as number,
    equipAtk: ((tot.weapon?.baseWeaponAtk ?? 0) + (tot.weapon?.refineBonus ?? 0) + tot.calc.totalEquipAtk) as number,
    atkStatus: tot.calc.totalStatusAtk as number,
    min: ds.skillMinDamage as number,
    max: ds.skillMaxDamage as number,
  };
}

/** Pyroclastic's measured worth in each file, in ATQ Equip. — see the tests below. */
const PYROCLASTIC_ALQUIMIRO = 431;
const PYROCLASTIC_MUSTY = 417;

describe('Cientista — Pyroclastic vale muito mais do que qualquer fonte diz', () => {
  /**
   * `bio-pyroclastic.rrf` is the clean measurement: the buff is recast at t=21.400 and the
   * client re-sends ATQ Equip. on both sides of the recast, 1.005 without and 1.436 with.
   * The engine reproduces the unbuffed 1.005 exactly, so the difference is the buff alone.
   */
  it('mede 431 de ATQ Equip. na gravação do Alquimiro', () => {
    const f = load('bio-pyroclastic.rrf');
    expect(f.efst(EFST_PYROCLASTIC)).toEqual([[0, true], [21400, false], [21400, true]]);
    expect(f.paramOf(42, 21400)).toEqual([1005, 1436]);
    expect(1436 - 1005).toBe(PYROCLASTIC_ALQUIMIRO);

    const traits = { pow: 100, sta: 0, wis: 0, spl: 0, con: 20, crt: 0 }; // do card
    expect(sim(f.replay, traits, '21077', { _Biolo_Monster_List: 2 }).equipAtk).toBe(1005);
  });

  /**
   * `bio-cart-cannon-two-sizes.rrf` measures it a second time, from the other side: its
   * only ATQ Equip. reading is sent at t=6.076, the millisecond Pyroclastic comes on, so
   * 1.075 is the buffed figure and the engine's unbuffed build is the other half.
   */
  it('mede 417 de ATQ Equip. na gravação do Musty LTDA', () => {
    const f = load('bio-cart-cannon-two-sizes.rrf');
    expect(f.efst(EFST_PYROCLASTIC)).toEqual([[6076, true]]);
    expect(f.paramOf(42)).toEqual([1075]);

    const traits = { pow: 51, sta: 0, wis: 0, spl: 0, con: 0, crt: 0 }; // do card
    const s = sim(f.replay, traits, '21065', { _Biolo_Monster_List: 2, 'Cart Boost': 5 });
    expect(s.equipAtk).toBe(1075 - PYROCLASTIC_MUSTY);
  });

  /**
   * OPEN. 431 and 417 are both far outside anything on record: the calculator's own picker
   * tops out at +300, and rAthena computes `100 + 10 x nível` — 150 at the skill's maximum
   * — under an explicit `!TODO: Confirm formula`. So the magnitude is not known anywhere,
   * and these two readings are the first measurements of it.
   *
   * Two points are not a formula. What they do rule out is the easy shapes: the buff is
   * **not flat** (431 != 417) and **not a share of ATQ Equip.** (the two builds sit at
   * 1.005 and 658, one and a half times apart, while the bonus moves by 3%). The two
   * characters differ in base level (230 / 212), job level (48 / 35), weapon and
   * homunculus, and the homunculus level is the one candidate the recordings cannot read —
   * the client sends it for one of the two and not the other.
   *
   * What settles it is the same character recasting the buff after a **weapon swap**: that
   * holds every other variable still and separates a flat grant from a proportional one.
   * Until then the picker is a guess in both directions.
   */
  it('não cabe em nenhuma fórmula conhecida', () => {
    const picker = (new Biolo() as any).activeSkills.find((a: any) => a.name === 'Pyroclastic');
    const tetoDoPicker = Math.max(...picker.dropdown.map((d: any) => d.bonus?.atk ?? 0));
    expect(tetoDoPicker).toBe(300);

    expect(PYROCLASTIC_ALQUIMIRO).toBeGreaterThan(tetoDoPicker);
    expect(PYROCLASTIC_MUSTY).toBeGreaterThan(tetoDoPicker);
    expect(PYROCLASTIC_ALQUIMIRO).not.toBe(PYROCLASTIC_MUSTY); // não é fixo
  });
});

describe('Cientista — Canhão de Prótons contra Médio e Pequeno (cVfBmHUQzf)', () => {
  const f = load('bio-cart-cannon-two-sizes.rrf');
  const TRAITS = { pow: 51, sta: 0, wis: 0, spl: 0, con: 0, crt: 0 }; // do card
  const ACTIVES = { _Biolo_Monster_List: 2, 'Cart Boost': 5 };
  const MEDIO = 4380;
  const PEQUENO = 4377;
  const MOB: Record<number, string> = { [MEDIO]: '21065', [PEQUENO]: '21064' };

  it('acerta um Médio e um Pequeno com segundos de diferença, com a mesma build', () => {
    const alvos = f.porAlvo();
    expect([...alvos.keys()].sort((a, b) => a - b)).toEqual([PEQUENO, MEDIO].sort((a, b) => a - b));
    expect([alvos.get(MEDIO)!.length, alvos.get(PEQUENO)!.length]).toEqual([4, 3]);
    expect(f.efst(EFST_CART_BOOST)).toEqual([[0, true], [2585, false], [2585, true]]);
  });

  /**
   * With Pyroclastic priced at the 417 the file itself reports, every packet on both
   * dummies falls inside the simulated roll — which is what says the shortfall was the buff
   * and nothing else, and is the closest thing this class has to a validation.
   *
   * It also checks the size table from the damage side: Espada de Uma Mão takes 75% against
   * Pequeno and nothing against Médio, and the same build covers both. Had either cell been
   * wrong, one of the two would have fallen outside.
   */
  it('cobre os dois tamanhos quando Pyroclastic entra pelo valor medido', () => {
    for (const [alvo, penalidade] of [[MEDIO, 100], [PEQUENO, 75]] as [number, number][]) {
      const s = sim(f.replay, TRAITS, MOB[alvo], ACTIVES, PYROCLASTIC_MUSTY);
      expect(s.hits).toBe(2); // Cultivar Bárbaro dobra o pacote
      expect(s.sizePenalty).toBe(penalidade);

      for (const pacote of f.porAlvo().get(alvo)!) {
        expect(pacote / s.hits).toBeGreaterThanOrEqual(s.min);
        expect(pacote / s.hits).toBeLessThanOrEqual(s.max);
      }
    }
  });

  /**
   * And the guard that makes the test above mean something: without the buff the engine is
   * roughly 39% short on both dummies, so "covers" is not something any build would pass.
   */
  it('sem o buff, o motor fica ~39% abaixo nos dois alvos', () => {
    for (const alvo of [MEDIO, PEQUENO]) {
      const s = sim(f.replay, TRAITS, MOB[alvo], ACTIVES);
      const pacotes = f.porAlvo().get(alvo)!.map((d) => d / s.hits);
      const media = pacotes.reduce((a, b) => a + b, 0) / pacotes.length;
      expect(media / ((s.min + s.max) / 2)).toBeGreaterThan(1.38);
    }
  });
});

describe('Cientista — o que a gravação do Alquimiro ainda deixa aberto (uoyYvxyRYP)', () => {
  const f = load('bio-pyroclastic.rrf');
  const TRAITS = { pow: 100, sta: 0, wis: 0, spl: 0, con: 20, crt: 0 }; // do card

  /**
   * OPEN. The hand-typed POD 100 does not reproduce the recorded ATQ: the window reports
   * 845 and the engine builds 813. No whole value of POD closes it either — the trait pays
   * 5 ATQ per point, so it would need 106,4 — which puts the shortfall on the stat side
   * rather than the trait, and leaves the card's numbers unconfirmed.
   *
   * Unlike the file above, this one cannot be rescued by pricing Pyroclastic in: the buff
   * is up before the recording starts and is only ever recast, so there is no unbuffed
   * damage window to compare against.
   */
  it('fixa a diferença de ATQ que os talentos do card deixam em aberto', () => {
    expect(f.paramOf(41)).toEqual([845, 885, 845]);
    expect(sim(f.replay, TRAITS, '21077', { _Biolo_Monster_List: 2 }).atkStatus).toBe(813);
  });
});
