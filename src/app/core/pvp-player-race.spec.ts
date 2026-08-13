import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MysticSymphonyFn } from 'src/app/constants/share-passive-skills/mystic-symphony-fn';
import { Windhawk } from 'src/app/jobs';
import { createMainModel } from 'src/app/utils';
import { Calculator } from './calculator';
import { CalculatorController } from './calculator-controller';
import { PlayerTargetProfile } from './pvp';

/**
 * A PVP target is of race **Humano**, not Humanoide — reported by Luís: "Player (na
 * parte de pvp) tá como humanóide, isso faz ele receber dano de algumas coisas que
 * não afetam ele". The two are different races and the pt-BR description names them
 * apart, so an anti-Humanoide bonus (Tempestivo, Penetrante, the Sinfonia Mística
 * buff) must not fire against a player, while an anti-Humano one must. See
 * docs/pvp.md §2.
 */
const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));

const monster = {
  id: 1002, name: 'Poring', spawn: 'x',
  stats: {
    level: 1, health: 50, attack: { min: 7, max: 8 }, range: 1, defense: 0, magicDefense: 0,
    str: 1, int: 0, vit: 1, dex: 6, agi: 1, luk: 30, element: 1, elementName: 'Neutral 1',
    elementShortName: 'W1', race: 4, raceName: 'Plant', scale: 0, scaleName: 'Small', class: 0,
    criShield: 0, softDef: 0, mdef: 0, softMdef: 0, res: 0, mres: 0,
    hitRequireFor100: 182, fleeRequireFor95: 182,
  },
  data: { def: 0, mdef: 0, hitRequireFor100: 182, fleeRequireFor95: 182, criShield: 0, softDef: 0, res: 0, mres: 0 },
} as any;

const target = (isDoram = false): PlayerTargetProfile => ({
  name: 'Alvo', level: 200, hp: 500_000,
  def: 0, softDef: 0, mdef: 0, softMdef: 0, res: 0, mres: 0, flee: 0,
  str: 1, agi: 1, dex: 1, vit: 1, int: 1, luk: 1,
  isDoram,
  defenderBonus: {},
});

const ACC = 999_001; // stand-in accessory carrying one race bonus

/** Skill damage against a player target while wearing an accessory with `script`. */
function skillMax(script: Record<string, string[]> | null, isDoram = false): number {
  const cls = new Windhawk();
  const { equipAtks, masteryAtks, activeSkillNames, learnedSkillMap } = cls
    .setLearnSkills({ activeSkillIds: [10, 5, 10, 5, 5, 1], passiveSkillIds: [] })
    .getSkillBonusAndName();

  const items: any = { 700016: { ...db['700016'] }, 1773: { ...db['1773'] } };
  if (script) items[ACC] = { id: ACC, name: 'Test Acc', itemTypeId: 2, itemSubTypeId: 517, slots: 0, usableClass: ['all'], script };

  const calc = new Calculator();
  calc
    .setMasterItems(items)
    .setHpSpTable([{ jobs: { [cls.className]: true }, baseHp: Array(251).fill(100000), baseSp: Array(251).fill(10000) }] as any)
    .setClass(cls);

  const model = createMainModel();
  model.class = 4257; model.level = 230; model.jobLevel = 47;
  model.str = 4; model.agi = 100; model.vit = 100; model.int = 120; model.dex = 130; model.luk = 73;
  model.pow = 100; model.crt = 21;
  model.jobStr = 2; model.jobAgi = 12; model.jobVit = 7; model.jobInt = 8; model.jobDex = 7; model.jobLuk = 4;
  model.jobPow = 7; model.jobSta = 4; model.jobWis = 5; model.jobSpl = 4; model.jobCon = 8; model.jobCrt = 4;
  model.weapon = 700016; model.weaponRefine = 11; model.ammo = 1773;
  if (script) model.accLeft = ACC;
  model.selectedAtkSkill = 'Focused Arrow Strike==5';
  calc.loadItemFromModel(model);

  new CalculatorController().runChain(calc, {
    monster, playerTarget: target(isDoram), pvpMode: 'pvp',
    equipAtks, masteryAtks, buffEquips: {}, buffMasterys: {}, consumeData: [], aspdPotion: 0,
    extraOptionScripts: [], activeSkillNames, learnedSkillMap,
    selectedAtkSkill: model.selectedAtkSkill, selectedChances: [], usedHpL: false,
  });

  return (calc as any).damageSummary.skillMaxDamage as number;
}

