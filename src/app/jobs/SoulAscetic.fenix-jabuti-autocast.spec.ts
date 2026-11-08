import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { decodeReplay } from 'rrfparser';
import { buildAutoCastSimulation } from 'src/app/core/auto-cast';
import { makeCalculator } from 'src/app/core/__tests__/make-calculator';
import { loadReplayFixture } from 'src/app/replay/__tests__/load-fixture';
import { replayToModel } from 'src/app/replay/replay-to-model';
import { createMainModel } from 'src/app/utils';
import { SoulAscetic } from './SoulAscetic';

/**
 * 491119 Colar Consagrado: Destino — "Ao usar [Talismã da Fênix] autoconjura [Talismã do
 * Jabuti] nv.4", the clause of its `Conjunto [Cajado Vivatus Fides]` gated on the weapon
 * reaching +10. It was not modelled: the simulator had no trigger for a proc that fires on
 * one named skill instead of on an attack, so the whole clause was absent.
 *
 * Ground truth: `fixtures/sa-fenix-jabuti-autocast.rrf`, submitted through "Ajude o
 * simulador" and triaged as card `YdZRzjaynn` (reported by Mascotito). "MascoteYinYang",
 * Asceta das Almas base 230 / job 48, 136 s on tra_fild against one dummy, with the gear
 * going on mid-recording.
 *
 * The file is a controlled before/after of exactly this clause, and that is what the first
 * block below reads off it:
 *
 *  - Cajado Vivatus Fides +10 (550064) goes on at t=37,5 s; the necklace (491119) only at
 *    t=86,0 s, in the middle of a 14-piece gear-up.
 *  - Before the necklace, every Talismã do Jabuti packet is **Lv 5** and carries its own
 *    1,68–1,70 s cast bar about 2,1 s after the Fênix — the player casting both by hand.
 *  - After it, each of the ten Fênix casts is followed within 11–22 ms by a Jabuti packet
 *    at **Lv 4** with no cast packet of its own at all. Ten casts, ten procs: 100%.
 *  - Jabuti is learned at **Lv 5**, so a Lv-4 Jabuti is not something this character can
 *    cast. It can only be the necklace's "nv.4".
 *
 * That settles level, rate and order, which is everything the clause claims. What the file
 * cannot settle is whether the proc is capped by Jabuti's own 0,7 s cooldown: the ten casts
 * are 0,585–0,777 s apart (mean 0,665 s), so a cap at 0,7 s would have skipped roughly one
 * of them and none was skipped — but the margin is a single frame wide, and no
 * `maxActivationsPerSecond` is claimed on that evidence.
 *
 * The recorded damage is pinned but no formula is read off it. Over the ten post-gear casts
 * the Jabuti/Fênix mean ratio is 1,18016, while the ratio of the two skills' columns with
 * this class's talisman tail (`Perícia × 15 × Nv + FEI × 5`, Perícia Lv10) lands at
 * 1,1667..1,1597 across FEI 90..140 — above the whole plausible band, by about 1,2%. That
 * is the talisman FEI coefficient `SoulAscetic.exorcism-replay.spec.ts` already leaves
 * open ("close but probably low"), not this clause: the same tail sits in both skills and
 * every multiplier on this build — the necklace's own +10% to both talismans included —
 * cancels in the ratio. One gear state cannot close it, so the ratio is recorded here as
 * the next recording's target and nothing more.
 */

const ITEMS = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8')) as Record<string, any>;
const MONSTERS = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8')) as Record<string, any>;
const HP_SP_TABLE = JSON.parse(readFileSync('src/assets/demo/data/hp_sp_table.json', 'utf8'));
/** "Dummy - Médio", the target in the recording. */
const DUMMY = '21065';

const CAJADO = 550064;
const COLAR = 491119;
const FENIX = 5428;
const JABUTI = 5429;
const FENIX_SELECTED = 'Talisman of Red Phoenix==5';
/** The moment 491119 is equipped; the ten proc casts all happen after it. */
const NECKLACE_AT = 85_983;

const replay: any = decodeReplay(loadReplayFixture('sa-fenix-jabuti-autocast.rrf'));
const aid = replay.sessionInfo.aid;
const mine = <T extends { source: number }>(rows: T[]): T[] => rows.filter((row) => row.source === aid);

