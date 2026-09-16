import { MAX_OPTION_NUMBER } from '../constants/item-option-number.enum';
import { MainModel } from '../models/main.model';
import { createMainModel } from '../utils/create-main-model';
import { normalizeRotation } from './rotation';
import { sanitizeSlotColors } from './slot-colors';

/**
 * Turn a stored build — a share token's sparse delta, the `ro-set` autosave, a named
 * save or an imported replay — into a complete `MainModel`: every field the save does
 * not carry is left at its `createMainModel()` default, and the old storage shapes are
 * migrated.
 *
 * Every restore path goes through this, so a migration written here reaches all of
 * them at once.
 */
export function normalizeSavedModel(savedData: Record<string, any> | null | undefined): MainModel {
  const rawModel = createMainModel();
  if (!savedData) return rawModel;

  // `rawModel` is already a complete sheet of defaults, so a field the save does not
  // carry is simply left alone. Reading the fallback from a second, longer-lived model
  // is what used to hand every build the *same* object for an object-valued default —
  // one build's map would then follow the next one loaded. Leaving the default in place
  // makes it fresh by construction, for objects and arrays alike.
  for (const key of Object.keys(rawModel)) {
    const savedValue = savedData[key];

    if (Array.isArray(rawModel[key])) {
      if (Array.isArray(savedValue)) rawModel[key] = savedValue;
    } else if (savedValue != null) {
      rawModel[key] = savedValue;
    }
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

  // A build saved before rotations existed carries no `rotation` key, arrives as [],
  // and becomes a rotation of one holding its selectedAtkSkill.
  rawModel.rotation = normalizeRotation(rawModel.rotation, rawModel.selectedAtkSkill);

  // Validation, not defaulting: the loop above already restores an absent map. This is
  // the one gate a hand-edited share token passes through, so a slot key the grid does
  // not draw or a colour outside the palette is dropped rather than stored.
  rawModel.slotColors = sanitizeSlotColors(rawModel.slotColors);

  return rawModel;
}
