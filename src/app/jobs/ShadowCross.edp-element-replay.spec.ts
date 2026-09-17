import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { decodeReplay } from 'rrfparser';
import { ElementType } from 'src/app/constants';
import { JobBuffs } from 'src/app/constants/job-buffs';
import { Calculator } from 'src/app/core/calculator';
import { CalculatorController, collectBuffBonuses } from 'src/app/core/calculator-controller';
import { parseOptionScripts } from 'src/app/core/option-scripts';
import { loadReplayFixture } from 'src/app/replay/__tests__/load-fixture';
import { replayToModel } from 'src/app/replay/replay-to-model';
import { SKILL_ID_BY_NAME } from 'src/app/skills';
import { ShadowCross } from './ShadowCross';

/**
 * `sc-edp-element-states.rrf` — Ynk again (Executor 240/50, POD 100 / CRV 59), amicitia2,
 * 17/09/2026, recorded to order after the RES pass left 2,5-3,8% unexplained
 * (`ShadowCross.res-penetration-replay.spec.ts`). It is the controlled version of that test:
 * **solo, no party buff, no food, no Aplicar Toxina, no Profanar Arma**, and it warps over and
 * over, so the status window is in the file — 12 fields, all reproduced exactly.
 *
 * Four states on Quimera Lava (20920: Pequeno, Amorfo, **Fogo 3**, RES 471), each fired many
 * times and each printing one repeated number (every packet is a critical):
 *
 *   Envenenar Arma                              15.018.815  ×9
 *   + Encantar com Veneno Mortal + Adulterar V. 58.390.248  ×14
 *   EDP alone (the endow had expired)           42.084.056  ×6
 *   EDP + Adulterar Veneno                      47.392.198  ×4
 *
 * **What it found.** The three EDP states came out 6,4-7,9% under the recording while the
 * state without EDP was within 0,7%, so the gap was EDP's, and the file separates it because
 * the endow is on in one EDP state and off in the other two. Inverting the chain on all of
 * them (plus the same states on 20921/20922, whose different race and size multipliers move
 * the weapon-plus-equipment share) gives one model:
 *
 *  - the **weapon ATK takes the poison element in full** — ×1,25 from the element table on a
 *    Fogo 3 target — and the pseudo-element +25% applies on top of it, where the engine was
 *    applying only the +25% scaled by the table (×1,3125 against ×1,5625);
 *  - the **status ATK stops taking the endow while EDP is up**: solving the four EDP equations
 *    leaves its multiplier at 0,99-1,00 instead of the endow's 1,25.
 *
 * Both are invisible on a Neutro target, where the poison line of the table is 100% — which is
 * why every dummy fixture in this folder is unchanged, and why this was never caught before.
 *
 * **The two wikis disagree here, and the recording picks one.** bROWiki's page for the skill
 * (browiki.org/wiki/Encantar_com_Veneno_Mortal) gives it "Poder Venenoso", which "acrescenta
 * propriedade Veneno no final de todos os seus ataques, mesmo que seu dano seja de propriedade
 * Neutro". iROwiki (irowiki.org/wiki/Enchant_Deadly_Poison) says the opposite in as many
 * words: "Only the Bonus Weapon ATK portion is Poison element. The rest of the ATK will not
 * have its element changed to poison" — which is what this engine did before, and which leaves
 * these packets 8,0% above the simulator (7,9%, 7,9% and 8,0% on the three EDP states). So
 * LATAM follows the bROWiki reading, and only for the weapon: carrying the poison element into
 * the equipment ATK overshoots by 13%, and into the status ATK by 2%, so neither is applied.
 *
 * What is left is +0,6% on the three EDP states and -0,7% on the endow-only one, pinned below.
 * The same fix, with Cogumelo Mágico as the toxin, closes the earlier Quimera Lava recordings
 * to 0,06% and 0,9%.
 */

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const monsters = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));
const hpSpTable = JSON.parse(readFileSync('src/assets/demo/data/hp_sp_table.json', 'utf8'));

const FIXTURE = 'sc-edp-element-states.rrf';
const QUIMERA_LAVA = '20920';
/** "Dummy - Médio" — Neutro 1, where the poison line of the element table is 100%. */
const DUMMY_MEDIO = '21065';
const CROSS_IMPACT = 2022;

