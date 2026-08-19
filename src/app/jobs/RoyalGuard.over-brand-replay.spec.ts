import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Calculator } from 'src/app/core/calculator';
import { CalculatorController } from 'src/app/core/calculator-controller';
import { parseOptionScripts } from 'src/app/core/option-scripts';
import { loadReplayFixture } from 'src/app/replay/__tests__/load-fixture';
import { importReplayBuffer } from 'src/app/replay/replay-to-model';
import { SKILL_ID_BY_NAME } from 'src/app/skills';
import { ImperialGuard } from './ImperialGuard';

/**
 * Lança do Destino (Over Brand) and Espiral Lunar (Moon Slasher), measured against an
 * in-game LATAM recording of an Imperial Guard hitting the tra_fild training dummies.
 *
 * Source: tracker card https://issues.latam-tools.com.br/admin?card=3Y2CGeLFVj
 * ("teste keen dummie.rrf", Keen", 74 s, 60 damage packets, 17/08/2026), committed as
 * `src/app/replay/__tests__/fixtures/ig-lanca-do-destino.rrf`. The traits are not in the
 * file (a session recorded inside one map never fires ZC_COUPLESTATUS) — the card carries
 * them, typed by whoever recorded it: **POD 86, everything else 0**.
 *
 * **What it found.** Over Brand's ratio was 300%/level (450% under Espiral Lunar); the
 * client's own table says **350% / 500%** (Lv5: 1.750% / 2.500%). The recording proves it
 * from the inside, with no reference to any absolute number: it holds the Espiral Lunar
 * bonus (EFST 1315) on and off inside the same buff state, and the damage ratio between
 * the two is what the two candidate tables disagree about —
 *
 *            with bonus / without bonus, at STR+DEX = 327 and base level 221
 *   300/450  (2.250 + 327) / (1.500 + 327) = 1,410
 *   350/500  (2.500 + 327) / (1.750 + 327) = 1,361      <- the recording: 1,3626
 *
 * (15 packets without the bonus, 12 with it, same gear and same buffs throughout.)
 *
 * **The recording drives the build; nothing here is retyped.** `importReplayBuffer` reads
 * the 19 equipped pieces, their refines, cards, socket enchants and random options, and
 * the learned skill tree, and the character it produces reproduces the recording's own
 * ZC_PAR_CHANGE status window exactly — see the first describe. That is what makes the
 * damage figures below a measurement of the *formula* rather than of the build.
 *
 * **Three states, from one file.** The recording walks through its own buff timeline, and
 * every state change is dated by an EFST or a ZC_PAR_CHANGE:
 *
 *   t=0        Posição de Defesa (EFST 1202) + Montaria (27)
 *   t=31,3 s   Consagração Lv5 (407)   -> ATQ equip. 372 -> 572 (+200)
 *   t=37,1 s   Posição de Defesa off, Posição de Ataque on (1202/1203)
 *                                      -> ATQ equip. 572 -> 822 (+250), DEF 491 -> 291
 *   t=38,7 s   Aegis Domini Lv3 (1316) -> ATQ equip. 822 -> 972 (+150)
 *   t=63,9 s   Rapidez com Lança (68)  -> Crít. 33 -> 63 (não muda estas habilidades)
 *
 * so "era A" (before 31,3 s) and "era C" (after 38,7 s) are two independent measurements
 * of the same formula at two different ATK levels, and both are asserted below.
 *
 * **Posição de Defesa came out of this recording.** The calculator had Posição de Ataque
 * and no counterpart for the defensive stance, whose client table reads "Nv 5: DEF +300,
 * ATQ -250"; the recording is what showed the -250 is real (the +250 above, the instant it
 * is dropped), and era A only closes with it applied. It is a modelled class skill now, and
 * these tests are what hold its table. Every other buff in the recording (Consagração,
 * Aegis Domini, Posição de Ataque, Montaria) was already one.
 */

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const monsters = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));
const hpSpTable = JSON.parse(readFileSync('src/assets/demo/data/hp_sp_table.json', 'utf8'));

/** The three tra_fild dummies the recording hits, by the entity view id it reports. */
const DUMMY = { small: '21064', medium: '21065', large: '21066' } as const;

/** The buffs that were up after t=38,7 s — all four are modelled class skills. */
const ERA_C = { 'Ride Peco': 1, Inspiration: 1, 'Shield Spell': 150, 'Attack Stance': 5 };
/** Before t=31,3 s: the mount, and Posição de Defesa Lv5 ("DEF +300 l ATQ -250"). */
const ERA_A = { 'Ride Peco': 1, 'Guard Stance': 5 };

