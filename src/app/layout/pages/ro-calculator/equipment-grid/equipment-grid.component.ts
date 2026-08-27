import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import {
  EQUIPMENT_SLOTS,
  EquipmentSlotDescriptor,
  SLOT_GROUP_LABELS,
  SlotGroup,
  comparableKeysOf,
} from 'src/app/app-config/equipment-slots';
import { ItemTypeEnum, MainItemWithRelations } from 'src/app/constants/item-type.enum';
import { itemSlotLabelPtBr } from 'src/app/constants/item-slot-i18n';
import { Chip } from 'src/app/core/equipment-chips';
import { SlotDerivation, cardsToClear, deriveSlot, reconcileEnchants } from 'src/app/core/equipment-slot-derivation';
import { ItemModel } from 'src/app/models/item.model';
import { ChipPick } from './equipment-slot-card.component';
import { SlotListBag } from './slot-list-bag.model';

/** What the host needs to run onSelectItem — the same three arguments it always took. */
export interface SelectItemEvent {
  itemType: string;
  itemId: number | null;
  refine: number;
}

export interface SelectGradeEvent {
  itemType: string;
  itemId: number | null;
  grade: string | null;
}

interface RenderedGroup {
  label: string;
  slots: EquipmentSlotDescriptor[];
}

/**
 * The equipment picker.
 *
 * One tag in place of the ~1200 lines of markup that used to write every slot out twice,
 * once for the build and once for the comparison. What it owns is the translation between
 * a chip and the host's handlers: the emitted sequences have to match what the old
 * `p-dropdown`s produced, or the debounced buses, the head-slot occupancy rule, the clear
 * cascade and the compare pipeline all start to disagree with the numbers.
 *
 * Layout follows the mock: an Equipamento column, then Visuais / Sombrios / Pet, in a grid
 * that folds to a single column when the left pane is narrow.
 */
