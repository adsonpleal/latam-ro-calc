import { Component, OnDestroy, OnInit } from '@angular/core';
import { ConfirmationService, MessageService, SelectItemGroup } from 'primeng/api';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { Observable, Subject, Subscription, catchError, debounceTime, filter, finalize, forkJoin, mergeMap, of, switchMap, take, tap, throwError } from 'rxjs';
import { PresetModel } from 'src/app/api-services';
import { RoService } from 'src/app/api-services/ro.service';
import { AllowedCompareItemTypes } from 'src/app/app-config';
import {
  AllowLeftWeaponMapper,
  AspdPotionList,
  AspdPotionList2,
  CardPosition,
  ElementConverterList,
  EnchantTable,
  ExtraOptionTable,
  FoodStatList,
  HeadGearLocation,
  ItemOptionNumber,
  ItemOptionTable,
  ItemSubTypeId,
  ItemTypeEnum,
  ItemTypeId,
  JobBuffs,
  MAX_OPTION_NUMBER,
  MainItemWithRelations,
  WeaponTypeName,
  WeaponTypeNameMapBySubTypeId,
  getMonsterSpawnMap,
} from 'src/app/constants';
import { ActiveSkillModel, AtkSkillModel, CharacterBase, ClassIdBySpriteJob, ClassName, PassiveSkillModel, SkillModel } from 'src/app/jobs';
import {
  createBaseHPSPOptionList,
  createExtraOptionList,
  createMainModel,
  createNumberDropdownList,
  prettyItemDesc,
  sortObj,
  toDropdownList,
  toRawOptionTxtList,
  toUpsertPresetModel,
} from 'src/app/utils';
import { waitRxjs } from 'src/app/utils/wait-rxjs';
import { importReplayBuffer } from '../../../replay/replay-to-model';
import { MainModel } from '../../../models/main.model';
import { environment } from 'src/environments/environment';
import { getClassDropdownList } from '../../../jobs/_class-list';
import { racePtBr, sizePtBr, elementPtBr } from '../../../constants/monster-i18n';
import { itemSlotLabelPtBr } from '../../../constants/item-slot-i18n';
import { ChanceModel } from '../../../models/chance-model';
import { BasicDamageSummaryModel, SkillDamageSummaryModel } from '../../../models/damage-summary.model';
import { DropdownModel, ItemDropdownModel } from '../../../models/dropdown.model';
import { HpSpTable } from '../../../models/hp-sp-table.model';
import { ItemListModel } from '../../../models/item-list.model';
import { ItemModel } from '../../../models/item.model';
import { MonsterModel } from '../../../models/monster.model';
import { LayoutService } from '../../service/app.layout.service';
import { ItemShopService } from './item-shop.service';
import { BaseStateCalculator } from 'src/app/core/base-state-calculator';
import { Calculator } from 'src/app/core/calculator';
import { CalculatorController, collectBuffBonuses, collectConsumables } from 'src/app/core/calculator-controller';
import { CalcStorage } from 'src/app/core/calc-storage';
import { parseOptionScripts } from 'src/app/core/option-scripts';
import {
  AtkTypeDataModel,
  ElementDataModel,
  RaceDataModel,
  SkillMultiplierModel,
  buildAtkTypeTable,
  buildElementTable,
  buildMonsterTypeTables,
  buildRaceTables,
  buildSizeTable,
  buildSkillMultiplierTable,
} from 'src/app/core/summary-tables';
import { MonsterDataViewComponent } from './monster-data-view/monster-data-view.component';
import { SavedSimulation, SavedSimulationStore } from 'src/app/core/saved-simulations';
import { encodeBuild, decodeBuild } from 'src/app/core/share-codec';
import { buildCharSpriteUrl, bareJobSprite } from 'src/app/pipes/char-sprite.pipe';

interface MonsterSelectItemGroup extends SelectItemGroup {
  items: any[];
}

const Characters = getClassDropdownList();

interface ClassModel extends Partial<Record<ItemTypeEnum, number>> {
  rawOptionTxts: string[];
  weaponGrade?: any;
  leftWeaponGrade?: any;
  shieldGrade?: any;
  headUpperGrade?: any;
  headMiddleGrade?: any;
  headLowerGrade?: any;
  armorGrade?: any;
  garmentGrade?: any;
  bootGrade?: any;
  accLeftGrade?: any;
  accRightGrade?: any;
}

const HideHpSp = {
  [ClassName.SpiritHandler]: environment.production,
  [ClassName.HyperNovice]: environment.production,
  [ClassName.NightWatch]: environment.production,
  [ClassName.Shinkiro]: environment.production,
  [ClassName.Shiranui]: environment.production,
  [ClassName.SoulAscetic]: environment.production,
  [ClassName.SkyEmperor]: environment.production,
};

@Component({
  selector: 'app-ro-calculator',
  templateUrl: './ro-calculator.component.html',
  styleUrls: ['./ro-calculator.component.css'],
  providers: [ConfirmationService, MessageService, DialogService],
})
export class RoCalculatorComponent implements OnInit, OnDestroy {
  // Beta notice shown on every simulator load (for now, no dismissal persistence).
  showBetaModal = true;
  readonly feedbackFormUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSc5wsk9KOLOmPbALe-Cww1dG4AYmjrSraEuBXcrweeyriSoLQ/viewform';
  readonly discordUrl = 'https://discord.gg/S4uEwGqK';

  updateItemEvent = new Subject();
  updateMonsterListEvent = new Subject();
  updateCompareEvent = new Subject();
  updateChanceEvent = new Subject();
  isCalculatingEvent = new Subject();

  monsterDataMap: Record<number, MonsterModel> = {};
  hpSpTable: HpSpTable;
  items!: Record<number, ItemModel>;
  mapEnchant!: Map<string, ItemModel>;
  enchants: DropdownModel[] = [];
  skillBuffs = JobBuffs;

  isInProcessingPreset = false;

  // --- Save / preview / share simulations (browser localStorage) ----------
  private savedSimStore = new SavedSimulationStore(localStorage);
  /** item id -> [sprite view id (ClassNum), visual-slot mask], for the paper-doll. */
  private itemViews: Record<string, [number, number]> = {};
  savedSims: SavedSimulation[] = [];
  showSavesDialog = false;
  showSaveDialog = false;
  saveName = '';
  showShareDialog = false;
  shareUrl = '';

  env = environment;
  model = createMainModel();
  private emptyModel = createMainModel();
  model2: ClassModel = { rawOptionTxts: [] };

  baseHpOptions = createBaseHPSPOptionList('BaseHP') as any;
  baseSpOptions = createBaseHPSPOptionList('BaseSP') as any;
  refineList = createNumberDropdownList({ from: 0, to: 18 });
  shadowRefineList = createNumberDropdownList({ from: 0, to: 10 });
  mainStatusList = createNumberDropdownList({ from: 1, to: 130 });
  traitStatusList = createNumberDropdownList({ from: 0, to: 100 });
  levelList = [];
  jobList = [];
  propertyAtkList = ElementConverterList;

  optionList: any[] = createExtraOptionList();
  itemList: ItemListModel = {} as any;

  weaponList: DropdownModel[] = [];
  leftWeaponList: DropdownModel[] = [];
  weaponCardList: DropdownModel[] = [];
  weaponEnchant0List: DropdownModel[] = [];
  leftWeaponEnchant0List: DropdownModel[] = [];
  ammoList: DropdownModel[] = [];
  headUpperList: DropdownModel[] = [];
  headMiddleList: DropdownModel[] = [];
  headLowerList: DropdownModel[] = [];
  headCardList: DropdownModel[] = [];
  armorList: DropdownModel[] = [];
  armorCardList: DropdownModel[] = [];
  shieldList: DropdownModel[] = [];
  shieldCardList: DropdownModel[] = [];
  garmentList: DropdownModel[] = [];
  garmentCardList: DropdownModel[] = [];
  bootList: DropdownModel[] = [];
  bootCardList: DropdownModel[] = [];
  accList: DropdownModel[] = [];
  accCardList: DropdownModel[] = [];
  accLeftList: DropdownModel[] = [];
  accLeftCardList: DropdownModel[] = [];
  accRightList: DropdownModel[] = [];
  accRightCardList: DropdownModel[] = [];
  petList: DropdownModel[] = [];


  costumeUpperList: DropdownModel[] = [];
  costumeMiddleList: DropdownModel[] = [];
  costumeLowerList: DropdownModel[] = [];
  costumeGarmentList: DropdownModel[] = [];

  costumeEnhUpperList: DropdownModel[] = [];
  costumeEnhMiddleList: DropdownModel[] = [];
  costumeEnhLowerList: DropdownModel[] = [];
  costumeEnhGarmentList: DropdownModel[] = [];
  costumeEnhGarment2List: DropdownModel[] = [];
  costumeEnhGarment4List: DropdownModel[] = [];

  shadowWeaponList: DropdownModel[] = [];
  shadowArmorList: DropdownModel[] = [];
  shadowShieldList: DropdownModel[] = [];
  shadowBootList: DropdownModel[] = [];
  shadowEarringList: DropdownModel[] = [];
  shadowPendantList: DropdownModel[] = [];

  characterList = Characters;
  selectedCharacter: CharacterBase;
  isShowSelectableSkillLevel = true;
  atkSkills: AtkSkillModel[] = [];
  atkSkillCascades: any[] = [];
  passiveSkills: PassiveSkillModel[] = [];
  activeSkills: ActiveSkillModel[] = [];
  consumableList: DropdownModel[] = [];
  consumableList2: DropdownModel[][] = FoodStatList;
  aspdPotionList: DropdownModel[] = [];
  aspdPotionList2: DropdownModel[] = AspdPotionList2;

  totalPoints = 0;
  availablePoints = 0;
  appropriateLevel = 0;

  isAllowTraitStat = false;
  totalTraitPoints = 0;
  availableTraitPoints = 0;
  appropriateLevelForTrait = 0;

  groupMonsterList: MonsterSelectItemGroup[] = [];
  monsterList: DropdownModel[] = [];
  selectedMonsterName = '';
  selectedMonster = Number(localStorage.getItem('monster')) || 21067;
  isShowMonsterEle = false;
  allSelectedMonsterIds: number[];

  chanceList = [] as ChanceModel[];
  selectedChances = [] as string[];

  isCalculating = false;
  private calculator = new Calculator();
  private calculator2 = new Calculator();
  private controller = new CalculatorController();
  private calcStorage = new CalcStorage(localStorage);
  private stateCalculator = new BaseStateCalculator();

  possiblyDamages: DropdownModel[];
  itemSummary: any;
  itemSummary2: any;
  /** Full per-source bonus breakdown (every equip slot/card/enchant + skills) from
   *  the last calc; powers the "which items contribute to this value" modal. */
  private bonusBreakdownSources: Record<string, any> = {};
  /** Every bonus key that at least one source contributes to (non-zero) in the last
   *  calc. A summary value is only worth a breakdown — and thus only clickable — when
   *  one of its keys is here; base/trait-derived stats (no item source) are excluded. */
  private bonusBreakdownKeys = new Set<string>();
  isShowBonusBreakdown = false;
  bonusBreakdownTitle = '';
  bonusBreakdownValueClass = 'summary_damage';
  bonusBreakdownRows: { label: string; icon?: number; iconType: 'item' | 'skill'; value: number; isPercent?: boolean }[] = [];
  modelSummary: any;
  totalSummary: any;

  elementTable: ElementDataModel[];
  raceTable: RaceDataModel[];
  peneRaceTable: RaceDataModel[];
  sizeTable: RaceDataModel[];
  classTable: RaceDataModel[];
  atkTypeTable: AtkTypeDataModel[];
  peneClassTable: RaceDataModel[];
  skillMultiplierTable: SkillMultiplierModel[];

  /**
   * Model 2
   */
  totalSummary2: any;
  compareItemSummaryModel: any;
  selectedCompareItemDesc: ItemTypeEnum;
  private equipCompareItemIdItemTypeMap = new Map<ItemTypeEnum, number>();
  equipCompareItems: DropdownModel[] = [];

  private equipItemMap = new Map<ItemTypeEnum, number>();
  private equipItemIdItemTypeMap = new Map<ItemTypeEnum, number>();
  equipItems: DropdownModel[] = [];
  itemSlotsMap: Partial<Record<ItemTypeEnum, number>> = {};
  selectedItemDesc: ItemTypeEnum;
  itemId = 0;
  itemBonus = {};
  /** Visual rows for the item-bonus panel (replaces the raw JSON dump): each stat/skill
   *  bonus as a labelled row, skill-named bonuses carrying their pt-BR skill icon. */
  itemBonusRows: { label: string; icon?: number; display: string; isSkill: boolean }[] = [];
  itemDescription = '';

  /** LATAM shops are split per server; the market link below points at whichever is
   *  selected. State + link logic live in ItemShopService so the search dialog shares it. */
  get shopServerOptions() {
    return this.itemShop.serverOptions;
  }
  get selectedShopServer(): string {
    return this.itemShop.server;
  }
  set selectedShopServer(value: string) {
    this.itemShop.server = value;
  }
  /** memoised pt-BR item descriptions (HTML) for the consumable hover popovers */
  private itemDescCache = new Map<number, string>();

