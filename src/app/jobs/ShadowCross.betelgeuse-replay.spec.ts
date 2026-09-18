import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { decodeReplay } from 'rrfparser';
import { ElementType, monsterDamageReductionPercent } from 'src/app/constants';
import { JobBuffs } from 'src/app/constants/job-buffs';
import { Calculator } from 'src/app/core/calculator';
import { CalculatorController, collectBuffBonuses } from 'src/app/core/calculator-controller';
import { parseOptionScripts } from 'src/app/core/option-scripts';
import { loadReplayFixture } from 'src/app/replay/__tests__/load-fixture';
import { replayToModel } from 'src/app/replay/replay-to-model';
import { SKILL_ID_BY_NAME } from 'src/app/skills';
import { ShadowCross } from './ShadowCross';

/**
 * **Betelgeuse takes only 1% of every hit, and Aliviar multiplies on top of that.**
 *
 * The Torre da Constelação boss (20994) was modelled through Aliviar alone until
 * 18/09/2026, on the assumption that the skill explained its damage. It does not, and the
 * two recordings here say so with the same character on two different bosses in the same
 * afternoon — @Fawxx, Executor 240/50, POD 100 / CRV 59:
 *
 *  - `sc-amdarais-fawxx.rrf` (0er1@gl_he, 20/08/2026): Lâminas Retalhadoras on **Phantom of
 *    Amdarais**, an ordinary instance MVP, 295.819.475 per packet;
 *  - `sc-betelgeuse-fawxx.rrf` (00y3@ch_t, 13/08/2026): the same skill on **Betelgeuse**
 *    with Aliviar off and nothing on the target, 1.323.630 per packet.
 *
 * A factor of 223 between two bosses, for one character, in one week. Nothing on the
 * monster side can produce it: RES saturates at 50% and the build penetrates both DEFs.
 * Neither can it be read off the residuals alone, because these are party recordings with
 * forty-odd buffs the simulator does not carry — but that soup is the *same* soup in both
 * files, and that is what makes the pair decisive. With Betelgeuse taking 1% the two
 * recordings need the same correction (recorded ≈ 2,5× simulated on Betelgeuse, 2,3× on
 * Phantom of Amdarais); without it Betelgeuse needs a correction ninety times the other's.
 *
 * **divine-pride says it outright**, in the Attributes block of monster 20994: "Taking only
 * 1% of the damage dealt to it". The same line is on Twisted God Freyja (21361) and
 * Schulang (21360), and **not** on Naght Sieger (20996), the Torre's other boss — which is
 * why `4eRVV9HGzk.rrf`, where one Cannon Spear splashes Naght Sieger and four Ilusões das
 * Trevas in the same millisecond, reads as Aliviar and nothing else.
 *
 * `monster.json` carries the attribute as bit 1024 of `stats.attr` (512 is the 10% tier),
 * and Betelgeuse has had 1032 there all along; the old comment in the constants file read
 * the bit as a reason to *exclude* it. See constants/monster-damage-reduction for why the
 * list is still by id.
 *
 * **The two reductions multiply.** Aliviar's own steps are unchanged and still exact on top
 * of the 1%, per displayed hit: `cA2vUmQM9d.rrf`, the same character a week later, prints
 * 3.071.516 with Aliviar off and 2.457.210 with it at Nv2 — and
 * `floor(floor(3.071.516 / 7) × 0,8) × 7` is 2.457.210 to the unit. The level table itself
 * is pinned in constants/monster-relieve.spec.ts.
 *
 * **A third confirmation, 18/09/2026** — Ynk's `Betel 210 1709.rrf`, not kept as a fixture
 * because the pair above already carries the finding and the file is 1 MB. It is the
 * controlled version: he photographed the Fonte da Deusa showing **Defesa — Selado**, which
 * is the ★ option that sets the base Aliviar level, and Selado is 0. The file agrees — no
 * 771 cast and no EFST 1166 on the boss for those packets. Its clean packet is 2.828.721
 * with only Garra Sombria on the target, and with the 1% *and* the eleven party buffs the
 * simulator can model it comes to 3,55× simulated, or 2,03× once Garra Sombria's boss
 * branch (+75% at Nv5, not the +150% it gives normal monsters) is credited. Without the 1%
 * the engine is **28× over**. What is left of that 2× is visible in the status window — the
 * build reads 8% low on ATQ and 19% low on CRIT against the recorded 1.051 / 171, from
 * Blessing, Aumentar Agilidade, the six +10 foods and the rest — plus EFST 1170
 * `SC_ADD_ATK_DAMAGE`, which rAthena applies as a flat `+val1%` to every weapon hit and
 * which the simulator has no notion of. It is on in that file and in @Fawxx's.
 */

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const monsters = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));
const hpSpTable = JSON.parse(readFileSync('src/assets/demo/data/hp_sp_table.json', 'utf8'));

