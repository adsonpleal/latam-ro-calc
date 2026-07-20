import { ItemTypeId } from 'src/app/constants';
import { ActiveSkillModel, AtkSkillModel, CharacterBase, ClassIDEnum, ClassName } from 'src/app/jobs';
import { HpSpTable } from 'src/app/models/hp-sp-table.model';
import { ItemModel } from 'src/app/models/item.model';
import { MainModel } from 'src/app/models/main.model';
import { MonsterModel } from 'src/app/models/monster.model';
import { createMainModel } from 'src/app/utils';
import { Calculator } from './calculator';
import { CalculatorController } from './calculator-controller';

class MockCharacter extends CharacterBase {
  protected override CLASS_NAME: ClassName;
  protected override JobBonusTable: Record<number, [number, number, number, number, number, number]>;
  protected override initialStatusPoint: number;
  protected override classNames: ClassName[];
  protected override _atkSkillList: AtkSkillModel[];
  protected override _activeSkillList: ActiveSkillModel[];
  protected override _passiveSkillList: ActiveSkillModel[];
}

/**
 * Reproduces the "Efeitos" checkbox list bug: the checklist is a MERGE of the
 * main build's and the compare build's chances (ro-calculator.component.ts
 * refreshChanceList()), so a chance whose source item only exists on ONE of
 * the two builds still shows up — and the SAME `selectedChances` array is fed
 * into both Calculator instances (ro-calculator.component.ts prepare()).
 *
 * A build that doesn't actually carry the selected chance's source item must
 * fall back to its own unboosted damage for `effected*`, exactly like the
 * build that DOES carry it falls back to its base damage in the UI template's
 * `totalSummary2?.dmg?.effectedSkillDamageMin || totalSummary2?.dmg?.skillMinDamage`
 * expression — not leave `effected*` undefined, which renders as a bare "0"
 * with no fallback in the main (non-compare) column and produces NaN% in the
 * diff-percent calculation.
 */
