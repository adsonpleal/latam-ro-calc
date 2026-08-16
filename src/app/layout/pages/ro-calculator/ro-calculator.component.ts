import { Component, OnDestroy, OnInit } from '@angular/core';
import { ConfirmationService, MessageService, SelectItemGroup } from 'primeng/api';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { Subject, Subscription, debounceTime, finalize, forkJoin, mergeMap, switchMap, take, tap } from 'rxjs';
import { PresetModel } from 'src/app/api-services';
import { RoService } from 'src/app/api-services/ro.service';
import { ItemDescriptionStore } from 'src/app/api-services/item-description.store';
import { SKILL_DESC_BY_ID, SKILL_ID_BY_NAME, resolveSkillMeta } from 'src/app/skills';
import { BUFF_BONUS_LABELS, bonusKeyLabel, resolveSkillKey } from 'src/app/core/bonus-key-label';
import { AllowedCompareItemTypes } from 'src/app/app-config';
import {
  AllowLeftWeaponMapper,
  AspdPotionFixBonus,
  AspdPotionList,
  AspdPotionList2,
  ACC_SIDE_PREFIX,
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
  PetLoyaltyList,
  WeaponTypeName,
  WeaponTypeNameMapBySubTypeId,
  getMonsterSpawnMap,
  MVP_IDS,
} from 'src/app/constants';
import { ActiveSkillModel, AtkSkillModel, CharacterBase, ClassIdBySpriteJob, ClassName, PassiveSkillModel, SkillModel } from 'src/app/jobs';
import {
  createBaseHPSPOptionList,
  createExtraOptionList,
  createMainModel,
  createNumberDropdownList,
  formatSignedNumber,
  getHeadGearLocations,
  HEAD_SLOTS,
  itemDescPopoverHtml,
  prettyItemDesc,
  resolveHeadSlotOccupancy,
  sortObj,
  toDropdownList,
  toRawOptionTxtList,
  toUpsertPresetModel,
} from 'src/app/utils';
import { waitRxjs } from 'src/app/utils/wait-rxjs';
import { importReplayBuffer } from '../../../replay/replay-to-model';
import { makeBuffGate } from '../../../replay/skill-status.map';
import { MainModel } from '../../../models/main.model';
import { environment } from 'src/environments/environment';
import { getClassDropdownList } from '../../../jobs/_class-list';
import { HIDDEN_CLASS_IDS } from '../../../jobs/hidden-classes';
import { racePtBr, sizePtBr, elementPtBr } from '../../../constants/monster-i18n';
import { itemSlotLabelPtBr } from '../../../constants/item-slot-i18n';
import { ChanceModel } from '../../../models/chance-model';
import { BasicDamageSummaryModel, DamageFormulaCalc, SkillDamageSummaryModel } from '../../../models/damage-summary.model';
import { DropdownModel, ItemDropdownModel } from '../../../models/dropdown.model';
import { HpSpTable } from '../../../models/hp-sp-table.model';
import { ItemListModel } from '../../../models/item-list.model';
import { ItemModel } from '../../../models/item.model';
import { MonsterModel } from '../../../models/monster.model';
import { LayoutService } from '../../service/app.layout.service';
import { ItemShopService } from './item-shop.service';
import { BaseStateCalculator } from 'src/app/core/base-state-calculator';
import { Calculator } from 'src/app/core/calculator';
import { applyGuaranaCandy, CalcChainInput, CalculatorController, collectAspdPotionSources, collectBuffBonuses, collectConsumables } from 'src/app/core/calculator-controller';
import { CalcStorage } from 'src/app/core/calc-storage';
import { CompareState } from 'src/app/core/compare-state';
import { compactRotationForShare, firstRealSkill, isBasicAttack, normalizeRotation, pruneRotationForClass } from 'src/app/core/rotation';
import { RotationScheduleStep } from 'src/app/core/rotation-schedule';
import { optimizeRotation } from 'src/app/core/rotation-optimize';
import { buildRotationView, RotationView, toScheduleStep } from './battle-hud/rotation-view';
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
import { isDefenderKey, PlayerTargetProfile, PvpMode } from 'src/app/core/pvp';
import { buildReductionCategories, ReductionCategory, ReductionRow, reductionRowClickable as reductionRowClickableFn, sourcesContributeAnyKey } from './reduction-breakdown';
import { encodeBuild, decodeShared } from 'src/app/core/share-codec';
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

  /**
   * One single indicator for the whole boot: download the data, build the preset and
   * run the first calculation. It used to be three loading screens in a row (splash,
   * the p-blockUI mask, each panel's spinner), which gave the impression the page was
   * loading several times over.
   *
   * It only switches off once both ends finish — the ngOnInit chain and the initial
   * calculation — because they complete out of order: the calculation is triggered at
   * the end of loadItemSet but runs later, behind two debounces.
   */
  isBooting = true;
  private bootChainDone = false;

  /**
   * Takes index.html's #ro-splash off screen. It lives outside <app-root> so it can
   * survive Angular's bootstrap, so it goes away by explicit removal, exactly once — it
   * is the same element since the first paint, with no change of owner in between.
   */
  private hideBootSplash() {
    const el = document.getElementById('ro-splash');
    if (!el) return;
    el.classList.add('ro-splash--hide');
    // On a timer, not transitionend: a background tab composites no frames, so the
    // transition never runs and the event never arrives. Scrolling is released together
    // with the removal, not at the start of the fade, so the bar cannot appear mid-fade.
    setTimeout(() => {
      el.remove();
      document.documentElement.classList.remove('ro-booting');
    }, 250);
  }

  private finishBoot() {
    if (!this.isBooting) return;
    this.isBooting = false;
    this.hideBootSplash();
  }

  // --- Save / preview / share simulations (browser localStorage) ----------
  private savedSimStore = new SavedSimulationStore(localStorage);
  /** item id -> [sprite view id (ClassNum), visual-slot mask], for the paper-doll. */
  private itemViews: Record<string, [number, number]> = {};
  savedSims: SavedSimulation[] = [];
  showSavesDialog = false;
  showSaveDialog = false;
  saveName = '';

  // --- PVP -----------------------------------------------------------------
  /** Mode selector for the PVP tab (open PVP / normal castle / TE castle). */
  pvpMode: PvpMode = 'pvp';
  pvpModeOptions = [
    {
      label: 'PVP',
      value: 'pvp' as PvpMode,
      tooltip: 'PVP aberto: dano cheio (1:1). Valem só as defesas e reduções do próprio alvo — sem a redução da guerra. A esquiva do alvo é a normal.',
    },
    {
      label: 'WOE',
      value: 'woe' as PvpMode,
      tooltip: 'Guerra do Emperium: o ataque básico corpo a corpo cai para 10% (−90%), o ataque básico à distância para 5% (−95%) e as habilidades para 10% (−90%). A esquiva do alvo cai 20%.',
    },
    {
      label: 'WOE TE',
      value: 'woe-te' as PvpMode,
      tooltip: 'Guerra TE: mesmos valores da guerra normal desde a atualização de 18/08 — corpo a corpo 10% (−90%), à distância 5% (−95%) e habilidades 10% (−90%). A esquiva do alvo cai 20%.',
    },
  ];
  /** Saved sims usable as PVP targets (those carrying a cached targetProfile). */
  pvpTargets: SavedSimulation[] = [];
  selectedPvpTargetId: string | null = null;
  /** The solved attacker-vs-target summary that feeds the PVP battle HUD. */
  pvpSummary: any = null;
  /** The compared build against the same PVP target; null when not comparing. */
  pvpSummary2: any = null;
  /** "Redução de dano" popover data: the current build's own reductions (main stats,
   *  mode-independent) and the selected PVP target's reductions (HUD, with the WoE
   *  layer for the active mode). Recomputed on each calculate()/calculatePvp(). */
  selfReductionCategories: ReductionCategory[] = [];
  targetReductionCategories: ReductionCategory[] = [];
  /** The target build's own per-item bonus sources, so the HUD popover drills into
   *  the OPPONENT's gear. Captured per selected target (keyed by id). Public so the
   *  PVP HUD can bind it as reductionSources. */
  pvpTargetSources: Record<string, any> = {};
  /** The target build's slot→itemId map, so the HUD drill-down names the OPPONENT's
   *  gear (not the attacker's item in the same slot). */
  pvpTargetItemMap = new Map<string, number>();
  private pvpTargetSourcesId: string | null = null;
  showShareDialog = false;
  shareUrl = '';
  shareShortening = false;

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
  readonly petLoyaltyList = PetLoyaltyList;

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
  /** Memo for `selectedAtkSkillDisplay`, invalidated when the class changes. */
  private atkSkillDisplayMemo?: { value: string; label: string; icon?: number };
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
  /** The compared build's own "Efeitos" list; empty unless comparing. */
  chanceList2 = [] as ChanceModel[];
  /** Procs ticked on the compared build. Separate from selectedChances: the two builds
   *  carry different gear, so a proc can exist on one side only. */
  selectedChances2 = [] as string[];
  selectedChances = [] as string[];

  isCalculating = false;
  /** The rotation as the panel sees it: per-entry damage/timing plus the solved cycle. */
  rotationView: RotationView | null = null;
  rotationView2: RotationView | null = null;
  rotationViewPvp: RotationView | null = null;
  /** The compared build's PVP rotation, positionally aligned with rotationViewPvp. */
  rotationViewPvp2: RotationView | null = null;
  /** The chain input prepare() last built, reused by the rotation pass. */
  private lastChainInput: CalcChainInput | null = null;

  private calculator = new Calculator();
  private calculator2 = new Calculator();
  private calculatorPvp = new Calculator();
  /** The compared build's PVP pass — its own instance, like calculator2 for the monster panel. */
  private calculatorPvp2 = new Calculator();
  private controller = new CalculatorController();
  private calcStorage = new CalcStorage(localStorage);
  private stateCalculator = new BaseStateCalculator();

  possiblyDamages: DropdownModel[];
  itemSummary: any;
  itemSummary2: any;
  /** Full per-source bonus breakdown (every equip slot/card/enchant + skills) from
   *  the last calc; powers the "which items contribute to this value" modal. Public so
   *  the reduction popover template can pass it as the self drill-down source map. */
  bonusBreakdownSources: Record<string, any> = {};
  /** Every bonus key that at least one source contributes to (non-zero) in the last
   *  calc. A summary value is only worth a breakdown — and thus only clickable — when
   *  one of its keys is here; base/trait-derived stats (no item source) are excluded. */
  private bonusBreakdownKeys = new Set<string>();
  isShowBonusBreakdown = false;
  isShowAspdCurve = false;
  bonusBreakdownTitle = '';
  bonusBreakdownValueClass = 'summary_damage';
  bonusBreakdownRows: { label: string; icon?: number; iconType: 'item' | 'skill'; value: number; display: string; tooltip?: string }[] = [];
  /** Per-source hover explanations (e.g. the AGI-scaled ASPD-potion formula), keyed by source key. */
  bonusBreakdownTooltips: Record<string, string> = {};
  /** Derivation of the clicked damage-graph node, when it has one — see showBonusBreakdown. */
  bonusBreakdownCalc: DamageFormulaCalc | null = null;
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
  /** The compare build's equivalents of bonusBreakdownSources / bonusBreakdownTooltips,
   *  so clicking a "→ simulado" value opens the breakdown against the compared build. */
  private bonusBreakdownSources2: Record<string, any> = {};
  private bonusBreakdownTooltips2: Record<string, string> = {};
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
  private itemDescVersion = -1;

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
  /**
   * Head slots swallowed by a multi-slot item worn elsewhere -> that item's name. A
   * Middle+Lower mask fills both positions in game, so only one of the two pickers stays
   * live and the other shows what is already sitting there.
   */
  headSlotOccupiedBy: Partial<Record<ItemTypeEnum, string>> = {};
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
    private readonly itemDescriptionStore: ItemDescriptionStore,
  ) { }

  ngOnInit() {
    this.initCalcTableColumns();
    // A share link (?b=...) wins over the local autosave; falls back to it when absent.
    const shared = this.consumeSharedBuild();
    this.initData()
      .pipe(
        switchMap(() => this.loadItemSet(shared?.preset ?? localStorage.getItem('ro-set'))),
        // In `finalize` so a network failure also releases it — otherwise the splash
        // would hang forever. If nothing ever triggered a calculation (an error, or no
        // saved preset), end the boot right here; otherwise `isCalculatingEvent` below
        // has the last word.
        finalize(() => {
          this.bootChainDone = true;
          if (!this.isCalculating) this.finishBoot();
        }),
      )
      .subscribe({
        next: () => {
          // Restore the comparison the link carried, or — for the autosave path — the one
          // that was active before the refresh. Either way a `null` clears any active
          // comparison, matching how loading a saved sim behaves.
          this.restoreCompareState(shared ? shared.compare : this.calcStorage.readCompareState());
          if (shared) {
            this.messageService.add({ severity: 'success', summary: 'Simulação carregada', detail: 'Carregada a partir do link compartilhado.' });
          }
        },
        error: (err) => {
          console.error(err);
          this.messageService.add({
            severity: 'error',
            summary: 'Falha ao carregar os dados',
            detail: 'Não foi possível baixar a base de itens. Recarregue a página.',
            life: 10000,
          });
        },
      });

    const laySub = this.layoutService.configUpdate$.pipe(debounceTime(300)).subscribe((c) => {
      this.hideBasicAtk = c.hideBasicAtk;
    });
    this.allSubs.push(laySub);

    this.allSubs.push(this.roService.getItemViews().subscribe((views) => (this.itemViews = views || {})));

    // Deliberately outside the initial forkJoin: the descriptions are nearly half the
    // payload and only show on hover and in the search preview. When they arrive, the
    // open panel is rewritten (the tooltips invalidate themselves off the store version).
    this.allSubs.push(
      this.roService.getItemDescriptions().subscribe(() => {
        if (this.selectedItemDesc || this.selectedCompareItemDesc) {
          this.onSelectItemDescription(!!this.selectedCompareItemDesc);
        }
      }),
    );

    const isCalcSubs = this.isCalculatingEvent.pipe(debounceTime(100)).subscribe(() => {
      this.isCalculating = false;
      // End of the first calculation: the screen has numbers, so the boot is over.
      if (this.bootChainDone) this.finishBoot();
    });
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

        // Same clear-and-bail idiom as the two rules above: emptying a slot re-fires
        // updateItemEvent, and the next pass sees a build with no overlap left.
        if (this.refreshHeadSlotOccupancy(itemChanges)) {
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

        this.refreshChanceList();

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
          this.totalSummary2 = undefined;
          // Drop the PVP tab's comparison too, or turning it off leaves a stale
          // "→ simulado" column behind over there.
          this.pvpSummary2 = null;
          this.rotationViewPvp2 = null;
        }
        // Rebuild the summary tables so the "Bônus de Habilidade / Multiplicadores"
        // cells pick up (or drop) the compared build's "main → simulado" arrows.
        this.applySummaryTables();
        // Refresh the Efeitos list so an activation that only exists on the item being
        // compared (e.g. its card's Instinto) shows up alongside the main build's.
        this.refreshChanceList();
        this.onSelectItemDescription(this.isEnableCompare && Boolean(this.selectedCompareItemDesc));

        // Persist the comparison alongside the autosave so it survives a refresh.
        this.calcStorage.writeCompareState(this.currentCompareState());

        this.isCalculatingEvent.next(false);
      });
    this.allSubs.push(x);

    // Ticking an Efeito used to take a fast path: setSelectedChances(...) +
    // recalcExtraBonus(selectedAtkSkill) on the main calculator, for that one skill.
    // A rotation has N skills to refresh (and the compare column has its own list), so
    // that shortcut cannot produce a correct panel any more — re-solve properly instead.
    // The full pass costs about what the old one did once the multi-monster loop is
    // taken out of the same tick, and it also retires the stale-`effected*` hazard the
    // fast path created (see pickHeroDamage in battle-hud.logic.ts).
    const cObs = this.updateChanceEvent
      .pipe(
        tap(() => (this.isCalculating = true)),
        debounceTime(300),
        tap(() => {
          this.calculate();
          if (this.isEnableCompare) this.calcCompare();
          this.applySummaryTables();
        }),
        debounceTime(100),
      )
      .subscribe(() => {
        this.isCalculatingEvent.next(false);
      });
    this.allSubs.push(cObs);
  }

  ngOnDestroy(): void {
    // Safety net: the splash is not part of the template, so leaving the screen mid-boot
    // would leave it hanging over the app.
    this.finishBoot();
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
    ]).pipe(
      tap(([items, monsters, hpSpTable, latamClasses]) => {
        this.items = items;
        this.monsterDataMap = monsters;
        this.hpSpTable = hpSpTable;

        // Show only classes released on LATAM (job icon present in the client GRF),
        // minus the few we keep hidden because the calc doesn't model them yet (4308).
        const latamClassSet = new Set(latamClasses);
        this.characterList = Characters.filter(
          (c) => latamClassSet.has(c.icon) && !HIDDEN_CLASS_IDS.has(c.icon),
        );

        this.selectedMonsterName = this.monsterDataMap[this.selectedMonster]?.name;

        // Seeded from one list on purpose: three separate statements are how the PVP
        // compare calculator was added without one, which made every compare pass in the
        // PVP tab die inside setWeapon. A new instance is one entry away from working.
        for (const calc of [this.calculator, this.calculator2, this.calculatorPvp, this.calculatorPvp2]) {
          calc.setMasterItems(items).setHpSpTable(hpSpTable);
        }
        this.refreshPvpTargets();

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

  private prepare(calculator: Calculator, compareModel?: any, pvpTarget?: PlayerTargetProfile, pvpMode?: PvpMode) {
    const { activeSkills, passiveSkills, selectedAtkSkill } = this.model;
    const { equipAtks, masteryAtks, activeSkillNames, learnedSkillMap } = this.selectedCharacter
      .setLearnSkills({
        activeSkillIds: activeSkills,
        passiveSkillIds: passiveSkills,
      })
      .getSkillBonusAndName();

    const { scripts: consumeData, usedHpL } = collectConsumables(this.model, this.items);
    const { aspdPotion, buffBonuses } = applyGuaranaCandy({
      consumables: this.model.consumables,
      aspdPotion: this.model.aspdPotion,
      buffDefs: this.skillBuffs,
      selectedBuffValues: this.model.skillBuffs,
      activeSkillNames,
      buffBonuses: collectBuffBonuses(this.skillBuffs, this.model.skillBuffs, activeSkillNames),
    });
    const { equipAtk: buffEquips, masteryAtk: buffMasterys } = buffBonuses;

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
      const model2 = this.resolveCompareHeadSlots({ ...this.model, ...compareModel });
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

    const chainInput: CalcChainInput = {
      monster: this.monsterDataMap[this.selectedMonster],
      playerTarget: pvpTarget,
      pvpMode,
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
      // Each build ticks its own procs; the compare column is not the main one.
      selectedChances: compareModel ? this.selectedChances2 : this.selectedChances,
      usedHpL,
    };

    this.controller.runChain(calc, chainInput);
    // Stashed for the rotation pass, which re-solves this same loaded calculator once
    // per distinct skill. Read immediately by the caller — prepare() is synchronous and
    // never interleaves, so a single slot is enough.
    this.lastChainInput = chainInput;

    return calc;
  }

  /**
   * Solve every distinct skill in the rotation on an already-prepared calculator and
   * build the panel's view model.
   *
   * Solves are memoised by skill value: a skill's damage does not depend on where it
   * sits in the rotation (nothing in the catalog gates on position), so a repeat reuses
   * the first solve. Ataque básico needs no pass at all — its numbers live in
   * `dmg.basic*` / `calc.hitPerSecs`, which no offensive skill affects.
   */
  private solveRotation(calc: Calculator, input: CalcChainInput, baseSummary: any): RotationView {
    const summaryByValue = new Map<string, any>();

    for (const value of this.model.rotation ?? []) {
      if (isBasicAttack(value) || summaryByValue.has(value)) continue;
      summaryByValue.set(value, this.controller.solveSkill(calc, input, value).getTotalSummary());
    }

    // Leave the calculator on the skill the rest of the app expects to find it on.
    this.controller.solveSkill(calc, input, input.selectedAtkSkill);

    return buildRotationView({
      rotation: this.model.rotation ?? [],
      summaryByValue,
      baseSummary,
      // This build's own ticked procs, not the main build's: prepare() already picks
      // selectedChances2 for the compared build, so reading `this.selectedChances` here
      // meant a proc ticked only on the comparison never reached its rows.
      hasSelectedChances: (input.selectedChances?.length ?? 0) > 0,
      atkSkills: this.atkSkills,
    });
  }

  /** Applies a new rotation order/content from the panel and recalculates. */
  onRotationChange(rotation: string[]) {
    this.model.rotation = rotation;
    this.syncRotationMirror();
    this.updateItemEvent.next(true);
  }

  /**
   * Reorder for the shortest cycle. Damage per cycle is permutation-invariant, so this
   * is purely about the recarga stalls — see core/rotation-optimize.ts.
   */
  onOptimizeRotation() {
    const cycle = this.rotationView?.cycle;
    if (!cycle) return;

    const stepByValue = new Map<string, RotationScheduleStep>();
    for (const entry of this.rotationView.entries) {
      if (stepByValue.has(entry.value)) continue;
      stepByValue.set(entry.value, toScheduleStep({ value: entry.value, summary: entry.summary, damage: entry.damage }));
    }

    const result = optimizeRotation({
      rotation: this.model.rotation ?? [],
      stepByValue,
      aspdPeriod: this.rotationView.aspdPeriod,
    });

    if (!result.changed) {
      this.messageService.add({ severity: 'info', summary: 'Otimizar', detail: 'Já está na melhor ordem que encontrei.' });
      return;
    }

    // Snapshot for the undo — the old panel only ever diagnosed, this one rewrites the
    // user's rotation, so the change has to be reversible in one click.
    const previous = (this.model.rotation ?? []).slice();
    const gain = result.dpsBefore > 0 ? ((result.dpsAfter - result.dpsBefore) / result.dpsBefore) * 100 : 0;
    const fmt = (v: number) => v.toFixed(2).replace('.', ',');

    this.onRotationChange(result.order);
    this.messageService.add({
      key: 'rotation-optimize',
      severity: 'success',
      summary: 'Ordem otimizada',
      detail: `Ciclo ${fmt(result.cycleBefore)}s → ${fmt(result.cycleAfter)}s (+${gain.toFixed(1).replace('.', ',')}% de DPS).`,
      life: 8000,
      data: { previous },
    });
  }

  /** Undo for the optimiser toast. */
  undoOptimize(previous: string[]) {
    this.messageService.clear('rotation-optimize');
    this.onRotationChange(previous);
  }

  private calculate() {
    const calc = this.prepare(this.calculator);

    this.totalSummary = calc.getTotalSummary();
    this.rotationView = this.lastChainInput ? this.solveRotation(calc, this.lastChainInput, this.totalSummary) : null;
    const modelSummary = calc.getModelSummary() as any;
    this.modelSummary = { ...modelSummary, rawOptionTxts: modelSummary.rawOptionTxts.filter(Boolean) };
    const x = calc.getItemSummary();
    // engine sources (equips, skills, buffs) + per-consumable maps + the selected
    // ASPD potions (display-only), so the breakdown modal can attribute
    // consumables/buffs/skills/potions alongside item slots
    // Potions apply a flat ASPD bonus scaled by the character's final AGI (× AGI /
    // 200) — feed that same AGI so the breakdown shows the real value, not nominal.
    const potionBreakdown = collectAspdPotionSources(this.model, AspdPotionFixBonus, this.totalSummary?.calc?.totalAgi ?? 0);
    this.bonusBreakdownSources = {
      ...x,
      ...collectConsumables(this.model, this.items).sources,
      ...potionBreakdown.sources,
    };
    this.bonusBreakdownTooltips = potionBreakdown.tooltips;
    const contributingKeys = new Set<string>();
    for (const map of Object.values(this.bonusBreakdownSources)) {
      if (!map || typeof map !== 'object') continue;
      for (const [k, v] of Object.entries(map)) {
        if (typeof v === 'number' && v !== 0) contributingKeys.add(k);
      }
    }
    this.bonusBreakdownKeys = contributingKeys;
    // "Redução de dano" popover for the main stats — the build's own gear reductions
    // against anything, not just a player attacker (no castle layer; mode-independent),
    // hence the 'self' scope. See docs/pvp.md §4.
    this.selfReductionCategories = buildReductionCategories(this.calculator.getDefenderBonus(), 'pvp', 'self');
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

    // Keep the PVP tab live as the attacker build changes.
    if (this.selectedPvpTargetId) this.calculatePvp();
  }

  private calcCompare() {
    if (this.compareItemNames?.length > 0) {
      const m2 = JSON.parse(JSON.stringify(this.model2));
      const calc2 = this.prepare(this.calculator2, m2);
      this.totalSummary2 = calc2.getTotalSummary();
      this.rotationView2 = this.lastChainInput ? this.solveRotation(calc2, this.lastChainInput, this.totalSummary2) : null;
      this.compareItemSummaryModel = calc2.getItemSummary();
      // Mirror calculate()'s bonusBreakdownSources for the compared build, so a click on a
      // "→ simulado" summary value drills into the compare column's own gear. Consumables and
      // ASPD potions are global toggles (only on the main MainModel, shared by both columns),
      // so reuse those from this.model — but scale the potions by the compare build's AGI.
      const potion2 = collectAspdPotionSources(this.model, AspdPotionFixBonus, this.totalSummary2?.calc?.totalAgi ?? 0);
      this.bonusBreakdownSources2 = {
        ...this.compareItemSummaryModel,
        ...collectConsumables(this.model, this.items).sources,
        ...potion2.sources,
      };
      this.bonusBreakdownTooltips2 = potion2.tooltips;

      // The PVP tab's comparison column reads model2, which is only settled here.
      // calculate() already solved PVP, but it ran before this — and enabling the
      // comparison at all never goes through calculate(), so without this the PVP panel
      // keeps its single-build result until something else happens to recalculate.
      //
      // Guarded because this is the compare pipeline's subscriber: it clears the loading
      // overlay as its last statement, so anything thrown here would strand the spinner
      // and unsubscribe the comparison control entirely.
      if (this.selectedPvpTargetId) {
        try {
          this.calculatePvp();
        } catch (err) {
          console.error('Falha ao atualizar o PVP após a comparação', err);
        }
      }
    }
  }

  /** Rebuild the toggleable Efeitos (item activations) list: the main build's chances
   *  plus — while comparing — the compare build's, so an activation that only exists on
   *  the item being compared still appears (deduped by name). A compare-only chance,
   *  when toggled on, applies to the compare column (calc2 filters it back in) and is a
   *  no-op on the main column. Prunes selections that no longer have a matching chance. */
  /**
   * Rebuild the "Efeitos" lists — one per build, no longer one shared list.
   *
   * The two builds carry different gear, so they offer different procs; the design's
   * comparison mode shows both rows and lets each be ticked on its own. Each list is
   * also a *union over the rotation's steps*: `prepareAllItemBonus()` rebuilds
   * `_chanceList` on every pass and item conditions can read the skill name, so a proc
   * offered for step 1 may be absent for step 3. A proc that applies to only some steps
   * is simply a no-op on the others — the same tolerance `recalcExtraBonus` already has.
   */
  private refreshChanceList() {
    this.chanceList = this.calculator.chanceList.slice();
    this.chanceList2 = this.isEnableCompare ? this.calculator2.chanceList.slice() : [];

    this.selectedChances = this.selectedChances.filter((name) => this.chanceList.some((c) => c.name === name));
    this.selectedChances2 = this.selectedChances2.filter((name) => this.chanceList2.some((c) => c.name === name));
  }

  /**
   * Recompute every "Bônus de Habilidade / Multiplicadores" summary table from
   * the latest engine output. The shaping logic lives in `core/summary-tables`;
   * this just wires the pure builders to the bound view fields.
   */
  private applySummaryTables(): void {
    // While comparing, feed the compared build's summary so each table row carries a
    // `*2` value and the misc-detail template can render the "main → simulado" arrow.
    const cmp = this.isComparing ? this.totalSummary2 : undefined;
    this.elementTable = buildElementTable(this.totalSummary, cmp);
    ({ raceTable: this.raceTable, peneRaceTable: this.peneRaceTable } = buildRaceTables(this.totalSummary, cmp));
    this.sizeTable = buildSizeTable(this.totalSummary, cmp);
    ({ classTable: this.classTable, peneClassTable: this.peneClassTable } = buildMonsterTypeTables(this.totalSummary, cmp));
    this.atkTypeTable = buildAtkTypeTable(this.totalSummary, cmp);
    this.skillMultiplierTable = buildSkillMultiplierTable(this.totalSummary, (key) => resolveSkillKey(key), cmp);
  }

  /** True when a compare build is active and its summary has been computed — gates
   *  the "main → simulado" arrows in the "Bônus de Habilidade / Multiplicadores" tables. */
  get isComparing(): boolean {
    return this.isEnableCompare && !!this.totalSummary2;
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

    // Every restore path lands here — share token, the 'ro-set' autosave, a named save
    // and the .rrf import — so this one line is the whole rotation migration: a build
    // saved before rotations existed carries no `rotation` key, arrives as [], and
    // becomes a rotation of one holding its selectedAtkSkill.
    rawModel.rotation = normalizeRotation(rawModel.rotation, rawModel.selectedAtkSkill);

    this.model = rawModel;
  }

  /**
   * Keep `selectedAtkSkill` pointing at the rotation's first real skill. Call after any
   * rotation mutation — add, remove, reorder, level change, optimise, class change.
   * An all-basic rotation has no skill to mirror and keeps the previous value, because
   * the engine always needs some valid skill string to solve against.
   */
  private syncRotationMirror() {
    const mirrored = firstRealSkill(this.model.rotation);
    if (mirrored) this.model.selectedAtkSkill = mirrored;
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

        // One macrotask hop is enough for the overlay to repaint before the final
        // calculation; the original 1 s was an arbitrary margin and the single largest
        // fixed cost of the initial load.
        return waitRxjs(0.05);
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

  /**
   * A JSON-safe snapshot of the active "comparar slot" comparison, or `null` when
   * nothing is being compared. Shared by the autosave (survive-refresh) and the
   * named saves (restore-on-load).
   */
  private currentCompareState(): CompareState | null {
    if (!this.compareItemNames?.length) return null;
    return {
      itemNames: [...this.compareItemNames],
      model2: JSON.parse(JSON.stringify(this.model2 ?? { rawOptionTxts: [] })),
    };
  }

  /**
   * Apply a stored comparison to the live state and recompute. A `null` state
   * clears any active comparison — so loading a sim saved without one drops the
   * current comparison too. Slots no longer comparable are dropped.
   */
  private restoreCompareState(state: CompareState | null): void {
    const names = (state?.itemNames ?? []).filter((n) =>
      this.compareItemList.includes(n as keyof typeof ItemTypeEnum),
    ) as ItemTypeEnum[];
    this.model2 = state ? ({ rawOptionTxts: [], ...state.model2 } as ClassModel) : { rawOptionTxts: [] };
    this.compareItemNames = names;
    this.isEnableCompare = names.length > 0;
    this.updateCompareEvent.next(1);
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
    // Cache the build's PVP defensive profile from the already-solved calculator
    // so it can be picked as an enemy target without re-solving (docs/pvp.md §3).
    let targetProfile: PlayerTargetProfile | undefined;
    try {
      targetProfile = this.calculator.getAsPlayerTarget(name);
    } catch (err) {
      console.error('Falha ao computar o perfil de alvo PVP', err);
    }
    this.savedSimStore.upsert(name, this.currentPreset(), targetProfile, this.currentCompareState());
    this.refreshPvpTargets();
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
        // Restore (or clear) the comparison the sim was saved with.
        this.restoreCompareState(sim.compare ?? null);
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
    // Keep the PVP target list in sync — refreshPvpTargets clears the selection
    // and the HUD if the deleted sim was the current target.
    this.refreshPvpTargets();
    this.messageService.add({ severity: 'info', summary: 'Simulação excluída', detail: sim.name });
  }

  async newSimulation(): Promise<void> {
    const ok = await this.waitConfirm('Isso vai limpar a simulação atual e começar do zero. Continuar?');
    if (!ok) return;
    this.loadItemSet(createMainModel() as any).subscribe({
      complete: () => {
        this.restoreCompareState(null);
        this.showSavesDialog = false;
        this.onBaseStatusChange();
        this.messageService.add({ severity: 'success', summary: 'Nova simulação', detail: 'Tudo foi limpo.' });
      },
    });
  }

  // --- PVP ------------------------------------------------------------------
  /** Every saved sim is a possible PVP target. Ones saved before profiles were
   *  cached get their profile solved on demand when selected (buildProfileFromPreset). */
  refreshPvpTargets(): void {
    this.pvpTargets = this.savedSimStore.list();
    if (this.selectedPvpTargetId && !this.pvpTargets.some((t) => t.id === this.selectedPvpTargetId)) {
      this.selectedPvpTargetId = null;
      this.pvpSummary = null;
      this.pvpSummary2 = null;
      this.rotationViewPvp2 = null;
    }
  }

  /** Solve an old saved sim on demand to produce its PVP target profile (for sims
   *  saved before profiles were cached). Mirrors prepare()'s non-compare solve,
   *  but for the preset's OWN class/build on the throwaway calculatorPvp — so the
   *  main build is untouched. Returns null if the class/build can't be resolved. */
  private buildProfileFromPreset(sim: SavedSimulation): PlayerTargetProfile | null {
    try {
      const classInstance = Characters.find((c) => c.value === Number(sim.preset.class))?.['instant'] as CharacterBase;
      if (!classInstance) return null;
      const model = { ...createMainModel(), ...sim.preset } as any;
      const { equipAtks, masteryAtks, activeSkillNames, learnedSkillMap } = classInstance
        .setLearnSkills({ activeSkillIds: model.activeSkills ?? [], passiveSkillIds: model.passiveSkills ?? [] })
        .getSkillBonusAndName();
      const { scripts: consumeData, usedHpL } = collectConsumables(model, this.items);
      const { aspdPotion, buffBonuses } = applyGuaranaCandy({
        consumables: model.consumables,
        aspdPotion: model.aspdPotion,
        buffDefs: this.skillBuffs,
        selectedBuffValues: model.skillBuffs,
        activeSkillNames,
        buffBonuses: collectBuffBonuses(this.skillBuffs, model.skillBuffs, activeSkillNames),
      });
      const { equipAtk: buffEquips, masteryAtk: buffMasterys } = buffBonuses;
      model.rawOptionTxts = toRawOptionTxtList(model, this.items);
      this.calculatorPvp.setClass(classInstance).loadItemFromModel(model);
      this.controller.runChain(this.calculatorPvp, {
        monster: this.monsterDataMap[this.selectedMonster],
        equipAtks, masteryAtks, buffEquips, buffMasterys, consumeData, aspdPotion,
        extraOptionScripts: parseOptionScripts(model.rawOptionTxts),
        activeSkillNames, learnedSkillMap,
        selectedAtkSkill: model.selectedAtkSkill, selectedChances: [], usedHpL,
      });
      // Capture the target's own defender-side sources + slot→id map so the HUD
      // reduction drill-down lists and names the OPPONENT's gear.
      this.pvpTargetSources = this.pickDefenderSources(this.calculatorPvp.getItemSummary());
      this.pvpTargetItemMap = new Map<string, number>();
      for (const slot of Object.values(ItemTypeEnum)) {
        const id = (model as any)[slot];
        if (typeof id === 'number' && id > 0) this.pvpTargetItemMap.set(slot, id);
      }
      return this.calculatorPvp.getAsPlayerTarget(sim.name);
    } catch (err) {
      console.error('Falha ao solver o alvo PVP', err);
      this.pvpTargetSources = {};
      this.pvpTargetItemMap = new Map<string, number>();
      return null;
    }
  }

  get selectedPvpTarget(): SavedSimulation | undefined {
    return this.pvpTargets.find((t) => t.id === this.selectedPvpTargetId);
  }

  /** Paper-doll URL for the selected PVP target (its saved build's appearance). */
  get pvpTargetSpriteUrl(): string | null {
    const t = this.selectedPvpTarget;
    return t ? this.charSpriteUrl(t.preset) : null;
  }

  /** Bare-job fallback if the composed target paper-doll fails to load. */
  get pvpTargetFallbackSprite(): string | null {
    const t = this.selectedPvpTarget;
    return t ? bareJobSprite(t.classId) : null;
  }

  /** Recompute the PVP damage for the current attacker build vs the selected
   *  target + mode. Uses a dedicated calculator so the main build is untouched. */
  calculatePvp(): void {
    const sim = this.selectedPvpTarget;
    if (!sim) {
      this.pvpSummary = null;
      this.pvpSummary2 = null;
      this.rotationViewPvp2 = null;
      this.targetReductionCategories = [];
      return;
    }
    // Solve the target build once per selected target — even when a cached profile
    // exists — so we capture its per-item bonus sources (pvpTargetSources) for the
    // reduction popover's drill-down. On attacker-only changes (same target) this is
    // skipped. buildProfileFromPreset caches pvpTargetSources as a side effect.
    let profile = sim.targetProfile;
    if (this.pvpTargetSourcesId !== sim.id || !profile) {
      const solved = this.buildProfileFromPreset(sim);
      this.pvpTargetSourcesId = sim.id;
      if (solved && !profile) {
        // Old sim without a cached profile — persist it WITHOUT re-timestamping.
        this.savedSimStore.setTargetProfile(sim.id, solved);
        sim.targetProfile = solved;
        profile = solved;
      }
      if (!solved) this.pvpTargetSources = {};
    }
    if (!profile) {
      this.pvpSummary = null;
      this.pvpSummary2 = null;
      this.rotationViewPvp2 = null;
      this.targetReductionCategories = [];
      this.messageService.add({ severity: 'warn', summary: 'Não foi possível carregar o alvo', detail: 'Abra essa simulação e salve de novo.' });
      return;
    }
    this.targetReductionCategories = buildReductionCategories(profile.defenderBonus, this.pvpMode);
    // buildProfileFromPreset above may have left the shared class instance /
    // calculatorPvp in the target's state — prepare() re-sets both to the attacker.
    const calc = this.prepare(this.calculatorPvp, undefined, profile, this.pvpMode);
    this.pvpSummary = calc.getTotalSummary();
    // The PVP panel reads the same rotation, solved against the player target.
    this.rotationViewPvp = this.lastChainInput ? this.solveRotation(calc, this.lastChainInput, this.pvpSummary) : null;

    // The compared build against the same target, exactly as calcCompare() does it for
    // the monster panel. Solved after the main pass so each rotation reads the chain
    // input its own prepare() produced — including that build's own Efeitos.
    if (this.isEnableCompare && this.compareItemNames?.length > 0) {
      // Guarded like buildProfileFromPreset: this runs inside the compare pipeline's
      // subscriber, whose last statement clears the loading overlay. An exception here
      // would skip that AND kill the subscription — the panel would sit on the spinner
      // for good and the comparison control would stop responding. A failed compare pass
      // costs the "→ simulado" column; it must never cost the app.
      try {
        const m2 = JSON.parse(JSON.stringify(this.model2));
        const calc2 = this.prepare(this.calculatorPvp2, m2, profile, this.pvpMode);
        this.pvpSummary2 = calc2.getTotalSummary();
        this.rotationViewPvp2 = this.lastChainInput ? this.solveRotation(calc2, this.lastChainInput, this.pvpSummary2) : null;
      } catch (err) {
        console.error('Falha ao solver a comparação no PVP', err);
        this.pvpSummary2 = null;
        this.rotationViewPvp2 = null;
      }
    } else {
      this.pvpSummary2 = null;
      this.rotationViewPvp2 = null;
    }
  }

  openShareDialog(): void {
    this.shareUrl = this.buildShareUrl();
    this.showShareDialog = true;
    void this.shortenShareUrl();
  }

  /** Swap the embedded-build URL for a short link; keep the long URL if the shortener is unreachable. */
  private async shortenShareUrl(): Promise<void> {
    const longUrl = this.shareUrl;
    this.shareShortening = true;
    try {
      const res = await fetch(`${environment.shortenerUrl}/api/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: longUrl }),
      });
      if (!res.ok) throw new Error(`shortener responded ${res.status}`);
      const { short_url } = (await res.json()) as { short_url?: string };
      // Only swap if the dialog still shows the URL we shortened (it may have been reopened with a new build).
      if (short_url && this.shareUrl === longUrl) this.shareUrl = short_url;
    } catch (error) {
      console.error(error);
    } finally {
      this.shareShortening = false;
    }
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
    // Drop a rotation that is just [selectedAtkSkill]: decoding rebuilds it, so a
    // single-skill build's token stays exactly what it was before rotations existed.
    const preset = compactRotationForShare(this.currentPreset() as unknown as Record<string, any>);
    const token = encodeBuild(preset, this.currentCompareState());
    const { origin, pathname } = window.location;
    return `${origin}${pathname}#/?b=${token}`;
  }

  /** Read & consume a shared build (?b=...) from the URL (query or hash query),
   *  then strip the param so a refresh/copy doesn't re-apply or leak the token. */
  private consumeSharedBuild(): { preset: PresetModel; compare: CompareState | null } | null {
    try {
      // Read the token raw — NOT via URLSearchParams, which would turn any '+'
      // into a space. The token lives in the hash query (#/?b=...) or the search.
      const match = window.location.href.match(/[?&]b=([^&#]+)/);
      const token = match?.[1];
      if (!token) return null;
      const shared = decodeShared(token);
      this.stripBuildParamFromUrl();
      if (!shared) return null;
      return { preset: shared.preset as PresetModel, compare: shared.compare };
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
  private applyLearnedSkills(model: MainModel, learnedSkills: Record<number, number>, activeStatuses: number[] = []) {
    const char = this.characterList.find((c) => c.value === model.class)?.['instant'] as CharacterBase | undefined;
    if (!char) return;

    // A buff/effect skill is only imported if its EFST status was actually up
    // during the replay — learning it doesn't switch it on. Unmapped skills (whose
    // active state we can't confirm) are skipped too.
    const gate = makeBuffGate(activeStatuses);

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

    // `gate` (when given) blocks a skill unless its buff was actually up in the
    // replay. The passive "Aprenda para ganhar bônus" list is NOT gated: those
    // entries just carry the *learned* level (e.g. endow feeds learnLv('Frost
    // Weapon') into damage formulas), which applies whether or not the buff was up.
    const build = (skills: { name: string; dropdown: SkillModel[] }[], gate?: (name: string) => boolean) => {
      const out: Record<string, number> = {};
      for (const s of skills) {
        const id = SKILL_ID_BY_NAME[s.name];
        const level = id ? learnedSkills[id] : 0;
        if (!level) continue;
        if (gate && !gate(s.name)) continue;
        const value = pick(s.dropdown, level);
        if (value) out[s.name] = value;
      }
      return out;
    };

    model.passiveSkillMap = { ...model.passiveSkillMap, ...build(char.passiveSkills) };
    model.activeSkillMap = { ...model.activeSkillMap, ...build(char.activeSkills, gate) };
    model.skillBuffMap = { ...model.skillBuffMap, ...build(this.skillBuffs, gate) };
  }

  async importReplay(file: File) {
    if (this.replayBusy) return;
    this.replayBusy = true;
    try {
      const buf = await file.arrayBuffer();
      const { model, summary, learnedSkills, activeStatuses } = importReplayBuffer(buf, this.items);
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
      this.applyLearnedSkills(model, learnedSkills, activeStatuses);
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
            (summary.traits ? ', talentos' : '') +
            (skipped ? `, ${skipped} ignorado(s) (fora do banco de dados)` : '') + '.';
          this.messageService.add({ severity: 'success', summary: 'Replay importado', detail, life: 9000 });
          // The traits ride on a packet the server only sends on a map load, so a
          // recording that never changed map arrives without them — say so, and only
          // then. On a class that has no traits at all there is nothing to warn about.
          if (!summary.traits && this.isAllowTraitStat) {
            this.messageService.add({
              severity: 'warn',
              summary: 'Talentos',
              detail:
                '⚠️ Esta gravação não trouxe os talentos (POD/STA/SAB/FEI/CON/CRV) — ajuste-os manualmente. ' +
                'Eles só entram no arquivo quando o personagem troca de mapa durante a gravação.',
              life: 9000,
            });
          }
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

  /** Resolve a calc skill name to its LATAM { id, pt-BR name } from the static
   *  Skill Catalog (src/app/skills). Names without an in-game id (internal markers
   *  / skills missing from the client map) return undefined and keep their English
   *  label with no icon, matching the previous behavior. */
  private resolveSkill(name: string): { id: number; name: string; iconType?: 'item' | 'skill' } | undefined {
    const meta = resolveSkillMeta(name);
    if (!meta || meta.id === undefined) return undefined;
    return { id: meta.id, name: meta.label ?? name, iconType: meta.iconType };
  }

  private setClassSkill() {
    // Overlay pt-BR skill names + ragassets skill-icon id (from the GRF skill map)
    // on every skill panel. Skills missing from the map keep their English label
    // and render no icon (the template guards on `icon`).
    const localize = <T extends { name: string }>(skill: T) => {
      const pt = this.resolveSkill(skill.name);
      const base = pt ? { ...skill, label: pt.name, icon: pt.id, iconType: pt.iconType } : skill;
      // A skill whose level-list entries are really *other* skills (Fist Spell
      // casts Fire/Cold/Lightning Bolt) exposes a `treatedAsSkillNameFn`. Relabel
      // each entry with the underlying bolt's pt-BR name + icon so the picker drops
      // the repeated parent prefix ("Punho Arcano ... (Lanças de Fogo)" -> "Lanças de Fogo").
      const treatedFn = (skill as any).treatedAsSkillNameFn;
      const levelList = (skill as any).levelList;
      if (typeof treatedFn === 'function' && Array.isArray(levelList)) {
        return {
          ...base,
          levelList: levelList.map((entry: { label: string; value: string }) => {
            const treatedName = treatedFn(entry.value)?.split('==')[0];
            const ptEntry = treatedName ? this.resolveSkill(treatedName) : undefined;
            return ptEntry ? { ...entry, label: ptEntry.name, icon: ptEntry.id, iconType: ptEntry.iconType } : entry;
          }),
        };
      }
      // The level picker is a cascade: the chosen entry is what stays visible once it
      // closes, so it has to carry the skill name — in pt-BR, like the group above it.
      // The entries are written in English in the class ("Wild Fire Lv1"); here only the
      // prefix is swapped, preserving the rest of the label (e.g. Constelação's
      // "(1 estrela)").
      if (pt && Array.isArray(levelList)) {
        return {
          ...base,
          levelList: levelList.map((entry: { label: string; value: string }) =>
            entry.label.startsWith(skill.name) ? { ...entry, label: pt.name + entry.label.slice(skill.name.length) } : entry,
          ),
        };
      }
      return base;
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
    // Atk skills can repeat the same name with different fixed properties (e.g. Adoramus
    // cast as Holy vs Neutral). After localizing the bare skill name, disambiguate any
    // repeated name by appending its element, so the picker reads "Adoramus - Sagrado".
    const localizedAtkSkills = this.selectedCharacter.atkSkills.map(localize);
    const seenLabel = new Set<string>();
    const dupLabels = new Set<string>();
    for (const s of localizedAtkSkills) {
      if (seenLabel.has(s.label)) dupLabels.add(s.label);
      seenLabel.add(s.label);
    }
    this.atkSkills = localizedAtkSkills.map((s) => {
      // An explicit labelSuffix always wins — it disambiguates same-name/same-element
      // variants (e.g. a ground skill's Inicial burst vs its Contínuo field) that the
      // element-based fallback below can't tell apart.
      if ((s as any).labelSuffix) return { ...s, label: `${s.label} (${(s as any).labelSuffix})` };
      return dupLabels.has(s.label) && s.element ? { ...s, label: `${s.label} - ${elementPtBr(s.element)}` } : s;
    });
    this.offensiveSkills = [...new Set(this.selectedCharacter.atkSkills.map((a) => a.name)).values()].map((name) => {
      const pt = this.resolveSkill(name);
      return { label: pt?.name ?? name, value: name, icon: pt?.id };
    });
    this.atkSkillCascades = this.atkSkills;
    this.atkSkillDisplayMemo = undefined;
    this.isShowSelectableSkillLevel = this.selectedCharacter.atkSkills.some((a) => a.levelList?.length > 0);
  }

  /**
   * Label + icon of the chosen skill, for the levels p-cascadeSelect.
   *
   * The cascade hands the display template only the **raw value** (`$implicit: value`,
   * "Wild Fire==1"), unlike p-dropdown, which hands over the whole option. Without this
   * the icon vanished as soon as the skill was picked: it showed in the open list but not
   * on the closed row. Level entries carry no icon of their own, so they inherit the one
   * from the skill above them.
   */
  get selectedAtkSkillDisplay(): { label: string; icon?: number } | undefined {
    const value = this.model.selectedAtkSkill;
    if (!value) return undefined;
    if (this.atkSkillDisplayMemo?.value === value) return this.atkSkillDisplayMemo;

    for (const skill of this.atkSkillCascades) {
      const entry = skill.value === value ? skill : skill.levelList?.find((l: any) => l.value === value);
      if (!entry) continue;
      this.atkSkillDisplayMemo = { value, label: entry.label, icon: entry.icon ?? skill.icon };
      return this.atkSkillDisplayMemo;
    }
    return undefined;
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

    this.setDefaultRotation();
  }

  /**
   * Bring the rotation in line with the class that is now loaded: drop entries this
   * class cannot cast (a class switch, or a share link built on another class) and
   * reseed an empty one from the skill `setDefaultSkill` just settled on.
   *
   * Runs after `selectedAtkSkill` is validated, then hands authority back to the
   * rotation — from here on the mirror follows the rotation, not the other way round.
   */
  private setDefaultRotation() {
    this.model.rotation = pruneRotationForClass(this.model.rotation ?? [], this.atkSkills);
    if (!this.model.rotation.length && this.model.selectedAtkSkill) {
      this.model.rotation = [this.model.selectedAtkSkill];
    }

    this.syncRotationMirror();
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
    const rawMonsters = Object.values(this.monsterDataMap).sort((a, b) => {
      // Sort by level, then by name with NATURAL numeric ordering so leveled
      // targets like "Miragem de Amdarais - Nível 1..10" read 1,2,…,10 instead
      // of the lexicographic 1,10,2,… (or the scrambled order the old
      // equal-level comparator produced).
      if (a.stats.level !== b.stats.level) return a.stats.level - b.stats.level;
      return a.name.localeCompare(b.name, 'pt-BR', { numeric: true, sensitivity: 'base' });
    });
    const classMap = {
      0: 'Normal',
      1: 'Boss',
    };

    for (const mon of rawMonsters) {
      const { id, name, spawn, stats } = mon;
      const { level, health, mvp, class: _class, elementShortName, raceName, scaleName } = stats;

      // MVPs from the browiki list get their own "MVPs" group (id-driven, so the
      // monster's real spawn — used by SPAWN[] item bonuses — stays intact).
      const spawnMap = MVP_IDS.has(id) ? 'MVPs' : mvp === 1 ? ' Boss' : getMonsterSpawnMap(spawn) || (_class === 1 ? ' Boss' : 'Etc');
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
      const { itemTypeId, itemSubTypeId, compositionPos } = item;

      switch (itemTypeId) {
        case ItemTypeId.WEAPON:
          // if (!item.name.startsWith('Furious')) continue;
          weaponList.push(item);

          if (itemSubTypeId === 256 || itemSubTypeId === 257) {
            leftWeaponList.push(item);
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
        // A head gear is offered in every slot it occupies — a Middle+Lower mask shows up
        // under both Meio and Baixo, and picking it in one marks the other as occupied
        // (see refreshHeadSlotOccupancy). Which one the player chooses matters: only
        // headUpper/headMiddle carry a card socket, so a masks's slot is unreachable if
        // the calculator confines it to Baixo.
        case ItemSubTypeId.Upper:
          for (const slot of getHeadGearLocations(item)) {
            if (slot === HeadGearLocation.Middle) headMiddleList.push(item);
            else if (slot === HeadGearLocation.Lower) headLowerList.push(item);
            else headUpperList.push(item);
          }
          continue;
        case ItemSubTypeId.Shield:
          shieldList.push(item);
          continue;
        case ItemSubTypeId.Armor:
          armorList.push(item);
          continue;
        case ItemSubTypeId.Garment:
          garmentList.push(item);
          continue;
        case ItemSubTypeId.Boot:
          bootList.push(item);
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
        // Same multi-slot rule as real head gear above; the costume family has its own
        // three slots, and 85 of these span more than one of them.
        case ItemSubTypeId.CostumeUpper:
        case ItemSubTypeId.CostumeMiddle:
        case ItemSubTypeId.CostumeLower:
          for (const slot of getHeadGearLocations(item)) {
            if (slot === HeadGearLocation.Middle) costumeMiddleList.push(item);
            else if (slot === HeadGearLocation.Lower) costumeLowerList.push(item);
            else costumeUpperList.push(item);
          }
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
              name: `${ACC_SIDE_PREFIX.left} ${item.name}`,
              isHilight: true,
            });
            accCardList.push(item);
            continue;
          case CardPosition.AccR:
            accRightCardList.push({
              ...item,
              name: `${ACC_SIDE_PREFIX.right} ${item.name}`,
              isHilight: true,
            });
            accCardList.push(item);
            continue;
          case CardPosition.Acc:
            accLeftCardList.push(item);
            accRightCardList.push(item);
            accCardList.push(item);
            continue;
          case CardPosition.All:
            // Fits any slot's card socket (e.g. Essências de Morroc): offer it in
            // every card picker.
            weaponCardList.push(item);
            headCardList.push(item);
            shieldCardList.push(item);
            armorCardList.push(item);
            garmentCardList.push(item);
            bootCardList.push(item);
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

  /** The head gear (real and costume) a build is wearing, keyed by the slot holding it. */
  private collectHeadGear(model: Record<string, any>) {
    const equipped: Partial<Record<ItemTypeEnum, ItemModel>> = {};
    for (const slot of HEAD_SLOTS) {
      const item = this.items[model[slot]];
      if (item) equipped[slot] = item;
    }

    return equipped;
  }

  /**
   * Applies the multi-slot head gear rule to the main build: mark the slots a spanning
   * item takes over, and empty whatever collides with it.
   *
   * Returns true when something was cleared, so the caller can bail out and let the
   * follow-up event recalculate against the settled build.
   */
  private refreshHeadSlotOccupancy(changed: ReadonlySet<ItemTypeEnum>): boolean {
    const equipped = this.collectHeadGear(this.model);
    const { occupiedBy, toClear } = resolveHeadSlotOccupancy(equipped, changed);

    this.headSlotOccupiedBy = Object.fromEntries(
      Object.entries(occupiedBy).map(([slot, holder]) => [slot, equipped[holder]?.name]),
    );

    for (const slot of toClear) {
      this.model[slot] = undefined;
      this.onSelectItem(slot);
      this.onClearItem(slot);
    }

    return toClear.length > 0;
  }

  /**
   * Same rule for a comparison build. It inherits every slot the comparison does not
   * override, so swapping a hat into Meio can land on top of a mask the main build wears
   * in Baixo — that has to resolve here or the mask's bonuses get counted twice. The
   * compared slots win, since they are what the player is asking about.
   */
  private resolveCompareHeadSlots<T extends Record<string, any>>(model: T): T {
    const { toClear } = resolveHeadSlotOccupancy(this.collectHeadGear(model), new Set(this.compareItemNames));
    if (!toClear.length) return model;

    const resolved = { ...model };
    for (const slot of toClear) {
      resolved[slot as keyof T] = null;
      for (const related of MainItemWithRelations[slot] ?? []) {
        resolved[related as keyof T] = null;
      }
    }

    return resolved;
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
    this.itemDescription = prettyItemDesc(this.itemDescriptionStore.get(itemId));
  }

  /** Turn a flat item-bonus summary ({ key: value }) into display rows. Skill-named
   *  keys resolve to their pt-BR skill (icon + name, value shown as a % skill-damage
   *  bonus); every other key gets a localized stat label. Skills are grouped last so
   *  the icon column reads cleanly — mirrors the visual bonus lists used elsewhere. */
  private buildItemBonusRows(bonus: Record<string, any>): { label: string; icon?: number; display: string; isSkill: boolean }[] {
    const fmt = (v: number) => (v > 0 ? `+${v}` : `${v}`);
    const rows = Object.entries(bonus || {}).map(([key, value]) => {
      const skill = resolveSkillKey(key);
      if (skill) {
        const display = typeof value === 'number' ? `${fmt(value)}%` : `${value}`;
        return { label: skill.name, icon: skill.id, display, isSkill: true };
      }
      const display = typeof value === 'number' ? this.bonusValueText(key, value) : `${value}`;
      return { label: bonusKeyLabel(key), display, isSkill: false };
    });
    return [...rows.filter((r) => !r.isSkill), ...rows.filter((r) => r.isSkill)];
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

    // See ItemDescriptionStore: the descriptions arrive after the item map.
    if (this.itemDescVersion !== this.itemDescriptionStore.version) {
      this.itemDescCache.clear();
      this.itemDescVersion = this.itemDescriptionStore.version;
    }

    const cached = this.itemDescCache.get(id);
    if (cached !== undefined) return cached;
    const html = itemDescPopoverHtml(this.items[id], this.itemDescriptionStore.get(id));
    this.itemDescCache.set(id, html);
    return html;
  }

  private buffTooltipCache = new Map<string, string>();

  /** Buff label popover: the real pt-BR client skill description when available,
   *  otherwise an effect summary derived from the buff's bonuses. */
  buffTooltip(buff: { name: string; label: string; icon?: number; isDebuff?: boolean; dropdown: any[] }): string {
    const cached = this.buffTooltipCache.get(buff.name);
    if (cached !== undefined) return cached;

    const desc = buff.icon ? prettyItemDesc(SKILL_DESC_BY_ID[buff.icon]) : '';

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
          const parts = Object.entries(d.bonus).map(([k, v]) => `${BUFF_BONUS_LABELS[k] ?? k} ${fmt(v)}`);
          return `<div>${d.label}: ${parts.join(', ')}</div>`;
        });
      const title = `<div class="item_desc_title"><b>${buff.label}</b></div>`;
      const debuff = buff.isDebuff ? `<div style="color:#b00000">Debuff no monstro</div>` : '';
      html = `${title}${debuff}${lines.length ? lines.join('') : '<div>—</div>'}`;
    }

    this.buffTooltipCache.set(buff.name, html);
    return html;
  }

  /** Reuses the buff popover for anything that names a skill but carries no dropdown: the
   *  multiplier rows in <app-misc-detail>/<app-battle-hud> (which label via `displayName`)
   *  and the "Resumo de Batalha" skill picker (which labels via `label`). With no dropdown
   *  buffTooltip falls through to the pt-BR client description.
   *  Arrow property, not a prototype method — it is passed by reference as an @Input. */
  skillTooltip = (skill: { name?: string; label?: string; displayName?: string; icon?: number }): string =>
    this.buffTooltip({
      name: skill?.name,
      label: skill?.label || skill?.displayName || skill?.name,
      icon: skill?.icon,
      dropdown: [],
    });

  /** Open the breakdown modal for a clicked summary value: list every source
   *  (equip slot/card/enchant + skill) whose contribution to `keys` is non-zero. */
  /** True when at least one equipped source contributes to `keys`; drives whether a
   *  summary value renders as clickable (no point opening an empty breakdown).
   *  Arrow property (not a prototype method) because it's also passed by reference
   *  into <app-battle-hud>'s canBreakdownFn input — same reason as skillTooltip. */
  canBreakdown = (keys: string[]): boolean => {
    // A pure defender-reduction lookup (the PVP reduction graph nodes) is sourced by
    // the TARGET's gear, not the attacker's — check the target map.
    if (this.isAllDefenderKeys(keys)) return sourcesContributeAnyKey(this.pvpTargetSources, keys);
    // Trait-derived stats (P.ATQ/S.ATQM/T.CRÍT, ATQ) always have something to say even
    // with no equipment behind them: showBonusBreakdown adds the "Atributos (…)" row for
    // the attribute-sourced remainder. Without this they render inert whenever the value
    // comes purely from stats — which is precisely when the user most wants to be told so.
    return keys.some((k) => this.bonusBreakdownKeys.has(k)) || !!this.traitDerivedDef(keys);
  };

  /** All keys are defender-reduction keys (subrace_/subele_/…) — such a lookup is
   *  always target-sourced (these keys only exist on a player target). */
  private isAllDefenderKeys(keys: string[]): boolean {
    return keys.length > 0 && keys.every(isDefenderKey);
  }

  /** The trait-derived definition for a lookup, if it has one. Single source of the
   *  "only single-key lookups can carry an attribute remainder" rule — canBreakdown
   *  (clickability) and showBonusBreakdown (the row itself) must never disagree on it. */
  private traitDerivedDef(keys: string[]): { total?: () => number; label: string } | null {
    return keys.length === 1 ? this.traitDerivedBreakdownKeys[keys[0]] ?? null : null;
  }

  private readonly mainStats = new Set(['str', 'agi', 'vit', 'int', 'dex', 'luk']);

  /** Every source key that feeds a base/trait stat total: the stat itself, the skill
   *  flat boost (`<stat>Boost`, e.g. Improve Concentration's agiBoost), and the all-stat
   *  bonus (`allStatus` for main stats, `allTrait` for traits). */
  statBreakdownKeys(stat: string): string[] {
    return [stat, `${stat}Boost`, this.mainStats.has(stat) ? 'allStatus' : 'allTrait'];
  }

  /** A bonus key whose value is a percentage (so it renders with a trailing "%"): the
   *  `*Percent` keys, the structured `p_/m_/pene_` damage keys, the cast/delay reduction
   *  percents (acd/vct/…, incl. per-skill `vct__`/`acd__`/`fctPercent__` combos), and a
   *  few named ones. */
  private isPercentKey(k: string): boolean {
    return (
      /Percent$/.test(k) ||
      /^(p|m)_/.test(k) ||
      /^pene_/.test(k) ||
      isDefenderKey(k) ||
      /^(vct|acd|fctPercent)__/.test(k) ||
      ['range', 'melee', 'criDmg', 'cri', 'perfectHit', 'acd', 'vct', 'vct_inc', 'vctBySkill', 'oratio', 'infection', 'intoxication', 'bitterCold', 'gravitation'].includes(k)
    );
  }

  /** A cast/delay/cooldown stat stored as a positive *reduction* magnitude but read as a
   *  negative effect — displayed negated, so a stored +25 renders as "-25%" (Pós-conjuração,
   *  Conj. Variável) or a stored +0.5 as "-0.5" seconds (Conj. Fixa). `vct_inc` is excluded:
   *  it's a cast-time *increase*, so its positive value reads as "+x%". */
  private isReductionKey(k: string): boolean {
    return ['acd', 'vct', 'fct', 'fctPercent', 'vctBySkill'].includes(k);
  }

  /** "+12", "-25%", "0%": a leading "+" only for positives (negatives already carry their
   *  own "-"), with an optional trailing "%". */
  private formatSignedValue(value: number, isPercent: boolean): string {
    return `${formatSignedNumber(value)}${isPercent ? '%' : ''}`;
  }

  /** Format a numeric equip/item bonus for display: percent bonuses get a trailing "%"
   *  (matching the breakdown modal); reduction stats (cast/delay) are negated so they read
   *  as the negative effect they apply. Used by the item-description rows and the summary. */
  bonusValueText(key: string, value: number | undefined): string {
    const v = value || 0;
    const shown = this.isReductionKey(key) ? -v : v;
    return this.formatSignedValue(shown, this.isPercentKey(key));
  }

  /** Keys whose full displayed value is never just an equipment sum, so bonusBreakdownSources
   *  can only ever surface the equip-sourced slice — showBonusBreakdown shows the remainder
   *  as its own row instead of silently under-counting. `total`, when given, reads the real
   *  combined value directly (P.ATQ/S.ATQM/T.CRÍT blend in POD/CON/FEI/CRV trait stats via
   *  DamageCalculator's `traitBonus` getter, not `totalBonus`, so there's a single dedicated
   *  field for it on totalSummary.dmg). Without a `total` getter, the *clicked row's own
   *  value* is used instead (event.total) — that's the case for "ATQ", which also carries
   *  character stats, weapon base, refine, etc. beyond any one summable equip key. */
  private readonly traitDerivedBreakdownKeys: Record<string, { total?: () => number; label: string }> = {
    pAtk: { total: () => this.totalSummary?.dmg?.pAtk || 0, label: 'Atributos (POD/CON)' },
    sMatk: { total: () => this.totalSummary?.dmg?.sMatk || 0, label: 'Atributos (FEI/CON)' },
    cRate: { total: () => this.totalSummary?.dmg?.cRate || 0, label: 'Atributos (CRV)' },
    atk: { label: 'Base (arma/atributos/outros)' },
  };

  /** Keep only the defender-reduction slice of each source's bonus map (and drop
   *  sources left with nothing) — the target reduction popover never needs the rest. */
  private pickDefenderSources(all: Record<string, any>): Record<string, any> {
    const out: Record<string, any> = {};
    for (const [src, map] of Object.entries(all || {})) {
      if (!map || typeof map !== 'object') continue;
      const slice: Record<string, number> = {};
      for (const [k, v] of Object.entries(map)) {
        if (typeof v === 'number' && v !== 0 && isDefenderKey(k)) slice[k] = v;
      }
      if (Object.keys(slice).length) out[src] = slice;
    }
    return out;
  }

  /** Whether a reduction row is drillable in a given source map (template binding —
   *  delegates to the shared predicate so self/target stay in lockstep). */
  reductionRowClickable(row: ReductionRow, sources: Record<string, any>): boolean {
    return reductionRowClickableFn(row, sources);
  }

  /** Open the bonus-breakdown modal for a clicked reduction row against the right
   *  source map (self = attacker gear; target = opponent gear). */
  openReductionRow(row: ReductionRow, target: boolean): void {
    if (!row.keys.length) return;
    const sources = target ? this.pvpTargetSources : this.bonusBreakdownSources;
    if (!this.reductionRowClickable(row, sources)) return;
    const itemMap = target ? this.pvpTargetItemMap : this.equipItemIdItemTypeMap;
    this.showBonusBreakdown({ label: `Redução: ${row.label}`, keys: row.keys, valueClass: 'summary_stat_def2', sources, itemMap });
  }

  showBonusBreakdown(event: { label: string; keys: string[]; valueClass: string; total?: number; calc?: DamageFormulaCalc; sources?: Record<string, any>; itemMap?: Map<any, number>; compare?: boolean }): void {
    const rows: typeof this.bonusBreakdownRows = [];
    // The summary value being broken down is a reduction (and so shown negated) when every
    // queried key is one — cast/delay stats are always queried alone (e.g. ['acd']).
    const isReduction = event.keys.length > 0 && event.keys.every((k) => this.isReductionKey(k));
    // Defaults to the attacker build's sources/item-map; the PVP reduction popover
    // passes them explicitly, a "→ simulado" compare click resolves against the compared
    // build, and a pure defender-key lookup (the "Redução por equip." graph node, which
    // carries no explicit sources) resolves against the TARGET's gear.
    const targetScoped = !event.sources && !event.compare && this.isAllDefenderKeys(event.keys);
    const sources = event.sources ?? (event.compare ? this.bonusBreakdownSources2 : targetScoped ? this.pvpTargetSources : this.bonusBreakdownSources);
    // The compared build is the main gear with only the compared slots swapped, so its
    // item map is the main one with those slots overridden. `equipCompareItemIdItemTypeMap`
    // alone holds just the swapped slots, which left every row from an untouched slot
    // unresolved and printed as its raw engine key ("headUpperEnchant1", "armorCard"...).
    const compareItemMap = new Map([...this.equipItemIdItemTypeMap, ...this.equipCompareItemIdItemTypeMap]);
    const itemMap = event.itemMap ?? (event.compare ? compareItemMap : targetScoped ? this.pvpTargetItemMap : this.equipItemIdItemTypeMap);
    const tooltips = event.compare ? this.bonusBreakdownTooltips2 : this.bonusBreakdownTooltips;
    for (const [srcKey, bonusMap] of Object.entries(sources || {})) {
      if (!bonusMap || typeof bonusMap !== 'object') continue;
      // A single source can contribute BOTH a flat and a percent bonus for the same
      // summary value — an ASPD enchant is "+1" and "+6%", HP máx is "+1000" and "+5%".
      // Flat and percent are different units and combine differently (the "%" is a
      // diminishing multiplier, not added to the flat), so summing them into one number
      // is wrong and misleading. Keep them apart and show each part in its own unit.
      let flatSum = 0;
      let pctSum = 0;
      for (const k of event.keys) {
        const v = (bonusMap as any)[k];
        if (typeof v === 'number' && v !== 0) {
          if (this.isPercentKey(k)) pctSum += v;
          else flatSum += v;
        }
      }
      if (!flatSum && !pctSum) continue;
      const parts: string[] = [];
      if (flatSum) parts.push(this.formatSignedValue(isReduction ? -flatSum : flatSum, false));
      if (pctSum) parts.push(this.formatSignedValue(isReduction ? -pctSum : pctSum, true));
      rows.push({ ...this.resolveBonusSource(srcKey, flatSum + pctSum, itemMap), display: parts.join(' '), tooltip: tooltips[srcKey] });
    }

    // Trait stats (P.ATQ/S.ATQM/T.CRÍT) mix POD/CON/FEI/CRV attributes into the same
    // number equip bonuses feed, and "ATQ" mixes in weapon base/refine/character stats —
    // without this, the dialog's rows would visibly add up to less than the value the
    // user clicked on.
    {
      const traitDef = this.traitDerivedDef(event.keys);
      const total = traitDef?.total ? traitDef.total() : event.total;
      if (traitDef && total != null) {
        const equipSum = rows.reduce((sum, r) => sum + r.value, 0);
        const baseAmount = total - equipSum;
        if (baseAmount !== 0) {
          rows.push({ label: traitDef.label, iconType: 'skill', value: baseAmount, display: this.formatSignedValue(baseAmount, false) });
        }
      }
    }

    rows.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

    this.bonusBreakdownTitle = event.label;
    this.bonusBreakdownValueClass = event.valueClass || 'summary_damage';
    this.bonusBreakdownRows = rows;
    // Formula-derived nodes in the damage graph (ATQ Status, ATQ da Arma, the "Adicional"
    // chips) carry their own derivation — the dialog shows it above the equipment rows.
    // A node can have both: e.g. a "%" chip lists the equipment behind the percentage.
    //
    // Rows naming a bonus source arrive keyed by the engine's raw English key (the engine
    // has no access to the pt-BR names or icon ids); resolve them here so they render like
    // the equipment rows below them.
    this.bonusBreakdownCalc = event.calc
      ? {
          ...event.calc,
          rows: event.calc.rows.map((r) => {
            if (!r.sourceKey) return r;
            const resolved = this.resolveBonusSource(r.sourceKey, 0, itemMap);
            return { ...r, label: resolved.label, icon: resolved.icon, iconType: resolved.iconType };
          }),
        }
      : null;
    this.isShowBonusBreakdown = true;
  }

  /** Opens the hits-per-second curve with this build plotted on it. VelAtq is a hyperbola,
   *  so "is +10 VelAtq worth it?" can only be answered against the breakpoint table — see
   *  aspd-curve.logic. */
  showAspdCurve(): void {
    this.isShowAspdCurve = true;
  }

  /** Map a breakdown source key to a display row: an equipped item (slot/card/enchant),
   *  a consumable (`consumable_<id>`), a job buff, a skill (id- or name-keyed), or a
   *  labelled catch-all (extras). */
  private resolveBonusSource(
    srcKey: string,
    value: number,
    itemMap: Map<any, number> = this.equipItemIdItemTypeMap,
  ): { label: string; icon?: number; iconType: 'item' | 'skill'; value: number } {
    if (srcKey.startsWith('consumable_')) {
      const consumableId = Number(srcKey.slice('consumable_'.length));
      if (this.items[consumableId]) {
        return { label: this.items[consumableId].name, icon: consumableId, iconType: 'item', value };
      }
    }
    // A slot key (headUpper/armor/…) resolves against the relevant build's equipment —
    // the PVP target popover passes the target's own slot→id map so its rows name the
    // OPPONENT's gear, not the attacker's item in the same slot.
    const itemId = itemMap.get(srcKey as any);
    if (itemId && this.items[itemId]) {
      return { label: this.items[itemId].name, icon: itemId, iconType: 'item', value };
    }
    const skill = resolveSkillKey(srcKey);
    if (skill) {
      return { label: skill.name, icon: skill.id, iconType: skill.iconType ?? 'skill', value };
    }
    // job buffs carry a curated pt-BR label (and icon, attached by setClassSkill)
    const buff = this.skillBuffs.find((b) => b.name === srcKey);
    if (buff) {
      return { label: buff.label, icon: buff.icon, iconType: 'skill', value };
    }
    // active/passive skill bonuses are keyed by the English skill name
    const namedSkill = this.resolveSkill(srcKey);
    if (namedSkill) {
      return { label: namedSkill.name, icon: namedSkill.id, iconType: namedSkill.iconType ?? 'skill', value };
    }
    const fallback: Record<string, string> = { extra: 'Bônus Aleatórios', consumableBonuses: 'Consumíveis' };
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
            // Same reason as loadItemSet: one macrotask hop is enough for the overlay
            // to repaint; the half second was an arbitrary margin.
            return waitRxjs(0.05);
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