const BETELGEUSE_FILE = 'sc-betelgeuse-fawxx.rrf';
const AMDARAIS_FILE = 'sc-amdarais-fawxx.rrf';
const BETELGEUSE = '20994';
const PHANTOM_OF_AMDARAIS = '20573';
const CROSS_IMPACT = 2022;
/** EFST_RELIEVE_DAMAGE — Aliviar's own icon, on the target. Worth more than the 771 stream. */
const RELIEVE_DAMAGE = 1166;

/** The two packets the comparison rests on. */
const ON_BETELGEUSE = 1323630;
const ON_PHANTOM = 295819475;

const cache = new Map<string, any>();
const replay = (f: string) => {
  if (!cache.has(f)) cache.set(f, decodeReplay(loadReplayFixture(f)));
  return cache.get(f);
};

interface State { file: string; mob: string; endow: ElementType; actives?: Record<string, number>; noReduction?: boolean }

function simulate(state: State) {
  const src: any = replay(state.file);
  const m: any = replayToModel(src, items).model;
  m.class = 4254;
  Object.assign(m, src.traits);
  m.propertyAtk = state.endow;
  m.consumables = [];
  m.selectedAtkSkill = 'Cross Impact==5';

  const cls: any = new ShadowCross();
  const b = cls.getJobBonusStatus(m.jobLevel);
  Object.assign(m, {
    jobStr: b.str, jobAgi: b.agi, jobVit: b.vit, jobInt: b.int, jobDex: b.dex, jobLuk: b.luk,
    jobPow: b.pow, jobSta: b.sta, jobWis: b.wis, jobSpl: b.spl, jobCon: b.con, jobCrt: b.crt,
  });

  const learned: Record<number, number> = {};
  for (const [id, lv] of src.learnedSkills) learned[id] = lv;
  const passiveIds = cls.passiveSkills.map((p: any) => {
    const sid = SKILL_ID_BY_NAME[p.name];
    return sid ? learned[sid] ?? 0 : 0;
  });
  const actives: Record<string, number> = { 'Enchant Deadly Poison': 1, 'Poisonous Weapon': 2, ...state.actives };
  const activeIds = cls.activeSkills.map((a: any) => actives[a.name] ?? 0);
  const { equipAtks, masteryAtks, activeSkillNames, learnedSkillMap } = cls
    .setLearnSkills({ activeSkillIds: activeIds, passiveSkillIds: passiveIds })
    .getSkillBonusAndName();
  const { equipAtk: buffEquips, masteryAtk: buffMasterys }: any = collectBuffBonuses(JobBuffs as any, JobBuffs.map(() => 0), activeSkillNames);

  const calc = new Calculator().setMasterItems(items).setHpSpTable(hpSpTable).setClass(cls)
    .setClock(() => new Date(src.sessionInfo.recordedAt));
  calc.loadItemFromModel(m);
  // The reversion the guard below needs: the monster with its "takes only 1%" attribute off.
  const mob = state.noReduction ? { ...monsters[state.mob], id: -1 } : monsters[state.mob];
  new CalculatorController().runChain(calc, {
    monster: mob, equipAtks, masteryAtks, buffEquips, buffMasterys,
    consumeData: [], aspdPotion: m.aspdPotion,
    extraOptionScripts: parseOptionScripts((m.rawOptionTxts ?? []).filter(Boolean)),
    activeSkillNames, learnedSkillMap, selectedAtkSkill: m.selectedAtkSkill, selectedChances: [], usedHpL: false,
    relieveLevel: 0,
  } as any);

  return (calc as any).damageSummary.skillMaxDamage as number;
}

/** @Fawxx runs a Fire endow on Betelgeuse (Neutro 2) and a Holy one on the Dark 3 Phantom. */
const betelgeuse = (o: Partial<State> = {}) => simulate({ file: BETELGEUSE_FILE, mob: BETELGEUSE, endow: ElementType.Fire, ...o });
const phantom = (o: Partial<State> = {}) => simulate({ file: AMDARAIS_FILE, mob: PHANTOM_OF_AMDARAIS, endow: ElementType.Holy, actives: { 'Potent Venom': 10 }, ...o });

