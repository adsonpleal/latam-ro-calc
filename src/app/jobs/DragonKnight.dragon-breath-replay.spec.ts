import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { decodeReplay } from 'rrfparser';
import { Calculator } from 'src/app/core/calculator';
import { CalculatorController } from 'src/app/core/calculator-controller';
import { parseOptionScripts } from 'src/app/core/option-scripts';
import { loadReplayFixture } from 'src/app/replay/__tests__/load-fixture';
import { replayToModel } from 'src/app/replay/replay-to-model';
import { SKILL_ID_BY_NAME } from 'src/app/skills';
import { DragonKnight } from './DragonKnight';

/**
 * `dk-water-breath-gear-states.rrf` — "Ban -", Cavaleiro Draconiano base 246 / job 50 on
 * tra_fild, 14/09/2026, sent by the author as "teste sopro dk". Seven Bafo do Dragão Nv 10
 * casts on the Dummy - Neutro (21077): three bare-handed at 256.897, then the character
 * gears up on camera and casts four more at 6.913.590. Every packet repeats exactly — the
 * breath has no weapon roll — so both states are exact equations.
 *
 * The recording carries only POD among the traits (a single-map session); POD 100 and
 * CON 26 are the recorder's own, and the status window agrees with them.
 *
 * What the file settled, in the order it was found:
 *
 *  - **Item bonuses never reached the breaths.** The post-DEF stage read
 *    `totalBonus['Dragon Breath - WATER']`, a name key only the Aura toggle wrote, while
 *    every item keys "Dano de [Bafo do Dragão]" by id ("5004"). The build's 228% was
 *    dropped whole, and the geared state simulated at a seventh of the packet.
 *  - **P.ATQ multiplies the whole term.** With Aura Draconiana learned the term is
 *    `floor((90 + 10 × Adestrar Dragão + POD ÷ 5) × (1 + P.ATQ ÷ 100))` (irowiki). The
 *    engine added `POD ÷ 5 × (1 + P.ATQ ÷ 100)` to the 140 instead, and read P.ATQ from the
 *    item share alone (10) rather than the window's 54 / 86.
 *  - **Two item records.** Cavaleiro Rúnico (Capa) had only its Lorde (Topo) set line, not
 *    its own "Dano de [Sopro do Dragão] e [Bafo do Dragão] +10%" (both generations, 29463
 *    and 25448); Bastarda Primordial-LT paid "Dano físico à distância +10%" at +9 where the
 *    text says +15%. Together they are 228% / 126%, and the geared packet closes only on
 *    that pair.
 *  - **What does not reach the breaths:** Dano físico +% (Cordão do Draconiano, Bota
 *    Primordial-LT), Dano contra tamanhos (Manto Branco Físico +12%) and Bolinho de
 *    Cerejeira's +5% against all sizes, eaten before the geared casts. Any one of them
 *    would put the packet 5–15% over.
 *  - **The dummy's soft DEF is 50**, subtracted before the ranged bonus.
 *
 * Still open:
 *
 *  - Bastarda Primordial-LT's "Grau C ou mais: P.ATQ +1" is not in the window: P.ATQ reads
 *    78 the moment the Grau C weapon goes on, which is what the engine gives without the
 *    line. Left unscripted until a second weapon grade is recorded.
 *  - The HP/SP Increase Potions (EFST 480/481, items 12422–12427) are not modelled. The
 *    stand-ins below put max HP/SP in the recording's own ÷50 / ÷4 buckets; the real
 *    formulas (rAthena's +3.320 HP and +29% SP at base 246) land within 0,02%.
 *  - No recording carries the Aura Draconiana state (EFST 1176), so its +100% is still
 *    priced as a stage of its own rather than added to the item bonuses.
 */

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const monsters = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));
const hpSpTable = JSON.parse(readFileSync('src/assets/demo/data/hp_sp_table.json', 'utf8'));

const WATER_BREATH = SKILL_ID_BY_NAME['Dragon Breath - WATER'];
const DUMMY_NEUTRAL = '21077';
const BETELGEUSE = '20994';

const replay: any = decodeReplay(loadReplayFixture('dk-water-breath-gear-states.rrf'));
const aid = replay.sessionInfo.aid;

/** Bare-handed casts happen before the first equip at 13,48 s; the geared ones after 20,98 s.
 *  `window` is the equip event whose status block is compared, `readAt` its last packet. */
