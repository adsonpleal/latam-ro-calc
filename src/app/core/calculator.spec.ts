import { readFileSync } from 'node:fs';
import { ItemTypeEnum, ItemTypeId } from 'src/app/constants';
import { ActiveSkillModel, AtkSkillModel, CharacterBase, ClassIDEnum, ClassName, RuneKnight, ShadowCross, Warlock } from 'src/app/jobs';
import { HpSpTable } from 'src/app/models/hp-sp-table.model';
import { ItemModel } from 'src/app/models/item.model';
import { MainModel } from 'src/app/models/main.model';
import { MonsterModel } from 'src/app/models/monster.model';
import { createMainModel } from 'src/app/utils';
import { Calculator } from './calculator';

// Mock CharacterBase for testing purposes
class MockCharacter extends CharacterBase {
  protected override CLASS_NAME: ClassName;
  protected override JobBonusTable: Record<number, [number, number, number, number, number, number]>;
  protected override initialStatusPoint: number;
  protected override classNames: ClassName[];
  protected override _atkSkillList: AtkSkillModel[];
  protected override _activeSkillList: ActiveSkillModel[];
  protected override _passiveSkillList: ActiveSkillModel[];
  // className = ClassName.RuneKnight;
  // classNameSet = new Set([ClassName.RuneKnight]);
  // isAllowTraitStat = () => false;
  // minMaxLevelCap = { minMaxLevel: [1, 200] as [number, number], maxJob: 70 };
  // initialStatPoint = 48;
  // getJobBonusStatus = () => ({ str: 7, agi: 2, vit: 5, int: 0, dex: 4, luk: 2, pow: 0, sta: 0, wis: 0, spl: 0, con: 0, crt: 0 });
}