describe('Talismã da Fênix → Talismã do Jabuti in the recording', () => {
  it('equips the staff at +10 well before the necklace, so the two states are separable', () => {
    const changes = (replay.equipChanges ?? []).filter((change: any) => [CAJADO, COLAR].includes(change.itemId));

    expect(changes.map((change: any) => [change.itemId, change.refine, Math.round(change.time / 1000)]))
      .toEqual([[CAJADO, 10, 38], [COLAR, 0, 86]]);
  });

  it('has Jabuti learned at Lv5, so no Lv4 Jabuti can come from the player', () => {
    expect(replay.learnedSkills.get(JABUTI)).toBe(5);
    expect(replay.learnedSkills.get(FENIX)).toBe(5);
  });

  it('casts Jabuti by hand before the necklace: Lv5, its own cast bar, seconds later', () => {
    const before = mine(replay.damage).filter((d: any) => d.skillId === JABUTI && d.time < NECKLACE_AT);
    const casts = mine(replay.skillCasts).filter((c: any) => c.skillId === JABUTI && c.time < NECKLACE_AT);

    expect(before).toHaveLength(16);
    expect(new Set(before.map((d: any) => d.skillLevel))).toEqual(new Set([5]));
    // One cast bar per packet, and it is a real one — nothing instant and nothing free.
    expect(casts).toHaveLength(16);
    expect(new Set(casts.map((c: any) => c.castMs))).toEqual(new Set([1704, 1684]));
  });

  it('fires Jabuti Lv4 on every Fênix cast once the necklace is on, with no cast of its own', () => {
    const fenix = mine(replay.damage).filter((d: any) => d.skillId === FENIX && d.time > NECKLACE_AT);
    const jabuti = mine(replay.damage).filter((d: any) => d.skillId === JABUTI && d.time > NECKLACE_AT);

    expect(fenix).toHaveLength(10);
    expect(jabuti).toHaveLength(10);
    // 100%: one proc per cast, every cast.
    expect(jabuti.map((d: any) => d.skillLevel)).toEqual(Array(10).fill(4));
    // Nothing cast it — the ten procs have no ZC_USE_SKILL and no cast bar between them.
    expect(mine(replay.skillCasts).filter((c: any) => c.skillId === JABUTI && c.time > NECKLACE_AT)).toEqual([]);
    expect(mine(replay.skillUses).filter((u: any) => u.skillId === JABUTI)).toEqual([]);
    // And it lands immediately after, not on the next cast cycle.
    const gaps = jabuti.map((d: any, index: number) => d.time - fenix[index].time);
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...gaps)).toBeLessThanOrEqual(25);
  });

  /**
   * The lead the file leaves behind, kept as a number so the next talisman recording has
   * something to hit. Both skills share every modifier on this build, so the ratio is the
   * two damage columns plus the shared tail and nothing else.
   */
  it('measures a Jabuti/Fênix ratio above what the talisman tail can produce', () => {
    const mean = (rows: any[]) => rows.reduce((sum, row) => sum + row.damage, 0) / rows.length;
    const after = mine(replay.damage).filter((d: any) => d.time > NECKLACE_AT);
    const recorded = mean(after.filter((d: any) => d.skillId === JABUTI))
      / mean(after.filter((d: any) => d.skillId === FENIX));
    // (2.000 + 900×4 + 10×15×4 + FEI×5) / (1.500 + 600×5 + 10×15×5 + FEI×5)
    const predicted = (spl: number) => (6200 + 5 * spl) / (5250 + 5 * spl);

    expect(recorded).toBeCloseTo(1.18016, 5);
    expect(predicted(90)).toBeCloseTo(1.1667, 4);
    expect(predicted(140)).toBeCloseTo(1.1597, 4);
    expect(recorded).toBeGreaterThan(predicted(90));
  });
});

/** The engine with `model` loaded, against the dummy the recording used. */
function resolveFor(model: any) {
  const cls = new SoulAscetic();
  cls.setLearnSkills({ activeSkillIds: [], passiveSkillIds: [] }).getSkillBonusAndName();
  const calc = makeCalculator(ITEMS, cls).setHpSpTable(HP_SP_TABLE).setMonster(MONSTERS[DUMMY]);
  calc.setModel(model).loadItemFromModel(model).prepareAllItemBonus();
  return { calc, model };
}

/** The engine state for a build holding `weapon` at `refine` plus the necklace. */
function resolve(refine: number, withNecklace = true) {
  return resolveFor({
    ...createMainModel(),
    level: 230,
    jobLevel: 48,
    weapon: CAJADO,
    weaponRefine: refine,
    accLeft: withNecklace ? COLAR : 0,
    selectedAtkSkill: FENIX_SELECTED,
  });
}

/**
 * A summary with the shape `buildAutoCastSimulation` reads. The two rates are what matters
 * here: `hitPerSecs` is the ASPD ceiling and `totalHitPerSec` the cast rate of the selected
 * skill, and a skill-use proc is priced off the second, capped by the first.
 */
