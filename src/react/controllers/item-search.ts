import { ViewState } from '../state/view-state';
import { Events, Disposable } from '../services/events';
import { prettyItemDesc } from '../../app/utils/pretty-item-desc';
import { DropdownModel } from '../../app/models/dropdown.model';
import type { CustomKind } from '../../app/core/custom-items';
import { ItemModel } from '../../app/models/item.model';
import { filterSearchItems, ITEM_SEARCH_BONUS_OPTIONS, ItemSearchRow } from '../../app/core/item-search';
import { CalculatorLayout as LayoutService, ItemShop as ItemShopService } from '../services/calculator-services';
import { SKILL_ID_BY_NAME } from 'src/app/skills';
import { DescriptionStore as ItemDescriptionStore } from '../services/data-client';

const positions: (DropdownModel & { iconKind: CustomKind })[] = [
  { value: 'weaponList', label: 'Arma', iconKind: 'weapon' },
  { value: 'ammoList', label: 'Munição', iconKind: 'ammo' },
  { value: 'weaponCardList', label: 'Carta de Arma', iconKind: 'card' },

  { value: 'shieldList', label: 'Escudo', iconKind: 'shield' },
  { value: 'shieldCardList', label: 'Carta de Escudo', iconKind: 'card' },

  { value: 'headUpperList', label: 'Topo', iconKind: 'headUpper' },
  { value: 'headMiddleList', label: 'Meio', iconKind: 'headMiddle' },
  { value: 'headLowerList', label: 'Baixo', iconKind: 'headLower' },
  { value: 'headCardList', label: 'Carta de Cabeça', iconKind: 'card' },

  { value: 'enchants', label: 'Pedra de Encantamento', iconKind: 'enchant' },

  { value: 'armorList', label: 'Armadura', iconKind: 'armor' },
  { value: 'armorCardList', label: 'Carta de Armadura', iconKind: 'card' },
  { value: 'garmentList', label: 'Capa', iconKind: 'garment' },
  { value: 'garmentCardList', label: 'Carta de Capa', iconKind: 'card' },
  { value: 'bootList', label: 'Botas', iconKind: 'boot' },
  { value: 'bootCardList', label: 'Carta de Botas', iconKind: 'card' },
  { value: 'accList', label: 'Acessório', iconKind: 'accessory' },
  { value: 'accCardList', label: 'Carta de Acessório', iconKind: 'card' },

  { value: 'petList', label: 'Pet', iconKind: 'pet' },

  { value: 'costumeList', label: 'Visual', iconKind: 'costumeUpper' },

  { value: 'shadowWeaponList', label: 'Arma Sombria', iconKind: 'shadowWeapon' },
  { value: 'shadowArmorList', label: 'Armadura Sombria', iconKind: 'shadowArmor' },
  { value: 'shadowShieldList', label: 'Escudo Sombrio', iconKind: 'shadowShield' },
  { value: 'shadowBootList', label: 'Botas Sombrias', iconKind: 'shadowBoot' },
  { value: 'shadowEarringList', label: 'Brinco Sombrio', iconKind: 'shadowEarring' },
  { value: 'shadowPendantList', label: 'Pingente Sombrio', iconKind: 'shadowPendant' },
];


export class ItemSearchComponent extends ViewState {
  items: Record<number, ItemModel> = {};
  selectedCharacter?: { className: string };
  className = '';
  equipableItems: ItemSearchRow[] = [];
  offensiveSkills: (DropdownModel & { icon?: number })[] = [];
  onClassChanged!: Events<boolean>;

  private classSubscription?: Disposable;
  private openSubscription?: Disposable;
  private unsubscribeTargets?: () => void;
  private preferredTargetKey?: string;
  equipInComparison = false;
  selectedEquipTarget: string | null = null;
  private nextBonusId = 1;

  constructor(
    private readonly layoutService: LayoutService,
    private readonly itemShop: ItemShopService,
    private readonly itemDescriptions: ItemDescriptionStore,
  ) { super(); }

