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
 * `gc-cross-impact-weapons.rrf` — "KZGX", Sicário base 160 / job 53, on tra_fild against
 * the training dummies, 15/08/2026. Tracker card R58WLWhJPQ, sent by KZGX through the
 * "Ajude o simulador" dialog. Lâminas Retalhadoras Lv5 throughout.
 *
 * A 3rd class, so there are no traits to ask for: the recording never changes map and
 * carries no `ZC_COUPLESTATUS`, but the status window answers it anyway — SP 225 to 230
 * (P.ATQ, S.ATQM, RES, RESM, C.Mais, T.CRÍT) all arrive as 0 on every equipment change.
 *
 * The file swaps weapons on camera — Katar de Apoio Crítico +13 → Punhal Metálico +7 →
 * Katar Metálico +7 → back — which re-sends the whole status window three times and gives
 * two ATK levels to read the same skill at. Only six of its thirteen damage packets are
 * the recorder's: tra_fild is a public field and the stream also carries another player's
 * Lâminas de Loki and a third one's 3,2 M hit, so `source` has to be filtered.
 *
 * Two data defects fell out of it, both measured here:
 *
 *  1. **The Manuks set was registered from one line of four.** `15038` had the combo's
 *     "Dano de [Lâminas Retalhadoras] +20%" and nothing else; the pt-BR set block also
 *     grants "Dano crítico +40%", "CRIT +15" and "Esquiva +10". Without the crit damage
 *     every packet in the file sat 5% to 17% **above** the simulator's critical ceiling.
 *  2. **The Katar Metálico (1296) was not in item.json at all**, so the third state
 *     imported with no weapon and its packet could not be read.
 *
 * With both fixed the six packets land inside the critical range, and the class formula
 * itself needed no change — `(1400 + 150 × nível) × nívelBase / 100` reproduces the file.
 */

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const monsters = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));
const hpSpTable = JSON.parse(readFileSync('src/assets/demo/data/hp_sp_table.json', 'utf8'));

const CROSS_IMPACT = 2022;
const DUMMY_MEDIO = '21065';
const DUMMY_GRANDE = '21066';

const replay: any = decodeReplay(loadReplayFixture('gc-cross-impact-weapons.rrf'));
const aid = replay.sessionInfo.aid;

/**
 * The build as it stood at `t`: the t=0 inventory snapshot with every equip change up to
 * then folded onto it by inventory slot, then read by the same importer the app uses.
 */
function stateAt(t: number) {
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
  return replayToModel({ ...replay, initialInventory: inv } as any, items).model as any;
}

/** Full engine run on the build worn at `t`, through the same chain the page uses. */
function sim(t: number, target: string) {
  const m = stateAt(t);
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
  // No toggle is on: the only EFSTs the recorder carries are the four every recording has
  // (802/993/994/1312) plus 46, the post-cast-delay marker, for 500 ms at each cast.
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
  const tot: any = calc.getTotalSummary();
  const dmg: any = (calc as any).dmgCalculator;
  return {
    model: m,
    bonus: (calc as any).totalEquipStatus as Record<string, number>,
    // Status-window columns, on the same terms as the recording's ZC_PAR_CHANGE.
    atkStatus: tot.calc.totalStatusAtk as number,
    equipAtk: ((tot.weapon?.baseWeaponAtk ?? 0) + (tot.weapon?.refineBonus ?? 0) + tot.calc.totalEquipAtk) as number,
    amotion: Math.round((200 - tot.calc.totalAspd) * 10),
    pAtk: dmg.traitBonus.pAtk as number,
    cRate: dmg.traitBonus.cRate as number,
    res: tot.calc.res as number,
    mres: tot.calc.mres as number,
    cri: tot.calc.totalCri as number,
    totalHit: ds.skillTotalHit as number,
    canCri: !!ds.skillCanCri,
    criMin: Math.round(ds.skillMinDamage as number),
    criMax: Math.round(ds.skillMaxDamage as number),
    noCriMin: Math.round(ds.skillMinDamageNoCri as number),
    noCriMax: Math.round(ds.skillMaxDamageNoCri as number),
    criRate: ds.skillCriRateToMonster as number,
  };
}

/** The three windows the equip timeline draws — swaps at 13.817 / 15.324 / 20.802 ms. */
const KATAR_APOIO = 10_000;
const PUNHAL = 14_500;
const KATAR_METALICO = 16_000;

