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
 * How Encantar com Veneno Mortal behaves against targets of different properties, measured
 * on the training dummies — `sc-edp-dummy-elements.rrf` (Ynk, Executor 240/50, POD 100 /
 * CRV 59, tra_fild, 17/09/2026). Solo, no food, no Aplicar Toxina, no Profanar Arma, and it
 * teleports, so the status window is in the file and the build reproduces all six fields.
 *
 * Four runs, three Lâminas Retalhadoras each, every packet a critical repeating one number:
 *
 *   1. EDP                      Fogo Lv1  89.441.170 · Neutro Lv1 85.645.014 · Sagrado Lv1 94.375.078
 *   2. EDP + Envenenar Arma     Fogo Lv1 131.505.738 · Neutro Lv1 85.645.014 · Sagrado Lv1 72.109.989
 *   3. + Potencializar Veneno 5 Neutro Lv1 125.812.547
 *   4. no weapon at all         1.289.134 and 5.113.024 on all three dummies
 *
 * (Sagrado reads high in run 1 because of a "Dano físico contra a propriedade Sagrado +17%"
 * random option, not because of the element table.)
 *
 * **This file settles the reading of the skill, and it overturned the previous pass.** The
 * two wikis disagree: bROWiki says the skill "acrescenta propriedade Veneno no final de todos
 * os seus ataques", iROwiki says "only the Bonus Weapon ATK portion is Poison element. The
 * rest of the ATK will not have its element changed to poison". 0.1.136-beta shipped the
 * bROWiki reading — the whole weapon ATK taking the poison line of the table — because it
 * closed a Quimera Lava recording (Fogo 3) where every target shared the same 125% entry and
 * nothing could separate the two.
 *
 * Here the entries are 150%, 100% and 75%, and they separate them at once. Under the bROWiki
 * reading the simulator ran 8% **over** on Fogo and 18% **under** on Sagrado; under iROwiki's
 * it is the **same** distance from every packet whatever the element (run 1: 1,0808, 1,0805,
 * 1,0708; run 2: 1,0826, 1,0805, 1,0694). A residual that does not move with the element is
 * not an element problem, so the element rule is iROwiki's and the engine is back to it.
 *
 * **What this file does confirm** is the other half of that pass: while EDP is up the status
 * ATK takes no endow. With it, the endow states and the non-endow states share one residual
 * (1,0826 against 1,0808 on Fogo); with the status endowed they disagree by ~2%.
 *
 * Two facts fall out of the recording itself, without any simulation:
 *
 *  - Envenenar Arma changes **nothing** on the Neutro dummy (85.645.014 in runs 1 and 2,
 *    to the unit) and multiplies by 1,4703 on Fogo and 0,8420 on Sagrado — the 150% and 75%
 *    entries of the poison line, so the endow is what carries the weapon's element;
 *  - Potencializar Veneno Nv5 on the Neutro dummy multiplies by **1,4690**, which is the same
 *    1,47 the Fogo dummy shows: the debuff moves the poison entry from 100% to 150%.
 *
 * **What closed the file.** Every packet used to sit ~8% above the simulator, element by
 * element, and 4,5% above it bare-handed; the same residual rode the RES recordings of the
 * same character. It was never EDP: it is the **[Visual] Cabeça do Baby Shark**, whose
 * pt-BR text lists only "Dano físico e mágico contra todos os tamanhos +10%" while the item
 * pays properties as well ("against enemies of all properties and sizes", divine-pride
 * 401367). Ten points of `p_element_all` is the whole difference, and the file measures it
 * rather than fitting it: the residual is the same on Fogo, Neutro and Sagrado, so it is not
 * the element table; it survives taking the weapon off, so it is not the weapon; and it
 * scales with the group-B share exactly, so it is not a flat term. `sc-cross-impact.rrf`, an
 * Executor with the same talents and no Baby Shark, already matched to the unit.
 *
 * The second half is the **status ATK**. Under EDP it was already read as Neutro; the
 * Quimera file's three Envenenar Arma states (EDP off) say the poison endow never reaches
 * it at all — each sat exactly one endow step, 466,5 of ATQ, high. With both changes the
 * sixteen packets of the two recordings land within 0,008%, and both are asserted below
 * together with the reversions that would break them.
 */

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const monsters = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));
const hpSpTable = JSON.parse(readFileSync('src/assets/demo/data/hp_sp_table.json', 'utf8'));