describe('Calculator', () => {
  let calculator: Calculator;
  let mockItems: Record<number, Partial<ItemModel>>;
  let mockMonster: MonsterModel;
  let mockModel: MainModel;
  let mockHpSpTable: HpSpTable;
  let mockCharacter: CharacterBase;

  beforeEach(() => {
    calculator = new Calculator();
    mockCharacter = new MockCharacter();

    mockItems = {
      1: { id: 1, name: 'Test Weapon', itemTypeId: ItemTypeId.WEAPON, attack: 100, script: { atk: ['10'] } },
      2: { id: 2, name: 'Test Armor', itemTypeId: ItemTypeId.ARMOR, defense: 10, script: { vit: ['5'] } },
      3: { id: 3, name: 'Test Card', itemTypeId: ItemTypeId.CARD, script: { str: ['2'] } },
    };

    mockMonster = {
      id: 1002,
      name: 'Poring',
      spawn: 'pay_fild04',
      stats: {
        level: 1,
        health: 50,
        attack: { min: 7, max: 8 },
        range: 1,
        defense: 0,
        magicDefense: 0,
        str: 1,
        int: 0,
        vit: 1,
        dex: 6,
        agi: 1,
        luk: 30,
        baseExp: 2,
        jobExp: 1,
        hitRequireFor100: 182,
        fleeRequireFor95: 182,
        element: 1,
        elementName: 'Water',
        elementShortName: 'W1',
        race: 4,
        raceName: 'Plant',
        scale: 0,
        scaleName: 'Small',
        class: 0,
        criShield: 0,
        softDef: 0,
        mdef: 0,
        softMdef: 0,
        res: 0,
        mres: 0,
      },
      data: {
        def: 0,
        mdef: 0,
        hitRequireFor100: 182,
        fleeRequireFor95: 182,
        criShield: 0,
        softDef: 0,
        res: 0,
        mres: 0,
      },
    } as any;

    mockModel = createMainModel();
    mockModel.class = ClassIDEnum.RuneKnight;
    mockModel.level = 100;
    mockModel.jobLevel = 50;
    mockModel.str = 10;
    mockModel.agi = 10;
    mockModel.vit = 10;
    mockModel.int = 10;
    mockModel.dex = 10;
    mockModel.luk = 10;

    mockHpSpTable = [
      {
        jobs: { [mockCharacter.className]: true },
        baseHp: Array(251).fill(1000),
        baseSp: Array(251).fill(100),
      },
    ] as any;

    calculator.setMasterItems(mockItems).setHpSpTable(mockHpSpTable).setClass(mockCharacter).setMonster(mockMonster);
  });

  it('should be created', () => {
    expect(calculator).toBeTruthy();
  });

  // Sigrun shadow set: Malha (24326, armor) + Escudo (24327, shield). Loads the
  // REAL scripts from item.json so it guards the shipped data. For a Swordman/
  // Thief/Taekwon-line class with both pieces equipped and set refine sum >= 17,
  // the set grants ATQ +15 "adicional" (on top of the armor's own USED[...]15
  // base) AND ATQ-speed +1 that STACKS with the shield's own +1 (so ASPD +2).
  describe('Sigrun shadow set combo (24326 Malha + 24327 Escudo)', () => {
    const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
    const sigrunItems = (): Record<number, Partial<ItemModel>> => ({
      24326: { ...db['24326'], itemTypeId: 10, itemSubTypeId: 526 },
      24327: { ...db['24327'], itemTypeId: 10, itemSubTypeId: 527 },
    });

    const statsFor = (
      cls: CharacterBase,
      opts: { armorRefine: number; shieldRefine?: number; withShield?: boolean },
    ): { atk: number; aspd: number } => {
      const { armorRefine, shieldRefine = 0, withShield = true } = opts;
      // initialise the character's skill bonuses (needed by setAdditionalBonus)
      cls.setLearnSkills({ activeSkillIds: [], passiveSkillIds: [] }).getSkillBonusAndName();
      const calc = new Calculator();
      calc.setMasterItems(sigrunItems() as any).setHpSpTable(mockHpSpTable).setClass(cls).setMonster(mockMonster);
      const model = createMainModel();
      model.level = 100;
      model.shadowArmor = 24326;
      model.shadowArmorRefine = armorRefine;
      if (withShield) {
        model.shadowShield = 24327;
        model.shadowShieldRefine = shieldRefine;
      }
      calc.loadItemFromModel(model).prepareAllItemBonus();
      const total = (calc as any).totalEquipStatus;
      return { atk: total.atk as number, aspd: total.aspd as number };
    };

    it('Swordman line, both equipped, set refine >= 17: ATQ +30 (15 base + 15 combo), ASPD +2 (1 shield + 1 combo)', () => {
      expect(statsFor(new RuneKnight(), { armorRefine: 9, shieldRefine: 8 })).toEqual({ atk: 30, aspd: 2 });
    });

    it('Thief line (Shadow Cross) — the reported build, both pieces at +10 (sum 20): ATQ +30, ASPD +2', () => {
      expect(statsFor(new ShadowCross(), { armorRefine: 10, shieldRefine: 10 })).toEqual({ atk: 30, aspd: 2 });
    });

    it('boundary: exactly 17 applies the combo regardless of split', () => {
      expect(statsFor(new RuneKnight(), { armorRefine: 16, shieldRefine: 1 })).toEqual({ atk: 30, aspd: 2 });
    });

    it('set refine sum 16: combo off — only bases (ATQ +15 from armor, ASPD +1 from shield)', () => {
      expect(statsFor(new RuneKnight(), { armorRefine: 8, shieldRefine: 8 })).toEqual({ atk: 15, aspd: 1 });
    });

    it('shield not equipped: no combo and no shield base (ATQ +15 from armor, ASPD +0)', () => {
      expect(statsFor(new RuneKnight(), { armorRefine: 15, withShield: false })).toEqual({ atk: 15, aspd: 0 });
    });

    it('non-matching class (Warlock/Mage line): no ATQ, no ASPD from this set', () => {
      expect(statsFor(new Warlock(), { armorRefine: 9, shieldRefine: 8 })).toEqual({ atk: 0, aspd: 0 });
    });
  });

  describe('loadItemFromModel', () => {
    it('should load items and refines from model', () => {
      mockModel.weapon = 1;
      mockModel.weaponRefine = 7;
      mockModel.armor = 2;
      mockModel.armorRefine = 4;
      mockModel.armorCard = 3;

      calculator.loadItemFromModel(mockModel);

      const itemSummary = calculator.prepareAllItemBonus().getItemSummary();

      // expect(itemSummary.weapon).toBeDefined();
      // expect(itemSummary.armor).toBeDefined();
      // expect(itemSummary.armorCard).toBeDefined();
      expect(itemSummary.consumableBonuses).toBeDefined();

      const internalEquipItem = (calculator as any).equipItem;
      expect(internalEquipItem.get(ItemTypeEnum.weapon).id).toBe(1);
      expect(internalEquipItem.get(ItemTypeEnum.armor).id).toBe(2);
      expect(internalEquipItem.get(ItemTypeEnum.armorCard).id).toBe(3);

      const internalRefineMap = (calculator as any).mapRefine;
      expect(internalRefineMap.get(ItemTypeEnum.weapon)).toBe(7);
      expect(internalRefineMap.get(ItemTypeEnum.armor)).toBe(4);
    });
  });
});