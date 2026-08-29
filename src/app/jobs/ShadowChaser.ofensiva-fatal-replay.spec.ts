import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Calculator } from 'src/app/core/calculator';
import { CalculatorController } from 'src/app/core/calculator-controller';
import { parseOptionScripts } from 'src/app/core/option-scripts';
import { JobBuffs } from 'src/app/constants/job-buffs';
import { collectBuffBonuses } from 'src/app/core/calculator-controller';
import { loadReplayFixture } from 'src/app/replay/__tests__/load-fixture';
import { importReplayBuffer } from 'src/app/replay/replay-to-model';
import { SKILL_ID_BY_NAME } from 'src/app/skills';
import { ShadowChaser } from './ShadowChaser';

/**
 * Shadow Chaser — Ofensiva Fatal (Fatal Menace, SC_FATALMENACE 2284) checked against
 * `shadowchaser-ofensiva-fatal.rrf`, a Renegado 170/58 hitting the **Dummy - Fantasma**
 * on tra_fild, submitted by Leonardo (tracker card `YmJXhzCyx4`, 24/08/2026).
 *
 * This is the first recording the class has ever had, and it is unusually clean. All 85
 * damage packets carry the recorder's own `source` — nothing to filter out despite a
 * second player standing on the map — and every one of them lands on the same dummy. The
 * whole EFST stream is twelve ids, of which eight are account bookkeeping
 * (`PLAYTIME_STATISTICS`, `GET_CNT_UNREAD_RODEX_*`, `AID_PERIOD_*`), one is 46
 * (post-delay) and one is 4 (Esconderijo, cast deliberately as the prerequisite for
 * Ataque Surpresa). That leaves exactly **two** real statuses, and both are ASPD and
 * nothing else: 39 "Em Fúria!" (Poção da Fúria Selvagem, Vel. de ataque +20%) and 484
 * "Suco Celular Enriquecido" (+10%). Neither touches a damage term, so the packets can be
 * held against the engine without a single unmodelled multiplier in the way.
 *
 * **Traits do not enter here.** A Renegado is a 3rd class, so POD/STA/SAB/FEI/CON/CRV do
 * not exist at all — the recording is complete without them, and there is nothing for the
 * submission dialog to have collected.
 *
 * **The count=2 packets are one roll, doubled.** All 42 Ofensiva Fatal packets, all 20
 * double basic attacks and all 14 double criticals carry an **even** `damage` — 76 of 76.
 * That is what says the server computes one hit and multiplies, rather than adding two
 * independent rolls, and it is why the per-hit figures below divide by two without
 * inventing a distribution. It also confirms the dagger branch: Jack the Knife (28767) is
 * "Tipo: Adaga", the client text promises "Se usar uma Adaga, a quantidade de ataques será
 * dobrada", and `calcSkillDmgByTotalHit` doubles it — which is why `skillMinDamage` is
 * compared to the raw packet and not to half of it.
 *
 * **The recording also pins Ataque Surpresa, both halves of it.** Sightless Mind (id 214)
 * is cast once, at 10.516 ms, and its client text reads "Pelos próximos 10 segundos…
 * Monstros Normais: recebem 30% mais dano / Monstros Chefes: 15%". Splitting the 42
 * Ofensiva Fatal packets on that ten-second window separates them cleanly, with nothing in
 * between:
 *
 *   fora da janela   19 pacotes   302.314 – 321.106   média 313.054
 *   dentro da janela 23 pacotes   346.552 – 374.432   média 360.314   ← razão 1,15096
 *
 * 1,151 is the **Boss** branch, not the normal one, and that is correct: the Dummy -
 * Fantasma carries `class: 1` in monster.json, which is rAthena's boss flag. The debuff
 * itself was already modelled — `_getRaidMultiplier` splits 115/130 and the toggle is the
 * global JobBuffs row `Raid` — so what the recording adds there is the proof that the
 * split and the branch are both right, to within 0,1 pp. The **skill** was the missing
 * half, and it was added off the back of this file (Stalker `atkSkillListHi`); its single
 * recorded packet, 23.144, lands within 0,1% of the midpoint of what the client's 800%
 * ratio predicts.
 *
 * Because the debuff is a target-side multiplier, the Ofensiva Fatal comparison below is
 * run in both states: the 19 packets against the plain build, the 23 against the same
 * build with the toggle on.
 *
 * **Open residual, ~1–2%.** The recorded maxima sit slightly above what the engine calls
 * its own maximum, consistently and in every channel:
 *
 *   ataque básico normal (por golpe)   gravado 2.792–3.041   motor 2.693–3.009   +1,1%
 *   ataque básico crítico (por golpe)  gravado 5.131–5.357   motor 4.970–5.240   +2,2%
 *   Ofensiva Fatal Nv10 (pacote)       gravado 302.314–321.106  motor 292.696–326.440
 *
 * The skill's own window sits inside the engine's range, so it is asserted; the two basic
 * channels overshoot and are pinned instead. What has been ruled out: a hidden buff (the
 * EFST stream is exhausted above, and both consumables are ASPD-only), a proc (every
 * "chance" line in all 38 equipped pieces, cards and enchants is either HP/SP leech,
 * Assumptio, or the Delírio card — which fires only "ao receber danos físicos" and cannot
 * on a dummy field), and a mis-split packet (the parity argument above). What could not be
 * ruled out: the recording carries **no status window** — its only `ZC_PAR_CHANGE` types
 * are 7/0/5/53 (SP, HP, MaxHP, amotion), so there is no SP_ATK1/SP_ATK2 to check the ATK
 * against, and with a single gear state the §9 method cannot separate an ATK-side stage
 * from a missing multiplier. A second Renegado recording — bare-handed, or swapping the
 * dagger on camera — is what would close it.
 */

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const monsters = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));
const hpSpTable = JSON.parse(readFileSync('src/assets/demo/data/hp_sp_table.json', 'utf8'));