const replay: any = decodeReplay(loadReplayFixture(FIXTURE));

interface State { endow?: boolean; edp?: boolean; venom?: boolean; mob?: string; }

function simulate(state: State) {
  const m: any = replayToModel(replay, items).model;
  m.class = 4254;
  if (state.endow) m.propertyAtk = ElementType.Poison;
  m.consumables = [];
  m.selectedAtkSkill = 'Cross Impact==5';

  const cls: any = new ShadowCross();
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
  const actives: Record<string, number> = {};
  if (state.edp) actives['Enchant Deadly Poison'] = 1;
  if (state.venom) actives['Potent Venom'] = 10;
  const activeIds = cls.activeSkills.map((a: any) => actives[a.name] ?? 0);
  const { equipAtks, masteryAtks, activeSkillNames, learnedSkillMap } = cls
    .setLearnSkills({ activeSkillIds: activeIds, passiveSkillIds: passiveIds })
    .getSkillBonusAndName();
  const { equipAtk: buffEquips, masteryAtk: buffMasterys }: any = collectBuffBonuses(JobBuffs as any, JobBuffs.map(() => 0), activeSkillNames);

  // The Baby Shark event gear is dated; judge it on the night this was recorded.
  const recordedAt = new Date(replay.sessionInfo.recordedAt);
  const calc = new Calculator().setMasterItems(items).setHpSpTable(hpSpTable).setClass(cls).setClock(() => recordedAt);
  calc.loadItemFromModel(m);
  new CalculatorController().runChain(calc, {
    monster: monsters[state.mob ?? QUIMERA_LAVA], equipAtks, masteryAtks, buffEquips, buffMasterys,
    consumeData: [], aspdPotion: m.aspdPotion,
    extraOptionScripts: parseOptionScripts((m.rawOptionTxts ?? []).filter(Boolean)),
    activeSkillNames, learnedSkillMap, selectedAtkSkill: m.selectedAtkSkill, selectedChances: [], usedHpL: false,
  } as any);

  const ds: any = (calc as any).damageSummary;
  const tot: any = calc.getTotalSummary();
  const c = tot.calc;
  const traits = (calc as any).dmgCalculator.traitBonus;
  const node = (id: string) => (ds.skillFormulaGraph?.max?.nodes ?? []).find((n: any) => n.id === id)?.value as number;
  return {
    crit: ds.skillMaxDamage as number,
    critMin: ds.skillMinDamage as number,
    critRate: ds.skillCriRateToMonster as number,
    weaponAtk: node('weaponAtk'),
    statusAtk: node('statusAtk'),
    window: {
      6: c.maxHp, 41: c.totalStatusAtk,
      42: (tot.weapon?.baseWeaponAtk ?? 0) + (tot.weapon?.refineBonus ?? 0) + c.totalEquipAtk,
      45: c.softDef, 47: c.softMdef, 49: c.totalHit, 50: c.totalFlee, 52: c.totalCri / 2,
      225: traits.pAtk, 227: c.res, 228: c.mres, 230: traits.cRate,
    } as Record<number, number>,
  };
}

/** The four states, with the number each of them repeats. */
const ENDOW = { state: { endow: true }, packet: 15018815, label: 'Envenenar Arma' };
const ENDOW_EDP_VENOM = { state: { endow: true, edp: true, venom: true }, packet: 58390248, label: 'endow + EDP + Adulterar Veneno' };
const EDP = { state: { edp: true }, packet: 42084056, label: 'EDP' };
const EDP_VENOM = { state: { edp: true, venom: true }, packet: 47392198, label: 'EDP + Adulterar Veneno' };

