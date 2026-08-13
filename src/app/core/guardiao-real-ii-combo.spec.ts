import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CharacterBase, HyperNovice, RoyalGuard, SuperNovice } from 'src/app/jobs';
import { createMainModel } from 'src/app/utils';
import { Calculator } from './calculator';

/**
 * Guardião Real II (Capa) 310184 + Paladino II (Topo) 310187 — reported by Paracelso.
 *
 * pt-BR (the source of truth):
 *   [Conjunto] [Paladino II (Topo)]
 *   A cada 2 níveis de [Bloqueio]: Conjuração fixa -0,1 segundo.
 *
 * The script (`LEARN_SKILL[Auto Guard==2]---0.1`) was already right and fires for the
 * Royal Guard, which inherits Bloqueio from the Paladin list. What it could not reach
 * was the Super Novice: Bloqueio was missing from its "Aprenda para ganhar bônus"
 * list, so `learnedSkillMap` never carried the skill and the step always resolved to
 * zero. bROWiki's "O Eterno Aprendizado" box lists Bloqueio under Superaprendizes EX,
 * which is the class the calculator models.
 */

const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));

const CAPE = 310184;
const UPPER = 310187;

const monster = {
  id: 1002, name: 'Poring', spawn: 'x',
  stats: { level: 1, health: 50, attack: { min: 7, max: 8 }, range: 1, defense: 0, magicDefense: 0, str: 1, int: 0, vit: 1, dex: 6, agi: 1, luk: 30, element: 1, elementName: 'Water', elementShortName: 'W1', race: 4, raceName: 'Plant', scale: 0, scaleName: 'Small', class: 0, criShield: 0, softDef: 0, mdef: 0, softMdef: 0, res: 0, mres: 0 },
  data: { def: 0, mdef: 0, criShield: 0, softDef: 0, res: 0, mres: 0 },
} as any;

/** Learns Bloqueio at `autoGuardLv` and returns the fixed-cast cut the set grants. */
function fixedCastCut(cls: CharacterBase, autoGuardLv: number, withUpper = true): number {
  const passives = cls.passiveSkills;
  const passiveSkillIds = passives.map((s) => (s.name === 'Auto Guard' ? autoGuardLv : 0));
  const { learnedSkillMap } = cls.setLearnSkills({ activeSkillIds: [], passiveSkillIds }).getSkillBonusAndName();

  const items: any = { [CAPE]: { ...db[CAPE] } };
  if (withUpper) items[UPPER] = { ...db[UPPER] };

  const calc = new Calculator();
  calc
    .setMasterItems(items)
    .setHpSpTable([{ jobs: {}, baseHp: Array(251).fill(1000), baseSp: Array(251).fill(100) }] as any)
    .setClass(cls)
    .setMonster(monster)
    .setLearnedSkills(learnedSkillMap);

  const model = createMainModel();
  model.level = 200;
  model.costumeEnchantGarment = CAPE;
  if (withUpper) model.costumeEnchantUpper = UPPER;

  calc.loadItemFromModel(model).prepareAllItemBonus();

  return (calc as any).totalEquipStatus.fct as number;
}

describe('Bloqueio in the Super Novice learn list', () => {
  it('offers all ten levels', () => {
    const skill = new SuperNovice().passiveSkills.find((s) => s.name === 'Auto Guard');

    expect(skill, 'Auto Guard missing from the Super Novice passive list').toBeDefined();
    expect(skill.dropdown.filter((d: any) => d.isUse).map((d: any) => d.value).sort((a, b) => a - b))
      .toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('sits at the end of the list, so no saved selection shifts', () => {
    // `passiveSkillIds` is positional: a saved sim without `passiveSkillMap` reads its
    // levels back by index. Appending keeps every pre-existing index where it was.
    const passives = new SuperNovice().passiveSkills;

    expect(passives[passives.length - 1].name).toBe('Auto Guard');
  });

  it('reaches the Hyper Novice at the same index, whose own skills come after', () => {
    const at = new SuperNovice().passiveSkills.length - 1;

    expect(new HyperNovice().passiveSkills[at].name).toBe('Auto Guard');
  });

  it('leaves Crux Magnum out — the Superaprendiz EX pool has Crux Divinum, not it', () => {
    // Paladino II (Baixo) 310185 gates its Holy damage on `LEARN_SKILL[Grand Cross==1]`,
    // so the absence is what makes that line correctly inert for a Super Novice.
    expect(new SuperNovice().passiveSkills.find((s) => s.name === 'Grand Cross')).toBeUndefined();
  });
});

describe('Guardião Real II (Capa) 310184 + Paladino II (Topo) 310187', () => {
  it('cuts fixed cast by 0,1s per 2 levels of Bloqueio for a Super Novice', () => {
    expect(fixedCastCut(new SuperNovice(), 10)).toBeCloseTo(0.5, 5);
    expect(fixedCastCut(new SuperNovice(), 5)).toBeCloseTo(0.2, 5);
    expect(fixedCastCut(new SuperNovice(), 1)).toBeCloseTo(0, 5);
  });

  it('does the same for the Royal Guard, which had it all along', () => {
    expect(fixedCastCut(new RoyalGuard(), 10)).toBeCloseTo(0.5, 5);
    expect(fixedCastCut(new RoyalGuard(), 5)).toBeCloseTo(0.2, 5);
  });

  it('gives nothing without Bloqueio learned', () => {
    expect(fixedCastCut(new SuperNovice(), 0)).toBe(0);
  });

  it('gives nothing without the Paladino II (Topo) partner', () => {
    expect(fixedCastCut(new SuperNovice(), 10, false)).toBe(0);
  });
});