const BARE = { at: 13_000, packet: 256_897, window: 13_480, readAt: 13_497 };
const GEARED = { at: 21_000, packet: 6_913_590, window: 20_279, readAt: 20_285 };

/**
 * What the character had up in both states, besides the class toggles (none):
 * EFST 272/275 the AGI and INT cash foods (+15 each, read off ZC_COUPLESTATUS), EFST 12
 * Aumentar Agilidade (+7 AGI), EFST 1509 Estimulante (102803), and EFST 480/481 the HP/SP
 * Increase Potions, stood in for by flat values — see the header.
 */
const CONSUMABLES = [{ int: ['15'], agi: ['22'] }, items[102803].script, { hp: ['3300'], spPercent: ['29'], sp: ['4'] }];

/** The build at `untilMs`: the t=0 inventory with every equip event up to then folded on. */
function modelAt(untilMs: number) {
  const inv = new Map([...replay.initialInventory].map(([k, r]: any) => [k, { ...r, cards: [...r.cards] }]));
  for (const e of replay.equipChanges ?? []) {
    if (e.time > untilMs) break;
    const rec: any = inv.get(e.slot) ?? { slot: e.slot, qty: 1, options: [] };
    inv.set(e.slot, {
      ...rec, itemId: e.itemId, refine: e.refine, grade: e.grade,
      cards: [...(e.cards ?? [])], options: e.options?.length ? e.options : rec.options ?? [],
      equipped: e.equipped ? e.location : 0,
    });
  }
  return replayToModel({ ...replay, initialInventory: inv }, items).model;
}

function sim(untilMs: number, opts: { monster?: string; relieveLevel?: number; skill?: string } = {}) {
  const m: any = modelAt(untilMs);
  const cls: any = new DragonKnight();
  const b = cls.getJobBonusStatus(m.jobLevel);
  Object.assign(m, {
    jobStr: b.str, jobAgi: b.agi, jobVit: b.vit, jobInt: b.int, jobDex: b.dex, jobLuk: b.luk,
    jobPow: b.pow, jobSta: b.sta, jobWis: b.wis, jobSpl: b.spl, jobCon: b.con, jobCrt: b.crt,
    pow: 100, sta: 0, wis: 0, spl: 0, con: 26, crt: 0,
  });
  const skill = opts.skill ?? 'Dragon Breath - WATER==10';
  m.selectedAtkSkill = skill;

  const learned: Record<number, number> = {};
  for (const [id, lv] of replay.learnedSkills) learned[id] = lv;
  const passiveIds = cls.passiveSkills.map((p: any) => learned[SKILL_ID_BY_NAME[p.name]] ?? 0);
  const activeIds = cls.activeSkills.map(() => 0);
  const { equipAtks, masteryAtks, activeSkillNames, learnedSkillMap } = cls
    .setLearnSkills({ activeSkillIds: activeIds, passiveSkillIds: passiveIds })
    .getSkillBonusAndName();

  const calc: any = new Calculator().setMasterItems(items).setHpSpTable(hpSpTable).setClass(cls);
  calc.loadItemFromModel(m);
  new CalculatorController().runChain(calc, {
    monster: monsters[opts.monster ?? DUMMY_NEUTRAL], relieveLevel: opts.relieveLevel ?? 0,
    equipAtks, masteryAtks, buffEquips: {}, buffMasterys: {},
    consumeData: CONSUMABLES, aspdPotion: undefined,
    extraOptionScripts: parseOptionScripts((m.rawOptionTxts ?? []).filter(Boolean)),
    activeSkillNames, learnedSkillMap, selectedAtkSkill: skill, selectedChances: [], usedHpL: false,
  } as any);

  const ds = calc.damageSummary;
  const tot = calc.getTotalSummary();
  return {
    calc,
    ds,
    maxHp: calc.maxHp as number,
    maxSp: calc.maxSp as number,
    bonus: calc.totalEquipStatus as Record<string, number>,
    window: {
      41: tot.calc.totalStatusAtk,
      42: (tot.weapon?.baseWeaponAtk ?? 0) + (tot.weapon?.refineBonus ?? 0) + tot.calc.totalEquipAtk,
      52: tot.calc.totalCri,
      225: ds.pAtk,
      226: ds.sMatk,
      230: ds.cRate,
    } as Record<number, number>,
  };
}

