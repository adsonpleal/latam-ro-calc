import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { EquipmentSlotDescriptor, comparableKeysOf } from 'src/app/app-config/equipment-slots';
import { ItemDescriptionStore } from 'src/app/api-services/item-description.store';
import { Chip, buildChipRows } from 'src/app/core/equipment-chips';
import { SlotDerivation } from 'src/app/core/equipment-slot-derivation';
import { ItemTypeEnum } from 'src/app/constants/item-type.enum';
import { PetLoyalty } from 'src/app/constants/pet-loyalty';
import { DropdownModel } from 'src/app/models/dropdown.model';
import { ItemModel } from 'src/app/models/item.model';
import { ExtraOptionMap } from 'src/app/utils/create-extra-option-list';
import { getGradeList } from 'src/app/utils/to-grade-list';
import { PickerRequest } from '../item-picker/item-picker.model';
import { ItemPickerService } from '../item-picker/item-picker.service';
import { ChipView } from './chip-view.model';
import { SlotListBag } from './slot-list-bag.model';

/** What a chip click asks the grid to write. `value` of null means the field was cleared. */
export interface ChipPick {
  chip: Chip;
  value: string | number | null;
  compare: boolean;
}

/** Lealdade has no element of its own; the tiers replace one another, so the scale reads high → low. */
const LOYALTY_CLASS: Record<string, string> = {
  [PetLoyalty.Alta]: 'loyalty_alta',
  [PetLoyalty.Normal]: 'loyalty_normal',
  [PetLoyalty.Nenhuma]: 'loyalty_nenhuma',
  [PetLoyalty.Baixa]: 'loyalty_baixa',
};