describe('Sicário — Lâminas Retalhadoras, gravação de KZGX (R58WLWhJPQ)', () => {
  it('imports the three weapons the equipment packets swap', () => {
    expect([stateAt(KATAR_APOIO).weapon, stateAt(KATAR_APOIO).weaponRefine]).toEqual([610013, 13]);
    expect([stateAt(PUNHAL).weapon, stateAt(PUNHAL).weaponRefine]).toEqual([13079, 7]);
    // Katar Metálico, added to item.json for this recording — without it the third state
    // imports with no weapon at all and its packet cannot be read.
    expect([stateAt(KATAR_METALICO).weapon, stateAt(KATAR_METALICO).weaponRefine]).toEqual([1296, 7]);
  });

  /**
   * Straight off the ZC_PAR_CHANGE bursts. SP 41 (ATQ), 42 (ATQ Equip.) and 53 (amotion)
   * are re-sent whole at each swap; 225-230 are all zero, which is what a 3rd class with
   * no traits looks like and is why none had to be asked for.
   */
  it('reads back all three recorded status windows', () => {
    const katar = sim(KATAR_APOIO, DUMMY_MEDIO);
    expect(katar.atkStatus).toBe(205);
    expect(katar.equipAtk).toBe(385); // 200 base + 91 de refino + 39 do script + 30 por nível + 25 do resto
    expect(katar.amotion).toBe(260); // VelAtq 174
    expect([katar.pAtk, katar.cRate, katar.res, katar.mres]).toEqual([0, 0, 0, 0]);

    const punhal = sim(PUNHAL, DUMMY_MEDIO);
    expect(punhal.atkStatus).toBe(205);
    expect(punhal.equipAtk).toBe(200);
    expect(punhal.amotion).toBe(260);

    const metalico = sim(KATAR_METALICO, DUMMY_MEDIO);
    expect(metalico.atkStatus).toBe(205);
    expect(metalico.equipAtk).toBe(220); // 75 base + 35 de refino + 35 do script + 50 por nível + 25 do resto
    expect(metalico.amotion).toBe(260);
  });

  /**
   * The Manuks set: `15038` names [Anel], [Botas] and [Capuz] and all three are worn here.
   * Only the "Dano de [Lâminas Retalhadoras] +20%" line was ever registered.
   */
  it('grants the whole Manuks set bonus, not just its skill line', () => {
    const b = sim(KATAR_APOIO, DUMMY_MEDIO).bonus;
    expect(b['2022']).toBe(60); // 20 do conjunto + 25 (refino 9) + 15 (refino 13) da katar
    expect(b['cri']).toBe(60); // 15 conjunto + 15 katar + 12 Luva de Sorte + 5 encanto + 3 anel + 10 sombra
    expect(b['criDmg']).toBe(71); // 40 do conjunto, o resto do capuz, do traje e da luva
    expect(b['flee']).toBe(62); // 10 do conjunto + 12 do capuz + 40 do resto
  });

  /**
   * The six packets, all of them Lâminas Retalhadoras Lv5. `count` is 7 and the skill
   * declares `hit: 7` — display only, `totalHit` 1 — so the packet is **one** hit and
   * neither side gets divided (skill review §5).
   *
   * They are criticals: at CRIT 101 with a katar the skill's half-CRIT chance saturates.
   * They are not identical because this build's DEX is low enough that the weapon's ATK
   * roll survives the critical, so the comparison is against the whole critical range
   * rather than against a single number.
   */
  const PACOTES: { ms: number; alvo: string; janela: number; dano: number }[] = [
    { ms: 1682, alvo: DUMMY_GRANDE, janela: KATAR_APOIO, dano: 132762 },
    { ms: 3417, alvo: DUMMY_GRANDE, janela: KATAR_APOIO, dano: 136738 },
    { ms: 5123, alvo: DUMMY_MEDIO, janela: KATAR_APOIO, dano: 153839 },
    { ms: 7057, alvo: DUMMY_MEDIO, janela: KATAR_APOIO, dano: 160405 },
    { ms: 9096, alvo: DUMMY_GRANDE, janela: KATAR_APOIO, dano: 144690 },
    { ms: 16924, alvo: DUMMY_MEDIO, janela: KATAR_METALICO, dano: 71274 },
  ];

  it('reads the recorder own packets, and only those', () => {
    const mine = (replay.damage ?? []).filter((d: any) => d.source === aid);
    expect(mine.length).toBe(PACOTES.length);
    expect(mine.map((d: any) => d.damage)).toEqual(PACOTES.map((p) => p.dano));
    expect(mine.every((d: any) => d.skillId === CROSS_IMPACT && d.skillLevel === 5 && d.hits === 7)).toBe(true);
    // Seven of the thirteen belong to other players standing on the same field.
    expect((replay.damage ?? []).length).toBe(13);
  });

  it.each(PACOTES)('$dano @$ms falls inside the critical range', ({ alvo, janela, dano }) => {
    const r = sim(janela, alvo);
    expect(r.totalHit).toBe(1);
    expect(r.canCri).toBe(true);
    expect(dano).toBeGreaterThanOrEqual(r.criMin);
    expect(dano).toBeLessThanOrEqual(r.criMax);
    expect(r.criMax / r.criMin).toBeLessThan(1.15);
  });

  /**
   * The width guard, pinned per state rather than left as one loose bound. It is the ATK
   * roll and nothing else, so it is a property of the weapon: the Katar de Apoio carries
   * 200 base ATK against ~185 of fixed bonuses and rolls 12-14%, while the Katar Metálico's
   * 75 base sits under 145 of fixed bonuses and barely moves. **That last state is the
   * tight measurement in this file** — a 2,4% window with the packet inside it, which no
   * wrong ratio survives; the wide ones only corroborate it.
   */
  it('keeps the critical windows as tight as each weapon allows', () => {
    const largura = (t: number, alvo: string) => {
      const r = sim(t, alvo);
      return Math.round((r.criMax / r.criMin) * 1000) / 1000;
    };
    expect(largura(KATAR_APOIO, DUMMY_GRANDE)).toBe(1.122);
    expect(largura(KATAR_APOIO, DUMMY_MEDIO)).toBe(1.141);
    expect(largura(KATAR_METALICO, DUMMY_MEDIO)).toBe(1.024);
  });

  it('leaves no packet inside the non-critical range, so the reading is unambiguous', () => {
    for (const p of PACOTES) {
      const r = sim(p.janela, p.alvo);
      expect(p.dano).toBeGreaterThan(r.noCriMax);
    }
  });

  /**
   * **Open residual: the CRIT column is 2 points high.** The recording prints SP 52 = 101
   * with the Katar de Apoio Crítico and 86 with the Katar Metálico — a difference of
   * exactly the katar's own "CRIT +15", which is what proves the client does *not* double
   * the number it shows for a katar, and that the set's "CRIT +15" is really there (drop it
   * and the SOR term would have to be 56).
   *
   * **CLOSED on 29/08/2026.** Neither of the decompositions this comment used to weigh was
   * right, and no third SOR value was needed to see it — the LUK term is not a whole number
   * at all. rAthena keeps CRIT in **tenths** and truncates once, at display (status.cpp,
   * RENEWAL): `piso(nívelBase / 10) + 10 + SOR × 3`, with flat equipment CRIT joining as
   * `× 10`. Here that is `16 + 10 + 390 = 41,6` for the SOR leg — which is exactly the 41
   * the recording implied, and it was never reachable by rounding a per-LUK integer.
   *
   * `getBaseCriRate` used `piso(SOR ÷ 3)`, a ~0,333 slope against the real 0,3, and dropped
   * base level entirely. It agreed with the client only near SOR 100 at base 170. Two more
   * Sicário recordings pinned the drift either side of that point (LfVVfKMZg3 at SOR 113 was
   * one high, TxYGFDGEn7 at SOR 133 two), and the same fix closed the identical pins in
   * `Shinkiro.shadow-flash-gear-states.spec.ts` and `pet-and-shadow-atk.spec.ts`.
   */
  it('reproduces the recorded Crítico from the status window', () => {
    const katar = sim(KATAR_APOIO, DUMMY_MEDIO);
    const metalico = sim(KATAR_METALICO, DUMMY_MEDIO);
    // The engine's figure carries the katar doubling and the client's does not; rAthena
    // doubles the tenths before truncating, so recovering the client number takes a floor
    // rather than a plain halving.
    expect(Math.floor(katar.cri / 2)).toBe(101); // gravado: 101
    expect(Math.floor(metalico.cri / 2)).toBe(86); // gravado: 86
    // The katar's own +15 lands undoubled on both sides, which is the part that agrees.
    expect((katar.cri - metalico.cri) / 2).toBe(15);
    // And it is far enough over the line that the skill crits regardless.
    expect(katar.criRate).toBeGreaterThanOrEqual(99);
  });
});