/** "Dummy - Fantasma" (view 21085) — Médio, Amorfo, Fantasma 1, e `class: 1` (Chefe). */
const DUMMY_FANTASMA = '21085';

function simular(skillValue: string, comAtaqueSurpresa = false) {
  const { model, learnedSkills }: any = importReplayBuffer(
    loadReplayFixture('shadowchaser-ofensiva-fatal.rrf'),
    items,
  );
  const m: any = model;
  m.class = 4079;
  m.selectedAtkSkill = skillValue;

  const cls = new ShadowChaser();
  const b = cls.getJobBonusStatus(m.jobLevel);
  Object.assign(m, {
    jobStr: b.str, jobAgi: b.agi, jobVit: b.vit, jobInt: b.int, jobDex: b.dex, jobLuk: b.luk,
  });

  // Passives come from the recorded skill tree. No active is switched on: the EFST stream
  // carries none, and the two statuses it does carry are ASPD consumables.
  const passiveIds = (cls as any).passiveSkills.map((s: any) => {
    const id = SKILL_ID_BY_NAME[s.name];
    return id ? learnedSkills[id] ?? 0 : 0;
  });
  const activeIds = (cls as any).activeSkills.map(() => 0);
  const { equipAtks, masteryAtks, activeSkillNames, learnedSkillMap } = cls
    .setLearnSkills({ activeSkillIds: activeIds, passiveSkillIds: passiveIds })
    .getSkillBonusAndName();

  // "Ataque Surpresa" is the debuff row in the global JobBuffs list, keyed `raid`.
  const selectedBuffValues = JobBuffs.map((buff) => (comAtaqueSurpresa && buff.name === 'Raid' ? 1 : 0));
  const { equipAtk: buffEquips, masteryAtk: buffMasterys }: any = collectBuffBonuses(
    JobBuffs as any,
    selectedBuffValues,
    activeSkillNames,
  );

  const calc = new Calculator().setMasterItems(items).setHpSpTable(hpSpTable).setClass(cls);
  calc.loadItemFromModel(m);
  new CalculatorController().runChain(calc, {
    monster: monsters[DUMMY_FANTASMA], equipAtks, masteryAtks, buffEquips, buffMasterys,
    consumeData: [], aspdPotion: undefined,
    extraOptionScripts: parseOptionScripts((m.rawOptionTxts ?? []).filter(Boolean)),
    activeSkillNames, learnedSkillMap, selectedAtkSkill: skillValue, selectedChances: [],
    usedHpL: false,
  } as any);

  const s = (calc as any).damageSummary;
  return {
    model: m,
    baseSkillDamage: s.baseSkillDamage as number,
    golpesDeDano: s.skillTotalHit as number,
    podeCritar: !!s.skillCanCri,
    minPacote: s.skillMinDamage as number,
    maxPacote: s.skillMaxDamage as number,
    basicoMin: s.basicMinDamage as number,
    basicoMax: s.basicMaxDamage as number,
    criticoMin: s.criMinDamage as number,
    criticoMax: s.criMaxDamage as number,
  };
}

