import { ActiveSkillModel } from '../../jobs/_character-base.abstract';

/**
 * Glória (PR_GLORIA 75) — the client's table: "Consome 20 de SP para conceder SOR +30 para
 * todos os membros do grupo na tela", the level buying duration only (10s at Nv 1 up to 30s
 * at Nv 5), hence one option rather than five identical ones. Plain `luk` is what makes the
 * CRIT follow: getBaseCriRate counts `totalLuk * 3` tenths, so +30 SOR is +9 de Crítico
 * through the normal stat path.
 *
 * Party-wide, so every class can receive it — and the Sacerdote line casts it. The same
 * factory therefore feeds both catalogs: the Priest line's own active list and the shared
 * `JobBuffs` row (see `supersededBuffNames`, which keeps a class from being offered both).
 */
export const GloriaFn = (): ActiveSkillModel => ({
  name: 'Gloria',
  label: 'Glória',
  icon: 75,
  inputType: 'selectButton',
  dropdown: [
    { label: 'Sim', isUse: true, value: 5, skillLv: 5, bonus: { luk: 30 } },
    { label: 'Não', isUse: false, value: 0 },
  ],
});
