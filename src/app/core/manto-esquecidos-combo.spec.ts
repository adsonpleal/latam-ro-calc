import { readFileSync } from 'node:fs';
import { RuneKnight } from 'src/app/jobs';
import { createMainModel } from 'src/app/utils';
import { Calculator } from './calculator';

const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));

describe('Manto dos Esquecidos 480024 combos', () => {
  const stat = (headId: number | null, garmentRefine: number, key: string): number => {
    const items: any = { 480024: { ...db['480024'], itemTypeId: 2, itemSubTypeId: 515 } };
    if (headId) items[headId] = { ...db[headId], itemTypeId: 2, itemSubTypeId: 512 };
    const cls = new RuneKnight();
    cls.setLearnSkills({ activeSkillIds: [], passiveSkillIds: [] }).getSkillBonusAndName();
    const calc = new Calculator();
    calc.setMasterItems(items).setHpSpTable([{ jobs: {}, baseHp: Array(251).fill(1000), baseSp: Array(251).fill(100) }] as any).setClass(cls).setMonster({
      id: 1002, name: 'Poring', spawn: 'x',
      stats: { level: 1, health: 50, attack: { min: 7, max: 8 }, range: 1, defense: 0, magicDefense: 0, str: 1, int: 0, vit: 1, dex: 6, agi: 1, luk: 30, element: 1, elementName: 'Water', elementShortName: 'W1', race: 4, raceName: 'Plant', scale: 0, scaleName: 'Small', class: 0, criShield: 0, softDef: 0, mdef: 0, softMdef: 0, res: 0, mres: 0 },
      data: { def: 0, mdef: 0, criShield: 0, softDef: 0, res: 0, mres: 0 },
    } as any);
    const model = createMainModel();
    model.level = 200;
    model.garment = 480024;
    model.garmentRefine = garmentRefine;
    if (headId) { model.headUpper = headId; model.headUpperRefine = 0; }
    calc.loadItemFromModel(model).prepareAllItemBonus();
    return (calc as any).totalEquipStatus[key] as number;
  };

  it('cape+12 ATQ +30 fires with the Piloto head (18973) at garment refine 12', () => {
    expect(stat(18973, 12, 'atk')).toBe(30);
  });
  it('cape+12 ATQ does NOT fire at garment refine 11', () => {
    expect(stat(18973, 11, 'atk')).toBe(0);
  });
  it('cape+12 ATQ does NOT fire without the partner head', () => {
    expect(stat(null, 12, 'atk')).toBe(0);
  });
  it('per-2-refine ranged: Sentido de Caça (18984) gives floor(12/2)*2 = 12 at refine 12', () => {
    expect(stat(18984, 12, 'range')).toBe(12);
  });
  it('per-2-refine crit dmg: Vingança (18982) gives floor(10/2)*3 = 15 at refine 10', () => {
    expect(stat(18982, 10, 'criDmg')).toBe(15);
  });
  it('cape+12 DEF penetration: Vingança (18982) p_pene_race_all 25 at refine 12', () => {
    expect(stat(18982, 12, 'p_pene_race_all')).toBe(25);
  });
});
