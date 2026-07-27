/**
 * Preset → MainModel, ported from `RoCalculatorComponent#setModelByJSONString`.
 *
 * A share token carries only the fields that differ from the defaults, so the merge
 * over `createMainModel()` is what restores the rest. Anything that drifts from the
 * component here produces a build the website would load differently from the same link.
 */
import { MAX_OPTION_NUMBER } from 'src/app/constants/item-option-number.enum';
import { MainModel } from 'src/app/models/main.model';
import { createMainModel } from 'src/app/utils';

/** Special Pharmacy grants a consumable that the preset doesn't carry explicitly. */
const PHARMACY_CONSUMABLE_BY_LEVEL: Record<number, number> = { 2: 100232, 3: 100233 };

/**
 * Merge a sparse preset over the model defaults, exactly as the app does on load.
 * `savedValue ?? initialValue` means an omitted field falls back to its default, and
 * an array field that isn't an array is replaced with an empty one.
 */
export function applyPreset(saved: Record<string, any> | null | undefined): MainModel {
  const model = createMainModel() as any;
  if (!saved) return model as MainModel;

  const defaults = createMainModel() as any;
  for (const [key, initialValue] of Object.entries(defaults)) {
    const savedValue = saved[key];
    model[key] = Array.isArray(initialValue) ? (Array.isArray(savedValue) ? savedValue : []) : savedValue ?? initialValue;
  }

  // Random-option slots were renumbered once; old tokens still carry 51..56.
  const rawOptionTxts: string[] = [];
  for (let i = 0; i <= MAX_OPTION_NUMBER; i++) {
    if (model.rawOptionTxts[i]) rawOptionTxts[i] = model.rawOptionTxts[i];
  }
  for (let i = 51; i <= 56; i++) {
    if (model.rawOptionTxts[i]) rawOptionTxts[i - 31] = model.rawOptionTxts[i];
  }
  model.rawOptionTxts = rawOptionTxts;

  const pharmacy = PHARMACY_CONSUMABLE_BY_LEVEL[model?.skillBuffMap?.['Special Pharmacy']];
  if (pharmacy && Array.isArray(model.consumables) && !model.consumables.includes(pharmacy)) {
    model.consumables.push(pharmacy);
  }

  return model as MainModel;
}
