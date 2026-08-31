import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { decodeReplay } from 'rrfparser';
import { Calculator } from 'src/app/core/calculator';
import { CalculatorController } from 'src/app/core/calculator-controller';
import { parseOptionScripts } from 'src/app/core/option-scripts';
import { SKILL_ID_BY_NAME } from 'src/app/skills';
import { loadReplayFixture } from 'src/app/replay/__tests__/load-fixture';
import { replayToModel } from 'src/app/replay/replay-to-model';
import { GuillotineCross } from './GuillotineCross';

/**
 * Two recordings of the same character — "Skulld", Sicário, on tra_fild against the training
 * dummies — at two levels, three days apart. Tracker cards TxYGFDGEn7 (170/58, 21/08/2026)
 * and RXBZc39dV5 (180/64, 23/08/2026). Same build, one level-up between them.
 *
 * **Both carry no combat buff at all**, which is what makes them worth keeping: there is no
 * unmodelled multiplier that could be hiding in a residual, so a packet landing outside the
 * simulated range would have nowhere to come from but the formula.
 *
 * That is not how they first read. tra_fild is a public field, and the raw `statusEvents`
 * stream showed 25 and 9 statuses — Poema de Bragi, Kyrie Eleison, Mantra da Força, Espírito
 * do Golem, Postura do Universo. **Every one of them belongs to a bystander**: the events
 * carry an `aid` and none of those is the recorder's. Postura do Universo is a Mestre
 * Celestial buff and should have been the tell. Filtered, TxYGFDGEn7 carries only the
 * Lâminas Destruidoras spin counter (which the recorder toggles on itself, mid-file) and
 * RXBZc39dV5 carries nothing whatsoever. The `damage` stream needs the same filter — 65 and
 * 17 of its packets are other people's.
 *
 * The 180/64 file is also the better probe of the katar's size table than any deliberate
 * test would be: 58 basic-attack **criticals** spread across four dummies, so the small and
 * large penalties are read off ~15 samples each instead of one.
 */

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const monsters = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));
const hpSpTable = JSON.parse(readFileSync('src/assets/demo/data/hp_sp_table.json', 'utf8'));

const CROSS_IMPACT = 2022;
/** The bookkeeping EFSTs every recording carries; none is a buff. */
const NOISE = new Set([46, 622, 673, 695, 802, 942, 983, 984, 987, 993, 994, 1084, 1085, 1312]);

function load(fixture: string) {
  const replay: any = decodeReplay(loadReplayFixture(fixture));
  const aid = replay.sessionInfo.aid;
  const mine = (d: any) => d.source === aid;
  return {
    replay,
    aid,
    /** Statuses that are the recorder's own and are not bookkeeping. */
    ownBuffs: () => {
      const on = new Set<number>();
      for (const s of replay.statusEvents ?? []) {
        if (s.aid !== aid) continue;
        s.isOn ? on.add(s.statusId) : on.delete(s.statusId);
      }
      return [...on].filter((id) => !NOISE.has(id));
    },
    packets: (skillId: number) => (replay.damage ?? []).filter((d: any) => mine(d) && d.skillId === skillId),
    foreignPackets: () => (replay.damage ?? []).filter((d: any) => !mine(d)).length,
    /** The dummy each packet hit, by its monster id (the entity's view). */
    targetOf: (d: any) => {
      const e = [...(replay.entities?.values?.() ?? [])].find((x: any) => x.aid === d.target);
      return String(e?.view ?? '');
    },
  };
}

function sim(replay: any, target: string) {
  const m = replayToModel(replay, items).model as any;
  const cls: any = new GuillotineCross();
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
  // No toggle is on: filtered by aid, neither file carries a combat buff.
  const { equipAtks, masteryAtks, activeSkillNames, learnedSkillMap } = cls
    .setLearnSkills({ activeSkillIds: cls.activeSkills.map(() => 0), passiveSkillIds: passiveIds })
    .getSkillBonusAndName();

  const value = 'Cross Impact==5';
  m.selectedAtkSkill = value;
  const calc = new Calculator().setMasterItems(items).setHpSpTable(hpSpTable).setClass(cls);
  calc.loadItemFromModel(m);
  new CalculatorController().runChain(calc, {
    monster: monsters[target], equipAtks, masteryAtks, buffEquips: {}, buffMasterys: {},
    consumeData: [], aspdPotion: undefined,
    extraOptionScripts: parseOptionScripts((m.rawOptionTxts ?? []).filter(Boolean)),
    activeSkillNames, learnedSkillMap, selectedAtkSkill: value, selectedChances: [], usedHpL: false,
  } as any);

  const ds: any = (calc as any).damageSummary;
  return {
    skillCrit: [Math.round(ds.skillMinDamage), Math.round(ds.skillMaxDamage)] as [number, number],
    skillNoCri: [Math.round(ds.skillMinDamageNoCri), Math.round(ds.skillMaxDamageNoCri)] as [number, number],
    basicCrit: [Math.round(ds.criMinDamage), Math.round(ds.criMaxDamage)] as [number, number],
  };
}

