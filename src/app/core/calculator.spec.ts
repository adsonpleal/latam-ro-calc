import { readFileSync } from 'node:fs';
import { ItemTypeEnum, ItemTypeId } from 'src/app/constants';
import { ActiveSkillModel, AtkSkillModel, CharacterBase, ClassIDEnum, ClassName, RuneKnight, ShadowCross, Warlock } from 'src/app/jobs';
import { HpSpTable } from 'src/app/models/hp-sp-table.model';
import { ItemModel } from 'src/app/models/item.model';
import { MainModel } from 'src/app/models/main.model';
import { MonsterModel } from 'src/app/models/monster.model';
import { createMainModel } from 'src/app/utils';
import { Calculator } from './calculator';

// The real item DB, read once — it is ~11 MB, and three describe blocks below need it.
const itemDb: Record<string, ItemModel> = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));

/**
 * Equip `slots` on a fresh calculator loaded with `items`, and return the summed
 * equipment bonuses. Shared by the set-combo blocks below, which all need the same
 * setMasterItems / loadItemFromModel / prepareAllItemBonus chain.
 */
const equipTotals = (
  cls: CharacterBase,
  items: Record<number, Partial<ItemModel>>,
  slots: Partial<MainModel>,
  hpSpTable: HpSpTable,
  monster: MonsterModel,
): Record<string, number> => {
  // initialise the character's skill bonuses (needed by setAdditionalBonus)
  cls.setLearnSkills({ activeSkillIds: [], passiveSkillIds: [] }).getSkillBonusAndName();
  const calc = new Calculator();
  calc.setMasterItems(items as any).setHpSpTable(hpSpTable).setClass(cls).setMonster(monster);
  const model = Object.assign(createMainModel(), slots);
  calc.loadItemFromModel(model).prepareAllItemBonus();
  return (calc as any).totalEquipStatus;
};