  isShowSearchDialog = false;
  readonly itemPositionOptions = positions;
  readonly bonusNameList = ITEM_SEARCH_BONUS_OPTIONS;
  readonly yesNoOptions = [{ label: 'Sim', value: true }, { label: 'Não', value: false }];
  searchName = '';
  selectedItemPositions: string[] = [];
  selectedOffensiveSkills: string[] = [];
  bonusPickers: { id: number; value: string | null }[] = [{ id: 0, value: null }];
  matchAllBonuses = true;
  itemSearchFirst = 0;
  filteredItems: ItemSearchRow[] = [];
  activeFilteredItem: ItemSearchRow | null = null;

  get totalFilteredItems(): number { return this.filteredItems.length; }
  get activeItem(): ItemModel | undefined { return this.items[this.activeFilteredItem?.id]; }
  // controllerView already subscribes to DescriptionStore. Read the current value on
  // every render so an item selected before itemsDesc arrives gains its description.
  get activeFilteredItemDesc(): string {
    return prettyItemDesc(this.itemDescriptions.get(this.activeFilteredItem?.id)) ?? '';
  }
  get shopServerOptions() { return this.itemShop.serverOptions; }
  get selectedShopServer(): string { return this.itemShop.server; }
  set selectedShopServer(value: string) { this.itemShop.server = value; }
  get divinePrideItemUrl(): string { return this.itemShop.divinePrideItemUrl(this.activeFilteredItem?.id); }
  get marketItemUrl(): string { return this.itemShop.marketItemUrl(this.activeItem?.name); }

  ngOnInit(): void {
    this.classSubscription = this.onClassChanged.subscribe(() => this.action(() => {
      this.selectedOffensiveSkills = [];
      this.preferredTargetKey = undefined;
      this.equipInComparison = false;
      this.clearResults();
    }));
    this.unsubscribeTargets = this.layoutService.itemSearchTargets.subscribe(() => this.publish());
    this.openSubscription = this.layoutService.itemSearchOpen.subscribe(request => this.action(() => {
      this.preferredTargetKey = request?.targetKey;
      this.equipInComparison = request?.compare ?? false;
      this.selectedEquipTarget = null;
      if (request) {
        this.selectedItemPositions = [request.position];
        this.onItemSearchFilterChange();
      }
      this.isShowSearchDialog = true;
    }));
  }
  ngOnDestroy(): void {
    this.classSubscription?.unsubscribe();
    this.openSubscription?.unsubscribe();
    this.unsubscribeTargets?.();
  }

  get equipTargetOptions(): DropdownModel[] {
    const id = this.activeFilteredItem?.id;
    if (!id) return [];
    return this.layoutService.itemSearchTargets.getSnapshot()
      .filter(target => target.compare === this.equipInComparison && target.options.some(option => option.value === id))
      .map(target => ({ label: target.label, value: target.targetKey }));
  }
  get equipTargetValue(): string | null {
    const options = this.equipTargetOptions;
    return [this.selectedEquipTarget, this.preferredTargetKey].find(key => options.some(option => option.value === key))
      ?? (options[0]?.value as string | undefined) ?? null;
  }
  equipSelectedItem(): void {
    const itemId = this.activeFilteredItem?.id;
    const targetKey = this.equipTargetValue;
    if (!itemId || !targetKey) return;
    this.layoutService.itemSearchEquip.next({ targetKey, itemId });
    this.isShowSearchDialog = false;
  }

  addBonusPicker(): void { this.bonusPickers.push({ id: this.nextBonusId++, value: null }); }
  removeBonusPicker(id: number): void {
    if (this.bonusPickers.length > 1) this.bonusPickers = this.bonusPickers.filter(picker => picker.id !== id);
  }

  onItemSearchFilterChange(): void {
    this.filteredItems = filterSearchItems(this.items, this.equipableItems, {
      name: this.searchName,
      positions: this.selectedItemPositions,
      skillIds: this.selectedOffensiveSkills.map(name => SKILL_ID_BY_NAME[name]).filter(id => id != null),
      bonuses: this.bonusPickers.map(picker => picker.value),
      matchAllBonuses: this.matchAllBonuses,
    });
    this.activeFilteredItem = null;
    this.selectedEquipTarget = null;
    this.itemSearchFirst = 0;
  }

  private clearResults(): void {
    this.filteredItems = [];
    this.itemSearchFirst = 0;
    this.activeFilteredItem = null;
  }
}