type RunOpts = {
  skill: string;
  active: Record<string, number>;
  size?: keyof typeof DUMMY;
  moonSlasher?: boolean;
};

/** Full engine run off the replay-imported build, the way the page does it. */
function run({ skill, active, size = 'medium', moonSlasher = false }: RunOpts) {
  const { model, learnedSkills } = importReplayBuffer(loadReplayFixture('ig-lanca-do-destino.rrf'), items);
  const m: any = model;
  // Traits: single-map recording, so they come from the tracker card (POD 86, rest 0).
  m.pow = 86;

  const cls = new ImperialGuard();
  // mirrors ro-calculator.component#applyLearnedSkills + #setSkillModelArray
  const pick = (dropdown: any[] = [], level: number): number => {
    if (!level) return 0;
    const byLv = dropdown.find((o) => o.skillLv === level);
    if (byLv) return byLv.value;
    const byVal = dropdown.find((o) => o.value === level);
    if (byVal) return byVal.value;
    const ranked = dropdown
      .filter((o) => o.isUse !== false)
      .map((o) => ({ value: o.value, lv: o.skillLv ?? o.value }))
      .filter((o) => typeof o.lv === 'number' && o.lv <= level)
      .sort((a, b) => b.lv - a.lv);
    return ranked.length ? ranked[0].value : 0;
  };
  const wanted = { ...active, ...(moonSlasher ? { 'Moon Slasher': 5 } : {}) };
  const passiveSkillIds = cls.passiveSkills.map((s) => pick(s.dropdown as any[], learnedSkills[SKILL_ID_BY_NAME[s.name]] ?? 0));
  const activeSkillIds = cls.activeSkills.map((s) => wanted[s.name] ?? 0);
  const { equipAtks, masteryAtks, activeSkillNames, learnedSkillMap, usedSkillMap } = cls
    .setLearnSkills({ activeSkillIds, passiveSkillIds })
    .getSkillBonusAndName();

  const bonus = cls.getJobBonusStatus(m.jobLevel);
  m.jobStr = bonus.str; m.jobAgi = bonus.agi; m.jobVit = bonus.vit;
  m.jobInt = bonus.int; m.jobDex = bonus.dex; m.jobLuk = bonus.luk;
  m.jobPow = bonus.pow; m.jobSta = bonus.sta; m.jobWis = bonus.wis;
  m.jobSpl = bonus.spl; m.jobCon = bonus.con; m.jobCrt = bonus.crt;
  m.selectedAtkSkill = skill;

  const calc = new Calculator().setMasterItems(items).setHpSpTable(hpSpTable).setClass(cls);
  calc.loadItemFromModel(m);
  new CalculatorController().runChain(calc, {
    monster: monsters[DUMMY[size]],
    equipAtks, masteryAtks,
    buffEquips: {}, buffMasterys: {},
    consumeData: [], aspdPotion: undefined,
    extraOptionScripts: parseOptionScripts(m.rawOptionTxts || []),
    activeSkillNames, learnedSkillMap, usedSkillMap,
    selectedAtkSkill: skill,
    selectedChances: [], usedHpL: false,
  } as any);

  const dmg: any = (calc as any).damageSummary;
  const total: any = calc.getTotalSummary();
  return {
    ratio: dmg.baseSkillDamage as number,
    min: dmg.skillMinDamage as number,
    max: dmg.skillMaxDamage as number,
    hit: dmg.skillHit as number,
    criBasic: dmg.criMaxDamage as number,
    pAtk: dmg.pAtk as number,
    sMatk: dmg.sMatk as number,
    cri: dmg.basicCriRate as number,
    flee: total.calc.totalFlee as number,
    hitTotal: total.calc.totalHit as number,
    statusAtk: total.calc.totalStatusAtk as number,
    /** The client's "ATQ Equip." adds the weapon's own ATK; the UI splits the two. */
    equipAtk: (total.calc.totalEquipAtk + total.weapon.baseWeaponAtk + total.weapon.refineBonus) as number,
    def: total.calc.def as number,
  };
}

/** Assert the packets recorded in one state fall inside the simulated range. */
function expectPacketsInRange(packets: number[], r: { min: number; max: number }) {
  expect(Math.min(...packets)).toBeGreaterThanOrEqual(r.min);
  expect(Math.max(...packets)).toBeLessThanOrEqual(r.max);
  // A range wider than the weapon's own ATK spread would swallow a wrong ratio whole.
  expect(r.max / r.min).toBeLessThan(1.12);
}

