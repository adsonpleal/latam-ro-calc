// What the target itself takes off the damage, and what to call that step in the formula
// trace. Pure, so the label and the percentage in it can be held to the same table the
// reduction is computed from (see applyAuraReduction in damage-calculator.ts).

import { relieveReductionPercent } from '../constants';
import { formatNumber } from '../utils/format-number';

export interface TargetReductionInput {
  /** The red aura an MVP spawns with, which leaves 0,1% of the damage. */
  isRedAura: boolean;
  /** The Aliviar level the target is under; 0 when it is not casting it. */
  relieveLevel: number;
}

export interface TargetReduction {
  /** What the damage is multiplied by. 1 when the target reduces nothing. */
  multiplier: number;
  /** How much is taken off, as a percentage of the damage. */
  percent: number;
  /** The formula trace's label for the step, naming whichever source produced it. */
  label: string;
}

/** The red aura leaves a thousandth of the damage — https://browiki.org/wiki/MVP. */
const RED_AURA_MULTIPLIER = 0.001;

/**
 * The two reductions a target can apply, and the name the step carries.
 *
 * They multiply, so a red-aura MVP under Aliviar is reduced by both, and the label says so
 * rather than crediting one of them. The percentage is derived from the multiplier rather
 * than written into the string: the trace used to read "Redução de aura (99,9%)" whatever
 * was actually reducing the damage, so Aliviar 5 — half the damage, not 99,9% of it — was
 * reported as the aura's figure.
 */
export function targetReduction(input: TargetReductionInput): TargetReduction {
  const { isRedAura, relieveLevel } = input;
  const relievePercent = relieveReductionPercent(relieveLevel);
  const hasRelieve = relievePercent > 0;

  const multiplier = (isRedAura ? RED_AURA_MULTIPLIER : 1) * ((100 - relievePercent) / 100);
  const percent = (1 - multiplier) * 100;
  const shown = formatNumber(percent, 0, 3);

  if (isRedAura && hasRelieve) return { multiplier, percent, label: `Redução de aura e Aliviar (${shown}%)` };
  if (hasRelieve) return { multiplier, percent, label: `Redução por Aliviar (${shown}%)` };
  if (isRedAura) return { multiplier, percent, label: `Redução de aura (${shown}%)` };

  return { multiplier: 1, percent: 0, label: '' };
}
