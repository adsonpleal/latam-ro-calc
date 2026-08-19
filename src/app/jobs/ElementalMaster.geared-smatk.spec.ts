import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { decodeReplay } from 'rrfparser';
import { Calculator } from 'src/app/core/calculator';
import { CalculatorController, collectBuffBonuses } from 'src/app/core/calculator-controller';
import { parseOptionScripts } from 'src/app/core/option-scripts';
import { JobBuffs } from 'src/app/constants/job-buffs';
import { SKILL_ID_BY_NAME } from 'src/app/skills';
import { loadReplayFixture } from 'src/app/replay/__tests__/load-fixture';
import { replayToModel } from 'src/app/replay/replay-to-model';
import { ElementalMaster } from './ElementalMaster';

/**
 * Elemental Master (Elementalista) — the **status window** of a fully geared character,
 * against "Mago Cacetada"'s recording (tracker card VtHJvZvSZe, `EM_DPS_2.rrf`,
 * 13/08/2026).
 *
 * Base 230 / job 47 on tra_fild, 20 equipped items, Ardor summoned. Traits as the
 * "Ajude o simulador" dialog collected them — FEI/SPL 100, the other five at zero; the
 * session never changes map, so the `.rrf` carries none of its own.
 *
 * **The recording carries no damage of its own.** All 91 damage packets in the file belong
 * to three other players who happened to be on the map (a Meister spamming Fúria do
 * Furacão / Machado Esmagador, an Arch Mage casting Cometa, a Soul Ascetic casting
 * Espíritos Ancestrais). The Elementalista buffed up over the first 18 seconds and then
 * never attacked anything for the remaining 21 minutes — no `ZC_NOTIFY_ACT` with it as the
 * source exists. So this file can say nothing about any damage formula, and this spec
 * deliberately asserts none. What it does pin is the one thing the packets DO carry about
 * this character: its `ZC_PAR_CHANGE` status window, on a build with real equipment (every
 * other Elemental Master fixture in the repo is a gearless control).
 *
 * The game's own readings, and what they settle:
 *
 *   sp=226 (S.ATQM) = 37, then 57 the instant Enfeitiçar Lv5 (EFST 1271) goes on at
 *   17.8 s, and back to 37 when it drops exactly 240 s later. That is
 *     - the trait job-bonus table at job 47 (FEI +8, CON +5 -> ⌊108/3⌋ + ⌊5/5⌋ = 37), and
 *     - that not one of the 20 equipped items grants a stray `sMatk`, and
 *     - the JobBuffs "Spell Enchanting" entry: +20, matching the client's own table
 *       ("[Nv 5]: +20 l 240 segundos") and the recorded 240 s duration.
 *
 * Checked on the way and needing no change: every attack-skill ratio in this class already
 * matches the client's per-level table (Execução Aurora and Tremor de Terra 1.250%×Nv,
 * 3.500 + 1.750×Nv with the matching spirit; Conflagração, Tormenta and Poço Venenoso
 * 400%×Nv and 800%×Nv; Círculo Elemental 480%×Nv and 1.100%×Nv vs Dragão/Amorfo), the
 * three ground skills' `totalHit: 10` matches "dura 3 segundos ... a cada 0,3 segundo",
 * and `skill-delay.spec.ts` is green on all six.
 */

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const monsters = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));
const hpSpTable = JSON.parse(readFileSync('src/assets/demo/data/hp_sp_table.json', 'utf8'));

/** "Dummy - Vento" — one of the four dummies standing on the map. Nothing is ever hit;
 *  the chain just needs a target to run. */
const DUMMY_WIND = '21079';
const FIXTURE = 'em-geared-smatk.rrf';

const replay: any = decodeReplay(loadReplayFixture(FIXTURE));