const summaryWith = (totalHitPerSec: number) => ({
  calc: { hitPerSecs: 4 },
  calcSkill: { dmgType: 'Magical', totalHitPerSec },
  dmg: { accuracy: 100, criRateToMonster: 0, basicDps: 0 },
  weapon: { rangeType: 'melee' },
  monster: { hp: 10_000_000, race: 'formless', type: 'boss' },
});

describe('Conjunto [Cajado Vivatus Fides] on Colar Consagrado: Destino', () => {
  it('registers the Jabuti Lv4 proc on the use of Fênix, at 100%, only from +10', () => {
    expect(resolve(10).calc.resolvedItemAutoCasts).toEqual([expect.objectContaining({
      itemId: COLAR, skillId: JABUTI, skillLevel: 4, chance: 100,
      trigger: 'skill-use', triggerSkillId: FENIX,
    })]);
    expect(resolve(9).calc.resolvedItemAutoCasts).toEqual([]);
    expect(resolve(10, false).calc.resolvedItemAutoCasts).toEqual([]);
  });

  it('prices it once per Fênix cast, under the ASPD ceiling', () => {
    const { calc, model } = resolve(10);
    calc.calcAllAtk();
    const sources = (rate: number) => buildAutoCastSimulation({
      calc, model, hasSelectedEffects: false, summary: summaryWith(rate) as any,
    }).sources.filter((source) => source.source.skillId === JABUTI);

    const perCast = sources(1.5)[0];
    expect(perCast).toMatchObject({ triggerAttacksPerSecond: 1.5, activationsPerSecond: 1.5 });
    expect(perCast.dps).toBeGreaterThan(0);
    // The ASPD floor the engine already applies to the skill's own DPS caps the proc too.
    expect(sources(9)[0]).toMatchObject({ triggerAttacksPerSecond: 4, activationsPerSecond: 4 });
  });

  /**
   * The same rule, on the build the recording actually wore rather than on a hand-typed
   * pair: every equip change up to `t` folded onto the start snapshot, which for this file
   * is the whole 14-piece gear-up. It is the step that proves the gate reads the recorded
   * staff and necklace and not two ids a spec happened to pick.
   */
  it('resolves on the build imported from the recording, and not before the necklace', () => {
    // Same fold as SoulAscetic.exorcism-gear-states.spec.ts: keep the slot's earlier
    // fields, and its options when the change carries none.
    const stateAt = (t: number) => {
      const inv = new Map<any, any>(
        [...replay.initialInventory].map(([k, r]: any) => [k, { ...r, cards: [...(r.cards ?? [])] }]),
      );
      for (const e of replay.equipChanges ?? []) {
        if (e.time > t) break;
        const rec = inv.get(e.slot) ?? { slot: e.slot, qty: 1, options: [] };
        inv.set(e.slot, {
          ...rec,
          itemId: e.itemId,
          refine: e.refine,
          grade: e.grade,
          cards: [...(e.cards ?? [])],
          options: e.options?.length ? e.options : rec.options ?? [],
          equipped: e.equipped ? e.location : 0,
        });
      }
      return replayToModel({ ...replay, initialInventory: inv } as any, ITEMS).model as any;
    };
    const resolvedAt = (t: number) =>
      resolveFor({ ...stateAt(t), selectedAtkSkill: FENIX_SELECTED }).calc.resolvedItemAutoCasts;

    // The staff has been on at +10 since t=37,5 s, and on its own it gives nothing.
    expect(resolvedAt(NECKLACE_AT - 1)).toEqual([]);
    expect(resolvedAt(NECKLACE_AT)).toEqual([expect.objectContaining({
      itemId: COLAR, skillId: JABUTI, skillLevel: 4, chance: 100, triggerSkillId: FENIX,
    })]);
  });

  it('says which skill to select instead of vanishing when another one is being solved', () => {
    const { calc, model } = resolve(10);
    calc.calcAllAtk();
    const simulation = buildAutoCastSimulation({
      calc,
      model: { ...model, selectedAtkSkill: 'Talisman of Black Tortoise==5' },
      hasSelectedEffects: false,
      summary: summaryWith(1.5) as any,
    });

    expect(simulation.sources.some((source) => source.source.skillId === JABUTI)).toBe(false);
    expect(simulation.blockedSources).toContainEqual(expect.objectContaining({
      icon: JABUTI, reason: 'Selecione Talismã da Fênix como habilidade para ativar.',
    }));
  });
});