const DUMMIES = 'sc-edp-dummy-elements.rrf';
/** The Quimera Lava file of the same character, three hours earlier — Fogo 3, RES 471. */
const QUIMERA = 'sc-edp-element-states.rrf';
const CROSS_IMPACT = 2022;
/** Training dummies, all Médio/Amorfo/DEF 0, differing only in property. */
const FOGO = '21080';
const NEUTRO = '21077';
const SAGRADO = '21083';

const replay: any = decodeReplay(loadReplayFixture(DUMMIES));

interface State { endow?: boolean; endowWith?: ElementType; edp?: boolean; venom?: number; potent?: boolean; bare?: boolean; noHeadElement?: boolean; mob: string; file?: string }

function simulate(state: State) {
  const src: any = state.file ? decodeReplay(loadReplayFixture(state.file)) : replay;
  const inv = new Map<any, any>([...src.initialInventory].map(([k, r]: any) => [k, { ...r, cards: [...(r.cards ?? [])] }]));
  // Run 4 takes the katar off; `equipped` is the e_equip_pos bitmask, 0x02 is the right hand.
  if (state.bare) for (const [k, v] of inv) if ((v.equipped & 0x02) !== 0) inv.set(k, { ...v, equipped: 0 });

  const m: any = replayToModel({ ...src, initialInventory: inv }, items).model;
  m.class = 4254;
  Object.assign(m, src.traits);
  if (state.endow) m.propertyAtk = ElementType.Poison;
  if (state.endowWith) m.propertyAtk = state.endowWith;
  // The reversion the guards below need: the head as the pt-BR client text describes it,
  // i.e. everything it pays except the ten points of "contra todas as propriedades".
  const options = [...((m.rawOptionTxts ?? []) as string[])].filter(Boolean);
  if (state.noHeadElement) {
    m.costumeUpper = undefined;
    options.push('atk:50', 'cri:10', 'p_size_all:10');
  }
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
  const actives: Record<string, number> = {};
  if (state.edp) actives['Enchant Deadly Poison'] = 1;
  if (state.venom) actives['Venom Impression'] = state.venom;
  if (state.potent) actives['Potent Venom'] = 10;
  const activeIds = cls.activeSkills.map((a: any) => actives[a.name] ?? 0);
  const { equipAtks, masteryAtks, activeSkillNames, learnedSkillMap } = cls
    .setLearnSkills({ activeSkillIds: activeIds, passiveSkillIds: passiveIds })
    .getSkillBonusAndName();
  const { equipAtk: buffEquips, masteryAtk: buffMasterys }: any = collectBuffBonuses(JobBuffs as any, JobBuffs.map(() => 0), activeSkillNames);

  // The Baby Shark event gear is dated; judge it on the night this was recorded.
  const recordedAt = new Date(src.sessionInfo.recordedAt);
  const calc = new Calculator().setMasterItems(items).setHpSpTable(hpSpTable).setClass(cls).setClock(() => recordedAt);
  calc.loadItemFromModel(m);
  new CalculatorController().runChain(calc, {
    monster: monsters[state.mob], equipAtks, masteryAtks, buffEquips, buffMasterys,
    consumeData: [], aspdPotion: m.aspdPotion,
    extraOptionScripts: parseOptionScripts(options),
    activeSkillNames, learnedSkillMap, selectedAtkSkill: m.selectedAtkSkill, selectedChances: [], usedHpL: false,
  } as any);

  const ds: any = (calc as any).damageSummary;
  const tot: any = calc.getTotalSummary();
  const c = tot.calc;
  const node = (id: string) => (ds.skillFormulaGraph?.max?.nodes ?? []).find((n: any) => n.id === id)?.value as number;
  return {
    crit: ds.skillMaxDamage as number, critMin: ds.skillMinDamage as number, critRate: ds.skillCriRateToMonster as number,
    weaponAtk: node('weaponAtk'), statusAtk: node('statusAtk'),
    elementBonus: (calc as any).totalEquipStatus.p_element_all as number,
    window: {
      6: c.maxHp, 41: c.totalStatusAtk,
      42: (tot.weapon?.baseWeaponAtk ?? 0) + (tot.weapon?.refineBonus ?? 0) + c.totalEquipAtk,
      49: c.totalHit, 50: c.totalFlee, 52: c.totalCri / 2,
    } as Record<number, number>,
  };
}

