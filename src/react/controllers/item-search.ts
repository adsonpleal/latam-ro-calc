import { ViewState } from '../state/view-state';
import { Events, Disposable, listenDebounced } from '../services/events';
import { createBonusNameList, prettyItemDesc } from '../../app/utils';
import { DropdownModel } from '../../app/models/dropdown.model';
import { ItemModel } from '../../app/models/item.model';
import { CalculatorLayout as LayoutService } from '../services/calculator-services';
import { ItemShop as ItemShopService } from '../services/calculator-services';
import { SKILL_ID_BY_NAME } from 'src/app/skills';
import { DescriptionStore as ItemDescriptionStore } from '../services/data-client';

const positions: DropdownModel[] = [
  { value: 'weaponList', label: 'Arma' },
  { value: 'weaponCardList', label: 'Carta de Arma' },

  { value: 'shieldList', label: 'Escudo' },
  { value: 'shieldCardList', label: 'Carta de Escudo' },

  { value: 'headUpperList', label: 'Topo' },
  { value: 'headMiddleList', label: 'Meio' },
  { value: 'headLowerList', label: 'Baixo' },
  { value: 'headCardList', label: 'Carta de Cabeça' },

  { value: 'enchants', label: 'Pedra de Encantamento' },

  { value: 'armorList', label: 'Armadura' },
  { value: 'armorCardList', label: 'Carta de Armadura' },
  { value: 'garmentList', label: 'Capa' },
  { value: 'garmentCardList', label: 'Carta de Capa' },
  { value: 'bootList', label: 'Botas' },
  { value: 'bootCardList', label: 'Carta de Botas' },
  { value: 'accList', label: 'Acessório' },
  { value: 'accCardList', label: 'Carta de Acessório' },

  { value: 'petList', label: 'Pet' },

  { value: 'costumeList', label: 'Visual' },

  { value: 'shadowWeaponList', label: 'Arma Sombria' },
  { value: 'shadowArmorList', label: 'Armadura Sombria' },
  { value: 'shadowShieldList', label: 'Escudo Sombrio' },
  { value: 'shadowBootList', label: 'Botas Sombrias' },
  { value: 'shadowEarringList', label: 'Brinco Sombrio' },
  { value: 'shadowPendantList', label: 'Pingente Sombrio' },
];


export class ItemSearchComponent extends ViewState {
   items!: Record<number, ItemModel>;
   selectedCharacter: any;
  /** pt-BR class name for the dialog title; falls back to the English className. */
   className = '';
   equipableItems: (DropdownModel & { id: number; position: string })[];
   offensiveSkills: DropdownModel[] = [];
   onClassChanged: Events<boolean>;

  private subscription: Disposable;
  private subscription2: Disposable;
  private subscription3: Disposable;

  private selectItemSource = new Events<number>();
  private onSelectItemChange$ = this.selectItemSource;

  constructor(
    private layoutService: LayoutService,
    private readonly itemShop: ItemShopService,
    private readonly itemDescriptions: ItemDescriptionStore,
  ) { super();}

  // Shop server selector (shared state with the "Descrições dos Itens" section).
  get shopServerOptions() {
    return this.itemShop.serverOptions;
  }
  get selectedShopServer(): string {
    return this.itemShop.server;
  }
  set selectedShopServer(value: string) {
    this.itemShop.server = value;
  }

  /** Divine Pride database page for the currently inspected item. */
  get divinePrideItemUrl(): string {
    return this.itemShop.divinePrideItemUrl(this.activeFilteredItem?.id);
  }

  /** GnJoy LATAM market (buy orders) search for the inspected item on the selected server. */
  get marketItemUrl(): string {
    return this.itemShop.marketItemUrl(this.items[this.activeFilteredItem?.id]?.name);
  }

  isShowSearchDialog = false;
  itemPositionOptions = positions;
  selectedItemPositions: string[] = [];
  itemSearchFirst = 0;
  totalFilteredItems = 0;

  bonusNameList = createBonusNameList() as any[];
  selectedBonus: string[] = [];

  filteredItems: DropdownModel[] = [];
  isSerchMatchAllBonus = true;
  selectedFilteredItem: string;
  activeFilteredItemDesc: string;
  activeFilteredItem: (typeof this.equipableItems)[0];
  seletedItemId = 0;

  selectedOffensiveSkills: string[] = [];