/** Last ZC_PAR_CHANGE value of `sp` sent at or before `t`. */
function windowAt(sp: number, t: number): number {
  const seen = (replay.paramChanges ?? []).filter((p: any) => p.type === sp && p.time <= t);
  return Number(seen[seen.length - 1].value);
}

const packets = (from: number, to: number) =>
  (replay.damage ?? [])
    .filter((d: any) => d.source === aid && d.skillId === WATER_BREATH && d.time >= from && d.time < to)
    .map((d: any) => d.damage as number);

describe('Cavaleiro Draconiano — Bafo do Dragão bare-handed and geared (teste sopro dk)', () => {
  it('holds the recording to two exact values, one per state', () => {
    expect(packets(0, 13_480)).toEqual([BARE.packet, BARE.packet, BARE.packet]);
    expect(packets(20_979, 30_000)).toEqual([GEARED.packet, GEARED.packet, GEARED.packet, GEARED.packet]);
  });

  it('imports the full build by the last cast', () => {
    const m: any = modelAt(GEARED.at);
    expect([m.weapon, m.weaponRefine, m.weaponGrade]).toEqual([600024, 12, 'C']);
    expect([m.headUpper, m.garment, m.accRight, m.costumeEnchantGarment, m.shadowArmor]).toEqual([19474, 480812, 490166, 29463, 24446]);
  });

  it.each([
    { name: 'bare-handed', state: BARE },
    { name: 'geared', state: GEARED },
  ])('reproduces the $name status window', ({ state }) => {
    // 41 ATQ · 42 ATQ Equip. · 52 Crítico · 225 P.ATQ · 226 S.ATQM · 230 C.Rate. The bare
    // window is the one sent with the first equip (a Drainiliar de Combate, which moves
    // none of these), so the model is read at that moment. ATQ, Crítico and amotion trail
    // the rest of the block by a few ms, hence `readAt`.
    const r = sim(state.window);
    let compared = 0;
    for (const sp of [41, 42, 52, 225, 226, 230]) {
      expect(r.window[sp], `SP ${sp}`).toBe(windowAt(sp, state.readAt));
      compared++;
    }
    expect(compared).toBe(6);
  });

  it.each([
    { name: 'bare-handed', state: BARE, hp: 107_026, sp: 8_152 },
    { name: 'geared', state: GEARED, hp: 407_378, sp: 17_300 },
  ])('puts the $name max HP and SP in the recording’s own buckets', ({ state, hp, sp }) => {
    // Bafo do Dragão reads floor(HP ÷ 50) and floor(SP ÷ 4), so the bucket is all that has
    // to match. The geared values are ZC_PAR_CHANGE's; the bare ones are the HP the
    // character carried into the first cast and the SP it had before paying for it.
    const r = sim(state.at);
    expect([Math.floor(r.maxHp / 50), Math.floor(r.maxSp / 4)]).toEqual([Math.floor(hp / 50), Math.floor(sp / 4)]);
    expect(windowAt(6, GEARED.window)).toBe(407_378);
    expect(windowAt(8, GEARED.window)).toBe(17_300);
  });

  it('reads the item bonuses the geared packet needs', () => {
    const { bonus } = sim(GEARED.at);
    expect(bonus[String(WATER_BREATH)]).toBe(228);
    expect(bonus.range).toBe(126);
  });

  it.each([
    { name: 'bare-handed', state: BARE },
    { name: 'geared', state: GEARED },
  ])('simulates the $name packet to the unit', ({ state }) => {
    const { ds } = sim(state.at);
    expect(ds.skillMaxDamage).toBe(state.packet);
    expect(ds.skillMinDamage).toBe(state.packet);
  });

  it('takes Betelgeuse’s Aliviar off both breaths', () => {
    for (const skill of ['Dragon Breath - WATER==10', 'Dragon Breath==10']) {
      const off = sim(GEARED.at, { monster: BETELGEUSE, skill }).ds.skillMaxDamage;
      expect(off).toBeGreaterThan(0);
      expect(sim(GEARED.at, { monster: BETELGEUSE, skill, relieveLevel: 5 }).ds.skillMaxDamage).toBe(Math.floor(off * 0.5));
      expect(sim(GEARED.at, { monster: BETELGEUSE, skill, relieveLevel: 10 }).ds.skillMaxDamage).toBe(Math.floor(off * 0.01));
    }
  });
});