/** The 19 Ofensiva Fatal packets recorded **outside** the Ataque Surpresa window. */
const FATAL_MIN = 302314;
const FATAL_MAX = 321106;

describe('Shadow Chaser — the build comes from the recording', () => {
  it('imports Jack the Knife +9 with its two cards and the six shadow pieces', () => {
    const { model }: any = importReplayBuffer(
      loadReplayFixture('shadowchaser-ofensiva-fatal.rrf'),
      items,
    );
    expect([model.level, model.jobLevel]).toEqual([170, 58]);
    // Refino +9 is what turns on the weapon's own "Dano de [Ofensiva Fatal] +30%".
    expect([model.weapon, model.weaponRefine]).toEqual([28767, 9]);
    expect([model.weaponCard1, model.weaponCard2]).toEqual([300263, 300263]);
    expect(model.rawOptionTxts.filter(Boolean)).toHaveLength(6);
  });

  it('carries no traits — a 3rd class has none, so this is complete, not missing', () => {
    const { summary }: any = importReplayBuffer(
      loadReplayFixture('shadowchaser-ofensiva-fatal.rrf'),
      items,
    );
    expect(summary.traits).toBeNull();
    expect(summary.skippedItems).toEqual([]);
  });
});

describe('Shadow Chaser — Ofensiva Fatal Nv10 vs "Dummy - Fantasma"', () => {
  const r = simular('Fatal Manace==10');

  it('skill ratio is 2.427% — (Nv10 × 120 + AGI 114 × 2) × nível base 170/100', () => {
    // Client table, skill-meta.generated.ts id 2284: [Nv 10] 1.200%, plus the AGI term the
    // description credits in prose ("O dano é afetado pela AGI e pelo nível de base").
    // (1200 + 228) × 1,70 = 2427,6 — truncated, never rounded.
    expect(r.baseSkillDamage).toBe(2427);
  });

  it('the packet is one damage figure, doubled by the dagger rather than split in two', () => {
    // The server sends one number for the whole cast — which is why nothing here is
    // divided by the packet's count=2. The doubling is a multiplier on the damage,
    // applied by the class override, not an extra entry in skillTotalHit.
    expect(r.golpesDeDano).toBe(1);

    const cls: any = new ShadowChaser();
    const comAdaga = (weapon: string) =>
      cls.calcSkillDmgByTotalHit({
        finalDamage: 1000,
        skill: { name: 'Fatal Manace', totalHit: 1 },
        info: { weapon: { data: { typeName: weapon } } },
      });
    expect(comAdaga('dagger')).toBe(2000);
    expect(comAdaga('sword')).toBe(1000);
  });

  it('cannot crit — and no recorded Ofensiva Fatal packet is flagged critical', () => {
    expect(r.podeCritar).toBe(false);
  });

  it(`the 19 packets outside the Ataque Surpresa window fall inside ${r.minPacote}–${r.maxPacote}`, () => {
    expect(FATAL_MIN).toBeGreaterThanOrEqual(r.minPacote);
    expect(FATAL_MAX).toBeLessThanOrEqual(r.maxPacote);
  });

  it('the simulated range is tight enough for that to mean something', () => {
    // Guard from the review skill §10: a wrong ratio must not still fit the window.
    expect(r.maxPacote / r.minPacote).toBeLessThan(1.12);
  });
});

