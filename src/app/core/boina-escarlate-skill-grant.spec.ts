import { readFileSync } from 'node:fs';
import { SuperNovice } from 'src/app/jobs';
import { createMainModel } from 'src/app/utils';
import { bonusKeyLabel } from './bonus-key-label';
import { Calculator } from './calculator';

/**
 * `enable_skill__<id>` — an item that grants a skill rather than boosting it.
 *
 * 400528 Boina Escarlate-OS, whose pt-BR description declares the set:
 *
 *   ^FA4E09Conjunto^000000 ^FA4E09[Rutilus-OS]^000000
 *   Habilita [Meteoro Escarlate] nv.5.
 *   A cada 2 refinos da arma: Dano mágico de propriedade Fogo +3%.
 *
 * Meteoro Escarlate (Crimson Rock, 2211) is not in the Superaprendiz skill tree, so this
 * combo is the only way the class reaches it. Registering the grant as a bonus key lets
 * SuperNovice.ts gate the skill on the item instead of hardcoding the two ids, and puts
 * the line in the item's bonus list where the player can see it.
 *
 * Reported anonymously, tracker RtQoUCeAB7NxnzQ7Xlkq. The gate's own cases live in
 * jobs/super-novice-skills.spec.ts.
 */

const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));

const BOINA = 400528;
const RUTILUS = 26151; // Rutilus Stick-OS [2] — the set's weapon
const OTHER_STAFF = 1602; // Rod [4] — an inert stand-in that is not the set partner

const monster = {
  id: 1002, name: 'Poring', spawn: 'x',
  stats: { level: 1, health: 50, attack: { min: 7, max: 8 }, range: 1, defense: 0, magicDefense: 0, str: 1, int: 0, vit: 1, dex: 6, agi: 1, luk: 30, element: 1, elementName: 'Water', elementShortName: 'W1', race: 4, raceName: 'Plant', scale: 0, scaleName: 'Small', class: 0, criShield: 0, softDef: 0, mdef: 0, softMdef: 0, res: 0, mres: 0 },
  data: { def: 0, mdef: 0, criShield: 0, softDef: 0, res: 0, mres: 0 },
} as any;

function totals(opts: { weapon?: number; weaponRefine?: number; withBoina?: boolean }): Record<string, number> {
  const { weapon, weaponRefine = 0, withBoina = true } = opts;
  const items: any = {};
  if (withBoina) items[BOINA] = { ...db[BOINA] };
  if (weapon) items[weapon] = { ...db[weapon] };

  const cls = new SuperNovice();
  cls.setLearnSkills({ activeSkillIds: [], passiveSkillIds: [] }).getSkillBonusAndName();
  const calc = new Calculator();
  calc
    .setMasterItems(items)
    .setHpSpTable([{ jobs: {}, baseHp: Array(251).fill(1000), baseSp: Array(251).fill(100) }] as any)
    .setClass(cls)
    .setMonster(monster);

  const model = createMainModel();
  model.level = 200;
  if (withBoina) { model.headUpper = BOINA; model.headUpperRefine = 0; }
  if (weapon) { model.weapon = weapon; model.weaponRefine = weaponRefine; }

  calc.loadItemFromModel(model).prepareAllItemBonus();
  return (calc as any).totalEquipStatus as Record<string, number>;
}

const grant = (opts: Parameters<typeof totals>[0]) => totals(opts)['enable_skill__2211'] ?? 0;

describe('Boina Escarlate-OS 400528 — Conjunto [Rutilus-OS] habilita Meteoro Escarlate nv.5', () => {
  it('grants nothing with the headgear alone', () => {
    expect(grant({})).toBe(0);
  });

  it('grants nothing with a weapon that is not the set partner', () => {
    expect(grant({ weapon: OTHER_STAFF })).toBe(0);
  });

  it('grants nothing with the partner but no headgear — the grant is the boina\'s clause', () => {
    expect(grant({ weapon: RUTILUS, withBoina: false })).toBe(0);
  });

  it('grants level 5 with both pieces, at any refine', () => {
    expect(grant({ weapon: RUTILUS })).toBe(5);
    expect(grant({ weapon: RUTILUS, weaponRefine: 11 })).toBe(5);
  });

  it('matches the set partner by id, not by name', () => {
    expect(db[BOINA].script['enable_skill__2211']).toEqual(['EQUIP_ID[26151]===5']);
  });

  it('leaves the set\'s other clause alone', () => {
    // "A cada 2 refinos da arma: Dano mágico de propriedade Fogo +3%."
    expect(totals({ weapon: RUTILUS, weaponRefine: 10 })['m_my_element_fire']).toBe(15);
  });

  it('reads as a pt-BR line in the item bonus list', () => {
    expect(bonusKeyLabel('enable_skill__2211')).toBe('Habilita Meteoro Escarlate');
  });
});