/** The build, read by the real importer — never retype the gear. */
function simulate(opts: { potion: boolean; spellEnchanting: boolean }) {
  const { model, learnedSkills }: any = replayToModel(replay, items);
  const m: any = model;
  // The traits the recorder's dialog collected — a single-map session carries none.
  m.pow = 0; m.sta = 0; m.wis = 0; m.spl = 100; m.con = 0; m.crt = 0;

  const cls = new ElementalMaster();
  const jb = cls.getJobBonusStatus(m.jobLevel);
  Object.assign(m, {
    jobStr: jb.str, jobAgi: jb.agi, jobVit: jb.vit, jobInt: jb.int, jobDex: jb.dex, jobLuk: jb.luk,
    jobPow: jb.pow, jobSta: jb.sta, jobWis: jb.wis, jobSpl: jb.spl, jobCon: jb.con, jobCrt: jb.crt,
  });
  const selectedAtkSkill = 'Conflagration==5';
  m.selectedAtkSkill = selectedAtkSkill;

  const passiveSkillIds = cls.passiveSkills.map((s) => {
    const id = (SKILL_ID_BY_NAME as any)[s.name];
    return id ? learnedSkills[id] ?? 0 : 0;
  });
  // Ardor is the summoned spirit throughout (entity kind `elem`, view 20817).
  const activeSkillIds = cls.activeSkills.map((s) => (s.name === '_ElementalMaster_spirit' ? 2 : 0));
  const { equipAtks, masteryAtks, activeSkillNames, learnedSkillMap } = cls
    .setLearnSkills({ activeSkillIds, passiveSkillIds })
    .getSkillBonusAndName();

  const selectedBuffValues = JobBuffs.map((b) => (opts.spellEnchanting && b.name === 'Spell Enchanting' ? 5 : 0));
  const { equipAtk: buffEquips, masteryAtk: buffMasterys } = collectBuffBonuses(JobBuffs, selectedBuffValues, activeSkillNames);

  const calc = new Calculator().setMasterItems(items).setHpSpTable(hpSpTable).setClass(cls);
  calc.loadItemFromModel(m);
  new CalculatorController().runChain(calc, {
    monster: monsters[DUMMY_WIND], equipAtks, masteryAtks, buffEquips, buffMasterys,
    consumeData: [], aspdPotion: opts.potion ? m.aspdPotion : undefined,
    extraOptionScripts: parseOptionScripts((m.rawOptionTxts ?? []).filter(Boolean)),
    activeSkillNames, learnedSkillMap, selectedAtkSkill, selectedChances: [], usedHpL: false,
  } as any);

  return calc as any;
}

describe('Elemental Master — geared status window (EM_DPS_2.rrf)', () => {
  it('imports every equipped item, and drops only the option the engine has no field for', () => {
    const { summary }: any = replayToModel(replay, items);
    expect(summary.equippedCount).toBe(20);
    expect(summary.skippedItems).toEqual([]);
    expect(summary.skippedCards).toBe(0);
    // 7 random options rolled; the one dropped is id 169 "Cura Recebida +5%" on the
    // Escudo Sombrio Diamante — a healing roll, which random-option-map.ts declines by
    // design rather than applying a no-op.
    expect(summary.appliedOptions).toBe(6);
    expect(summary.skippedOptions).toBe(1);
  });

  it('S.ATQM is 37, as the game reports it (sp=226)', () => {
    expect(simulate({ potion: true, spellEnchanting: false }).damageSummary.sMatk).toBe(37);
  });

  it('Enfeitiçar Lv5 takes it to 57 — the +20 the client table promises', () => {
    expect(simulate({ potion: true, spellEnchanting: true }).damageSummary.sMatk).toBe(57);
  });

  /**
   * VelAtq, and the one reading that does not line up.
   *
   * With the Poção do Despertar on (EFST 38) the game sends `sp=53` amotion 70, i.e.
   * VelAtq 200 − 70/10 = 193, and the engine also says 193 — but 193 is `ASPD_CAP` and the
   * game's own ceiling too, so the two agreeing there proves nothing.
   *
   * The potion expires at 607.9 s and the game re-sends amotion 90 = **VelAtq 191**, where
   * the engine says 192. Nothing else changes at that instant: it is the only status event
   * in the file at that millisecond. So the engine is one point high on this build's
   * uncapped VelAtq.
   *
   * One reading cannot localise it. Two candidates fit both numbers equally well —
   * `rawCalcAspd` two points high (the base/Book/shield row in `_aspd-table.ts`), or the
   * gear's `aspdPercent` three points high (73 here, from two +2% shadow-gear rolls plus
   * the Rapidez enchants) — because `equip = ⌊(195 − baseAspd2) × aspd%⌋` trades one
   * against the other. Separating them needs a recording that reports amotion at more than
   * one gear state, which this one does not: it has zero equipment changes.
   *
   * Nothing here rides on it — this character casts, and VelAtq only feeds basic-attack
   * DPS. Asserted at the engine's current value so a fix flips a visible expectation.
   */
  it('VelAtq: 193 capped with the potion, and one point high without it (game says 191)', () => {
    expect(simulate({ potion: true, spellEnchanting: false }).basicAspd.totalAspd).toBe(193);
    expect(simulate({ potion: false, spellEnchanting: false }).basicAspd.totalAspd).toBe(192);
  });
});