describe('EDP recording — what the file carries', () => {
  it('carries its own talents, so nothing here is typed by hand', () => {
    expect(replay.traits).toMatchObject({ pow: 100, crt: 59 });
  });

  it('is solo and clean: no food, no Aplicar Toxina, no Profanar Arma, no party buff', () => {
    const me = replay.sessionInfo.aid;
    const mine = new Set(replay.statusEvents.filter((s: any) => s.aid === me && s.isOn).map((s: any) => s.statusId));
    for (const efst of [271, 272, 273, 274, 275, 276, 685, 341, 1226, 72, 15, 1199]) expect(mine.has(efst), `EFST ${efst}`).toBe(false);
    // What it does carry: Envenenar Arma (6), EDP (114) with its pseudo-element (131) and
    // Adulterar Veneno (1194).
    for (const efst of [6, 114, 131, 1194]) expect(mine.has(efst), `EFST ${efst}`).toBe(true);
  });

  it('each state repeats one number, so every packet is a critical', () => {
    const me = replay.sessionInfo.aid;
    const onLava = replay.damage.filter((d: any) => d.source === me && d.skillId === CROSS_IMPACT && replay.entities.get(d.target)?.view === 20920);
    const counts = new Map<number, number>();
    for (const d of onLava) counts.set(Number(d.damage), (counts.get(Number(d.damage)) ?? 0) + 1);
    expect([...counts.entries()].sort((a, b) => b[1] - a[1])).toEqual([
      [ENDOW_EDP_VENOM.packet, 14], [ENDOW.packet, 9], [EDP.packet, 6], [EDP_VENOM.packet, 4],
    ]);
  });
});

describe('EDP recording — the build reproduces the whole status window', () => {
  const r = simulate({ endow: true });

  it('all twelve fields the client sent', () => {
    expect(r.window).toEqual({
      41: 933, 42: 1296, 45: 197, 47: 105, 49: 572, 50: 643, 52: 138,
      225: 107, 227: 41, 228: 33, 230: 27, 6: 101465,
    });
  });
});

describe('EDP against a Fogo 3 target — the weapon turns poison, the status ATK does not', () => {
  for (const { state, packet, label } of [ENDOW, ENDOW_EDP_VENOM, EDP, EDP_VENOM]) {
    it(`${label}: within 1% of ${packet.toLocaleString('pt-BR')}`, () => {
      const r = simulate(state);
      expect(r.critRate).toBeGreaterThanOrEqual(100);
      expect(r.crit).toBe(r.critMin);
      expect(Math.abs(packet / r.crit - 1)).toBeLessThan(0.01);
    });
  }

  /*
   * The stage, not just the total: without the fix the weapon ATK under EDP was the plain
   * weapon × (1 + 0,25 × 1,25) and the three EDP states came out 6,4-7,9% low together.
   */
  it('the weapon ATK is multiplied by the poison table entry and by 1,25, not only by 1,25', () => {
    const bare = simulate({}).weaponAtk;
    const edp = simulate({ edp: true }).weaponAtk;
    expect(edp).toBe(Math.floor(bare * 1.25 * 1.25)); // Fogo 3 takes 125% from poison
    expect(edp).not.toBe(Math.floor(bare * (1 + 0.25 * 1.25)));
  });

  it('on a Neutro target it stays the +25% it always was, so the dummy fixtures do not move', () => {
    const bare = simulate({ mob: DUMMY_MEDIO }).weaponAtk;
    expect(simulate({ edp: true, mob: DUMMY_MEDIO }).weaponAtk).toBe(Math.floor(bare * 1.25));
  });

  it('the status ATK ignores the endow while EDP is up, and takes it otherwise', () => {
    expect(simulate({ endow: true }).statusAtk).toBe(simulate({}).statusAtk * 1.25);
    expect(simulate({ endow: true, edp: true }).statusAtk).toBe(simulate({ edp: true }).statusAtk);
  });
});

describe('EDP recording — what is still open', () => {
  // Same sign and size on all three EDP states, so it is one thing and not three.
  it('the three EDP states sit 0,6% over the recording', () => {
    for (const { state, packet } of [ENDOW_EDP_VENOM, EDP, EDP_VENOM]) {
      expect(packet / simulate(state).crit).toBeCloseTo(0.994, 2);
    }
  });

  // And the state without EDP sits under it by about as much, in the other direction.
  it('the endow-only state sits 0,7% under it', () => {
    expect(ENDOW.packet / simulate(ENDOW.state).crit).toBeCloseTo(1.007, 2);
  });
});
