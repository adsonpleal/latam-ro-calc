import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { createBonusNameList, prettyItemDesc } from '../../../../utils';
import { DropdownModel } from '../../../../models/dropdown.model';
import { ItemModel } from '../../../../models/item.model';
import { Observable, Subject, Subscription, debounceTime, tap } from 'rxjs';
import { LayoutService } from '../../../service/app.layout.service';
import { ItemShopService } from '../item-shop.service';

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

@Component({
  selector: 'app-item-search',
  templateUrl: './item-search.component.html',
  styleUrls: ['../ro-calculator.component.css', './item-search.component.css'],
})
export class ItemSearchComponent implements OnInit, OnDestroy {
  @Input({ required: true }) items!: Record<number, ItemModel>;
  @Input({ required: true }) selectedCharacter: any;
  /** pt-BR class name for the dialog title; falls back to the English className. */
  @Input() className = '';
  @Input({ required: true }) equipableItems: (DropdownModel & { id: number; position: string })[];
  @Input({ required: true }) offensiveSkills: DropdownModel[] = [];
  @Input({ required: true }) onClassChanged: Observable<boolean>;

  private subscription: Subscription;
  private subscription2: Subscription;
  private subscription3: Subscription;

  private selectItemSource = new Subject<number>();
  private onSelectItemChange$ = this.selectItemSource.asObservable();

  constructor(
    private layoutService: LayoutService,
    private readonly itemShop: ItemShopService,
  ) {}

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
        label: 'Esquiva perfeita',
        value: 'perfectDodge',
      },
      {
        label: 'Redução de Recarga',
        value: 'cd__',
      },
    );

    this.subscription = this.onClassChanged.subscribe(() => {
      this.clearItemSearch();
    });
    this.subscription2 = this.onSelectItemChange$
      .pipe(
        tap(() => (this.seletedItemId = null)),
        debounceTime(50),
      )
      .subscribe((itemId) => {
        this.seletedItemId = itemId;
      });
    // The "Itens" trigger now lives in the global topbar; open the dialog on its signal.
    this.subscription3 = this.layoutService.itemSearchOpen$.subscribe(() => this.showSearchDialog());
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
    for (const equipableItem of this.equipableItems) {
      const item = this.items[equipableItem.value] as ItemModel;
      if (!item?.script) {
        console.log('No Script', { item, equipableItem });
        continue;
      }
      if (selectedPositions.size > 0 && !selectedPositions.has(equipableItem.position)) continue;
      let isFoundCD = false;
      if (this.selectedOffensiveSkills?.length > 0) {
        if (isIncludeCdReduction) {
          isFoundCD = this.selectedOffensiveSkills.some((skillName) => item.script[`cd__${skillName}`]);
        } else {
          const found = this.selectedOffensiveSkills.some(
            (skillName) =>
              item.script[skillName] ||
              item.script[`chance__${skillName}`] ||
              item.script[`cd__${skillName}`] ||
              item.script[`vct__${skillName}`] ||
              item.script[`fct__${skillName}`] ||
              item.script[`fix_vct__${skillName}`],
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

    this.activeFilteredItemDesc = prettyItemDesc(this.items[this.activeFilteredItem?.id]?.description);
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