@Component({
  selector: 'app-equipment-grid',
  templateUrl: './equipment-grid.component.html',
  styleUrls: ['./equipment-grid.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentGridComponent implements OnChanges {
  @Input({ required: true }) items!: Record<number, ItemModel>;
  @Input({ required: true }) mapEnchant!: Map<string, ItemModel>;
  @Input({ required: true }) model!: Record<string, any>;
  @Input({ required: true }) model2!: Record<string, any>;
  @Input({ required: true }) lists!: SlotListBag;
  /** The host's array, mutated in place — it stays the single source of truth. */
  @Input() compareItemNames: string[] = [];
  /** Which comparisons the compare pipeline is actually honouring. */
  @Input() showCompareItemMap: Record<string, boolean> = {};
  @Input() headSlotOccupiedBy: Partial<Record<ItemTypeEnum, string>> = {};
  @Input() hiddenMap: { ammu: boolean; shield: boolean } = { ammu: true, shield: true };
  @Input() isLeftWeaponShown = false;
  /**
   * Bumped by the host at the end of each debounced pass. The models are mutated in place,
   * so nothing else tells the cards that a preset, a replay import or a share link landed.
   */
  @Input() revision = 0;

  @Output() readonly selectItem = new EventEmitter<SelectItemEvent>();
  @Output() readonly clearItem = new EventEmitter<string>();
  @Output() readonly selectGrade = new EventEmitter<SelectGradeEvent>();
  @Output() readonly optionChange = new EventEmitter<void>();
  @Output() readonly propertyAtkChange = new EventEmitter<void>();
  @Output() readonly compareItemChange = new EventEmitter<void>();
  @Output() readonly compareSlotsChange = new EventEmitter<boolean>();

  /** Column 1 is the gear; column 2 stacks the rest, as in the mock. */
  columns: RenderedGroup[][] = [];
  derivations: Record<string, SlotDerivation> = {};
  compareDerivations: Record<string, SlotDerivation> = {};
  comparing: ReadonlySet<string> = new Set();
  /** Own counter, so a write made here reaches the OnPush cards without waiting for the bus. */
  cardRevision = 0;

  constructor(private readonly cdr: ChangeDetectorRef) {}

  ngOnChanges(): void {
    // Anything arriving from outside is a load, not a pick: an enchant the kRO-derived
    // table does not list has to survive it.
    this.refresh(null);
  }

  get compareCount(): number {
    return this.comparing.size;
  }

  get ribbonText(): string {
    return this.compareCount === 1 ? '1 slot em comparação' : `${this.compareCount} slots em comparação`;
  }

  get ribbonTitle(): string {
    if (!this.compareCount) return 'Nenhum slot em comparação.';
    return [...this.comparing].map((key) => itemSlotLabelPtBr(key)).join('\n');
  }

  occupiedBy(slot: EquipmentSlotDescriptor): string | null {
    return slot.headSlot ? (this.headSlotOccupiedBy?.[slot.key] ?? null) : null;
  }

  trackSlot = (_: number, slot: EquipmentSlotDescriptor) => slot.key;

  // ── compare ──────────────────────────────────────────────────────────────────

  onToggleCompare(slot: EquipmentSlotDescriptor): void {
    const keys = comparableKeysOf(slot);
    const isOn = keys.some((key) => this.compareItemNames.includes(key));

    if (isOn) {
      for (const key of keys) {
        const at = this.compareItemNames.indexOf(key);
        if (at >= 0) this.compareItemNames.splice(at, 1);
      }
    } else {
      for (const key of keys) {
        if (!this.compareItemNames.includes(key)) this.compareItemNames.push(key);
      }
    }

    this.compareSlotsChange.emit(false);
    this.refresh(null);
  }

  onClearComparison(): void {
    // The host empties the array itself when told to clear, exactly as the old
    // multiselect's (onClear) did.
    this.compareSlotsChange.emit(true);
    this.refresh(null);
  }

  // ── the event translation table ──────────────────────────────────────────────

  onPickField({ chip, value, compare }: ChipPick): void {
    const model = compare ? this.model2 : this.model;
    const slot = chip.slotKey;

    switch (chip.kind) {
      case 'item':
      case 'subItem': {
        // The refine travels with the item: onSelectItem has always been handed the
        // refine the slot is already wearing.
        const refine = Number(model[`${slot}Refine`]) || 0;
        model[slot] = value ?? undefined;
        if (!compare) {
          this.selectItem.emit({ itemType: slot, itemId: (value as number) ?? null, refine });
          // A slot with no related fields has nothing to cascade, and never bound the
          // clear event in the first place (costume visuals, costume enchants, the pet).
          if (value == null && (MainItemWithRelations[slot as ItemTypeEnum] ?? []).length) this.clearItem.emit(slot);
        }
        break;
      }
      case 'card':
      case 'enchant': {
        model[chip.field!] = value ?? undefined;
        if (!compare) this.selectItem.emit({ itemType: chip.field!, itemId: (value as number) ?? null, refine: 0 });
        break;
      }
      case 'refine': {
        const refine = Number(value) || 0;
        model[chip.field!] = refine;
        if (!compare) this.selectItem.emit({ itemType: chip.field!, itemId: model[slot] ?? null, refine });
        break;
      }
      case 'grade': {
        const grade = (value as string) ?? '';
        model[chip.field!] = grade;
        if (!compare) this.selectGrade.emit({ itemType: slot, itemId: model[slot] ?? null, grade });
        break;
      }
      case 'ammo': {
        model[chip.field!] = value ?? undefined;
        if (!compare) this.selectItem.emit({ itemType: ItemTypeEnum.ammo, itemId: (value as number) ?? null, refine: 0 });
        break;
      }
      case 'converter': {
        model[chip.field!] = value ?? undefined;
        if (!compare) this.propertyAtkChange.emit();
        break;
      }
      case 'loyalty': {
        model[chip.field!] = value ?? undefined;
        if (!compare) this.optionChange.emit();
        break;
      }
      case 'option': {
        model['rawOptionTxts'][chip.optionIndex!] = value ?? undefined;
        if (!compare) this.optionChange.emit();
        break;
      }
    }

    if (compare) this.compareItemChange.emit();

    // Only the slot the player just touched counts as hand-picked: an enchant that is no
    // longer valid for the new item must clear rather than be rescued.
    this.refresh(chip.kind === 'item' || chip.kind === 'subItem' ? slot : null);
  }

  /** The ✕ in the card header — the same thing as clearing the item chip. */
  onClearSlot(slot: EquipmentSlotDescriptor): void {
    const chip = { kind: 'item', slotKey: slot.key, field: slot.key, index: 0, placeholder: slot.label } as Chip;
    this.onPickField({ chip, value: null, compare: false });
  }

  // ── derivation and reconciliation ────────────────────────────────────────────

  /**
   * Recomputes what every slot offers and settles the values that no longer fit.
   *
   * `handPicked` names the slot whose item the player just chose; everywhere else counts
   * as hydration, where an enchant the table omits is surfaced instead of wiped.
   */
  private refresh(handPicked: string | null): void {
    this.comparing = new Set(this.compareItemNames.filter((key) => this.showCompareItemMap?.[key] !== false));

    const derivations: Record<string, SlotDerivation> = {};
    const compareDerivations: Record<string, SlotDerivation> = {};

    for (const slot of EQUIPMENT_SLOTS) {
      derivations[slot.key] = this.deriveAndSettle(slot, this.model, slot.key !== handPicked, false);
      compareDerivations[slot.key] = this.deriveAndSettle(slot, this.model2, slot.key !== handPicked, true);
    }

    this.derivations = derivations;
    this.compareDerivations = compareDerivations;
    this.columns = buildColumns(this.visibleSlots());
    this.cardRevision += 1;
    this.cdr.markForCheck();
  }

  private deriveAndSettle(
    slot: EquipmentSlotDescriptor,
    model: Record<string, any>,
    isHydration: boolean,
    compare: boolean,
  ): SlotDerivation {
    const itemId = model?.[slot.key];
    const derivation = deriveSlot({
      descriptor: slot,
      item: this.items?.[itemId],
      mapEnchant: this.mapEnchant ?? new Map(),
      refineList: this.lists?.refineList ?? [],
      shadowRefineList: this.lists?.shadowRefineList ?? [],
    });

    const { lists, clear } = reconcileEnchants({
      enchantLists: derivation.enchantLists,
      current: slot.enchantFields.map((field) => (field ? model?.[field] : undefined)),
      hasItem: !!itemId,
      items: this.items,
      mapEnchant: this.mapEnchant,
      isHydration,
    });
    derivation.enchantLists = lists;

    for (const index of clear) {
      const field = slot.enchantFields[index]!;
      model[field] = undefined;
      // The old picker routed this through onSelectItem, which emitted with a zeroed id.
      if (!compare) this.selectItem.emit({ itemType: field, itemId: 0, refine: 0 });
    }

    // A socket the new item does not have: the old picker emitted only the two-way
    // binding here, leaving the item change already in flight to notify the bus.
    for (const index of cardsToClear(derivation.cardSlots, slot.cardFields.map((field) => model?.[field]))) {
      model[slot.cardFields[index]] = undefined;
    }

    const gradeField = `${slot.key}Grade`;
    if (slot.grade && !derivation.gradeList.length && model?.[gradeField]) {
      model[gradeField] = null;
      if (!compare) this.selectGrade.emit({ itemType: slot.key, itemId: itemId ?? null, grade: null });
    }

    // A non-refinable accessory cannot keep the refine the previous one had.
    const refineField = `${slot.key}Refine`;
    if (slot.refine === 'accessory' && !derivation.refineList.length && model?.[refineField] > 0) {
      model[refineField] = 0;
    }

    return derivation;
  }

  private visibleSlots(): EquipmentSlotDescriptor[] {
    return EQUIPMENT_SLOTS.filter((slot) => {
      switch (slot.visibility) {
        case 'leftWeapon':
          return this.isLeftWeaponShown;
        case 'shield':
          return !!this.model?.['weapon'] && !this.hiddenMap?.shield && !this.model?.['leftWeapon'];
        default:
          return true;
      }
    });
  }
}

const COLUMN_GROUPS: SlotGroup[][] = [['equip'], ['costume', 'shadow', 'pet']];

function buildColumns(slots: EquipmentSlotDescriptor[]): RenderedGroup[][] {
  return COLUMN_GROUPS.map((groups) =>
    groups
      .map((group) => ({ label: SLOT_GROUP_LABELS[group], slots: slots.filter((slot) => slot.group === group) }))
      .filter((group) => group.slots.length > 0),
  );
}
