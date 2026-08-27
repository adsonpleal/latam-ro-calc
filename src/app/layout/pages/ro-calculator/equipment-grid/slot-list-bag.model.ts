import { DropdownModel } from 'src/app/models/dropdown.model';

/**
 * The option lists the cards read, indexed by the names the descriptors carry
 * (`weaponList`, `accLeftCardList`, `costumeEnhGarment2List`, …).
 *
 * RoCalculatorComponent already builds every one of these in setItemList /
 * setItemDropdownList / setAmmoDropdownList, so the grid takes the component itself as
 * the bag rather than copying forty fields across an @Input boundary.
 */
export interface SlotListBag {
  [listKey: string]: any;

  refineList: DropdownModel[];
  shadowRefineList: DropdownModel[];
  ammoList: DropdownModel[];
  propertyAtkList: DropdownModel[];
  petLoyaltyList: { label: string; value: string }[];
  /** The Bônus Aleatório tree (createExtraOptionList). */
  optionList: any[];
}
