import { ActiveSkillModel } from '../../jobs/_character-base.abstract';
import { genSkillList } from '../../utils/gen-skill-list';

/**
 * Concentrar (AC_CONCENTRATION 45) — DES e AGI +3% at Nv 1 up to +12% at Nv 10, the client's
 * table unchanged by the 28/10/2026 rebalance. `agiBoost`/`dexBoost` are the percent-boost
 * keys (calculator.ts applies them through calcStatBoost).
 *
 * A self-buff of the Arqueiro line and the Superaprendiz in game, and any other class can
 * still hold it: 12796 Elixir Rubro autocasts "[Concentrar] nv.3 ou no maior nível aprendido"
 * on physical attacks. So the same factory feeds both catalogs — the class lists of the
 * classes that cast it and the shared `JobBuffs` row everyone else receives — and the panel
 * shows whichever of the two applies (see `supersededBuffNames`). The row is left ungated: a
 * one-shot damage figure cannot gate on a 1% proc (auto-cast-audit.json books that clause as
 * `reviewed-non-damaging`), and the player knows whether the buff is up.
 */
export const ImproveConcentrationFn = (): ActiveSkillModel => ({
  name: 'Improve Concentration',
  label: 'Concentrar',
  icon: 45,
  inputType: 'dropdown',
  dropdown: genSkillList(10, (level) => ({ agiBoost: level + 2, dexBoost: level + 2 })),
});
