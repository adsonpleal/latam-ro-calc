import { ActiveSkillModel } from '../../jobs/_character-base.abstract';

/**
 * Telecinesia — boosts Ghost-element damage and cuts variable cast. Shared because two
 * unrelated classes learn it: Warlock (and the Magus line above it) and Super Novice,
 * which do not share an ancestor. Keeping one copy stops the two from drifting apart.
 *
 * A factory, not a const, for the same reason as NoLimitFn: `CharacterBase.activeSkills`
 * sorts `dropdown` **in place**, so a shared object would have both classes mutating one
 * array. Only `selectButton` skills (CartBoost, DistortedCrescent) can safely be consts —
 * the getter skips those.
 */
export const IntensificationFn = (): ActiveSkillModel => ({
  inputType: 'dropdown',
  label: 'Intensification',
  name: 'Intensification',
  dropdown: [
    { label: '-', isUse: false, value: 0 },
    { label: 'Nv 1', isUse: true, value: 1, bonus: { final_ghost: 40, vct: 10 } },
    { label: 'Nv 2', isUse: true, value: 2, bonus: { final_ghost: 80, vct: 20 } },
    { label: 'Nv 3', isUse: true, value: 3, bonus: { final_ghost: 120, vct: 30 } },
    { label: 'Nv 4', isUse: true, value: 4, bonus: { final_ghost: 160, vct: 40 } },
    { label: 'Nv 5', isUse: true, value: 5, bonus: { final_ghost: 200, vct: 50 } },
  ],
});
