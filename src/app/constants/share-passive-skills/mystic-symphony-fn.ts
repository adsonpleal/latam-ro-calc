import { PassiveSkillModel } from '../../jobs/_character-base.abstract';

/**
 * Sinfonia Mística (5351). The client description carries two effects:
 *
 *   "Por 150 segundos, aumenta o dano físico e mágico contra as raças Peixe e Humanoide.
 *    Também aumenta em 100% o dano de: Arranjo Musical / Disparo Rítmico / Atirar Rosas"
 *
 * The second line is the "Dano de [perícia] +N%" form, so it is a per-skill damage bonus
 * keyed by skill id and lands in the same additive pool as the equipment that boosts
 * those skills — it does not multiply the skill ratio on a stage of its own. A Chicote
 * Consertado worth +35% on Disparo Rítmico therefore reaches 135%, and 235% with the
 * ultimate up, instead of doubling the whole total. Tracker card X47Hghzqed5N1JN1WUMr.
 *
 * 5357 (Arranjo Musical) is inert for now — no attack skill models it — and is listed so
 * that it works the day one is added.
 */
export const MysticSymphonyFn = (): PassiveSkillModel => ({
  label: 'Mystic Symphony',
  name: 'Mystic Symphony',
  inputType: 'selectButton',
  dropdown: [
    { label: 'Sim', value: 1, isUse: true, bonus: { p_race_fish: 50, p_race_demihuman: 50, m_race_fish: 50, m_race_demihuman: 50, 5353: 100, 5355: 100, 5357: 100 } },
    { label: 'Não', value: 0, isUse: false },
  ],
});