describe('Calculator — chance selected in one build, not carried by the other', () => {
  let mockItems: Record<number, Partial<ItemModel>>;
  let mockMonster: MonsterModel;
  let mockHpSpTable: HpSpTable;
  let mockCharacter: CharacterBase;

  beforeEach(() => {
    mockCharacter = new MockCharacter();
    (mockCharacter as any)._atkSkillList = [];
    (mockCharacter as any)._activeSkillList = [];
    (mockCharacter as any)._passiveSkillList = [];

    mockItems = {
      1: { id: 1, name: 'Test Weapon', itemTypeId: ItemTypeId.WEAPON, attack: 100, script: { atk: ['10'] } },
      4: { id: 4, name: 'Chance Card', itemTypeId: ItemTypeId.CARD, script: { chance__atk: ['500'] } },
    };

    mockMonster = {
      id: 1002,
      name: 'Poring',
      spawn: 'pay_fild04',
      stats: {
        level: 1, health: 50, attack: { min: 7, max: 8 }, range: 1, defense: 0, magicDefense: 0,
        str: 1, int: 0, vit: 1, dex: 6, agi: 1, luk: 30, baseExp: 2, jobExp: 1,
        hitRequireFor100: 182, fleeRequireFor95: 182, element: 1, elementName: 'Neutral 1', elementShortName: 'W1',
        race: 4, raceName: 'Plant', scale: 0, scaleName: 'Small', class: 0,
        criShield: 0, softDef: 0, mdef: 0, softMdef: 0, res: 0, mres: 0,
      },
      data: { def: 0, mdef: 0, hitRequireFor100: 182, fleeRequireFor95: 182, criShield: 0, softDef: 0, res: 0, mres: 0 },
    } as any;

    mockHpSpTable = [
      { jobs: { [mockCharacter.className]: true }, baseHp: Array(251).fill(1000), baseSp: Array(251).fill(100) },
    ] as any;
  });

  /** Builds+solves a Calculator exactly like ro-calculator.component.ts's
   *  prepare()+runChain() do, for a given model and the (shared) selectedChances. */
  const solve = (model: MainModel, selectedChances: string[]): Calculator => {
    const calc = new Calculator();
    calc.setMasterItems(mockItems as any).setHpSpTable(mockHpSpTable).setClass(mockCharacter).setMonster(mockMonster);
    calc.loadItemFromModel(model);

    new CalculatorController().runChain(calc, {
      monster: mockMonster,
      equipAtks: {},
      masteryAtks: {},
      buffEquips: {},
      buffMasterys: {},
      consumeData: [],
      aspdPotion: 0,
      extraOptionScripts: [],
      activeSkillNames: new Set(),
      learnedSkillMap: new Map(),
      selectedAtkSkill: '',
      selectedChances,
      usedHpL: false,
    });

    return calc;
  };

  const baseModel = (): MainModel => {
    const model = createMainModel();
    model.class = ClassIDEnum.RuneKnight;
    model.level = 100;
    model.jobLevel = 50;
    model.str = 10; model.agi = 10; model.vit = 10; model.int = 10; model.dex = 10; model.luk = 10;
    model.weapon = 1;
    model.weaponRefine = 0;
    return model;
  };

  it('sanity check: the build that DOES carry the chance item gets boosted effected damage', () => {
    const withCard = baseModel();
    withCard.weaponCard1 = 4; // "Chance Card" equipped — this build has the chance

    const calc = solve(withCard, ['Chance Card']);
    const dmg = calc.getTotalSummary().dmg;

    expect(calc.selectedChanceList).toEqual(['Chance Card']);
    expect(dmg.effectedBasicDamageMin).toBeGreaterThan(dmg.basicMinDamage);
    expect(dmg.effectedBasicDamageMax).toBeGreaterThan(dmg.basicMaxDamage);
  });

  it('a build without the chance item falls back to its own base damage instead of leaving effected* undefined', () => {
    const withoutCard = baseModel(); // no weaponCard1 — this build never had the chance to begin with

    // Mirrors ro-calculator.component.ts: the SAME selectedChances (built from
    // the merged checkbox list) is applied to every build, including one that
    // doesn't carry the item granting it.
    const calc = solve(withoutCard, ['Chance Card']);
    const dmg = calc.getTotalSummary().dmg;

    expect(calc.selectedChanceList).toEqual([]); // "Chance Card" isn't one of THIS build's own chances
    // Bug: these come back `undefined` today because calculateAllDamages() only
    // ever populates effected* when selectedChanceList is non-empty. They must
    // equal the build's own unaffected base damage instead.
    expect(dmg.effectedBasicDamageMin).toBe(dmg.basicMinDamage);
    expect(dmg.effectedBasicDamageMax).toBe(dmg.basicMaxDamage);
    expect(dmg.effectedBasicDps).toBe(dmg.basicDps);
  });

  it('the fast path used by the chance-checkbox toggle handler (setSelectedChances + recalcExtraBonus) has the same requirement', () => {
    // ro-calculator.component.ts's updateChanceEvent handler calls
    // `this.calculator.setSelectedChances(this.selectedChances).recalcExtraBonus(skill)`
    // directly instead of a full calculateAllDamages() pass — recalcExtraBonus()
    // must not leave effected* stale/undefined when this build has no match.
    const withoutCard = baseModel();
    const calc = solve(withoutCard, []); // first solve with nothing selected (initial render)

    const baseDmg = calc.getTotalSummary().dmg;

    calc.setSelectedChances(['Chance Card']).recalcExtraBonus('');
    const afterToggle = calc.getTotalSummary().dmg;

    expect(calc.selectedChanceList).toEqual([]);
    expect(afterToggle.effectedBasicDamageMin).toBe(baseDmg.basicMinDamage);
    expect(afterToggle.effectedBasicDamageMax).toBe(baseDmg.basicMaxDamage);
  });
});