  itemOptionNumber = ItemOptionNumber;

  cols: {
    field: keyof BasicDamageSummaryModel | keyof SkillDamageSummaryModel | 'health' | 'monsterClass';
    header: string;
    default?: boolean;
  }[] = [];
  selectedColumns: { field: string; header: string; }[] = [];
  selectedMonsterIds: number[] = this.calcStorage.readMonsterIds();
  calcDamages: any[] = [];

  private allSubs: Subscription[] = [];

  hiddenMap = { ammu: true, shield: true };
  isAllowLeftWeaponByClass = false;
  showLeftWeapon = false;
  isWeaponCanGrade = false;

  isEnableCompare = false;
  showCompareItemMap = {} as any;
  compareItemNames = [] as ItemTypeEnum[];
  compareItemList: (keyof typeof ItemTypeEnum)[] = [...AllowedCompareItemTypes];
  // Display options for the "comparar slot" multiselect: pt-BR label, English value.
  compareItemOptions = this.compareItemList.map((v) => ({ label: itemSlotLabelPtBr(v), value: v }));

  ref: DynamicDialogRef | undefined;
  monsterRef: DynamicDialogRef | undefined;
  hideBasicAtk = this.layoutService.config.hideBasicAtk;
  readonly hideHpSp = HideHpSp;

  equipableItems: (DropdownModel & { id: number; position: string; })[] = [];
  offensiveSkills: (DropdownModel & { icon?: number })[] = [];
  latamSkills: Record<string, { id: number; name: string; iconType?: 'item' | 'skill' }> = {};
  /** skill id -> pt-BR client skill description (raw ^RRGGBB text) */
  latamSkillDesc: Record<string, string> = {};

  // --- Replay (.rrf) import modal ---
  showReplayImport = false;
  replayDragOver = false;
  replayBusy = false;

  onClassChangedSubject = new Subject<boolean>();
  onClassChanged$ = this.onClassChangedSubject.asObservable();

  constructor(
    private roService: RoService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private dialogService: DialogService,
    private readonly layoutService: LayoutService,
    private readonly itemShop: ItemShopService,
  ) { }

  ngOnInit() {
    this.initCalcTableColumns();
    // A share link (?b=...) wins over the local autosave; falls back to it when absent.
    const sharedBuild = this.consumeSharedBuild();
    this.initData()
      .pipe(switchMap(() => this.loadItemSet(sharedBuild ?? localStorage.getItem('ro-set'))))
      .subscribe(() => {
        if (sharedBuild) {
          this.messageService.add({ severity: 'success', summary: 'Simulação carregada', detail: 'Carregada a partir do link compartilhado.' });
        }
      });

    const laySub = this.layoutService.configUpdate$.pipe(debounceTime(300)).subscribe((c) => {
      this.hideBasicAtk = c.hideBasicAtk;
    });
    this.allSubs.push(laySub);

    this.allSubs.push(this.roService.getItemViews().subscribe((views) => (this.itemViews = views || {})));

    const isCalcSubs = this.isCalculatingEvent.pipe(debounceTime(100)).subscribe(() => (this.isCalculating = false));
    this.allSubs.push(isCalcSubs);

    const itemChanges = new Set<ItemTypeEnum>();
    // let n = 0;
    const updateItemSubs = this.updateItemEvent
      .pipe(
        tap((itemChange: ItemTypeEnum) => {
          this.isCalculating = true;
          // console.log('updateItemSubs ', ++n);
          itemChanges.add(itemChange);
        }),
        debounceTime(250),
      )
      .subscribe(() => {
        this.hiddenMap = {
          ammu: !this.calculator.isAllowAmmo(),
          shield: !this.calculator.isAllowShield(),
        };
        if (this.hiddenMap.ammu && this.model.ammo) {
          this.model.ammo = undefined;
          this.onSelectItem(ItemTypeEnum.ammo);
          return;
        }
        if (this.hiddenMap.shield && this.model.shield) {
          this.model.shield = undefined;
          this.onSelectItem(ItemTypeEnum.shield);
          this.onClearItem(ItemTypeEnum.shield);
          return;
        }

        this.showLeftWeapon = this.isAllowLeftWeaponByClass && !this.hiddenMap.shield;
        if (this.model.leftWeapon && !this.showLeftWeapon) {
          this.model.leftWeapon = undefined;
          this.onSelectItem(ItemTypeEnum.leftWeapon);
          this.onClearItem(ItemTypeEnum.leftWeapon);
          return;
        }

        if (itemChanges.has(ItemTypeEnum.weapon)) {
          this.setAmmoDropdownList();
        }
        this.calculate();
        this.calcCompare();
        this.saveCurrentStateItemset();
        this.resetItemDescription();
        this.onSelectItemDescription(Boolean(this.selectedCompareItemDesc));
        this.applySummaryTables();

        this.chanceList = this.calculator.chanceList;
        const fixedSelectedChances = this.chanceList
          .filter(({ name }) => {
            return this.selectedChances.includes(name);
          })
          .map(({ name }) => name);
        this.selectedChances = fixedSelectedChances;

        this.isCalculatingEvent.next(false);
        itemChanges.clear();
      });
    this.allSubs.push(updateItemSubs);

    const updateMonsterListSubs = this.updateMonsterListEvent
      .pipe(
        tap(() => (this.isCalculating = true)),
        debounceTime(250),
      )
      .subscribe(() => {
        this.calculateToSelectedMonsters(false);
        this.calcStorage.writeMonsterIds(this.selectedMonsterIds);
        this.isCalculatingEvent.next(false);
      });
    this.allSubs.push(updateMonsterListSubs);

    const x = this.updateCompareEvent
      .pipe(
        tap(() => (this.isCalculating = true)),
        debounceTime(250),
      )
      .subscribe(() => {
        const model2 = { rawOptionTxts: this.model2?.rawOptionTxts || [] } as ClassModel;

        const equipItemIdItemTypeMap2 = new Map<ItemTypeEnum, number>();

        this.showCompareItemMap = (this.compareItemNames || [])
          .sort((a: any, b: any) => {
            return this.compareItemList.indexOf(a) > this.compareItemList.indexOf(b) ? 1 : -1;
          })
          .reduce((agg, itemTypeName) => {
            agg[itemTypeName] = true;

            model2[itemTypeName] = this.model2[itemTypeName] || null;

            const hasMainItem = model2[itemTypeName] != null;
            if (hasMainItem) {
              equipItemIdItemTypeMap2.set(itemTypeName, model2[itemTypeName]);
            }

            const relatedItems = MainItemWithRelations[itemTypeName];
            for (const relatedItemType of relatedItems) {
              model2[relatedItemType] = hasMainItem ? this.model2[relatedItemType] || null : null;
              const relatedVal = model2[relatedItemType];
              if (relatedVal) {
                equipItemIdItemTypeMap2.set(relatedItemType, relatedVal);
              }
            }

            if (!hasMainItem) {
              model2[`${itemTypeName}Refine`] = null;
              model2[`${itemTypeName}Grade`] = null;
              return agg;
            }

            model2[`${itemTypeName}Refine`] = this.model2[`${itemTypeName}Refine`] || 0;
            model2[`${itemTypeName}Grade`] = this.model2[`${itemTypeName}Grade`] || null;

            return agg;
          }, {});

        this.equipCompareItemIdItemTypeMap = equipItemIdItemTypeMap2;
        this.equipCompareItems = this.buildEquipItemList(this.equipCompareItemIdItemTypeMap, model2);
        // console.log('model2', { ...model2 })
        if (this.isEnableCompare) {
          this.model2 = model2;
          this.calcCompare();
        } else {
          this.resetModel2();
        }
        this.onSelectItemDescription(this.isEnableCompare && Boolean(this.selectedCompareItemDesc));

        this.isCalculatingEvent.next(false);
      });
    this.allSubs.push(x);

    const cObs = this.updateChanceEvent
      .pipe(
        tap(() => (this.isCalculating = true)),
        debounceTime(300),
        filter(() => {
          const needCalc = this.selectedChances?.length > 0;
          if (!needCalc) {
            this.isCalculatingEvent.next(false);
            this.calculator.setSelectedChances([]);
            this.calculateToSelectedMonsters();
          }

          return needCalc;
        }),
        tap(() => {
          this.calculator.setSelectedChances(this.selectedChances).recalcExtraBonus(this.model.selectedAtkSkill);
          this.totalSummary = this.calculator.getTotalSummary();
          this.calculateToSelectedMonsters();

          if (this.isEnableCompare) {
            this.onCompareItemChange();
          }
        }),
        debounceTime(100),
      )
      .subscribe(() => {
        this.isCalculatingEvent.next(false);
      });
    this.allSubs.push(cObs);
  }

  ngOnDestroy(): void {
    for (const ob of this.allSubs) {
      ob?.unsubscribe();
    }
    if (this.ref) {
      this.ref.close();
    }
  }

  private initData() {
    return forkJoin([
      this.roService.getItems<Record<number, ItemModel>>(),
      this.roService.getMonsters<Record<number, MonsterModel>>(),
      this.roService.getHpSpTable<HpSpTable>(),
      this.roService.getLatamClasses(),
      this.roService.getLatamSkills(),
      this.roService.getLatamSkillDesc(),
    ]).pipe(
      tap(([items, monsters, hpSpTable, latamClasses, latamSkills, latamSkillDesc]) => {
        this.items = items;
        this.monsterDataMap = monsters;
        this.hpSpTable = hpSpTable;
        this.latamSkills = latamSkills;
        this.latamSkillDesc = latamSkillDesc;

        // Hide classes unreleased on LATAM (no job icon in the client GRF).
        const latamClassSet = new Set(latamClasses);
        this.characterList = Characters.filter((c) => latamClassSet.has(c.icon));

        this.selectedMonsterName = this.monsterDataMap[this.selectedMonster]?.name;

        this.calculator.setMasterItems(items).setHpSpTable(hpSpTable);
        this.calculator2.setMasterItems(items).setHpSpTable(hpSpTable);

        const ens = [] as DropdownModel[];
        this.mapEnchant = new Map(
          Object.values(items)
            .filter((item) => item.itemTypeId === ItemTypeId.ENCHANT)
            .map((item) => {
              ens.push({
                label: item.name,
                value: item.id,
              });

              return [item.aegisName, item];
            }),
        );
        this.enchants = ens;

        if (!this.env.production) {
          const enchants = EnchantTable.flatMap((a) => a.enchants)
            .filter(Boolean)
            .flat();
          const allEnchantSet = new Set(enchants);
          console.log({ allEnchantSet });
          for (const enchtName of allEnchantSet.values()) {
            if (!this.mapEnchant.has(enchtName)) {
              console.log('not found in data.json', { enchtName });
            }
          }
        }

        this.setMonsterDropdownList();
        this.setItemList();
      }),
    );
  }

  private initCalcTableColumns() {
    this.cols = [
      { field: 'health', header: 'HP', default: true },
      { field: 'monsterClass', header: 'Classe' },
      { field: 'skillMinDamage', header: 'Dano Mín', default: true },
      { field: 'skillMaxDamage', header: 'Dano Máx', default: true },
      { field: 'skillDps', header: 'DPS', default: true },
      { field: 'skillHitKill', header: 'Golpes p/ Matar', default: true },
      { field: 'skillCriRateToMonster', header: 'Tx. Crít.' },
      { field: 'skillAccuracy', header: 'Precisão' },
      { field: 'skillTotalPene', header: 'Penetração' },
      // { field: 'hitRate', header: 'Precisão' },
      { field: 'accuracy', header: 'Precisão Bás.' },
      { field: 'totalPene', header: 'Penetração Bás.' },
      { field: 'basicMinDamage', header: 'Dano Mín Bás.' },
      { field: 'basicMaxDamage', header: 'Dano Máx Bás.' },
      { field: 'criMaxDamage', header: 'Dano Crít. Bás.' },
      { field: 'criMaxDamage', header: 'DPS Bás.' },
      { field: 'basicCriRate', header: 'Tx. Crít. Bás.' },
    ];
    const availableCols = new Map(this.cols.map((a) => [a.field, a]));

    const cached = this.calcStorage.readBattleColNames()
      .map((col) => availableCols.get(col as any))
      .filter(Boolean);
    if (cached.length > 0) {
      this.selectedColumns = cached;
      return;
    }

    const defaultCols = [...this.cols.filter((a) => a.default).map((a) => a)];
    this.selectedColumns = defaultCols;
  }

