import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { decodeReplay } from 'rrfparser';
import { AtkSkillModel, CharacterBase } from 'src/app/jobs/_character-base.abstract';
import { CLASS_CTOR_BY_ID } from 'src/app/jobs/_class-list';
import { DragonKnight } from 'src/app/jobs/DragonKnight';
import { loadReplayFixture } from 'src/app/replay/__tests__/load-fixture';
import { replayToModel } from 'src/app/replay/replay-to-model';
import { SKILL_ID_BY_NAME } from 'src/app/skills';
import { Calculator } from './calculator';
import { CalculatorController } from './calculator-controller';
import { parseOptionScripts } from './option-scripts';
import { PlayerTargetProfile, PvpMode } from './pvp';

/**
 * A skill with a `customFormula` builds its whole total outside
 * `calcPhysicalSkillDamage`/`calcMagicalSkillDamage`, which are the only two places the
 * vs-player cut used to be applied. So every such skill landed on a player for exactly
 * its damage against a monster: no castle layer, no defender gear reduction. Reported for
 * Sopro do Dragão on card oua6mspqhIrWSikUbSCO ("no Dummy e no PVP está dando exatamente
 * o mesmo dano"), and the two breaths are the customFormula skills a Cavaleiro
 * Draconiano can cast.
 *
 * The attacker is the geared state of `dk-water-breath-gear-states.rrf` — the same build
 * `DragonKnight.dragon-breath-replay.spec.ts` holds to the recorded packet, so the
 * baseline below is a replay-exact number rather than an invented one. The target is a
 * featureless player (zero defenses) so only the layers under test move.
 *
 * Expected factors come from Luís's validated table (docs/pvp.md §2): open PVP applies no
 * castle layer, and both castles cut any skill to 10%. Each step floors.
 *
 * `Baforada Draconiana` is the control: it takes the ordinary traced path, so its numbers
 * must not move — the fix adds the cut where it was missing, it does not apply it twice.
 */

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const monsters = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));
const hpSpTable = JSON.parse(readFileSync('src/assets/demo/data/hp_sp_table.json', 'utf8'));

const DUMMY_NEUTRAL = '21077';
/** The geared state: every equip event of the recording is folded on by then. */
const GEARED_AT = 21_000;
const CONSUMABLES = [{ int: ['15'], agi: ['22'] }, items[102803].script, { hp: ['3300'], spPercent: ['29'], sp: ['4'] }];

const replay: any = decodeReplay(loadReplayFixture('dk-water-breath-gear-states.rrf'));

/** A featureless player target: zero defenses, so the mode and gear layers are isolated. */
const bareTarget = (defenderBonus: PlayerTargetProfile['defenderBonus'] = {}): PlayerTargetProfile => ({
  name: 'Alvo', level: 200, hp: 500_000,
  def: 0, softDef: 0, mdef: 0, softMdef: 0, res: 0, mres: 0, flee: 0,
  str: 1, agi: 1, dex: 1, vit: 1, int: 1, luk: 1,
  defenderBonus,
});

function gearedModel() {
  const inv = new Map([...replay.initialInventory].map(([k, r]: any) => [k, { ...r, cards: [...r.cards] }]));
  for (const e of replay.equipChanges ?? []) {
    if (e.time > GEARED_AT) break;
    const rec: any = inv.get(e.slot) ?? { slot: e.slot, qty: 1, options: [] };
    inv.set(e.slot, {
      ...rec, itemId: e.itemId, refine: e.refine, grade: e.grade,
      cards: [...(e.cards ?? [])], options: e.options?.length ? e.options : rec.options ?? [],
      equipped: e.equipped ? e.location : 0,
    });
  }
  return replayToModel({ ...replay, initialInventory: inv }, items).model;
}