describe('Shadow Chaser — what this recording leaves open', () => {
  const r = simular('Fatal Manace==10');

  /**
   * Pinned, not asserted as correct: the recorded basic attacks overshoot the engine's own
   * maximum by ~1–2%. Ratcheted so that the gap can only shrink — if a later fix lands, one
   * of these fails and gets tightened, and if something regresses it fails too.
   */
  it('basic attacks still land above the engine ceiling, by no more than 2.5%', () => {
    const normalGravadoMax = 3041; // por golpe, dos pacotes count=2 (pares, logo exatos)
    const criticoGravadoMax = 5357;
    expect(normalGravadoMax / r.basicoMax).toBeLessThan(1.025);
    expect(normalGravadoMax / r.basicoMax).toBeGreaterThan(1); // ainda aberto
    expect(criticoGravadoMax / r.criticoMax).toBeLessThan(1.025);
    expect(criticoGravadoMax / r.criticoMax).toBeGreaterThan(1); // ainda aberto
  });

});

/**
 * Ataque Surpresa (Sightless Mind, 214) is a Rogue skill, so it lives on Stalker's
 * `atkSkillListHi` and reaches Renegado by inheritance. The recording is the only
 * measurement of it this project has, and it pins both halves at once — the hit it deals
 * and the debuff it leaves — because the character casts it exactly once, at 10.516 ms,
 * and keeps hitting the same dummy on both sides of its ten-second window.
 *
 * The **debuff** half was already in the engine before this recording: `_getRaidMultiplier`
 * returns 115 on a boss and 130 otherwise, and the toggle is the global JobBuffs row named
 * `Raid`. What the recording adds is the proof that both the split and the branch are
 * right — the dummy is `class: 1`, and the measured 1,15096 is the boss number.
 */
describe('Shadow Chaser — Ataque Surpresa Nv5 vs "Dummy - Fantasma"', () => {
  const r = simular('Sightless Mind==5');

  it('skill ratio is 800% — the client table, with no base-level or stat term', () => {
    // skill-meta.generated.ts id 214: 200/350/500/650/800 = 50 + Nv × 150.
    expect(r.baseSkillDamage).toBe(800);
  });

  it('is one melee hit and cannot crit, like the single recorded packet', () => {
    expect(r.golpesDeDano).toBe(1);
    expect(r.podeCritar).toBe(false);
  });

  it(`the recorded packet 23.144 falls inside ${r.minPacote}–${r.maxPacote}`, () => {
    const GRAVADO = 23144;
    expect(GRAVADO).toBeGreaterThanOrEqual(r.minPacote);
    expect(GRAVADO).toBeLessThanOrEqual(r.maxPacote);
    // It lands within 0,1% of the midpoint, which is what says the 800% is the right
    // ratio rather than merely a ratio the window happens to admit.
    expect(GRAVADO / ((r.minPacote + r.maxPacote) / 2)).toBeCloseTo(1, 2);
  });

  it('the simulated range is tight enough for that to mean something', () => {
    expect(r.maxPacote / r.minPacote).toBeLessThan(1.12);
  });
});

describe('Shadow Chaser — the Ataque Surpresa debuff on the target', () => {
  const semDebuff = simular('Fatal Manace==10');
  const comDebuff = simular('Fatal Manace==10', true);

  it('multiplies by exactly 1,15 on a boss — the branch the dummy falls into', () => {
    expect(comDebuff.maxPacote / semDebuff.maxPacote).toBeCloseTo(1.15, 5);
    // monster.json 21085 carries `class: 1`, rAthena's boss flag. Asserted here because
    // it is the whole reason the recording reads 15% and not the advertised 30%.
    expect(monsters[DUMMY_FANTASMA].stats.class).toBe(1);
  });

  it('the 23 packets recorded inside the window fall inside the debuffed range', () => {
    const DENTRO_MIN = 346552;
    const DENTRO_MAX = 374432;
    expect(DENTRO_MIN).toBeGreaterThanOrEqual(comDebuff.minPacote);
    expect(DENTRO_MAX).toBeLessThanOrEqual(comDebuff.maxPacote);
  });

  it('and the ratio the recording measured is the one the engine produces', () => {
    const mediaForaDaJanela = 313054.4;
    const mediaDentroDaJanela = 360314.3;
    expect(mediaDentroDaJanela / mediaForaDaJanela).toBeCloseTo(1.15, 2);
  });
});