  ngOnInit(): void {
    this.bonusNameList.push(
      {
        label: 'Conj. Fixa',
        value: 'fct',
      },
      {
        label: 'Esquiva Perfeita',
        value: 'perfectDodge',
      },
      {
        label: 'Redução de Recarga',
        value: 'cd__',
      },
    );

    this.subscription = this.onClassChanged.subscribe(() => {
      this.clearItemSearch(); this.publish();
    });
    this.subscription2 = listenDebounced(this.onSelectItemChange$, 50, (itemId) => { this.seletedItemId = itemId; this.publish(); }, () => { this.seletedItemId = null; this.publish(); });
    // The "Itens" trigger now lives in the global topbar; open the dialog on its signal.
    this.subscription3 = this.layoutService.itemSearchOpen.subscribe(() => this.action(() => this.showSearchDialog()));
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    this.subscription2?.unsubscribe();
    this.subscription3?.unsubscribe();
  }

  onItemSearchFilterChange() {
    let isIncludeCdReduction = false;
    const selectedBonus = [
      ...this.selectedBonus.filter(Boolean).filter((v) => {
        if (v === 'cd__') {
          isIncludeCdReduction = true;
          return false;
        }

        return true;
      }),
    ];
    const selectedPositions = new Set([...(this.selectedItemPositions || []).filter(Boolean)]);

    const displayItems = [];
    // A head gear that fills several slots is registered once per slot, so it would show
    // up two or three times in an unfiltered search. Listing it once is enough — the
    // position filter still works, because only matching entries get this far.
    const alreadyListed = new Set<number>();
    for (const equipableItem of this.equipableItems) {
      const item = this.items[equipableItem.value] as ItemModel;
      if (!item?.script) {
        console.log('No Script', { item, equipableItem });
        continue;
      }
      if (selectedPositions.size > 0 && !selectedPositions.has(equipableItem.position)) continue;
      // Checked after the position filter, so filtering by "Baixo" still surfaces a
      // Middle+Lower mask, and before the bonus matching below, so the ~200 duplicate
      // entries skip the whole body instead of being built and thrown away at the push.
      if (alreadyListed.has(equipableItem.id)) continue;
      let isFoundCD = false;
      if (this.selectedOffensiveSkills?.length > 0) {
        // item.script keys skill bonuses by id; selected skills are names.
        const skillIds = this.selectedOffensiveSkills.map((skillName) => SKILL_ID_BY_NAME[skillName]);
        if (isIncludeCdReduction) {
          isFoundCD = skillIds.some((id) => item.script[`cd__${id}`]);
        } else {
          const found = skillIds.some(
            (id) =>
              item.script[`${id}`] ||
              item.script[`chance__${id}`] ||
              item.script[`cd__${id}`] ||
              item.script[`vct__${id}`] ||
              item.script[`fct__${id}`] ||
              item.script[`fix_vct__${id}`],
          );
          if (!found) continue;
        }
      }

      let foundBonus = false;
      if (isIncludeCdReduction) {
        foundBonus =
          this.isSerchMatchAllBonus || selectedBonus.length === 0
            ? isFoundCD && selectedBonus.every((bonus) => item.script[bonus])
            : isFoundCD || selectedBonus.some((bonus) => item.script[bonus]);
      } else {
        foundBonus =
          this.isSerchMatchAllBonus || selectedBonus.length === 1
            ? selectedBonus.every((bonus) => item.script[bonus])
            : selectedBonus.some((bonus) => item.script[bonus]);
      }

      // const foundBonus =
      //   this.isSerchMatchAllBonus || selectedBonus.length === 1 || (selectedBonus.length === 0 && isIncludeCdReduction)
      //     ? isFoundCD && selectedBonus.every((bonus) => item.script[bonus])
      //     : isFoundCD || selectedBonus.length === 0 || selectedBonus.some((bonus) => item.script[bonus]);
      if (foundBonus) {
        alreadyListed.add(equipableItem.id);
        displayItems.push(equipableItem);
      }
    }
    this.totalFilteredItems = displayItems.length;
    this.filteredItems = displayItems;
    this.activeFilteredItem = undefined;
    this.activeFilteredItemDesc = undefined;
    this.selectItemSource.next(null);
    setTimeout(() => {
      this.itemSearchFirst = 0;
    }, 10);
  }

  onSelectFilteredItem(item: any) {
    // console.log({ item, activeFilteredItemID: this.activeFilteredItemID });
    // console.log({ item });
    this.selectItemSource.next((item as (typeof this.equipableItems)[0]).value as number);

    // The search filter reads item.script, not the description — searching works even
    // before items-desc arrives; only this preview stays empty until then.
    this.activeFilteredItemDesc = prettyItemDesc(this.itemDescriptions.get(this.activeFilteredItem?.id));
  }

  private clearItemSearch() {
    this.filteredItems = [];
    this.selectedOffensiveSkills = [];
    this.totalFilteredItems = 0;
    this.itemSearchFirst = 0;
    this.selectedFilteredItem = undefined;
    this.activeFilteredItem = undefined;
    this.activeFilteredItemDesc = undefined;
  }

  showSearchDialog() {
    this.isShowSearchDialog = true;
  }
}