/** Max skill damage of `skill`, against the dummy when `pvp` is null, else against a player. */
function sim(skill: string, pvp: { mode: PvpMode; defenderBonus?: PlayerTargetProfile['defenderBonus'] } | null) {
  const m: any = gearedModel();
  const cls: any = new DragonKnight();
  const b = cls.getJobBonusStatus(m.jobLevel);
  Object.assign(m, {
    jobStr: b.str, jobAgi: b.agi, jobVit: b.vit, jobInt: b.int, jobDex: b.dex, jobLuk: b.luk,
    jobPow: b.pow, jobSta: b.sta, jobWis: b.wis, jobSpl: b.spl, jobCon: b.con, jobCrt: b.crt,
    pow: 100, sta: 0, wis: 0, spl: 0, con: 26, crt: 0,
  });
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
    monster: monsters[DUMMY_NEUTRAL],
    playerTarget: pvp ? bareTarget(pvp.defenderBonus) : undefined,
    pvpMode: pvp?.mode ?? 'none',
    equipAtks, masteryAtks, buffEquips: {}, buffMasterys: {},
    consumeData: CONSUMABLES, aspdPotion: undefined,
    extraOptionScripts: parseOptionScripts((m.rawOptionTxts ?? []).filter(Boolean)),
    activeSkillNames, learnedSkillMap, selectedAtkSkill: skill, selectedChances: [], usedHpL: false,
  } as any);
  return calc.damageSummary.skillMaxDamage as number;
}

/** Open-PVP damage of each skill, which the castle and gear factors below are read against. */
const OPEN = {
  'Dragon Breath==10': 6_808_565,
  'Dragon Breath - WATER==10': 6_913_961,
  'Dragonic Breath==10': 6_640_650,
} as const;

describe('vs-player reduction on a customFormula skill (card oua6mspqhIrWSikUbSCO)', () => {
  it.each([
    { label: 'Sopro do Dragão', skill: 'Dragon Breath==10' },
    { label: 'Bafo do Dragão', skill: 'Dragon Breath - WATER==10' },
  ])('$label takes the castle cut and the defender’s reduction', ({ skill }) => {
    const open = OPEN[skill];
    expect(sim(skill, { mode: 'pvp' })).toBe(open);
    // Both castles cut a skill to 10%; the bug was these three being the same number.
    expect(sim(skill, { mode: 'woe' })).toBe(Math.floor(open * 0.1));
    expect(sim(skill, { mode: 'woe-te' })).toBe(Math.floor(open * 0.1));
    // And a reduction off the target's own gear, which is not the castle layer.
    expect(sim(skill, { mode: 'pvp', defenderBonus: { dmg_taken_all: 50 } })).toBe(Math.floor(open * 0.5));
  });

  it('leaves the dummy damage alone — the cut is vs-player only', () => {
    expect(sim('Dragon Breath==10', null)).toBe(6_808_200);
    expect(sim('Dragon Breath - WATER==10', null)).toBe(6_913_590);
  });

  it('does not double-apply it to Baforada Draconiana, which is already traced', () => {
    // It lands in two packets, so the castle cut floors per packet before the pair is
    // summed: floor(floor(open / 2) × 0,1) × 2, one unit under floor(open × 0,1).
    const open = OPEN['Dragonic Breath==10'];
    const expected = Math.floor(Math.floor(open / 2) * 0.1) * 2;
    expect(sim('Dragonic Breath==10', { mode: 'pvp' })).toBe(open);
    expect(sim('Dragonic Breath==10', { mode: 'woe' })).toBe(expected);
    expect(sim('Dragonic Breath==10', { mode: 'woe-te' })).toBe(expected);
  });

  /**
   * The census of the hole. The fix is to the branch, not to the breaths, so the guard
   * that matters is knowing which skills go through it: a fourth one added later takes the
   * cut automatically, but nothing else in the suite would say it exists. Two of the three
   * are pinned above; Ataque Aéreo belongs to the Falcão do Vento line and is exercised in
   * `pvp-integration.spec.ts`, on the Windhawk build that file already carries.
   */
  it('names every skill that takes this branch, so a new one is not silently added', () => {
    const withCustomFormula = Object.values(CLASS_CTOR_BY_ID).flatMap((Ctor) => {
      const cls = new Ctor() as CharacterBase;
      cls.setLearnSkills({ activeSkillIds: cls.activeSkills.map(() => 0), passiveSkillIds: cls.passiveSkills.map(() => 0) }).getSkillBonusAndName();

      return (cls.getAtkSkills('current') as AtkSkillModel[])
        .filter((skill) => typeof skill.customFormula === 'function')
        .map((skill) => skill.name);
    });

    expect([...new Set(withCustomFormula)].sort()).toEqual(['Blitz Beat', 'Dragon Breath', 'Dragon Breath - WATER']);
  });
});