  private prepare(calculator: Calculator, compareModel?: any) {
    const { activeSkills, passiveSkills, selectedAtkSkill } = this.model;
    const { equipAtks, masteryAtks, activeSkillNames, learnedSkillMap } = this.selectedCharacter
      .setLearnSkills({
        activeSkillIds: activeSkills,
        passiveSkillIds: passiveSkills,
      })
      .getSkillBonusAndName();

    const { aspdPotion } = this.model;
    const { scripts: consumeData, usedHpL } = collectConsumables(this.model, this.items);
    const { equipAtk: buffEquips, masteryAtk: buffMasterys } = collectBuffBonuses(this.skillBuffs, this.model.skillBuffs, activeSkillNames);

    const calc = calculator.setClass(this.selectedCharacter);
    const rawOptionTxts = [...this.model.rawOptionTxts];
    const isShadowOption = {
      [ItemTypeEnum.shadowWeapon]: true,
      [ItemTypeEnum.shadowArmor]: true,
      [ItemTypeEnum.shadowShield]: true,
      [ItemTypeEnum.shadowBoot]: true,
      [ItemTypeEnum.shadowEarring]: true,
      [ItemTypeEnum.shadowPendant]: true,
    };
    if (compareModel) {
      const model2 = { ...this.model, ...compareModel };
      calc.loadItemFromModel(model2);

      // if compare the item, should get options from its.
      if (this.compareItemNames?.includes(ItemTypeEnum.weapon)) {
        const itemId = this.model2[ItemTypeEnum.weapon];
        for (let slot = ItemOptionNumber.W_Left_1; slot <= ItemOptionNumber.W_Left_3; slot++) {
          if (!itemId) {
            this.model2.rawOptionTxts[slot] = null;
          }
          rawOptionTxts[slot] = this.model2.rawOptionTxts[slot];
        }

        const isAllowShield = calc.isAllowShield();
        for (let slot = ItemOptionNumber.W_Right_1; slot <= ItemOptionNumber.W_Right_3; slot++) {
          if (!itemId || !isAllowShield) {
            this.model2.rawOptionTxts[slot] = null;
            rawOptionTxts[slot] = this.model2.rawOptionTxts[slot];
          }
        }

        if (!isAllowShield) {
          const clearList = [ItemTypeEnum.shield, ItemTypeEnum.leftWeapon];
          for (const itemT of clearList) {
            calc.setItem({ itemId: undefined, itemType: itemT });
            for (const relatedItemType of MainItemWithRelations[itemT]) {
              calc.setItem({ itemId: undefined, itemType: relatedItemType });
            }
          }

          const [_, slots] = ItemOptionTable.find(([itemType]) => itemType === ItemTypeEnum.shield) || ['', []];
          for (const slot of slots) {
            rawOptionTxts[slot] = null;
            this.model2.rawOptionTxts[slot] = null;
          }
        }
      }

      for (const [_itemType, slotNumbers] of ItemOptionTable) {
        if (this.compareItemNames?.includes(_itemType)) {
          const itemId = this.model2[_itemType];

          if (isShadowOption[_itemType]) {
            // Shadow gear can carry up to two options (SD_*_1 / SD_*_2); mirror
            // the primary path (toRawOptionTxtList) and copy/clear every slot.
            for (const slot of slotNumbers) {
              if (!itemId) this.model2.rawOptionTxts[slot] = null;
              rawOptionTxts[slot] = this.model2.rawOptionTxts[slot];
            }
            continue;
          }

          for (const slot of slotNumbers) {
            rawOptionTxts[slot] = this.model2.rawOptionTxts[slot];
          }

          let totalItemOptionSlot = 0;
          if (itemId) {
            const aegisName = this.items[itemId]?.aegisName;
            totalItemOptionSlot = ExtraOptionTable[aegisName] || 0;
          }

          for (const [index, slot] of slotNumbers.entries()) {
            if (totalItemOptionSlot <= index) {
              rawOptionTxts[slot] = null;
              this.model2.rawOptionTxts[slot] = null;
            }
          }
        }
      }
    } else {
      // clean if the itemType not allow to have options
      this.model.rawOptionTxts = toRawOptionTxtList(this.model, this.items);

      calc.loadItemFromModel(this.model);
    }

    this.controller.runChain(calc, {
      monster: this.monsterDataMap[this.selectedMonster],
      equipAtks,
      masteryAtks,
      buffEquips,
      buffMasterys,
      consumeData,
      aspdPotion,
      extraOptionScripts: parseOptionScripts(!compareModel ? this.model.rawOptionTxts : rawOptionTxts),
      activeSkillNames,
      learnedSkillMap,
      selectedAtkSkill,
      selectedChances: this.selectedChances,
      usedHpL,
    });

    return calc;
  }

  private calculate() {
    const calc = this.prepare(this.calculator);

    this.totalSummary = calc.getTotalSummary();
    const modelSummary = calc.getModelSummary() as any;
    this.modelSummary = { ...modelSummary, rawOptionTxts: modelSummary.rawOptionTxts.filter(Boolean) };
    const x = calc.getItemSummary();
    this.bonusBreakdownSources = x;
    const contributingKeys = new Set<string>();
    for (const map of Object.values(x)) {
      if (!map || typeof map !== 'object') continue;
      for (const [k, v] of Object.entries(map)) {
        if (typeof v === 'number' && v !== 0) contributingKeys.add(k);
      }
    }
    this.bonusBreakdownKeys = contributingKeys;
    const splitNumber = Object.keys(x).length / 2;
    const part1 = Object.entries(x).filter((a, index) => {
      return index < splitNumber;
    });
    const part2 = Object.entries(x).filter((a, index) => {
      return index >= splitNumber;
    });
    this.itemSummary = part1.reduce((total, [key, value]) => {
      total[key] = value;
      return total;
    }, {});
    this.itemSummary2 = part2.reduce((total, [key, value]) => {
      total[key] = value;
      return total;
    }, {});
    // this.possiblyDamages = calc.getPossiblyDamages().map((a) => ({ label: `${a}`, value: a }));

    this.calculateToSelectedMonsters();
  }

  private calcCompare() {
    if (this.compareItemNames?.length > 0) {
      const m2 = JSON.parse(JSON.stringify(this.model2));
      const calc2 = this.prepare(this.calculator2, m2);
      this.totalSummary2 = calc2.getTotalSummary();
      this.compareItemSummaryModel = calc2.getItemSummary();
    }
  }

  /**
   * Recompute every "Bônus de Habilidade / Multiplicadores" summary table from
   * the latest engine output. The shaping logic lives in `core/summary-tables`;
   * this just wires the pure builders to the bound view fields.
   */
  private applySummaryTables(): void {
    this.elementTable = buildElementTable(this.totalSummary);
    ({ raceTable: this.raceTable, peneRaceTable: this.peneRaceTable } = buildRaceTables(this.totalSummary));
    this.sizeTable = buildSizeTable(this.totalSummary);
    ({ classTable: this.classTable, peneClassTable: this.peneClassTable } = buildMonsterTypeTables(this.totalSummary));
    this.atkTypeTable = buildAtkTypeTable(this.totalSummary);
    this.skillMultiplierTable = buildSkillMultiplierTable(this.totalSummary, (name) => this.resolveSkill(name));
  }

  calculateToSelectedMonsters(needCalcAll = true) {
    const classMap = ['Normal', 'Champion', 'Boss'];
    const selectedMonsterIds = this.selectedMonsterIds || [];

    if (!needCalcAll) {
      const alreadyCalc = new Set(this.calcDamages.map((a) => a.id));
      const noCalcs = selectedMonsterIds.filter((id) => !alreadyCalc.has(id));
      if (noCalcs.length === 0) {
        this.calcDamages = this.calcDamages.filter((a) => selectedMonsterIds.includes(a.id));
        return;
      }
    }

    const isUseHpL = this.model.consumables.includes(12424);
    this.calcDamages = selectedMonsterIds.map((monsterId) => {
      const monster = this.monsterDataMap[monsterId];
      const calculated = this.calculator.setMonster(monster).prepareAllItemBonus().calcDmgWithExtraBonus({ skillValue: this.model.selectedAtkSkill, isUseHpL });

      const {
        id,
        name,
        stats: { elementShortName, level, elementName, raceName, scaleName, health, class: _class },
      } = monster;

      return {
        id,
        label: `${level} ${name} (${racePtBr(raceName)}, ${sizePtBr(scaleName).at(0)}, ${elementPtBr(elementName)})`,
        health,
        monsterClass: classMap[_class],
        elementName: elementShortName,
        ...calculated,
      };
    });

    // reset to main selected monster
    this.calculator.setMonster(this.monsterDataMap[this.selectedMonster]).prepareAllItemBonus().calcAllAtk();
  }

  private resetModel() {
    const { class: _class, level, jobLevel } = this.model;
    this.model = { ...createMainModel(), class: _class, level, jobLevel };
    this.resetModel2();
  }

  private resetModel2() {
    this.model2 = { rawOptionTxts: [] };
  }

  private waitConfirm(message: string, icon?: string) {
    return new Promise((res) => {
      this.confirmationService.confirm({
        message: message,
        header: 'Confirmação',
        icon: icon || 'pi pi-exclamation-triangle',
        accept: () => {
          res(true);
        },
        reject: () => {
          console.log('reject confirm');
          res(false);
        },
      });
    });
  }

  private setModelByJSONString(savedModel: string | any) {
    const savedData = typeof savedModel === 'string' ? JSON.parse(savedModel || '{}') : savedModel;
    const rawModel = createMainModel();
    if (!savedData) {
      this.model = rawModel;
      return;
    }

    for (const [key, initialValue] of Object.entries(this.emptyModel)) {
      const isAttrArray = Array.isArray(initialValue);

      const savedValue = savedData[key];
      const validValue = isAttrArray ? (Array.isArray(savedValue) ? savedValue : []) : savedValue ?? initialValue;
      rawModel[key] = validValue;
    }

    const rawOptionTxts = [] as string[];
    // migrate
    for (let i = 0; i <= MAX_OPTION_NUMBER; i++) {
      if (rawModel.rawOptionTxts[i]) {
        rawOptionTxts[i] = rawModel.rawOptionTxts[i];
      }
    }
    for (let i = 51; i <= 56; i++) {
      if (rawModel.rawOptionTxts[i]) {
        rawOptionTxts[i - 31] = rawModel.rawOptionTxts[i];
      }
    }

    rawModel.rawOptionTxts = rawOptionTxts;

    const mapPhamacy = {
      2: 100232,
      3: 100233,
    };
    const p = mapPhamacy[rawModel?.skillBuffMap['Special Pharmacy']];
    if (Boolean(p) && Array.isArray(rawModel.consumables)) {
      if (!rawModel.consumables.includes(p)) {
        rawModel.consumables.push(p);
      }
    }

    this.model = rawModel;
  }

  loadItemSet(presetStrOrModel: string | PresetModel, isSetMinLevel = false) {
    this.isInProcessingPreset = true;

    this.setModelByJSONString(presetStrOrModel);

    this.model.selectedAtkSkill = this.model.selectedAtkSkill || this.atkSkills[0]?.value;
    const selectedAtkSkill = this.model.selectedAtkSkill;

    const { level, jobLevel, ...bkModel } = this.model;

    this.setClassInstant();
    this.setSkillModelArray();
    this.setClassSkill();
    this.setClassMinMaxLvl();

    return waitRxjs().pipe(
      take(1),
      mergeMap(() => {
        this.setClassLvl({ currentLvl: level, currentJob: jobLevel, isSetMinLevel });
        this.setJobBonus();
        return waitRxjs();
      }),
      mergeMap(() => {
        this.setAspdPotionList();
        this.setDefaultSkill(selectedAtkSkill);
        this.setItemDropdownList();
        return waitRxjs();
      }),
      mergeMap(() => {
        try {
          this.model.shield = bkModel.shield;
          this.model.shieldCard = bkModel.shieldCard;
          this.model.shieldGrade = bkModel.shieldGrade;
          this.model.shieldRefine = bkModel.shieldRefine;
          this.model.shieldEnchant1 = bkModel.shieldEnchant1;
          this.model.shieldEnchant2 = bkModel.shieldEnchant2;
          this.model.shieldEnchant3 = bkModel.shieldEnchant3;

          for (const itemType of Object.keys(MainItemWithRelations) as ItemTypeEnum[]) {
            const refine = this.model[`${itemType}Refine`];
            const itemId = this.model[itemType];
            this.onSelectItem(itemType, itemId, refine);
            // console.log('Set Main Item', { itemType, itemId, refine });
            for (const relatedItemType of MainItemWithRelations[itemType] ?? []) {
              // console.log({ relatedItemType, val: this.model[relatedItemType] });
              this.onSelectItem(relatedItemType, this.model[relatedItemType], refine);
            }
          }
          this.onBaseStatusChange();
        } catch (error) {
          console.error(error);
        }

        return waitRxjs(1);
      }),
      finalize(() => {
        this.isInProcessingPreset = false;
      }),
    );
  }

  private saveCurrentStateItemset() {
    localStorage.setItem('ro-set', JSON.stringify(toUpsertPresetModel(this.model, this.selectedCharacter)));
  }

  // --- Save / preview / share simulations ---------------------------------
  /** The current build in the same preset shape the autosave / replay import use. */
  private currentPreset(): PresetModel {
    return toUpsertPresetModel(this.model, this.selectedCharacter) as unknown as PresetModel;
  }

  /** Display label for a class id, for the preview cards / save name prefill. */
  classLabel(classId: number): string {
    return Characters.find((c) => c.value === classId)?.label ?? '';
  }