describe('Guardião Imperial — a build lida da gravação bate com a janela de status dela', () => {
  const r = run({ skill: 'Over Brand==5', active: ERA_C });

  // Every number here is a ZC_PAR_CHANGE from the recording itself, read after t=38,7 s.
  it('ATQ (status) = 738 — SP_ATK1', () => expect(r.statusAtk).toBe(738));
  it('ATQ Equip. = 972 — SP_ATK2 (equip 402 + arma 220 + Aegis Domini 150 + Consagração 200)', () => {
    expect(r.equipAtk).toBe(972);
  });
  it('P.ATQ = 45 — SP_PATK (POD 91 -> 30, mais Posição de Ataque Lv5 +15)', () => expect(r.pAtk).toBe(45));
  it('S.ATQM = 17 — SP_SMATK', () => expect(r.sMatk).toBe(17));
  it('Crítico = 33 — SP_CRITICAL (antes de Rapidez com Lança)', () => expect(r.cri).toBe(33));
  it('DEF = 291 — SP_DEF2 (com Posição de Ataque Lv5, -200)', () => expect(r.def).toBe(291));

  // The one basic attack in the recording (t=46,1 s, vs the Small dummy) is a critical,
  // so it uses the weapon's maximum ATK and is a single exact number, not a range.
  it('crítico de ataque básico contra o Dummy Pequeno = 6658', () => {
    expect(run({ skill: 'Over Brand==5', active: ERA_C, size: 'small' }).criBasic).toBe(6658);
  });
});

describe('Lança do Destino Nv5 — razão do cliente (350% / 500% por nível)', () => {
  it('sem Espiral Lunar: 5 x 350 + FOR + DES, x nv. base/100', () => {
    expect(run({ skill: 'Over Brand==5', active: ERA_C }).ratio).toBe(4590);
  });

  it('com Espiral Lunar: 5 x 500 + FOR + DES, x nv. base/100', () => {
    expect(run({ skill: 'Over Brand==5', active: ERA_C, moonSlasher: true }).ratio).toBe(6247);
  });

  it('o dano é mostrado em 3 golpes, como o `count` dos pacotes', () => {
    expect(run({ skill: 'Over Brand==5', active: ERA_C }).hit).toBe(3);
  });

  /**
   * The measurement that identifies the table: 350/500 puts this at 1,361 and 300/450 at
   * 1,410, and the recording's own two bands (era C, Dummy Médio) give 680.759 / 499.624.
   */
  it('a razão com/sem Espiral Lunar é 1,36 — não 1,41', () => {
    const off = run({ skill: 'Over Brand==5', active: ERA_C });
    const on = run({ skill: 'Over Brand==5', active: ERA_C, moonSlasher: true });
    expect(on.ratio / off.ratio).toBeCloseTo(1.361, 3);
  });
});

describe('Lança do Destino Nv5 — pacotes da gravação, depois de Consagração + Aegis + Posição de Ataque', () => {
  it('Dummy Médio, sem Espiral Lunar (15 pacotes, 53,2 s a 66,7 s)', () => {
    expectPacketsInRange(
      [491760, 508017, 496104, 506100, 506505, 492063, 494388, 497316, 504585, 508017, 491964, 490851, 504687, 502668, 499335],
      run({ skill: 'Over Brand==5', active: ERA_C }),
    );
  });

  it('Dummy Médio, com Espiral Lunar (6 pacotes, 68,2 s a 72,0 s)', () => {
    expectPacketsInRange(
      [689805, 689121, 674412, 681561, 679911, 669741],
      run({ skill: 'Over Brand==5', active: ERA_C, moonSlasher: true }),
    );
  });

  // Montaria cancels the spear's penalty against Medium targets, so Médio and Grande
  // have to come out identical — the recording says so too (675.330 contra 680.759 de
  // média, dentro da variação da arma).
  it('Dummy Grande, com Espiral Lunar (6 pacotes, 40,4 s a 44,0 s)', () => {
    expectPacketsInRange(
      [686784, 666717, 668778, 669741, 691182, 668778],
      run({ skill: 'Over Brand==5', active: ERA_C, moonSlasher: true, size: 'large' }),
    );
  });

  it('Dummy Pequeno, com Espiral Lunar (5 pacotes, 46,7 s a 49,7 s)', () => {
    expectPacketsInRange(
      [647751, 658746, 648852, 646791, 648852],
      run({ skill: 'Over Brand==5', active: ERA_C, moonSlasher: true, size: 'small' }),
    );
  });
});