@Component({
  selector: 'app-equipment-slot-card',
  templateUrl: './equipment-slot-card.component.html',
  styleUrls: ['./equipment-slot-card.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentSlotCardComponent implements OnChanges {
  @Input({ required: true }) descriptor!: EquipmentSlotDescriptor;
  @Input({ required: true }) items!: Record<number, ItemModel>;
  @Input({ required: true }) lists!: SlotListBag;
  @Input({ required: true }) model!: Record<string, any>;
  @Input({ required: true }) model2!: Record<string, any>;
  /** Reconciled by the grid, so a rescued enchant shows up here too. */
  @Input({ required: true }) derivation!: SlotDerivation;
  @Input({ required: true }) compareDerivation!: SlotDerivation;
  /** Name of the multi-slot head gear that already fills this position, if any. */
  @Input() occupiedBy: string | null = null;
  /** Slot keys currently in the comparison. */
  @Input() comparing: ReadonlySet<string> = new Set();
  /** False when the class or the weapon takes no ammo. */
  @Input() showAmmo = false;
  /** Bumped by the grid to re-run the view build; the model object never changes identity. */
  @Input() revision = 0;

  @Output() readonly pickField = new EventEmitter<ChipPick>();
  @Output() readonly clearSlot = new EventEmitter<void>();
  @Output() readonly toggleCompare = new EventEmitter<void>();

  mainRows: ChipView[][] = [];
  compareRows: ChipView[][] = [];
  comparable = false;
  comparingHere = false;

  constructor(
    private readonly picker: ItemPickerService,
    private readonly cdr: ChangeDetectorRef,
    public readonly itemDescriptions: ItemDescriptionStore,
  ) {}

  ngOnChanges(): void {
    this.comparable = comparableKeysOf(this.descriptor).length > 0;
    this.comparingHere = comparableKeysOf(this.descriptor).some((key) => this.comparing.has(key));

    this.mainRows = this.buildRows(this.model, this.derivation, false);
    this.compareRows = this.comparingHere ? this.buildRows(this.model2, this.compareDerivation, true) : [];
    this.cdr.markForCheck();
  }

  /** The item this card is holding, for the big icon and the header badge. */
  get item(): ItemModel | undefined {
    return this.items?.[this.model?.[this.descriptor.key]];
  }

  get compareItem(): ItemModel | undefined {
    return this.items?.[this.model2?.[this.descriptor.key]];
  }

  get compareTitle(): string {
    return this.occupiedBy
      ? `Comparação indisponível: este espaço está ocupado por ${this.occupiedBy}, que é usado em outro slot. Compare no slot que carrega o item.`
      : 'Ligar ou desligar a comparação deste slot';
  }

  onToggleCompare(): void {
    if (this.occupiedBy) return;
    this.toggleCompare.emit();
  }

  onIconError(event: Event): void {
    (event.target as HTMLElement).style.display = 'none';
  }

  onChipClear(view: ChipView, compare: boolean): void {
    this.pickField.emit({ chip: view.chip, value: null, compare });
  }

  onChipPick(view: ChipView, anchor: HTMLElement, compare: boolean): void {
    const request = this.pickerRequest(view.chip, anchor, compare);
    if (!request) return;

    this.picker.open(request).subscribe((result) => {
      if (!result.committed) return;
      this.pickField.emit({ chip: view.chip, value: result.value ?? null, compare });
    });
  }

  // ── view building ────────────────────────────────────────────────────────────

  private buildRows(model: Record<string, any>, derivation: SlotDerivation, compare: boolean): ChipView[][] {
    const rows = buildChipRows(this.descriptor, model, derivation, {
      variant: compare ? 'compare' : 'main',
      comparing: this.comparing,
      showAmmo: this.showAmmo,
    });

    return rows.map((row) => row.map((chip) => this.toView(chip, model)));
  }

  private toView(chip: Chip, model: Record<string, any>): ChipView {
    const raw = chip.kind === 'option' ? model?.['rawOptionTxts']?.[chip.optionIndex!] : model?.[chip.field!];
    const empty: ChipView = {
      chip,
      text: chip.placeholder,
      filled: false,
      icon: null,
      elementClass: null,
      descId: null,
      primary: !!chip.primary,
      preRelease: false,
    };

    if (raw == null || raw === '') return empty;

    switch (chip.kind) {
      case 'item':
      case 'subItem':
      case 'card':
      case 'enchant':
      case 'ammo': {
        const item = this.items?.[raw as number];
        if (!item) return empty;
        return {
          ...empty,
          text: itemChipLabel(item),
          filled: true,
          icon: item.id,
          descId: item.id,
          preRelease: !!item.preRelease,
          // Ammo carries an element of its own and the old picker coloured it.
          elementClass: chip.kind === 'ammo' ? elementClassOf(this.lists.ammoList, raw) : null,
        };
      }
      case 'refine': {
        // 0 is a value, not a choice — it reads as the placeholder so the ✕ only shows
        // up once there is a refine worth clearing.
        const refine = Number(raw) || 0;
        return refine > 0 ? { ...empty, text: `+ ${refine}`, filled: true } : empty;
      }
      case 'grade': {
        const grade = GRADE_LABELS.get(String(raw)) ?? `Grau ${raw}`;
        return { ...empty, text: grade, filled: true };
      }
      case 'loyalty': {
        const option = this.lists.petLoyaltyList?.find((o) => o.value === raw);
        return { ...empty, text: option?.label ?? String(raw), filled: true, elementClass: LOYALTY_CLASS[String(raw)] ?? null };
      }
      case 'converter': {
        const option = this.lists.propertyAtkList?.find((o) => o.value === raw);
        if (!option) return empty;
        return { ...empty, text: option.label, filled: true, icon: option['img'], elementClass: `property_${option['element']}` };
      }
      case 'option':
        return { ...empty, text: ExtraOptionMap.get(String(raw)) ?? String(raw), filled: true };
      default:
        return empty;
    }
  }

  // ── picker wiring ────────────────────────────────────────────────────────────

  private pickerRequest(chip: Chip, anchor: HTMLElement, compare: boolean): PickerRequest | null {
    const model = compare ? this.model2 : this.model;
    const derivation = compare ? this.compareDerivation : this.derivation;
    const value = chip.kind === 'option' ? model?.['rawOptionTxts']?.[chip.optionIndex!] : model?.[chip.field!];
    const base = { anchor, title: this.pickerTitle(chip), value };

    switch (chip.kind) {
      case 'item':
        return { ...base, mode: 'flat', options: this.lists[this.descriptor.itemListKey] ?? [], filterKeys: ITEM_KEYS, iconKey: 'value', items: this.items };
      case 'subItem': {
        const sub = this.descriptor.subItemSlots?.find((s) => s.key === chip.slotKey);
        return { ...base, mode: 'flat', options: this.lists[sub?.itemListKey ?? ''] ?? [], filterKeys: ITEM_KEYS, iconKey: 'value', items: this.items };
      }
      case 'card':
        // The acc-side prefix ("Dir."/"Esq.") is only reachable through cardPrefix.
        return { ...base, mode: 'flat', options: this.lists[this.descriptor.cardListKey ?? ''] ?? [], filterKeys: CARD_KEYS, iconKey: 'value', items: this.items };
      case 'enchant':
        return { ...base, mode: 'flat', options: derivation.enchantLists[chip.index] ?? [], filterKeys: ITEM_KEYS, iconKey: 'value', items: this.items };
      case 'ammo':
        return { ...base, mode: 'flat', options: this.lists.ammoList ?? [], filterKeys: ITEM_KEYS, iconKey: 'value', elementColoured: true, items: this.items };
      case 'refine':
        return { ...base, mode: 'flat', options: refineOptions(derivation.refineList), filterKeys: ['label'] };
      case 'grade':
        return { ...base, mode: 'flat', options: derivation.gradeList, filterKeys: ['label'] };
      case 'loyalty':
        return { ...base, mode: 'flat', options: this.lists.petLoyaltyList ?? [], filterKeys: ['label'] };
      case 'converter':
        return { ...base, mode: 'flat', options: this.lists.propertyAtkList ?? [], filterKeys: ['label'], iconKey: 'img', elementColoured: true };
      case 'option':
        return { ...base, mode: 'tree', roots: this.lists.optionList ?? [], leafIndex: ExtraOptionMap };
      default:
        return null;
    }
  }

  private pickerTitle(chip: Chip): string {
    switch (chip.kind) {
      case 'item':
        return this.descriptor.key === ItemTypeEnum.pet ? 'Selecionar ovo' : `Selecionar ${this.descriptor.label}`;
      case 'refine':
        return 'Refino';
      case 'grade':
        return 'Grau';
      case 'loyalty':
        return 'Lealdade do pet';
      case 'converter':
        return 'Conversor de elemento';
      case 'ammo':
        return 'Munição';
      default:
        return chip.placeholder;
    }
  }
}

const GRADE_LABELS = new Map(getGradeList().map((option) => [String(option.value), option.label]));

const ITEM_KEYS = ['label', 'value'];
const CARD_KEYS = ['label', 'cardPrefix', 'value'];

/**
 * Same label the pickers show: the pt-BR names drop the "[N]" socket suffix the game
 * displays, so a 0-slot and a 1-slot version would otherwise read identically.
 */
function itemChipLabel(item: ItemModel): string {
  return item.slots > 0 && !/\[\d+\]$/.test(item.name) ? `${item.name} [${item.slots}]` : item.name;
}

function elementClassOf(list: DropdownModel[] | undefined, value: string | number): string | null {
  const element = list?.find((o) => o.value === value)?.element;
  return element ? `property_${element}` : null;
}

function refineOptions(list: DropdownModel[]): DropdownModel[] {
  return list.map((option) => ({ label: `+ ${option.value}`, value: option.value }));
}