describe('Betelgeuse — what the recordings carry', () => {
  it('the same Executor, 1,3 M on Betelgeuse and 295,8 M on Phantom of Amdarais', () => {
    const packets = (file: string, view: number) => {
      const r = replay(file);
      const me = r.sessionInfo.aid;
      return r.damage
        .filter((d: any) => d.source === me && d.skillId === CROSS_IMPACT && Number(d.damage) > 0 && r.entities.get(d.target)?.view === view)
        .map((d: any) => Number(d.damage));
    };
    expect(replay(BETELGEUSE_FILE).sessionInfo.player).toBe(replay(AMDARAIS_FILE).sessionInfo.player);
    expect(replay(BETELGEUSE_FILE).traits).toMatchObject({ pow: 100, crt: 59 });
    expect(packets(BETELGEUSE_FILE, 20994)).toContain(ON_BETELGEUSE);
    expect(packets(AMDARAIS_FILE, 20573).every((d: number) => d === ON_PHANTOM)).toBe(true);
    expect(ON_PHANTOM / ON_BETELGEUSE).toBeGreaterThan(200);
  });

  it('and the Betelgeuse packet it rests on has Aliviar off — no EFST 1166 on the target', () => {
    const r = replay(BETELGEUSE_FILE);
    const me = r.sessionInfo.aid;
    const on = new Set<number>();
    const events = [
      ...r.statusEvents.filter((s: any) => s.aid !== me).map((s: any) => ({ t: s.time, aid: s.aid, id: s.statusId, v: s.isOn })),
      ...r.damage.filter((d: any) => d.source === me && Number(d.damage) === ON_BETELGEUSE).map((d: any) => ({ t: d.time, hit: d.target })),
    ].sort((a: any, b: any) => a.t - b.t);
    const seen: boolean[] = [];
    for (const e of events as any[]) {
      if (e.hit === undefined) { if (e.id === RELIEVE_DAMAGE) (e.v ? on.add(e.aid) : on.delete(e.aid)); continue; }
      seen.push(on.has(e.hit));
    }
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every((withRelieve) => withRelieve === false)).toBe(true);
  });

  /* Pure arithmetic on two recorded packets of cA2vUmQM9d.rrf (@Fawxx, 19/08/2026), one with
   * Aliviar off and one at Nv2. The step is the skill's own 7 displayed hits, floored per
   * hit — the same shape damage-calculator.spec.ts pins — and it lands to the unit *after*
   * the 1%, which is what says the two reductions multiply rather than replace each other. */
  it('Aliviar Nv2 still takes exactly 20% off, per displayed hit, on top of the 1%', () => {
    const noRelieve = 3071516;
    expect(Math.floor(Math.floor(noRelieve / 7) * 0.8) * 7).toBe(2457210);
  });

  /* Two more numbers from `Betel 210 1709.rrf`, both pure arithmetic. Adjacent Aliviar
   * levels on the same target state come out at exactly 0,8/0,9 of each other — which is
   * the table, undisturbed by whatever flat multiplier sits under it. And Lex Aeterna
   * doubles **one** hit and is consumed: the icon sits on the boss for a dozen packets that
   * do not move, and then a single one is exactly twice its neighbours. */
  it('Nv1 → Nv2 is 0,8/0,9, and Lex Aeterna doubles a single packet', () => {
    expect(2534532 / 2851345).toBeCloseTo(0.8 / 0.9, 5);
    expect(2998443 * 2).toBe(5996886);
  });
});

describe('Betelgeuse — the reduction the engine now applies', () => {
  it('is 99%: divine-pride\'s "taking only 1% of the damage dealt to it"', () => {
    expect(monsterDamageReductionPercent(20994)).toBe(99);
    // The same attribute, same instance family.
    expect(monsterDamageReductionPercent(21361)).toBe(99); // Twisted God Freyja
    expect(monsterDamageReductionPercent(21360)).toBe(99); // Schulang
    // Naght Sieger, the Torre's other boss, does not carry it — its gap is Aliviar alone.
    expect(monsterDamageReductionPercent(20996)).toBe(0);
  });

  /*
   * The pair. Neither residual is 1 — these are party recordings and the simulator carries
   * none of the buffs — but they are the *same* residual, which is what a shared, unmodelled
   * party soup looks like and what a wrong target multiplier does not.
   */
  it('brings the two recordings to the same residual, 2,51× and 2,29×', () => {
    const onBetelgeuse = ON_BETELGEUSE / betelgeuse();
    const onPhantom = ON_PHANTOM / phantom();
    expect(onBetelgeuse).toBeCloseTo(2.51, 1);
    expect(onPhantom).toBeCloseTo(2.29, 1);
    // 10% apart, on two party recordings a week apart — the Betelgeuse run carries some
    // twenty buffs the Phantom run does not, so it is the one that should read higher.
    expect(Math.abs(onBetelgeuse / onPhantom - 1)).toBeLessThan(0.15);
    expect(onBetelgeuse).toBeGreaterThan(onPhantom);
  });

  it('and without it Betelgeuse needs a correction 91× the one Phantom of Amdarais needs', () => {
    const onBetelgeuse = ON_BETELGEUSE / betelgeuse({ noReduction: true });
    const onPhantom = ON_PHANTOM / phantom();
    expect(onBetelgeuse).toBeCloseTo(0.0251, 3);
    expect(onPhantom / onBetelgeuse).toBeGreaterThan(80);
  });
});