describe('Lança do Destino Nv5 — pacotes do início da gravação, em Posição de Defesa', () => {
  // Independent of the block above: no Consagração, no Aegis Domini, no Posição de Ataque,
  // and 250 ATQ less from the defensive stance. Same formula, a very different ATK.

  // The stance's own ground truth: SP_ATK2 read 372 for the whole opening stretch, and
  // 372 = equip 402 + arma 220 - Posição de Defesa Nv5 250, with none of era C's buffs.
  it('Posição de Defesa Nv5 tira 250 do ATQ Equip. — SP_ATK2 = 372', () => {
    expect(run({ skill: 'Over Brand==5', active: ERA_A }).equipAtk).toBe(372);
  });
  // Same burst, the other half of the stance: SP_DEF2 was sent twice at t=37,1 s, 491 and
  // then 291. The 291 is Posição de Ataque's -200 off the 491, so 491 is the stance-less
  // DEF and the opening stretch ran at 491 + 300.
  it('Posição de Defesa Nv5 põe 300 na DEF — 491 sem stance vira 791', () => {
    expect(run({ skill: 'Over Brand==5', active: ERA_A }).def).toBe(791);
  });

  it('Dummy Médio, sem Espiral Lunar (7 pacotes, 17,2 s a 22,1 s)', () => {
    expectPacketsInRange(
      [302679, 306600, 314739, 310521, 310620, 301110, 307680],
      run({ skill: 'Over Brand==5', active: ERA_A }),
    );
  });

  it('Dummy Médio, com Espiral Lunar (12 pacotes, 8,3 s a 16,4 s)', () => {
    expectPacketsInRange(
      [431325, 417201, 413835, 422580, 429711, 417738, 418815, 424599, 412356, 410472, 414777, 425406],
      run({ skill: 'Over Brand==5', active: ERA_A, moonSlasher: true }),
    );
  });

  it('Dummy Grande, com Espiral Lunar (5 pacotes, 26,3 s a 29,1 s)', () => {
    expectPacketsInRange(
      [413028, 425406, 430788, 418143, 423390],
      run({ skill: 'Over Brand==5', active: ERA_A, moonSlasher: true, size: 'large' }),
    );
  });
});

describe('Espiral Lunar Nv5 — já estava certa, e a gravação confirma', () => {
  it('razão = 120 x 5 + Lança do Destino Nv5 x 80, x nv. base/100', () => {
    expect(run({ skill: 'Moon Slasher==5', active: ERA_C }).ratio).toBe(2210);
  });

  // One cast per state, so these are single rolls rather than a band: 107.753 against the
  // Grande em 39,7 s e 110.427 contra o Médio em 67,5 s, ambos na mesma faixa simulada.
  it('os dois usos da era C caem na faixa simulada', () => {
    expectPacketsInRange([107753], run({ skill: 'Moon Slasher==5', active: ERA_C, size: 'large' }));
    expectPacketsInRange([110427], run({ skill: 'Moon Slasher==5', active: ERA_C }));
  });

  it('o uso da era A também, com a Posição de Defesa aplicada', () => {
    expectPacketsInRange([70913], run({ skill: 'Moon Slasher==5', active: ERA_A, size: 'large' }));
  });
});

describe('Rapidez com Lança — CRIT e Esquiva por nível, não o Nv10 fixo de antes', () => {
  // Ground truth, both from the same ZC_PAR_CHANGE burst at t=63,9 s, when the buff went
  // up at Lv10 (the level in the recording's own skill tree): SP_CRITICAL 33 -> 63 and
  // SP_FLEE1 500 -> 520. The engine gave +30/+20 at every level, so Lv10 was the only one
  // it got right.
  const off = run({ skill: 'Over Brand==5', active: ERA_C });
  const lv10 = run({ skill: 'Over Brand==5', active: { ...ERA_C, 'Spear Quicken': 10 } });

  it('Nv10 dá CRIT +30 — 33 vira 63, como na gravação', () => {
    expect(off.cri).toBe(33);
    expect(lv10.cri).toBe(63);
  });

  it('Nv10 dá Esquiva +20 — o mesmo salto que SP_FLEE1 registrou', () => {
    expect(lv10.flee - off.flee).toBe(20);
  });

  // Not in the recording (it only ever used Lv10) — this is the client's table, which the
  // flat +30/+20 contradicted at every level below 10.
  it('Nv5 dá metade: CRIT +15, Esquiva +10', () => {
    const lv5 = run({ skill: 'Over Brand==5', active: { ...ERA_C, 'Spear Quicken': 5 } });
    expect(lv5.cri - off.cri).toBe(15);
    expect(lv5.flee - off.flee).toBe(10);
  });
});