/** Pick `keys` out of the totals, defaulting absent bonuses to 0 so tests can assert them. */
const pick = (totals: Record<string, number>, keys: string[]): Record<string, number> =>
  Object.fromEntries(keys.map((k) => [k, totals[k] || 0]));

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

  // Phase 1 (PVP): the defender-side reduction keys must aggregate on
  // totalEquipStatus just like any other script bonus. No application logic yet
  // — this only guards that the namespace exists and sums. See docs/pvp.md §4.
  describe('defender-side reduction bonuses (PVP namespace)', () => {
    const defenderItems = (): Record<number, Partial<ItemModel>> => ({
      // headgear granting "reduces phys+magic damage from players by 5%" (Thanatos-mask shape)
      500: { id: 500, name: 'Reduc Head', itemTypeId: ItemTypeId.ARMOR, defense: 3, script: { dmg_taken_all: ['5'] } },
      // armor stacking a race + element reduction
      501: { id: 501, name: 'Reduc Armor', itemTypeId: ItemTypeId.ARMOR, defense: 10, script: { subrace_player_human: ['7'], subele_neutral: ['4'] } },
      // a second piece adding more of the same key, to prove summation
      502: { id: 502, name: 'Reduc Garment', itemTypeId: ItemTypeId.ARMOR, defense: 5, script: { dmg_taken_all: ['3'], subele_neutral: ['6'] } },
    });

    it('aggregates dmg_taken_all / subrace / subele across pieces', () => {
      const calc = new Calculator();
      calc.setMasterItems(defenderItems() as any).setHpSpTable(mockHpSpTable).setClass(mockCharacter).setMonster(mockMonster);
      const model = createMainModel();
      model.level = 100;
      model.headUpper = 500;
      model.armor = 501;
      model.garment = 502;
      calc.loadItemFromModel(model).prepareAllItemBonus();

      const total = (calc as any).totalEquipStatus;
      expect(total.dmg_taken_all).toBe(8); // 5 + 3
      expect(total.subrace_player_human).toBe(7);
      expect(total.subele_neutral).toBe(10); // 4 + 6
    });
  });

  // Sigrun shadow set: Malha (24326, armor) + Escudo (24327, shield). Loads the
  // REAL scripts from item.json so it guards the shipped data. For a Swordman/
  // Thief/Taekwon-line class with both pieces equipped and set refine sum >= 17,
  // the set grants ATQ +15 "adicional" (on top of the armor's own USED[...]15
  // base) AND ATQ-speed +1 that STACKS with the shield's own +1 (so ASPD +2).
  describe('Sigrun shadow set combo (24326 Malha + 24327 Escudo)', () => {
    const sigrunItems = (): Record<number, Partial<ItemModel>> => ({
      24326: { ...itemDb['24326'], itemTypeId: 10, itemSubTypeId: 526 },
      24327: { ...itemDb['24327'], itemTypeId: 10, itemSubTypeId: 527 },
    });

    const statsFor = (
      cls: CharacterBase,
      opts: { armorRefine: number; shieldRefine?: number; withShield?: boolean },
    ): { atk: number; aspd: number } => {
      const { armorRefine, shieldRefine = 0, withShield = true } = opts;
      const totals = equipTotals(
        cls,
        sigrunItems(),
        {
          level: 100,
          shadowArmor: 24326,
          shadowArmorRefine: armorRefine,
          ...(withShield ? { shadowShield: 24327, shadowShieldRefine: shieldRefine } : {}),
        },
        mockHpSpTable,
        mockMonster,
      );
      return pick(totals, ['atk', 'aspd']) as { atk: number; aspd: number };
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

  // Reported missing by Ted; the ids only reached latam-items.json after re-extracting
  // the patched client. Both head pieces declare the set on their own side, the necklace
  // declares none — so the combo must fire once, from whichever chain is equipped.
  describe('Correntes Sagradas + Coleira de Espinhos set (410093/410094 + 420076)', () => {
    const setItems = { 410093: { ...itemDb['410093'] }, 410094: { ...itemDb['410094'] }, 420076: { ...itemDb['420076'] } };

    const statsFor = (opts: { chain?: number; necklace?: boolean }): Record<string, number> =>
      pick(
        equipTotals(
          new RuneKnight(),
          setItems,
          { level: 150, ...(opts.chain ? { headMiddle: opts.chain } : {}), ...(opts.necklace ? { headLower: 420076 } : {}) },
          mockHpSpTable,
          mockMonster,
        ),
        ['cri', 'criDmg', 'melee', 'range'],
      );

    it('410093 alone: its own bonuses, no set', () => {
      expect(statsFor({ chain: 410093 })).toEqual({ cri: 8, criDmg: 0, melee: 8, range: 8 });
    });

    it('420076 alone: its own bonuses, no set', () => {
      expect(statsFor({ necklace: true })).toEqual({ cri: 3, criDmg: 5, melee: 0, range: 0 });
    });

    it('410093 + 420076: set adds +7% crit damage on top of both bases', () => {
      expect(statsFor({ chain: 410093, necklace: true })).toEqual({ cri: 11, criDmg: 12, melee: 8, range: 8 });
    });

    it('410094 (the slotted, weaker version) + 420076: set adds +5% instead', () => {
      expect(statsFor({ chain: 410094, necklace: true })).toEqual({ cri: 8, criDmg: 10, melee: 5, range: 5 });
    });

    it('removing the necklace drops the set bonus', () => {
      expect(statsFor({ chain: 410094 }).criDmg).toBe(0);
    });
  });

  // Same patch as the Correntes Sagradas pair. The partner (420003 CD Antiquado) was
  // already in the DB and already grants m_my_element_all +5 on its own, so the set
  // bonus has to stack on top of the partner's own line rather than replace it.
  describe('Fones COR + CD Antiquado set (410091/410092 + 420003)', () => {
    const setItems = { 410091: { ...itemDb['410091'] }, 410092: { ...itemDb['410092'] }, 420003: { ...itemDb['420003'] } };

    const statsFor = (opts: { headset?: number; cd?: boolean }): Record<string, number> =>
      pick(
        equipTotals(
          new Warlock(),
          setItems,
          { level: 150, ...(opts.headset ? { headMiddle: opts.headset } : {}), ...(opts.cd ? { headLower: 420003 } : {}) },
          mockHpSpTable,
          mockMonster,
        ),
        ['acd', 'vct', 'm_my_element_all'],
      );

    it('410091 alone: cast reductions only, no set', () => {
      expect(statsFor({ headset: 410091 })).toEqual({ acd: 8, vct: 8, m_my_element_all: 0 });
    });

    it('420003 alone: its own +5% all-property magic damage', () => {
      expect(statsFor({ cd: true })).toEqual({ acd: 0, vct: 0, m_my_element_all: 5 });
    });

    it('410091 + 420003: set +7% stacks on the CD own +5% = 12%', () => {
      expect(statsFor({ headset: 410091, cd: true })).toEqual({ acd: 8, vct: 8, m_my_element_all: 12 });
    });

    it('410092 (slotted, weaker) + 420003: set +5% on top of the CD own +5% = 10%', () => {
      expect(statsFor({ headset: 410092, cd: true })).toEqual({ acd: 5, vct: 5, m_my_element_all: 10 });
    });

    it('removing the CD drops the set bonus but keeps the cast reductions', () => {
      expect(statsFor({ headset: 410092 })).toEqual({ acd: 5, vct: 5, m_my_element_all: 0 });
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

  // The values passed in are the skill catalog's own dropdown `bonus` objects (see
  // _character-base.abstract.ts getSkillBonusAndName), which live for the whole session.
  // Anything that writes to the calculator's copy — CharacterBase.clearSupersededBonusSource
  // zeroing a superseded bonus, for one — would otherwise permanently delete that skill's
  // bonus from the catalog and from every later calculation.
  describe('setEquipAtkSkillAtk isolates the caller"s bonus objects', () => {
    it('does not write through to the source map when the stored copy is mutated', () => {
      const catalogBonus = { range: 350 };
      const source = { 'No Limits': catalogBonus };

      calculator.setEquipAtkSkillAtk(source);
      (calculator as any).equipAtkSkillBonus['No Limits'].range = 0;

      expect(catalogBonus.range).toBe(350);
      expect(source['No Limits'].range).toBe(350);
    });
  });
});