/** The packets, by run and dummy. */
const P = {
  edp: { [FOGO]: 89441170, [NEUTRO]: 85645014, [SAGRADO]: 94375078 },
  edpEndow: { [FOGO]: 131505738, [NEUTRO]: 85645014, [SAGRADO]: 72109989 },
  venomImpression: 125812547,
  bareCrit: 5113024,
} as const;

describe('EDP on the dummies — what the file carries', () => {
  it('carries its own talents and the four runs', () => {
    expect(replay.traits).toMatchObject({ pow: 100, crt: 59 });
    const me = replay.sessionInfo.aid;
    const counts = new Map<string, number>();
    for (const d of replay.damage.filter((d: any) => d.source === me && d.skillId === CROSS_IMPACT && Number(d.damage) > 0)) {
      const key = `${replay.entities.get(d.target)?.view}:${d.damage}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    // The Neutro dummy prints the same number in runs 1 and 2 — the endow does nothing there.
    expect(counts.get(`${FOGO}:${P.edp[FOGO]}`)).toBe(3);
    expect(counts.get(`${SAGRADO}:${P.edp[SAGRADO]}`)).toBe(3);
    expect(counts.get(`${NEUTRO}:${P.edp[NEUTRO]}`)).toBe(6);
    expect(counts.get(`${NEUTRO}:${P.venomImpression}`)).toBe(3);
  });

  /* No simulation involved: the recording alone says what the endow does. */
  it('the endow does nothing on Neutro and moves Fogo and Sagrado by the table entries', () => {
    expect(P.edpEndow[NEUTRO]).toBe(P.edp[NEUTRO]);
    expect(P.edpEndow[FOGO] / P.edp[FOGO]).toBeCloseTo(1.47, 2);
    // 0,75 of the table, lifted slightly by the "+17% contra Sagrado" random option.
    expect(P.edpEndow[SAGRADO] / P.edp[SAGRADO]).toBeCloseTo(0.764, 2);
  });

  it('Potencializar Veneno Nv5 is worth the same 1,47 — it moves the poison entry to 150%', () => {
    expect(P.venomImpression / P.edp[NEUTRO]).toBeCloseTo(P.edpEndow[FOGO] / P.edp[FOGO], 2);
  });
});

describe('EDP on the dummies — the build reproduces the status window', () => {
  it('ATQ 933, ATQ Equip. 1.296, Precisão 572, Esquiva 643, CRIT 138, HP máx. 101.468', () => {
    const w = simulate({ edp: true, mob: NEUTRO }).window;
    expect({ ...w, 6: Math.abs(w[6] - 101468) <= 5 ? 101468 : w[6] }).toEqual({ 41: 933, 42: 1296, 49: 572, 50: 643, 52: 138, 6: 101468 });
  });
});

describe('EDP and the element table — only the +25% bonus is poison', () => {
  /*
   * The guard: under the reading that the whole weapon ATK turns poison, these three would
   * spread by more than 25 points (0,92 on Fogo against 1,18 on Sagrado). They do not.
   */
  it('the distance to the recording is the same on Fogo, Neutro and Sagrado', () => {
    const ratios = [FOGO, NEUTRO, SAGRADO].map((mob) => P.edp[mob] / simulate({ edp: true, mob }).crit);
    expect(Math.max(...ratios) - Math.min(...ratios)).toBeLessThan(0.015);
  });

  it('and the same again with the endow on', () => {
    const ratios = [FOGO, NEUTRO, SAGRADO].map((mob) => P.edpEndow[mob] / simulate({ edp: true, endow: true, mob }).crit);
    expect(Math.max(...ratios) - Math.min(...ratios)).toBeLessThan(0.015);
  });

  it('the weapon ATK under EDP is the weapon plus 25% of it at the table entry', () => {
    const bare = simulate({ mob: NEUTRO }).weaponAtk;
    for (const [mob, entry] of [[FOGO, 1.5], [NEUTRO, 1], [SAGRADO, 0.75]] as const) {
      expect(Math.abs(simulate({ edp: true, mob }).weaponAtk - bare * (1 + 0.25 * entry)), mob).toBeLessThanOrEqual(1);
    }
  });
});

describe('EDP and the status ATK — the poison endow never reaches it', () => {
  it('the status ATK is the same with and without the endow while EDP is up', () => {
    expect(simulate({ edp: true, endow: true, mob: FOGO }).statusAtk).toBe(simulate({ edp: true, mob: FOGO }).statusAtk);
  });

  it('and the same with EDP off — Envenenar Arma does not scale it either', () => {
    expect(simulate({ endow: true, mob: FOGO }).statusAtk).toBe(simulate({ mob: FOGO }).statusAtk);
  });

  /* The endow and non-endow runs share one residual — which is what the status being
   * neutral produces; endowing it puts ~2% between them. */
  it('so the endow states sit the same distance from the recording as the others', () => {
    const withEndow = P.edpEndow[FOGO] / simulate({ edp: true, endow: true, mob: FOGO }).crit;
    const without = P.edp[FOGO] / simulate({ edp: true, mob: FOGO }).crit;
    expect(Math.abs(withEndow - without)).toBeLessThan(0.005);
  });
});

describe('EDP — every packet of the two recordings, to the unit', () => {
  /* The two clean sessions of 17/09/2026: the dummies (this file) and the Quimera Lava run
   * three hours earlier. Sixteen distinct packets — four target elements on the Quimeras and
   * three on the dummies, four races, two sizes, with and without EDP, with and without the
   * endow, with and without Adulterar Veneno and Potencializar Veneno. */
  const PACKETS: Array<[string, State, number]> = [
    ['bonecos · EDP · Fogo Lv1', { edp: true, mob: FOGO }, P.edp[FOGO]],
    ['bonecos · EDP · Neutro Lv1', { edp: true, mob: NEUTRO }, P.edp[NEUTRO]],
    ['bonecos · EDP · Sagrado Lv1', { edp: true, mob: SAGRADO }, P.edp[SAGRADO]],
    ['bonecos · EDP + Envenenar Arma · Fogo Lv1', { edp: true, endow: true, mob: FOGO }, P.edpEndow[FOGO]],
    ['bonecos · EDP + Envenenar Arma · Neutro Lv1', { edp: true, endow: true, mob: NEUTRO }, P.edpEndow[NEUTRO]],
    ['bonecos · EDP + Envenenar Arma · Sagrado Lv1', { edp: true, endow: true, mob: SAGRADO }, P.edpEndow[SAGRADO]],
    ['bonecos · + Potencializar Veneno Nv5 · Neutro Lv1', { edp: true, endow: true, venom: 5, mob: NEUTRO }, P.venomImpression],
    ['bonecos · sem arma, sem EDP · Neutro Lv1', { bare: true, mob: NEUTRO }, P.bareCrit],
    ['Quimera · só Envenenar Arma · Lava (Fogo 3)', { endow: true, mob: '20920', file: QUIMERA }, 15018815],
    ['Quimera · só Envenenar Arma · Galensis (Terra 3)', { endow: true, mob: '20923', file: QUIMERA }, 25232375],
    ['Quimera · só Envenenar Arma · Fulgor (Água 3)', { endow: true, mob: '20921', file: QUIMERA }, 21396032],
    ['Quimera · EDP + encanto + Adulterar · Lava', { edp: true, endow: true, potent: true, mob: '20920', file: QUIMERA }, 58390248],
    ['Quimera · EDP + encanto + Adulterar · Napeo (Vento 3)', { edp: true, endow: true, potent: true, mob: '20922', file: QUIMERA }, 77326977],
    ['Quimera · EDP + encanto + Adulterar · Fulgor', { edp: true, endow: true, potent: true, mob: '20921', file: QUIMERA }, 87558233],
    ['Quimera · só EDP · Lava', { edp: true, mob: '20920', file: QUIMERA }, 42084056],
    ['Quimera · EDP + Adulterar · Lava', { edp: true, potent: true, mob: '20920', file: QUIMERA }, 47392198],
  ];

  it.each(PACKETS)('%s', (_label, state, packet) => {
    // 0,02% covers the floors the chain takes after the last exact stage; the worst of the
    // sixteen is 0,008%.
    expect(Math.abs(packet / simulate(state).crit - 1)).toBeLessThan(0.0002);
  });
});

describe('EDP — what the two fixes are worth, measured by taking them back out', () => {
  /* Without the Baby Shark head the whole set falls back to the residual that stood before
   * it: ~8% with a weapon, 4,5% bare-handed — element-independent both times, which is what
   * said the answer was a flat ten points of "contra todas as propriedades" and not the
   * element table. */
  it('drop the head and every packet is ~8% short again, whatever the element', () => {
    const ratios = [FOGO, NEUTRO, SAGRADO].map((mob) => P.edp[mob] / simulate({ edp: true, mob, noHeadElement: true }).crit);
    for (const r of ratios) expect(r).toBeGreaterThan(1.065);
    for (const r of ratios) expect(r).toBeLessThan(1.085);
    expect(Math.max(...ratios) - Math.min(...ratios)).toBeLessThan(0.015);
    expect(P.bareCrit / simulate({ bare: true, mob: NEUTRO, noHeadElement: true }).crit).toBeCloseTo(1.045, 2);
  });

  it('the head is worth exactly ten points of "contra todas as propriedades"', () => {
    // 22 with it, 12 without — the 12 being the Malha/Greva Sombria do Mastodonte set, which
    // is the build's only other element bonus.
    expect(simulate({ edp: true, mob: NEUTRO }).elementBonus).toBe(22);
    expect(simulate({ edp: true, mob: NEUTRO, noHeadElement: true }).elementBonus).toBe(12);
  });

  /* The status ATK half only shows with EDP *off*, because EDP already neutralised it: the
   * three Envenenar Arma states above each carried one endow step too many. */
  it('the poison endow leaves the status ATK Neutro, with or without EDP', () => {
    const neutral = simulate({ mob: '20920', file: QUIMERA }).statusAtk;
    expect(simulate({ endow: true, mob: '20920', file: QUIMERA }).statusAtk).toBe(neutral);
    expect(simulate({ edp: true, endow: true, mob: '20920', file: QUIMERA }).statusAtk).toBe(neutral);
    // 466,5 is the step the three Quimera states were off by — Fogo 3 takes the poison line
    // at 125%, so a quarter of the Neutro status ATK.
    expect(neutral * 0.25).toBeCloseTo(466.5, 1);
  });

  it('a converter or Aspersio still reaches it — only the poison endow is exempt', () => {
    const neutral = simulate({ mob: '20920', file: QUIMERA }).statusAtk;
    // Água contra Fogo 3: 200% na tabela.
    expect(simulate({ endowWith: ElementType.Water, mob: '20920', file: QUIMERA }).statusAtk).toBe(neutral * 2);
  });
});