describe('a PVP target is Humano (player_human), never Humanoide', () => {
  it('reports the target as Human / Humano', () => {
    const calc = new Calculator();
    calc.setClass(new Windhawk() as any);
    calc.setPlayerTarget(target(), 'pvp');
    expect(calc.monster.race).toBe('player_human');
    expect(calc.monster.data.raceUpper).toBe('Human');
  });

  it('reports a Doram target as player_doram', () => {
    const calc = new Calculator();
    calc.setClass(new Windhawk() as any);
    calc.setPlayerTarget(target(true), 'pvp');
    expect(calc.monster.race).toBe('player_doram');
  });

  it('keeps Medium / Neutral / Normal', () => {
    const calc = new Calculator();
    calc.setClass(new Windhawk() as any);
    calc.setPlayerTarget(target(), 'pvp');
    expect([calc.monster.size, calc.monster.element, calc.monster.type]).toEqual(['m', 'neutral', 'normal']);
  });
});

describe('race bonuses against a player', () => {
  const baseline = skillMax(null);

  it('ignores anti-Humanoide damage — the bug Luís reported', () => {
    expect(skillMax({ p_race_demihuman: ['100'] })).toBe(baseline);
  });

  it('applies anti-Humano damage', () => {
    expect(skillMax({ p_race_player_human: ['100'] })).toBeGreaterThan(baseline);
  });

  it('applies anti-Doram damage only to a Doram target', () => {
    expect(skillMax({ p_race_player_doram: ['100'] })).toBe(baseline);
    expect(skillMax({ p_race_player_doram: ['100'] }, true)).toBeGreaterThan(baseline);
  });

  it('ignores anti-Humanoide DEF penetration', () => {
    expect(skillMax({ p_pene_race_demihuman: ['100'] })).toBe(baseline);
  });

  it('still applies a race-agnostic bonus', () => {
    expect(skillMax({ p_race_all: ['100'] })).toBeGreaterThan(baseline);
  });
});

describe('the item database splits Humano from Humanoide', () => {
  it('"contra as raças Humano e Humanoide" grants both keys', () => {
    // 5121 Máscara de Jirtas — "Dano físico contra as raças Humano e Humanoide +5%."
    expect(db[5121].script.p_race_demihuman).toEqual(['5']);
    expect(db[5121].script.p_race_player_human).toEqual(['5']);
  });

  it('"contra a raça Humano" alone grants only the player key', () => {
    // 1436 Lança de Vellum — the description never says Humanoide.
    expect(db[1436].script.p_race_player_human).toEqual(['9===30']);
    expect(db[1436].script.p_race_demihuman).toBeUndefined();
  });

  it('"Bruto, Doram, Humano e Humanoide" grants the Doram key too', () => {
    // 28039 Katar Ancestral
    const s = db[28039].script;
    expect(s.p_race_player_human).toEqual(s.p_race_demihuman);
    expect(s.p_race_player_doram).toEqual(s.p_race_demihuman);
  });

  it('leaves a Humanoide-only item alone', () => {
    // 19098 Chapéu Macabro — "Dano físico e mágico contra a raça Humanoide +10%."
    expect(db[19098].script.p_race_demihuman).toEqual(['10']);
    expect(db[19098].script.p_race_player_human).toBeUndefined();
    expect(db[19098].script.m_race_player_human).toBeUndefined();
  });

  it('leaves the Sinfonia Mística buff Humanoide-only, as its description says', () => {
    // "aumenta o dano físico e mágico contra as raças Peixe e Humanoide" — no player race.
    const bonus = MysticSymphonyFn().dropdown.find((d) => d.isUse)!.bonus as Record<string, number>;
    expect(bonus.p_race_demihuman).toBe(50);
    expect(bonus.p_race_player_human).toBeUndefined();
  });
});