  openSaveDialog(): void {
    const label = this.classLabel(this.model.class) || 'Simulação';
    this.saveName = `${label} Nv ${this.model.level}`;
    this.showSaveDialog = true;
  }

  async confirmSave(): Promise<void> {
    const name = (this.saveName || '').trim();
    if (!name) {
      this.messageService.add({ severity: 'warn', summary: 'Nome obrigatório', detail: 'Dê um nome à simulação.' });
      return;
    }
    if (this.savedSimStore.nameExists(name)) {
      const ok = await this.waitConfirm(`Já existe uma simulação chamada "${name}". Substituir?`);
      if (!ok) return;
    }
    this.savedSimStore.upsert(name, this.currentPreset());
    this.showSaveDialog = false;
    this.messageService.add({ severity: 'success', summary: 'Simulação salva', detail: name });
  }

  openSavesDialog(): void {
    this.savedSims = this.savedSimStore.list();
    this.showSavesDialog = true;
  }

  async loadSavedSim(sim: SavedSimulation): Promise<void> {
    const ok = await this.waitConfirm('Isso vai substituir a simulação atual. Continuar?');
    if (!ok) return;
    this.loadItemSet(sim.preset).subscribe({
      complete: () => {
        this.showSavesDialog = false;
        this.onBaseStatusChange();
        this.messageService.add({ severity: 'success', summary: 'Simulação carregada', detail: sim.name });
      },
      error: (err) => {
        console.error(err);
        this.messageService.add({ severity: 'error', summary: 'Falha ao carregar', detail: 'Erro ao aplicar a simulação.' });
      },
    });
  }

  async deleteSavedSim(sim: SavedSimulation, event: Event): Promise<void> {
    event.stopPropagation();
    const ok = await this.waitConfirm(`Excluir a simulação "${sim.name}"?`);
    if (!ok) return;
    this.savedSimStore.remove(sim.id);
    this.savedSims = this.savedSimStore.list();
    this.messageService.add({ severity: 'info', summary: 'Simulação excluída', detail: sim.name });
  }

  async newSimulation(): Promise<void> {
    const ok = await this.waitConfirm('Isso vai limpar a simulação atual e começar do zero. Continuar?');
    if (!ok) return;
    this.loadItemSet(createMainModel() as any).subscribe({
      complete: () => {
        this.showSavesDialog = false;
        this.onBaseStatusChange();
        this.messageService.add({ severity: 'success', summary: 'Nova simulação', detail: 'Tudo foi limpo.' });
      },
    });
  }

  openShareDialog(): void {
    this.shareUrl = this.buildShareUrl();
    this.showShareDialog = true;
  }