describe('Sicário — Lâminas Retalhadoras sem buff nenhum (TxYGFDGEn7, RXBZc39dV5)', () => {
  it.each([
    { arquivo: 'gc-cross-impact-unbuffed-170.rrf', nivel: 170, alheios: 17 },
    { arquivo: 'gc-cross-impact-unbuffed-180.rrf', nivel: 180, alheios: 65 },
  ])('$arquivo carries no borrowed buff once statusEvents is filtered by aid', ({ arquivo, nivel, alheios }) => {
    const f = load(arquivo);
    expect(f.replay.sessionInfo.baseLevel).toBe(nivel);
    expect(f.ownBuffs()).toEqual([]);
    // And the party's packets ride in the damage stream too, so `source` needs the same filter.
    expect(f.foreignPackets()).toBe(alheios);
  });

  /**
   * The one status the 170 file's recorder does raise is 339, EFST_ROLLINGCUTTER — the spin
   * counter, which ticks on and straight back off around each Lâminas Destruidoras cast. It
   * is a counter, not a damage buff, and it is spent well before the last packet, which is
   * why the still-on set above is empty for both files.
   */
  it('raises only the Lâminas Destruidoras spin counter, and spends it mid-file', () => {
    const f = load('gc-cross-impact-unbuffed-170.rrf');
    const own = (f.replay.statusEvents ?? []).filter((s: any) => s.aid === f.aid && !NOISE.has(s.statusId));
    expect([...new Set(own.map((s: any) => s.statusId))]).toEqual([339]);
    expect(own.filter((s: any) => s.isOn).length).toBeGreaterThan(1); // re-armed per cast
    expect(own.at(-1).isOn).toBe(false);
  });

  /**
   * Every Lâminas Retalhadoras packet in both files, against whichever dummy it hit. The
   * skill declares `hit: 7` — display only, `totalHit` 1 — so `count` 7 does **not** divide
   * the packet (review skill §5). Each is compared against the whole non-crit..crit span,
   * because at this build's CRIT the skill's half-chance leaves both outcomes on the table.
   */
  it.each([
    { arquivo: 'gc-cross-impact-unbuffed-170.rrf', n: 17 },
    { arquivo: 'gc-cross-impact-unbuffed-180.rrf', n: 6 },
  ])('brackets all $n Lâminas Retalhadoras packets of $arquivo', ({ arquivo, n }) => {
    const f = load(arquivo);
    const packets = f.packets(CROSS_IMPACT);
    expect(packets.length).toBe(n);

    const cache = new Map<string, ReturnType<typeof sim>>();
    for (const d of packets) {
      const target = f.targetOf(d);
      expect(monsters[target]).toBeDefined();
      if (!cache.has(target)) cache.set(target, sim(f.replay, target));
      const s = cache.get(target)!;
      expect(d.damage).toBeGreaterThanOrEqual(s.skillNoCri[0]);
      expect(d.damage).toBeLessThanOrEqual(s.skillCrit[1]);
    }
  });

  /**
   * The katar's size table, off 58 basic-attack criticals. Pequeno and Grande take the same
   * penalty and Médio takes none, so 21064/21066 land on one range and 21065/21077 on a
   * higher one — and the recorded extremes sit within a couple of points of the simulated
   * bounds on every dummy, which is as tight as a sampled envelope gets.
   */
  it('reproduces the katar size modifiers across four dummies', () => {
    const f = load('gc-cross-impact-unbuffed-180.rrf');
    const basics = f.packets(0);
    expect(basics.length).toBe(58);
    expect(basics.every((d: any) => d.hitType === 'critical')).toBe(true);

    const porAlvo = new Map<string, number[]>();
    for (const d of basics) {
      const t = f.targetOf(d);
      if (!porAlvo.has(t)) porAlvo.set(t, []);
      porAlvo.get(t)!.push(d.damage);
    }
    expect([...porAlvo.keys()].sort()).toEqual(['21064', '21065', '21066', '21077']);

    for (const [target, valores] of porAlvo) {
      const [lo, hi] = sim(f.replay, target).basicCrit;
      expect(Math.min(...valores)).toBeGreaterThanOrEqual(lo);
      expect(Math.max(...valores)).toBeLessThanOrEqual(hi);
    }

    // Pequeno and Grande share the katar's penalty; Médio does not.
    const teto = (t: string) => sim(f.replay, t).basicCrit[1];
    expect(teto('21064')).toBe(teto('21066'));
    expect(teto('21065')).toBeGreaterThan(teto('21064'));
  });
});
