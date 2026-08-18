import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Calculator } from 'src/app/core/calculator';
import { createMainModel } from 'src/app/utils';
import { ElementalMaster } from './ElementalMaster';
import { Scholar } from './Scholar';
import { Sorcerer } from './Sorcerer';

/**
 * Estudo de Livros (Advanced Book, skill 274) — tracker card weX1HzsAlZeMhsnRgSzJ,
 * reported as "the ASPD is not applied when a Book is equipped".
 *
 * The client table is the source of truth:
 *
 *   Nível l ATQ l Velocidade de ataque
 *   [Nv 1]:  +3 l +0,5%    ...    [Nv 10]: +30 l +5,0%
 *
 * Both halves are stored on the skill prefixed with the weapon type (`book_atk`,
 * `book_aspdPercent`) and only pay out with a Book equipped. Two separate faults hid
 * them: the ASPD was written as `book_skillAspd`, a name no consumer read, and the
 * consumers themselves sat on Sorcerer — so the Professor, who learns the skill from the
 * Sage line, got neither half. Both consumers now live on Scholar, which owns the skill.
 */

const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));

const BOOK = 1588; // Metal Book — an inert host, the skill only checks the weapon type
const DAGGER = 1201; // Knife [3] — the negative case

const monster = {
  id: 1002, name: 'Poring', spawn: 'x',
  stats: { level: 1, health: 50, attack: { min: 7, max: 8 }, range: 1, defense: 0, magicDefense: 0, str: 1, int: 0, vit: 1, dex: 6, agi: 1, luk: 30, element: 1, elementName: 'Water', elementShortName: 'W1', race: 4, raceName: 'Plant', scale: 0, scaleName: 'Small', class: 0, criShield: 0, softDef: 0, mdef: 0, softMdef: 0, res: 0, mres: 0 },
  data: { def: 0, mdef: 0, criShield: 0, softDef: 0, res: 0, mres: 0 },
} as any;

/** Drives the real Calculator and reports both halves of the skill's payout. */
function payout(Cls: any, weaponId: number, advBookLv: number) {
  const cls = new Cls();
  const activeList = (cls as any)._activeSkillList as { name: string }[];
  const passiveList = (cls as any)._passiveSkillList as { name: string }[];
  cls
    .setLearnSkills({
      activeSkillIds: activeList.map(() => 0),
      passiveSkillIds: passiveList.map((s) => (s.name === 'Advanced Book' ? advBookLv : 0)),
    })
    .getSkillBonusAndName();

  const calc = new Calculator();
  calc
    .setMasterItems({ [weaponId]: db[weaponId] } as any)
    .setHpSpTable([{ jobs: {}, baseHp: Array(251).fill(1000), baseSp: Array(251).fill(100) }] as any)
    .setClass(cls)
    .setMonster(monster);

  const model = createMainModel();
  model.level = 200;
  model.weapon = weaponId;
  calc.loadItemFromModel(model).prepareAllItemBonus();

  const totalBonus = (calc as any).totalEquipStatus as Record<string, number>;
  const weapon = (calc as any).weaponData;

  return {
    aspdPercent: totalBonus['aspdPercent'] ?? 0,
    masteryAtk: cls.getMasteryAtk({ weapon, monster, model } as any),
  };
}

const CLASSES: [string, any][] = [
  ['Professor', Scholar],
  ['Feiticeiro', Sorcerer],
  ['Elementalista', ElementalMaster],
];

describe('Estudo de Livros — with a Book equipped', () => {
  it.each(CLASSES)('%s gets +30 ATQ and +5% ASPD at Nv 10', (_name, Cls) => {
    expect(payout(Cls, BOOK, 10)).toEqual({ masteryAtk: 30, aspdPercent: 5 });
  });

  // Holds the per-level table, not just its last row: +3 ATK and +0,5% per level.
  it.each(CLASSES)('%s gets half of that at Nv 5', (_name, Cls) => {
    expect(payout(Cls, BOOK, 5)).toEqual({ masteryAtk: 15, aspdPercent: 2.5 });
  });
});

describe('Estudo de Livros — when it must pay nothing', () => {
  it.each(CLASSES)('%s gets nothing with a Book but the skill unlearned', (_name, Cls) => {
    expect(payout(Cls, BOOK, 0)).toEqual({ masteryAtk: 0, aspdPercent: 0 });
  });

  // The whole point of the weapon-type prefix: a dagger pays nothing at any level.
  it.each(CLASSES)('%s gets nothing at Nv 10 while holding a dagger', (_name, Cls) => {
    expect(payout(Cls, DAGGER, 10)).toEqual({ masteryAtk: 0, aspdPercent: 0 });
  });
});