  async copyShareUrl(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.shareUrl);
      this.messageService.add({ severity: 'success', summary: 'Link copiado', detail: 'Cole para compartilhar a simulação.' });
    } catch (error) {
      console.error(error);
      this.messageService.add({ severity: 'warn', summary: 'Copie manualmente', detail: 'Selecione o link e copie.' });
    }
  }

  /** Full paper-doll URL (job + equipped headgears/garment) for a saved-sim card. */
  charSpriteUrl(preset: PresetModel): string {
    return buildCharSpriteUrl(preset as unknown as Record<string, any>, this.itemViews);
  }

  /** (error) handler for the paper-doll <img>: degrade to the bare job sprite, then hide. */
  onCharSpriteError(event: Event, classId: number): void {
    const img = event.target as HTMLImageElement;
    const fallback = bareJobSprite(classId);
    if (fallback && img.src !== fallback) img.src = fallback;
    else img.style.visibility = 'hidden';
  }

  private buildShareUrl(): string {
    const token = encodeBuild(this.currentPreset() as unknown as Record<string, any>);
    const { origin, pathname } = window.location;
    return `${origin}${pathname}#/?b=${token}`;
  }

  /** Read & consume a shared build (?b=...) from the URL (query or hash query),
   *  then strip the param so a refresh/copy doesn't re-apply or leak the token. */
  private consumeSharedBuild(): PresetModel | null {
    try {
      // Read the token raw — NOT via URLSearchParams, which would turn any '+'
      // into a space. The token lives in the hash query (#/?b=...) or the search.
      const match = window.location.href.match(/[?&]b=([^&#]+)/);
      const token = match?.[1];
      if (!token) return null;
      const build = decodeBuild(token) as PresetModel | null;
      this.stripBuildParamFromUrl();
      return build;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  private stripBuildParamFromUrl(): void {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('b');
      let hash = url.hash;
      if (hash.includes('?')) {
        const path = hash.slice(0, hash.indexOf('?'));
        const params = new URLSearchParams(hash.slice(hash.indexOf('?') + 1));
        params.delete('b');
        const rest = params.toString();
        hash = rest ? `${path}?${rest}` : path;
      }
      url.hash = hash;
      window.history.replaceState(null, '', url.toString());
    } catch (error) {
      console.error(error);
    }
  }

  // --- Import build from a Ragnarok replay (.rrf) -------------------------
  openReplayImport() {
    this.showReplayImport = true;
  }

  onReplayDragOver(event: DragEvent) {
    event.preventDefault();
    this.replayDragOver = true;
  }

  onReplayDragLeave(event: DragEvent) {
    event.preventDefault();
    this.replayDragOver = false;
  }

  onReplayDrop(event: DragEvent) {
    event.preventDefault();
    this.replayDragOver = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) this.importReplay(file);
  }

  onReplayInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.importReplay(file);
    input.value = ''; // allow re-picking the same file
  }

  /**
   * Map a replay's learned skill tree (client skill id → level) onto the model's
   * skill panels. Keyed by skill name through the LATAM skill map (name → id), so
   * only skills the calculator knows about are set; the rest stay at 0.
   * setSkillModelArray() (run inside loadItemSet) applies these maps to the actual
   * dropdowns, which is what produces the passive-skill stat bonuses.
   */
  private applyLearnedSkills(model: MainModel, learnedSkills: Record<number, number>) {
    const char = this.characterList.find((c) => c.value === model.class)?.['instant'] as CharacterBase | undefined;
    if (!char) return;

    // Resolve the dropdown value that represents a given learned level. Most
    // skills use the level as the value; the skillLv/closest fallbacks cover the
    // few whose option values aren't the plain level (toggles, bonus amounts).
    const pick = (dropdown: SkillModel[] = [], level: number): number => {
      if (!level) return 0;
      const byLv = dropdown.find((o) => o.skillLv === level);
      if (byLv) return byLv.value;
      const byVal = dropdown.find((o) => o.value === level);
      if (byVal) return byVal.value;
      const ranked = dropdown
        .filter((o) => o.isUse !== false)
        .map((o) => ({ value: o.value, lv: o.skillLv ?? o.value }))
        .filter((o) => typeof o.lv === 'number' && o.lv <= level)
        .sort((a, b) => b.lv - a.lv);
      return ranked.length ? ranked[0].value : 0;
    };

    const build = (skills: { name: string; dropdown: SkillModel[] }[]) => {
      const out: Record<string, number> = {};
      for (const s of skills) {
        const id = this.latamSkills[s.name]?.id;
        const level = id ? learnedSkills[id] : 0;
        if (!level) continue;
        const value = pick(s.dropdown, level);
        if (value) out[s.name] = value;
      }
      return out;
    };

    model.passiveSkillMap = { ...model.passiveSkillMap, ...build(char.passiveSkills) };
    model.activeSkillMap = { ...model.activeSkillMap, ...build(char.activeSkills) };
    model.skillBuffMap = { ...model.skillBuffMap, ...build(this.skillBuffs) };
  }

  async importReplay(file: File) {
    if (this.replayBusy) return;
    this.replayBusy = true;
    try {
      const buf = await file.arrayBuffer();
      const { model, summary, learnedSkills } = importReplayBuffer(buf, this.items);
      // The replay carries the real sprite/job id (e.g. 4073 Royal Guard); the
      // calc models classes by internal id (11), so translate it back so the
      // class dropdown + icon select the right class.
      model.class = ClassIdBySpriteJob[model.class] ?? model.class;
      // The calculator only carries the advanced LATAM classes; bail out cleanly
      // (keeping the current build) if the replay's class isn't one of them.
      if (!this.characterList?.some((c) => c.value === model.class)) {
        this.replayBusy = false;
        this.messageService.add({
          severity: 'warn',
          summary: 'Classe indisponível',
          detail: `A classe deste replay (${summary.player || 'personagem'}, job ${model.class}) não está disponível na calculadora.`,
          life: 7000,
        });
        return;
      }
      // Importing replaces the current build — confirm first (same alert as
      // loading a saved sim / starting a new simulation).
      const ok = await this.waitConfirm('Isso vai substituir a simulação atual. Continuar?');
      if (!ok) {
        this.replayBusy = false;
        return;
      }
      // Map the replay's learned skill tree onto the model's skill panels before
      // loadItemSet — setSkillModelArray() (run inside it) applies these maps.
      this.applyLearnedSkills(model, learnedSkills);
      this.loadItemSet(model as any).subscribe({
        complete: () => {
          // Switching to a class with a different level range can leave the
          // level/job dropdowns holding a momentarily out-of-range value; re-assert
          // the replay's levels and recompute once everything has settled.
          if (summary.baseLevel) this.model.level = summary.baseLevel;
          if (summary.jobLevel) this.model.jobLevel = summary.jobLevel;
          this.onBaseStatusChange();
          this.replayBusy = false;
          this.showReplayImport = false;
          const skipped = summary.skippedItems.length;
          const detail =
            `${summary.player || 'Personagem'} — nível ${summary.baseLevel}, ${summary.equippedCount} equipamentos` +
            (summary.appliedOptions ? `, ${summary.appliedOptions} bônus aleatórios` : '') +
            (summary.learnedSkillCount ? `, ${summary.learnedSkillCount} habilidades` : '') +
            (skipped ? `, ${skipped} ignorado(s) (fora do banco de dados)` : '') +
            '. ⚠️ Talentos (POD/STA/SAB/FEI/CON/CRV) não são gravados no replay — ajuste-os manualmente.';
          this.messageService.add({ severity: 'success', summary: 'Replay importado', detail, life: 9000 });
        },
        error: (err) => {
          this.replayBusy = false;
          console.error(err);
          this.messageService.add({ severity: 'error', summary: 'Falha ao importar', detail: 'Erro ao aplicar o replay.' });
        },
      });
    } catch (e) {
      this.replayBusy = false;
      console.error(e);
      this.messageService.add({ severity: 'error', summary: 'Arquivo inválido', detail: 'Não foi possível ler o arquivo .rrf.' });
    }
  }

  private resetItemDescription() {
    const equipItemTypes: string[] = [];
    const map = new Map<ItemTypeEnum, number>();
    const mapRefine = new Map<string, number>();

    for (const [itemType, relations] of Object.entries(MainItemWithRelations)) {
      const itemId = this.equipItemMap.get(itemType as any);
      if (itemId) {
        equipItemTypes.push(itemType);
        map.set(itemType as any, itemId);

        mapRefine.set(itemType, this.model[`${itemType}Refine`]);
      }

      for (const itemType2 of relations) {
        const itemId = this.equipItemMap.get(itemType2 as any);
        if (itemId) {
          equipItemTypes.push(itemType2);
          map.set(itemType2 as any, itemId);
        }
      }
    }

    this.equipItemIdItemTypeMap = map;

    if (!equipItemTypes.includes(this.selectedItemDesc)) {
      this.selectedItemDesc = undefined;
    }
    this.equipItems = this.buildEquipItemList(this.equipItemIdItemTypeMap, this.model);
  }

  private buildEquipItemList(itemMap: Map<ItemTypeEnum, number>, model: typeof this.model | typeof this.model2) {
    return [...itemMap.entries()]
      .filter(([itemType, id]) => this.items[id] && model[itemType])
      .map(([itemType, id]) => {
        const grade = model[`${itemType}Grade`];
        const prefixGrade = grade && typeof grade === 'string' ? ` [${grade}] ` : '';

        const refine = model[`${itemType}Refine`];
        const prefixRefine = refine && refine > 0 ? ` +${refine} ` : '';

        return {
          label: `${prefixRefine}${prefixGrade}${this.items[id]?.name}`,
          value: itemType,
          id,
        };
      });
  }

  /** pt-BR label of the currently selected class (same lookup as the class picker),
   *  used for the item-search dialog title. Falls back to '' before a class is set. */
  get selectedClassLabel(): string {
    return Characters.find((a) => a.value === this.model.class)?.label ?? '';
  }

  private setClassInstant() {
    const c = Characters.find((a) => a.value === this.model.class)?.['instant'] as CharacterBase;
    this.selectedCharacter = c || Characters[0]['instant'];
    this.calculator.setClass(this.selectedCharacter);
    this.isAllowTraitStat = this.selectedCharacter.isAllowTraitStat();
    this.isAllowLeftWeaponByClass = AllowLeftWeaponMapper[this.selectedCharacter.className] || false;
  }

  /** Resolve a calc skill name to its LATAM { id, pt-BR name }. The id is baked
   *  per skill at build time (tools/build-latam-skills.mjs -> latam-skills.json),
   *  keyed by the calc's own skill name, so this is a direct exact lookup. */
  private resolveSkill(name: string): { id: number; name: string; iconType?: 'item' | 'skill' } | undefined {
    return this.latamSkills[name];
  }

  private setClassSkill() {
    // Overlay pt-BR skill names + ragassets skill-icon id (from the GRF skill map)
    // on every skill panel. Skills missing from the map keep their English label
    // and render no icon (the template guards on `icon`).
    const localize = <T extends { name: string }>(skill: T) => {
      const pt = this.resolveSkill(skill.name);
      return pt ? { ...skill, label: pt.name, icon: pt.id, iconType: pt.iconType } : skill;
    };
    // Buffs keep their curated (already pt-BR) labels — only attach the icon id.
    // A buff may pin its own `icon` (e.g. a generic buff that shouldn't use the
    // skill-map icon); that explicit id wins over the resolved one.
    const attachIcon = <T extends { name: string; icon?: number }>(skill: T) => {
      const pt = this.resolveSkill(skill.name);
      return pt ? { ...skill, icon: skill.icon ?? pt.id } : skill;
    };
    this.skillBuffs = JobBuffs.map(attachIcon);
    this.activeSkills = this.selectedCharacter.activeSkills.map(localize);
    this.passiveSkills = this.selectedCharacter.passiveSkills.map(localize);
    this.atkSkills = this.selectedCharacter.atkSkills.map(localize);
    this.offensiveSkills = [...new Set(this.selectedCharacter.atkSkills.map((a) => a.name)).values()].map((name) => {
      const pt = this.resolveSkill(name);
      return { label: pt?.name ?? name, value: name, icon: pt?.id };
    });
    this.atkSkillCascades = this.atkSkills;
    this.isShowSelectableSkillLevel = this.selectedCharacter.atkSkills.some((a) => a.levelList?.length > 0);
  }

  private setClassMinMaxLvl() {
    const {
      minMaxLevel: [min, max],
      maxJob,
    } = this.selectedCharacter.minMaxLevelCap;

    this.levelList = createNumberDropdownList({ from: min, to: max });
    this.jobList = createNumberDropdownList({ from: 1, to: maxJob, excludingNumbers: [66, 67, 68, 69] });
  }

  private setClassLvl(params: { currentLvl: number; currentJob: number; isSetMinLevel?: boolean; }) {
    const { currentJob, currentLvl, isSetMinLevel = false } = params;
    const {
      minMaxLevel: [min, max],
      maxJob,
    } = this.selectedCharacter.minMaxLevelCap;

    this.model.level = isSetMinLevel ? min : currentLvl;
    this.model.jobLevel = isSetMinLevel ? 1 : currentJob;

    const { level, jobLevel } = this.model;

    if (level < min || level > max) {
      this.model.level = 200;
    }

    if (!jobLevel || jobLevel > maxJob) {
      this.model.jobLevel = 1;
    }
  }

  private setDefaultSkill(selectedSkill?: string) {
    const defaultAtkSkill = this.atkSkills[0].value;
    const selectedAtkSkill = this.model.selectedAtkSkill || selectedSkill;
    if (!selectedAtkSkill) {
      this.model.selectedAtkSkill = defaultAtkSkill;
      return;
    }

    const selectedValidSkill = this.atkSkills.find((a) => a.value === selectedAtkSkill || (Array.isArray(a.values) && a.values?.includes(selectedAtkSkill)));
    const selectedValidSkill2 = this.atkSkills.find(
      (a) => Array.isArray(a.levelList) && a.levelList.length > 0 && a.levelList.find((lv) => lv.value === selectedAtkSkill),
    );
    if (selectedValidSkill?.value) {
      this.model.selectedAtkSkill = selectedValidSkill.value;
    } else if (selectedValidSkill2?.value) {
      this.model.selectedAtkSkill = selectedAtkSkill;
    } else {
      this.model.selectedAtkSkill = defaultAtkSkill;
    }
  }

  private setAspdPotionList() {
    this.aspdPotionList = AspdPotionList.filter(({ value }) => {
      switch (value) {
        case 645:
          return true;
        case 656:
          return true;
        case 657: {
          const usable = [
            ClassName.RuneKnight,
            ClassName.DragonKnight,
            ClassName.RoyalGuard,
            ClassName.ImperialGuard,
            ClassName.Genetic,
            ClassName.Biolo,
            ClassName.Mechanic,
            ClassName.Meister,
            ClassName.ShadowChaser,
            ClassName.AbyssChaser,
            ClassName.Warlock,
            ClassName.ArchMage,
            ClassName.Rebellion,
            ClassName.NightWatch,
            ClassName.SoulReaper,
            ClassName.SoulAscetic,
            ClassName.StarEmperor,
            ClassName.SkyEmperor,
          ];

          return usable.includes(this.selectedCharacter.className);
        }
      }

      return true;
    });
  }

  private setSkillModelArray() {
    const { activeSkills, passiveSkills } = this.selectedCharacter;
    let { skillBuffMap, activeSkillMap, passiveSkillMap } = this.model;
    if (!skillBuffMap || typeof skillBuffMap !== 'object') skillBuffMap = {};
    if (!activeSkillMap || typeof activeSkillMap !== 'object') activeSkillMap = {};
    if (!passiveSkillMap || typeof passiveSkillMap !== 'object') passiveSkillMap = {};

    const isEqualBuffLenght = passiveSkills?.length === this.model.passiveSkills?.length;
    this.model.skillBuffs = this.skillBuffs.map((skill, i) => {
      const savedVal = skillBuffMap[skill.name] ?? (isEqualBuffLenght ? this.model.skillBuffs[i] : 0);
      const found = skill.dropdown.find((a) => a.value === savedVal);

      return found ? savedVal : 0;
    });

    const isEqualActiveLenght = activeSkills?.length === this.model.activeSkills?.length;
    this.model.activeSkills = activeSkills.map((skill, i) => {
      const savedVal = activeSkillMap[skill.name] ?? (isEqualActiveLenght ? this.model.activeSkills[i] : 0);
      const found = skill.dropdown.find((a) => a.value === savedVal);

      return found ? savedVal : 0;
    });

    const isEqualPassiveLenght = passiveSkills?.length === this.model.passiveSkills?.length;
    this.model.passiveSkills = passiveSkills.map((skill, i) => {
      const savedVal = passiveSkillMap[skill.name] ?? (isEqualPassiveLenght ? this.model.passiveSkills[i] : 0);
      const found = skill.dropdown.find((a) => a.value === savedVal);

      return found ? savedVal : 0;
    });
  }

  private setJobBonus() {
    const { str, agi, vit, int, dex, luk, pow, sta, wis, spl, con, crt } = this.selectedCharacter.getJobBonusStatus(this.model.jobLevel);
    this.model.jobStr = str;
    this.model.jobAgi = agi;
    this.model.jobVit = vit;
    this.model.jobInt = int;
    this.model.jobDex = dex;
    this.model.jobLuk = luk;

    this.model.jobPow = pow;
    this.model.jobSta = sta;
    this.model.jobWis = wis;
    this.model.jobSpl = spl;
    this.model.jobCon = con;
    this.model.jobCrt = crt;
  }

  private setMonsterDropdownList() {
    const groupMap = new Map<string, MonsterSelectItemGroup>();
    const monsters: DropdownModel[] = [];
    const rawMonsters = Object.values(this.monsterDataMap).sort((a, b) => (a.stats.level > b.stats.level ? 1 : -1));
    const classMap = {
      0: 'Normal',
      1: 'Boss',
    };

    for (const mon of rawMonsters) {
      const { id, name, spawn, stats } = mon;
      const { level, health, mvp, class: _class, elementShortName, raceName, scaleName } = stats;

      const spawnMap = mvp === 1 ? ' Boss' : getMonsterSpawnMap(spawn) || (_class === 1 ? ' Boss' : 'Etc');
      const group = groupMap.get(spawnMap);
      const monster: DropdownModel = {
        label: `${level} ${name} (${racePtBr(raceName)} ${sizePtBr(scaleName).at(0)})`,
        name,
        value: id,
        level,
        elementName: elementShortName,
        raceName,
        className: classMap[_class],
        mvp,
        scaleName: scaleName.at(0),
        health,
        groups: spawnMap.trim().split(','),
        searchVal: `${spawnMap} ${id}`,
      };

      monsters.push(monster);

      if (group) {
        group.items.push(monster);
      } else {
        groupMap.set(spawnMap, {
          label: spawnMap,
          items: [monster],
        });
      }
    }

    this.monsterList = monsters;
    this.groupMonsterList = [...groupMap.values()].sort((a, b) => {
      return a.label > b.label ? 1 : -1;
    });
  }

  private setItemList() {
    const weaponList: ItemModel[] = [];
    const leftWeaponList: ItemModel[] = [];
    const weaponCardList: ItemModel[] = [];
    const ammoList: ItemModel[] = [];
    const headUpperList = [];
    const headMiddleList = [];
    const headLowerList = [];
    const headCardList = [];
    const armorList = [];
    const armorCardList = [];
    const shieldList = [];
    const shieldCardList = [];
    const garmentList = [];
    const garmentCardList = [];
    const bootList = [];
    const bootCardList = [];
    const accList = [];
    const accCardList = [];
    const accLeftList = [];
    const accLeftCardList = [];
    const accRightList = [];
    const accRightCardList = [];
    const petList = [];

    const costumeUpperList = [];
    const costumeMiddleList = [];
    const costumeLowerList = [];
    const costumeGarmentList = [];
    const costumeEnhUpperList = [];
    const costumeEnhMiddleList = [];
    const costumeEnhLowerList = [];
    const costumeEnhGarmentList = [];
    const costumeEnhGarment2List = [];
    const costumeEnhGarment4List = [];

    const shadowArmorList = [];
    const shadowShieldList = [];
    const shadowBootList = [];
    const shadowEarringList = [];
    const shadowPendantList = [];
    const shadowWeaponList = [];

    const consumableList: ItemModel[] = [];

    // Only show items that exist on the LATAM server (flagged by RoService from
    // the GRF extract). Non-LATAM items stay in the map for id lookups but are
    // hidden from the selection dropdowns.
    const sortedItems = Object.values(this.items)
      .filter((item: any) => item.presentInLatam)
      .sort(sortObj('name'));
    for (const item of sortedItems) {
      const { itemTypeId, itemSubTypeId, compositionPos, location } = item;

      switch (itemTypeId) {
        case ItemTypeId.WEAPON:
          // if (!item.name.startsWith('Furious')) continue;
          if (item.itemLevel > 4) {
            weaponList.push({
              ...item,
              name: `[LV ${item.itemLevel}] ${item.name}`
            });
          } else {
            weaponList.push(item);
          }

          if (itemSubTypeId === 256 || itemSubTypeId === 257) {
            if (item.itemLevel > 4) {
              leftWeaponList.push({
                ...item,
                name: `[LV ${item.itemLevel}] ${item.name}`
              });
            } else {
              leftWeaponList.push(item);
            }
          }
          continue;
        case ItemTypeId.CONSUMABLE:
          consumableList.push(item);
          continue;
        case ItemTypeId.AMMO:
          ammoList.push(item);
          continue;
      }

      switch (itemSubTypeId) {
        case ItemSubTypeId.Upper:
          if (location === HeadGearLocation.Middle) {
            headMiddleList.push(item);
          } else if (location === HeadGearLocation.Lower) {
            headLowerList.push(item);
          } else {
            // if (!item.name.startsWith('Furious')) continue;
            if (item.itemLevel > 1) {
              headUpperList.push({
                ...item,
                name: `[LV ${item.itemLevel}] ${item.name}`
              });
            } else {
              headUpperList.push(item);
            }
          }
          continue;
        case ItemSubTypeId.Shield:
          if (item.itemLevel > 1) {
            shieldList.push({
              ...item,
              name: `[LV ${item.itemLevel}] ${item.name}`
            });
          } else {
            shieldList.push(item);
          }
          continue;
        case ItemSubTypeId.Armor:
          if (item.itemLevel > 1) {
            armorList.push({
              ...item,
              name: `[LV ${item.itemLevel}] ${item.name}`
            });
          } else {
            armorList.push(item);
          }
          continue;
        case ItemSubTypeId.Garment:
          if (item.itemLevel > 1) {
            garmentList.push({
              ...item,
              name: `[LV ${item.itemLevel}] ${item.name}`
            });
          } else {
            garmentList.push(item);
          }
          continue;
        case ItemSubTypeId.Boot:
          if (item.itemLevel > 1) {
            bootList.push({
              ...item,
              name: `[LV ${item.itemLevel}] ${item.name}`
            });
          } else {
            bootList.push(item);
          }
          continue;
        case ItemSubTypeId.Acc_L:
          accLeftList.push(item);
          accList.push(item);
          continue;
        case ItemSubTypeId.Acc_R:
          accRightList.push(item);
          accList.push(item);
          continue;
        case ItemSubTypeId.Acc:
          accRightList.push(item);
          accLeftList.push(item);
          accList.push(item);
          continue;
        case ItemSubTypeId.Pet:
          petList.push(item);
          continue;
        case ItemSubTypeId.ShadowArmor:
          shadowArmorList.push(item);
          continue;
        case ItemSubTypeId.ShadowShield:
          shadowShieldList.push(item);
          continue;
        case ItemSubTypeId.ShadowBoot:
          shadowBootList.push(item);
          continue;
        case ItemSubTypeId.ShadowEarring:
          shadowEarringList.push(item);
          continue;
        case ItemSubTypeId.ShadowPendant:
          shadowPendantList.push(item);
          continue;
        case ItemSubTypeId.ShadowWeapon:
          shadowWeaponList.push(item);
          continue;
        case ItemSubTypeId.CostumeUpper:
          costumeUpperList.push(item);
          continue;
        case ItemSubTypeId.CostumeMiddle:
          costumeMiddleList.push(item);
          continue;
        case ItemSubTypeId.CostumeLower:
          costumeLowerList.push(item);
          continue;
        case ItemSubTypeId.CostumeGarment:
          costumeGarmentList.push(item);
          continue;
        case ItemSubTypeId.CostumeEnhUpper:
          costumeEnhUpperList.push(item);
          continue;
        case ItemSubTypeId.CostumeEnhMiddle:
          costumeEnhMiddleList.push(item);
          continue;
        case ItemSubTypeId.CostumeEnhLower:
          costumeEnhLowerList.push(item);
          continue;
        case ItemSubTypeId.CostumeEnhGarment:
          costumeEnhGarmentList.push(item);
          continue;
        case ItemSubTypeId.CostumeEnhGarment2:
          costumeEnhGarment2List.push(item);
          continue;
        case ItemSubTypeId.CostumeEnhGarment4:
          costumeEnhGarment4List.push(item);
          continue;
      }

      if (itemTypeId === ItemTypeId.CARD) {
        switch (compositionPos) {
          case CardPosition.Weapon:
            weaponCardList.push(item);
            continue;
          case CardPosition.Head:
            headCardList.push(item);
            continue;
          case CardPosition.Shield:
            shieldCardList.push(item);
            continue;
          case CardPosition.Armor:
            armorCardList.push(item);
            continue;
          case CardPosition.Garment:
            garmentCardList.push(item);
            continue;
          case CardPosition.Boot:
            bootCardList.push(item);
            continue;
          case CardPosition.AccL:
            accLeftCardList.push({
              ...item,
              name: '[Left] ' + item.name,
              isHilight: true,
            });
            accCardList.push(item);
            continue;
          case CardPosition.AccR:
            accRightCardList.push({
              ...item,
              name: '[Right] ' + item.name,
              isHilight: true,
            });
            accCardList.push(item);
            continue;
          case CardPosition.Acc:
            accLeftCardList.push(item);
            accRightCardList.push(item);
            accCardList.push(item);
            continue;
        }
      }
    }

    this.itemList.weaponList = toDropdownList(weaponList, 'name', 'id');
    this.itemList.leftWeaponList = toDropdownList(leftWeaponList, 'name', 'id');
    this.itemList.weaponCardList = toDropdownList(weaponCardList, 'name', 'id', undefined, ['cardPrefix']);
    this.itemList.ammoList = toDropdownList(ammoList, 'name', 'id', 'propertyAtk');
    this.itemList.headUpperList = toDropdownList(headUpperList, 'name', 'id');
    this.itemList.headMiddleList = toDropdownList(headMiddleList, 'name', 'id');
    this.itemList.headLowerList = toDropdownList(headLowerList, 'name', 'id');
    this.itemList.headCardList = toDropdownList(headCardList, 'name', 'id', undefined, ['cardPrefix']);
    this.itemList.armorList = toDropdownList(armorList, 'name', 'id');
    this.itemList.armorCardList = toDropdownList(armorCardList, 'name', 'id', undefined, ['cardPrefix']);
    this.itemList.shieldList = toDropdownList(shieldList, 'name', 'id');
    this.itemList.shieldCardList = toDropdownList(shieldCardList, 'name', 'id', undefined, ['cardPrefix']);
    this.itemList.garmentList = toDropdownList(garmentList, 'name', 'id');
    this.itemList.garmentCardList = toDropdownList(garmentCardList, 'name', 'id', undefined, ['cardPrefix']);
    this.itemList.bootList = toDropdownList(bootList, 'name', 'id');
    this.itemList.bootCardList = toDropdownList(bootCardList, 'name', 'id', undefined, ['cardPrefix']);
    this.itemList.accList = toDropdownList(accList, 'name', 'id');
    this.itemList.accCardList = toDropdownList(accCardList, 'name', 'id');
    this.itemList.accLeftList = toDropdownList(accLeftList, 'name', 'id');
    this.itemList.accLeftCardList = toDropdownList(accLeftCardList, 'name', 'id', undefined, ['cardPrefix', 'isHilight']);
    this.itemList.accRightList = toDropdownList(accRightList, 'name', 'id');
    this.itemList.accRightCardList = toDropdownList(accRightCardList, 'name', 'id', undefined, ['cardPrefix', 'isHilight']);
    this.itemList.petList = petList.map((a) => ({ label: a.name, value: a.id }));

    this.itemList.costumeUpperList = toDropdownList(costumeUpperList, 'name', 'id');
    this.itemList.costumeMiddleList = toDropdownList(costumeMiddleList, 'name', 'id');
    this.itemList.costumeLowerList = toDropdownList(costumeLowerList, 'name', 'id');
    this.itemList.costumeGarmentList = toDropdownList(costumeGarmentList, 'name', 'id');

    this.itemList.costumeEnhUpperList = toDropdownList(costumeEnhUpperList, 'name', 'id');
    this.itemList.costumeEnhMiddleList = toDropdownList(costumeEnhMiddleList, 'name', 'id');
    this.itemList.costumeEnhLowerList = toDropdownList(costumeEnhLowerList, 'name', 'id');
    this.itemList.costumeEnhGarmentList = toDropdownList(costumeEnhGarmentList, 'name', 'id');
    this.itemList.costumeEnhGarment2List = toDropdownList(costumeEnhGarment2List, 'name', 'id');
    this.itemList.costumeEnhGarment4List = toDropdownList(costumeEnhGarment4List, 'name', 'id');

    this.itemList.shadowArmorList = toDropdownList(shadowArmorList, 'name', 'id');
    this.itemList.shadowShieldList = toDropdownList(shadowShieldList, 'name', 'id');
    this.itemList.shadowBootList = toDropdownList(shadowBootList, 'name', 'id');
    this.itemList.shadowEarringList = toDropdownList(shadowEarringList, 'name', 'id');
    this.itemList.shadowPendantList = toDropdownList(shadowPendantList, 'name', 'id');
    this.itemList.shadowWeaponList = toDropdownList(shadowWeaponList, 'name', 'id');

    this.consumableList = toDropdownList(consumableList.sort(sortObj('id')), 'name', 'id');

    if (!this.env.production) {
      for (const wea of weaponList) {
        if (!wea.itemLevel) {
          console.log('invalid weapon, ID' + wea.id);
        }
      }
    }
  }

  private setItemDropdownList() {
    const classNameSet = this.selectedCharacter.classNameSet;
    const onlyMe = (a: ItemDropdownModel) => {
      // if (a.label.startsWith('Heroic Token')) return true

      if (Array.isArray(a.unusableClass) && a.unusableClass.length > 0) {
        const cannot = a.unusableClass.some((x) => classNameSet.has(x));
        if (cannot) return false;
      }
      if (Array.isArray(a.usableClass)) {
        return a.usableClass.some((x) => classNameSet.has(x));
      }

      return true;
    };
    const onlySuperNoviceWeapon = (a: ItemDropdownModel) => {
      // if (this.items[+a.value]?.aegisName?.startsWith('Poenitentia_')) return true;
      // if (this.items[+a.value]?.aegisName?.startsWith('Poenetentia_')) return true;
      // if (a.label.includes('-AD')) return true

      // supper novice allow to equip weapon lv4
      if (this.selectedCharacter.className === ClassName.SuperNovice) {
        const { itemLevel, itemSubTypeId } = this.items[a.value as number] ?? {};
        const isLv4 = itemLevel === 4;
        const wTypeNames = new Set<WeaponTypeName>(['dagger', 'sword', 'axe', 'mace', 'rod', 'twohandRod']);
        const isSup = wTypeNames.has(WeaponTypeNameMapBySubTypeId[itemSubTypeId]);

        if (isLv4 && isSup) return true;
      }

      // return a.label.startsWith('Glacier')
      // return this.items[+a.value]?.aegisName?.startsWith('Fourth');

      return onlyMe(a);
    };
    const onlySuperNoviceHeadGear = (a: ItemDropdownModel) => {
      if (this.selectedCharacter.className === ClassName.SuperNovice) {
        return true;
      }

      // return a.label.startsWith('Temporal Circlet')

      return onlyMe(a);
    };

    this.weaponList = this.itemList.weaponList.filter(onlySuperNoviceWeapon);
    this.leftWeaponList = this.itemList.leftWeaponList.filter(onlySuperNoviceWeapon);
    this.weaponCardList = this.itemList.weaponCardList.map((a) => a);
    // this.ammoList = this.itemList.ammoList.filter(onlyMe);
    this.headUpperList = this.itemList.headUpperList.filter(onlySuperNoviceHeadGear);
    this.headMiddleList = this.itemList.headMiddleList.filter(onlySuperNoviceHeadGear);
    this.headLowerList = this.itemList.headLowerList.filter(onlySuperNoviceHeadGear);
    this.headCardList = this.itemList.headCardList.map((a) => a);
    this.armorList = this.itemList.armorList.filter(onlyMe);
    this.armorCardList = this.itemList.armorCardList.map((a) => a);
    this.shieldList = this.itemList.shieldList.filter(onlyMe);
    this.shieldCardList = this.itemList.shieldCardList.map((a) => a);
    this.garmentList = this.itemList.garmentList.filter(onlyMe);
    this.garmentCardList = this.itemList.garmentCardList.map((a) => a);
    this.bootList = this.itemList.bootList.filter(onlyMe);
    this.bootCardList = this.itemList.bootCardList.map((a) => a);
    this.accList = this.itemList.accList.filter(onlyMe);
    this.accCardList = this.itemList.accCardList.map((a) => a);
    this.accLeftList = this.itemList.accLeftList.filter(onlyMe);
    this.accLeftCardList = this.itemList.accLeftCardList.map((a) => a);
    this.accRightList = this.itemList.accRightList.filter(onlyMe);
    this.accRightCardList = this.itemList.accRightCardList.map((a) => a);
    this.petList = this.itemList.petList.map((a) => a);

    this.costumeUpperList = this.itemList.costumeUpperList.filter(onlyMe);
    this.costumeMiddleList = this.itemList.costumeMiddleList.filter(onlyMe);
    this.costumeLowerList = this.itemList.costumeLowerList.filter(onlyMe);
    this.costumeGarmentList = this.itemList.costumeGarmentList.filter(onlyMe);

    this.costumeEnhUpperList = this.itemList.costumeEnhUpperList.map((a) => a);
    this.costumeEnhMiddleList = this.itemList.costumeEnhMiddleList.map((a) => a);
    this.costumeEnhLowerList = this.itemList.costumeEnhLowerList.map((a) => a);
    this.costumeEnhGarmentList = this.itemList.costumeEnhGarmentList.map((a) => a);
    this.costumeEnhGarment2List = this.itemList.costumeEnhGarment2List.map((a) => a);
    this.costumeEnhGarment4List = this.itemList.costumeEnhGarment4List.map((a) => a);

    this.shadowArmorList = this.itemList.shadowArmorList.filter(onlyMe);
    this.shadowShieldList = this.itemList.shadowShieldList.filter(onlyMe);
    this.shadowBootList = this.itemList.shadowBootList.filter(onlyMe);
    this.shadowEarringList = this.itemList.shadowEarringList.filter(onlyMe);
    this.shadowPendantList = this.itemList.shadowPendantList.filter(onlyMe);
    this.shadowWeaponList = this.itemList.shadowWeaponList.filter(onlyMe);

    this.setEquipableItems();
    this.onClassChangedSubject.next(true);
  }

  private setEquipableItems() {
    const items = [
      { position: 'weaponList', values: this.weaponList },
      { position: 'weaponCardList', values: this.weaponCardList },
      { position: 'headUpperList', values: this.headUpperList },
      { position: 'headMiddleList', values: this.headMiddleList },
      { position: 'headLowerList', values: this.headLowerList },
      { position: 'headCardList', values: this.headCardList },
      { position: 'armorList', values: this.armorList },
      { position: 'armorCardList', values: this.armorCardList },
      { position: 'shieldList', values: this.shieldList },
      { position: 'shieldCardList', values: this.shieldCardList },
      { position: 'garmentList', values: this.garmentList },
      { position: 'garmentCardList', values: this.garmentCardList },
      { position: 'bootList', values: this.bootList },
      { position: 'bootCardList', values: this.bootCardList },
      { position: 'accList', values: this.accList },
      { position: 'accCardList', values: this.accCardList },

      { position: 'enchants', values: this.enchants },
      // { position: 'accLeftCardList', values: this.accLeftCardList },
      // { position: 'accRightList', values: this.accRightList },
      // { position: 'accRightCardList', values: this.accRightCardList },
      { position: 'petList', values: this.petList },
      { position: 'costumeList', values: this.costumeUpperList },
      { position: 'costumeList', values: this.costumeMiddleList },
      { position: 'costumeList', values: this.costumeLowerList },
      { position: 'costumeList', values: this.costumeGarmentList },
      { position: 'costumeList', values: this.costumeEnhUpperList },
      { position: 'costumeList', values: this.costumeEnhMiddleList },
      { position: 'costumeList', values: this.costumeEnhLowerList },
      { position: 'costumeList', values: this.costumeEnhGarmentList },
      { position: 'costumeList', values: this.costumeEnhGarment2List },
      { position: 'costumeList', values: this.costumeEnhGarment4List },
      { position: 'shadowArmorList', values: this.shadowArmorList },
      { position: 'shadowShieldList', values: this.shadowShieldList },
      { position: 'shadowBootList', values: this.shadowBootList },
      { position: 'shadowEarringList', values: this.shadowEarringList },
      { position: 'shadowPendantList', values: this.shadowPendantList },
      { position: 'shadowWeaponList', values: this.shadowWeaponList },
    ];

    this.equipableItems = items.flatMap((a) => {
      return a.values.map((value) => {
        return {
          label: value.label,
          id: value.value as number,
          value: value.value,
          position: a.position,
        };
      });
    });
  }

  private setAmmoDropdownList() {
    const myAmmoId = this.calculator.getAmmoSubTypeId();
    // const isMC = this.selectedCharacter.className === ClassName.Mechanic;
    const onlyMyAmmo = (a: DropdownModel) => {
      const ammo = this.items[a.value];
      if (!ammo) return false;

      // const onlyMC = ammo.aegisName?.includes('Cannon_Ball');

      // if (isMC && onlyMC) {
      //   return true;
      // }

      return ammo.itemSubTypeId === myAmmoId;
    };

    this.ammoList = this.itemList.ammoList.filter(onlyMyAmmo);
  }

  private updateAvailablePoints() {
    const { str, agi, vit, int, dex, luk } = this.model;
    const mainStatuses = [str, agi, vit, int, dex, luk];

    const { pow, sta, wis, spl, con, crt } = this.model;
    const traitStatus = [pow, sta, wis, spl, con, crt];

    const { availablePoint, appropriateLevel, availableTraitPoint, appropriateLevelForTrait } = this.stateCalculator
      .setLevel(this.model.level)
      .setClass(this.selectedCharacter)
      .setMainStatusLevels(mainStatuses)
      .setTraitStatusLevels(traitStatus)
      .calculate().summary;

    this.availablePoints = availablePoint;
    this.appropriateLevel = appropriateLevel;

    if (this.isAllowTraitStat) {
      this.availableTraitPoints = availableTraitPoint;
      this.appropriateLevelForTrait = appropriateLevelForTrait;
    } else {
      this.availableTraitPoints = 0;
      this.appropriateLevelForTrait = 0;
    }
  }

  onSelectItem(itemType: string, itemId = 0, refine = 0) {
    // console.log({ itemType, itemId, refine })
    this.equipItemMap.set(itemType as ItemTypeEnum, itemId);

    // if (!itemType.startsWith('weapon')) {
    //   this.updateItemEvent.next(itemType);
    //   return;
    // }

    // if (this.isMainItem(itemType)) {
    //   this.itemSlotsMap[itemType] = this.items[itemId]?.slots || 0;
    //   this.setEnchantList(itemId, itemType);
    //   this.clearCard(itemType);
    // }
    // if (this.isOptionableItem(itemType)) {
    //   const itemAegisName = this.items[itemId]?.aegisName;
    //   this.itemTotalOptionMap[itemType] = ExtraOptionTable[itemAegisName] || 0;
    // }

    // in order to check is the weapon allow to hold shield or left weapon or not
    if (itemType === ItemTypeEnum.weapon) {
      this.calculator.setWeapon({ itemId, refine });
      this.isWeaponCanGrade = this.items[itemId]?.canGrade || false;
    }

    this.updateItemEvent.next(itemType);
  }

  onSelectGrade(itemType: string, _itemId: number, _grade: string) {
    this.updateItemEvent.next(itemType);
  }

  onClearItem(itemType: string) {
    if (this.model[`${itemType}Refine`] > 0) {
      this.model[`${itemType}Refine`] = 0;
    }
    if (this.model[`${itemType}Grade`]) {
      this.model[`${itemType}Grade`] = '';
    }

    if (itemType === ItemTypeEnum.weapon) {
      this.model.propertyAtk = undefined;
      this.model.ammo = undefined;
      for (let i = 0; i <= 5; i++) {
        this.model.rawOptionTxts[i] = undefined;
      }

      this.onClearItem(ItemTypeEnum.leftWeapon);
    } else if (itemType === ItemTypeEnum.leftWeapon) {
      for (let i = 3; i <= 5; i++) {
        this.model.rawOptionTxts[i] = undefined;
      }
    }

    const relatedItems = MainItemWithRelations[itemType as ItemTypeEnum] || [];
    for (const _itemType of relatedItems) {
      if (this.model[_itemType]) {
        this.model[_itemType] = undefined;
        this.onSelectItem(_itemType);
      }
    }

    this.updateItemEvent.next(itemType);
  }

  onJobLevelChange() {
    this.setJobBonus();
    this.updateItemEvent.next(1);
  }

  onBaseStatusChange() {
    this.updateAvailablePoints();
    this.updateItemEvent.next(1);
  }

  onConsumableChange() {
    this.updateItemEvent.next(1);
  }

  onSkillClassChange(i?: number) {
    // turning on an active skill in an exclusive group (e.g. the Inquisitor Faiths)
    // turns the rest of that group off — mirrors onSkillBuffChange for the souls.
    if (i != null) {
      const changed = this.activeSkills[i];
      const group = changed?.exclusiveGroup;
      if (group) {
        const selected = changed.dropdown.find((d) => d.value === this.model.activeSkills[i]);
        if (selected?.isUse) {
          this.activeSkills.forEach((skill, j) => {
            if (j !== i && skill.exclusiveGroup === group) {
              this.model.activeSkills[j] = skill.dropdown.find((d) => !d.isUse)?.value ?? 0;
            }
          });
        }
      }
    }
    this.updateItemEvent.next(1);
  }

  onSkillBuffChange(i: number) {
    const changed = this.skillBuffs[i];
    const group = changed?.exclusiveGroup;
    // turning on a buff in an exclusive group (e.g. the souls) turns the rest off
    if (group) {
      const selected = changed.dropdown.find((d) => d.value === this.model.skillBuffs[i]);
      if (selected?.isUse) {
        this.skillBuffs.forEach((buff, j) => {
          if (j !== i && buff.exclusiveGroup === group) {
            this.model.skillBuffs[j] = buff.dropdown.find((d) => !d.isUse)?.value ?? 0;
          }
        });
      }
    }
    this.updateItemEvent.next(1);
  }

  onMonsterChange() {
    localStorage.setItem('monster', this.selectedMonster.toString());
    this.selectedMonsterName = this.monsterDataMap?.[this.selectedMonster]?.name;
    this.updateItemEvent.next(1);
  }

  onSelectItemDescription(isCompareItem = false) {
    let selectedType: ItemTypeEnum;
    let bonus: any;
    let itemId: number;

    // console.log({ isCompareItem, selectedType: this.selectedCompareItemDesc });

    if (isCompareItem) {
      selectedType = this.selectedCompareItemDesc;
      bonus = this.compareItemSummaryModel?.[selectedType] || {};
      itemId = this.equipCompareItemIdItemTypeMap.get(selectedType);

      this.selectedItemDesc = undefined;
    } else {
      selectedType = this.selectedItemDesc;
      bonus = this.itemSummary?.[selectedType] || this.itemSummary2?.[selectedType] || {};
      itemId = this.equipItemIdItemTypeMap.get(selectedType);

      this.selectedCompareItemDesc = undefined;
    }

    this.itemId = itemId;
    this.itemBonus = bonus; //{ script, bonus };
    this.itemBonusRows = this.buildItemBonusRows(bonus);
    this.itemDescription = prettyItemDesc(this.items[itemId]?.description);
  }

  /** Turn a flat item-bonus summary ({ key: value }) into display rows. Skill-named
   *  keys resolve to their pt-BR skill (icon + name, value shown as a % skill-damage
   *  bonus); every other key gets a localized stat label. Skills are grouped last so
   *  the icon column reads cleanly — mirrors the visual bonus lists used elsewhere. */
  private buildItemBonusRows(bonus: Record<string, any>): { label: string; icon?: number; display: string; isSkill: boolean }[] {
    const fmt = (v: number) => (v > 0 ? `+${v}` : `${v}`);
    const rows = Object.entries(bonus || {}).map(([key, value]) => {
      const skill = this.resolveSkill(key);
      if (skill) {
        const display = typeof value === 'number' ? `${fmt(value)}%` : `${value}`;
        return { label: skill.name, icon: skill.id, display, isSkill: true };
      }
      const display = typeof value === 'number' ? fmt(value) : `${value}`;
      return { label: this.bonusKeyLabel(key), display, isSkill: false };
    });
    return [...rows.filter((r) => !r.isSkill), ...rows.filter((r) => r.isSkill)];
  }

  /** pt-BR label for an item/equip bonus key: explicit overrides first, then the shared
   *  buff labels, then a decoder for the structured damage keys (p_/m_ × size/element/
   *  race/class), falling back to the raw key when nothing matches. */
  private bonusKeyLabel(key: string): string {
    return this.itemBonusLabels[key] ?? this.buffBonusLabels[key] ?? this.decodeStructuredBonusKey(key) ?? key;
  }

  // pt-BR stat labels aligned with the battle-summary panel (ATQ/ATQM/DEFM/VelAtq/Conj. …),
  // so the item-bonus list reads the same as the rest of the UI instead of raw EN abbreviations.
  private readonly itemBonusLabels: Record<string, string> = {
    hp: 'HP máx.', hpPercent: 'HP máx. %', sp: 'SP máx.', spPercent: 'SP máx. %',
    def: 'DEF', defPercent: 'DEF %', softDef: 'DEF Suave', softDefPercent: 'DEF Suave %',
    mdef: 'DEFM', mdefPercent: 'DEFM %', softMdef: 'DEFM Suave', softMdefPercent: 'DEFM Suave %',
    res: 'RES', mres: 'RESM',
    allStatus: 'Todos os atributos', allTrait: 'Todos os traços',
    range: 'Dano à distância', melee: 'Dano corpo a corpo', bowRange: 'Alcance do arco',
    atk: 'ATQ', x_atk: 'ATQ (extra)', cannonballAtk: 'ATQ Bala de Canhão', atkPercent: 'ATQ %',
    matk: 'ATQM', matkPercent: 'ATQM %', flatDmg: 'Dano fixo', dmg: 'Dano',
    pAtk: 'P.ATQ', sMatk: 'S.ATQM', cRate: 'T.CRÍT',
    aspd: 'VelAtq', aspdPercent: 'VelAtq %',
    skillAspd: 'VelAtq (hab.)', skillAspdPercent: 'VelAtq % (hab.)', decreaseSkillAspdPercent: 'Reduz VelAtq (hab.)',
    acd: 'Pós-conjuração', fct: 'Conj. Fixa', fctPercent: 'Conj. Fixa %',
    vct: 'Conj. Variável', vct_inc: 'Conj. Variável (aumento)', vctBySkill: 'Conj. Variável (hab.)',
    cd: 'Recarga',
    hit: 'Precisão', perfectHit: 'Precisão Perfeita', cri: 'Crítico', criDmg: 'Dano crítico',
    perfectDodge: 'Esquiva perfeita', flee: 'Esquiva', forceCri: 'Força crítico',
    ignore_size_penalty: 'Ignora penalidade de tamanho', p_infiltration: 'Infiltração física',
    p_final: 'Dano físico final', m_final: 'Dano mágico final', mildwind: 'Vento Suave',
  };

  private readonly bonusKeyParts = {
    atk: { p: 'Físico', m: 'Mágico' } as Record<string, string>,
    cat: { size: 'Tamanho', element: 'Elemento', race: 'Raça', class: 'Classe' } as Record<string, string>,
    sub: {
      all: 'Todos', s: 'Pequeno', m: 'Médio', l: 'Grande',
      normal: 'Normal', boss: 'Chefe',
      neutral: 'Neutro', water: 'Água', earth: 'Terra', fire: 'Fogo', wind: 'Vento',
      poison: 'Veneno', holy: 'Sagrado', dark: 'Sombrio', ghost: 'Fantasma', undead: 'Morto-vivo',
      formless: 'Sem Forma', brute: 'Bruto', plant: 'Planta', insect: 'Inseto', fish: 'Peixe',
      demon: 'Demônio', demihuman: 'Semi-humano', angel: 'Anjo', dragon: 'Dragão',
    } as Record<string, string>,
  };

  /** Decode the structured damage keys, e.g. `p_size_l` → "Dano Físico (Tamanho: Grande)",
   *  `m_pene_race_demon` → "Penetração Mágica (Raça: Demônio)", `pene_res_race_fish` →
   *  "Penetrar RES (Raça: Peixe)". Returns undefined when the key isn't one of these. */
  private decodeStructuredBonusKey(key: string): string | undefined {
    const { atk, cat, sub } = this.bonusKeyParts;
    let m: RegExpMatchArray | null;
    // p_/m_ penetration vs a category subtype
    if ((m = key.match(/^([pm])_pene_(size|element|race|class)_(\w+)$/))) {
      return `Penetração ${atk[m[1]] === 'Físico' ? 'Física' : 'Mágica'} (${cat[m[2]]}: ${sub[m[3]] ?? m[3]})`;
    }
    // m_my_element_* — damage with the character's own element
    if ((m = key.match(/^m_my_element_(\w+)$/))) {
      return `Dano Mágico (Meu Elemento: ${sub[m[1]] ?? m[1]})`;
    }
    // p_/m_ damage vs a category subtype
    if ((m = key.match(/^([pm])_(size|element|race|class)_(\w+)$/))) {
      return `Dano ${atk[m[1]]} (${cat[m[2]]}: ${sub[m[3]] ?? m[3]})`;
    }
    // RES/MRES penetration vs a race
    if ((m = key.match(/^pene_(res|mres)_race_(\w+)$/))) {
      return `Penetrar ${m[1].toUpperCase()} (Raça: ${sub[m[2]] ?? m[2]})`;
    }
    // Combo bonuses
    if ((m = key.match(/^(vct|fct|cd)__(.+)$/))) {
      return `Redução de ${this.itemBonusLabels[m[1]]} de ${sub[m[2]] ?? m[2]}`;
    }
    return undefined;
  }

  onSelectShopServer() {
    // The ItemShopService setter persists the choice; nothing else to do here.
  }

  /** Divine Pride database page for the currently inspected item. */
  get divinePrideItemUrl(): string {
    return this.itemShop.divinePrideItemUrl(this.itemId);
  }

  /** GnJoy LATAM market (buy orders) search for the inspected item on the selected server. */
  get marketItemUrl(): string {
    return this.itemShop.marketItemUrl(this.items[this.itemId]?.name);
  }

  /** pt-BR description (HTML) for a consumable's hover popover, memoised. */
  itemDescTooltip(id: number): string {
    if (!id || !this.items) return '';
    const cached = this.itemDescCache.get(id);
    if (cached !== undefined) return cached;
    const item = this.items[id];
    const desc = prettyItemDesc(item?.description) || '';
    const title = item?.name ? `<div class="item_desc_title"><b>${item.name}</b></div><br>` : '';
    const html = title || desc ? `${title}${desc}` : '';
    this.itemDescCache.set(id, html);
    return html;
  }

  /** pt-BR labels for buff bonus keys (skill descriptions aren't in the local
   *  data, so the buff popover summarises the effect from its bonus values). */
  private readonly buffBonusLabels: Record<string, string> = {
    atk: 'ATK', matk: 'MATK', atkPercent: 'ATK%', matkPercent: 'MATK%',
    pAtk: 'P.ATK', sMatk: 'S.MATK', cRate: 'C.RATE',
    hit: 'HIT', cri: 'Crit', perfectHit: 'Acerto Perfeito', flatDmg: 'Dano Fixo',
    aspd: 'ASPD', aspdPercent: 'ASPD%', skillAspd: 'ASPD (hab.)', vct: 'VCT',
    str: 'FOR', agi: 'AGI', vit: 'VIT', int: 'INT', dex: 'DES', luk: 'SOR',
    pow: 'POW', sta: 'STA', wis: 'WIS', spl: 'SPL', con: 'CON', crt: 'CRT',
    def: 'DEF', mdef: 'MDEF',
    p_pene_race_all: 'Penetração Física (Raça)', m_pene_race_all: 'Penetração Mágica (Raça)',
    pene_res: 'Penetrar Res', pene_mres: 'Penetrar MRes',
    monster_res: 'Res do alvo', monster_mres: 'MRes do alvo',
    comet: 'Dano Cometa', raid: 'Dano físico recebido', darkClaw: 'Garra Sombria',
    sporeExplosion: 'Dano recebido', quake: 'Dano físico recebido', oleumSanctum: 'Oleum Sanctum',
    mysticAmp: 'Ampl. Mística', magnumBreakPsedoBonus: 'Impacto Explosivo', magnumBreakClearEDP: 'Limpar EDP',
    ignore_size_penalty: 'Ignora penalidade de tamanho', m_my_element_water: 'Dano Mágico (Água)',
  };
  private buffTooltipCache = new Map<string, string>();

  /** Buff label popover: the real pt-BR client skill description when available,
   *  otherwise an effect summary derived from the buff's bonuses. */
  buffTooltip(buff: { name: string; label: string; icon?: number; isDebuff?: boolean; dropdown: any[] }): string {
    const cached = this.buffTooltipCache.get(buff.name);
    if (cached !== undefined) return cached;

    const descReady = Object.keys(this.latamSkillDesc).length > 0;
    const desc = buff.icon ? prettyItemDesc(this.latamSkillDesc[buff.icon]) : '';

    let html: string;
    if (desc) {
      // the client description already opens with the skill name
      const debuff = buff.isDebuff ? `<div style="color:#b00000">Debuff no monstro</div>` : '';
      html = `${debuff}${desc}`;
    } else {
      // fallback: summarise what the calc applies, one line per usable level
      const fmt = (v: any) => (typeof v === 'number' ? (v > 0 ? `+${v}` : `${v}`) : v);
      const lines = (buff.dropdown || [])
        .filter((d) => d.isUse && d.bonus && Object.keys(d.bonus).length)
        .map((d) => {
          const parts = Object.entries(d.bonus).map(([k, v]) => `${this.buffBonusLabels[k] ?? k} ${fmt(v)}`);
          return `<div>${d.label}: ${parts.join(', ')}</div>`;
        });
      const title = `<div class="item_desc_title"><b>${buff.label}</b></div>`;
      const debuff = buff.isDebuff ? `<div style="color:#b00000">Debuff no monstro</div>` : '';
      html = `${title}${debuff}${lines.length ? lines.join('') : '<div>—</div>'}`;
    }

    // only memoise once the description data has loaded (avoid caching the fallback)
    if (descReady) this.buffTooltipCache.set(buff.name, html);
    return html;
  }

  /** Reuses the buff popover for the skill-multiplier rows rendered by <app-misc-detail>.
   *  Those rows carry { name, displayName, icon } but no dropdown, so the popover shows
   *  the pt-BR client description (or just the skill name when none exists). */
  buffTooltipForMultiplier = (skill: { name: string; displayName?: string; icon?: number }): string =>
    this.buffTooltip({ name: skill.name, label: skill.displayName || skill.name, icon: skill.icon, dropdown: [] });

  /** Open the breakdown modal for a clicked summary value: list every source
   *  (equip slot/card/enchant + skill) whose contribution to `keys` is non-zero. */
  /** True when at least one equipped source contributes to `keys`; drives whether a
   *  summary value renders as clickable (no point opening an empty breakdown). */
  canBreakdown(keys: string[]): boolean {
    return keys.some((k) => this.bonusBreakdownKeys.has(k));
  }

  private readonly mainStats = new Set(['str', 'agi', 'vit', 'int', 'dex', 'luk']);

  /** Every source key that feeds a base/trait stat total: the stat itself, the skill
   *  flat boost (`<stat>Boost`, e.g. Improve Concentration's agiBoost), and the all-stat
   *  bonus (`allStatus` for main stats, `allTrait` for traits). */
  statBreakdownKeys(stat: string): string[] {
    return [stat, `${stat}Boost`, this.mainStats.has(stat) ? 'allStatus' : 'allTrait'];
  }

  /** A bonus key whose value is a percentage (so the breakdown row shows "%"): the
   *  `*Percent` keys, the structured `p_/m_/pene_` damage keys, and a few named ones. */
  private isPercentKey(k: string): boolean {
    return /Percent$/.test(k) || /^(p|m)_/.test(k) || /^pene_/.test(k) || ['range', 'melee', 'criDmg', 'cri', 'perfectHit'].includes(k);
  }

  showBonusBreakdown(event: { label: string; keys: string[]; valueClass: string }): void {
    const rows: typeof this.bonusBreakdownRows = [];
    for (const [srcKey, bonusMap] of Object.entries(this.bonusBreakdownSources || {})) {
      if (!bonusMap || typeof bonusMap !== 'object') continue;
      let sum = 0;
      let pct = 0;
      let flat = 0;
      for (const k of event.keys) {
        const v = (bonusMap as any)[k];
        if (typeof v === 'number' && v !== 0) {
          sum += v;
          if (this.isPercentKey(k)) pct++;
          else flat++;
        }
      }
      if (!sum) continue;
      // a source contributes via one unit type in practice; only flag "%" when it's purely percent
      rows.push({ ...this.resolveBonusSource(srcKey, sum), isPercent: pct > 0 && flat === 0 });
    }
    rows.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

    this.bonusBreakdownTitle = event.label;
    this.bonusBreakdownValueClass = event.valueClass || 'summary_damage';
    this.bonusBreakdownRows = rows;
    this.isShowBonusBreakdown = true;
  }

  /** Map a breakdown source key to a display row: an equipped item (slot/card/enchant),
   *  a skill, or a labelled catch-all (extras/consumables). */
  private resolveBonusSource(srcKey: string, value: number): { label: string; icon?: number; iconType: 'item' | 'skill'; value: number } {
    const itemId = this.equipItemIdItemTypeMap.get(srcKey as any);
    if (itemId && this.items[itemId]) {
      return { label: this.items[itemId].name, icon: itemId, iconType: 'item', value };
    }
    const skill = this.resolveSkill(srcKey);
    if (skill) {
      return { label: skill.name, icon: skill.id, iconType: skill.iconType ?? 'skill', value };
    }
    const fallback: Record<string, string> = { extra: 'Extras', consumableBonuses: 'Consumíveis' };
    return { label: fallback[srcKey] ?? srcKey, iconType: 'item', value };
  }

  onLog(inputs) {
    console.log({ inputs, model2: this.model2 });
  }

  onOptionChange() {
    this.updateItemEvent.next(1);
  }

  onClassChange(isChangeByInput = true) {
    if (isChangeByInput) {
      this.isInProcessingPreset = true;

      const { level, jobLevel } = this.model;

      waitRxjs()
        .pipe(
          mergeMap(() => {
            this.resetModel();
            return waitRxjs();
          }),
          mergeMap(() => {
            this.calculator = new Calculator();
            this.calculator.setMasterItems(this.items).setHpSpTable(this.hpSpTable);

            this.setClassInstant();
            this.setSkillModelArray();
            this.setClassSkill();
            this.setClassMinMaxLvl();
            return waitRxjs();
          }),
          mergeMap(() => {
            this.setClassLvl({ currentLvl: level, currentJob: jobLevel });
            this.onListItemComparingChange(true);

            this.updateAvailablePoints();
            this.equipItemMap.clear();
            this.resetItemDescription();

            this.setJobBonus();
            return waitRxjs();
          }),
          mergeMap(() => {
            this.setAspdPotionList();
            this.setDefaultSkill();
            this.setItemDropdownList();
            this.setAmmoDropdownList();
            return waitRxjs(0.5);
          }),
          take(1),
          finalize(() => (this.isInProcessingPreset = false)),
        )
        .subscribe(() => {
          this.updateItemEvent.next(1);
          this.updateCompareEvent.next(1);
        });
    }
  }

  onAtkSkillChange() {
    this.updateItemEvent.next(1);
  }

  onPropertyAtkChange() {
    this.updateItemEvent.next(1);
  }

  onMonsterListChange() {
    this.updateMonsterListEvent.next(1);
  }

  onSelectedColChange() {
    this.calcStorage.writeBattleColNames(this.selectedColumns.map((a) => a.field));
  }

  onListItemComparingChange(isClear = false) {
    if (isClear) {
      this.compareItemNames = [];
    }

    this.isEnableCompare = this.compareItemNames.length > 0;

    this.updateCompareEvent.next(1);
  }

  onCompareItemChange() {
    this.updateCompareEvent.next(1);
  }

  onClickMonster() {
    this.monsterRef = this.dialogService.open(MonsterDataViewComponent, {
      header: 'Select a Product',
      width: '75%',
      height: '90%',
      showHeader: false,
      dismissableMask: true,
      contentStyle: { overflow: 'auto' },
      baseZIndex: 10000,
      data: {
        monsters: this.monsterList,
      },
    });
    this.monsterRef.onClose.subscribe((monsterId: any) => {
      if (monsterId) {
        this.selectedMonster = monsterId;
        this.onMonsterChange();
      }
    });
  }

  onSelecteChance(_a: any) {
    this.updateChanceEvent.next(1);
  }

  onShowElementalTableClick() {
    this.allSelectedMonsterIds = [this.selectedMonster, ...(this.selectedMonsterIds || [])];
    this.isShowMonsterEle = true;
  }
}
