import { ClassName } from './_class-name';
import { ActiveSkillModel, AtkSkillFormulaInput, AtkSkillModel, CharacterBase, PassiveSkillModel } from './_character-base.abstract';
import { DoubleStrafeFn, OwlsEyeFn, VulturesEyeFn } from '../constants/share-passive-skills';
import { ImproveConcentrationFn } from '../constants/share-active-skills';
import { atkSkillLevelList } from '../utils';

const jobBonusTableHi: Record<number, [number, number, number, number, number, number]> = {
  1: [0, 0, 0, 0, 0, 0],
  2: [0, 0, 0, 0, 1, 0],
  3: [0, 0, 0, 0, 1, 0],
  4: [0, 0, 0, 0, 1, 0],
  5: [0, 0, 0, 0, 1, 0],
  6: [1, 0, 0, 0, 1, 0],
  7: [1, 0, 0, 0, 1, 0],
  8: [1, 0, 0, 0, 1, 0],
  9: [1, 0, 0, 0, 1, 0],
  10: [1, 0, 0, 1, 1, 0],
  11: [1, 0, 0, 1, 1, 0],
  12: [1, 0, 0, 1, 1, 0],
  13: [1, 0, 0, 1, 1, 0],
  14: [1, 0, 0, 1, 2, 0],
  15: [1, 0, 0, 1, 2, 0],
  16: [1, 0, 0, 1, 2, 0],
  17: [1, 0, 0, 1, 2, 0],
  18: [1, 0, 0, 1, 3, 0],
  19: [1, 0, 0, 1, 3, 0],
  20: [1, 0, 0, 1, 3, 0],
  21: [1, 0, 0, 1, 3, 0],
  22: [1, 0, 0, 1, 3, 1],
  23: [1, 0, 0, 1, 3, 1],
  24: [1, 0, 0, 1, 3, 1],
  25: [1, 0, 0, 1, 3, 1],
  26: [1, 1, 0, 1, 3, 1],
  27: [1, 1, 0, 1, 3, 1],
  28: [1, 1, 0, 1, 3, 1],
  29: [1, 1, 0, 1, 3, 1],
  30: [1, 1, 0, 1, 4, 1],
  31: [1, 1, 0, 1, 4, 1],
  32: [1, 1, 0, 1, 4, 1],
  33: [1, 2, 0, 1, 4, 1],
  34: [1, 2, 0, 1, 4, 1],
  35: [1, 2, 0, 1, 4, 1],
  36: [1, 2, 0, 1, 5, 1],
  37: [1, 2, 0, 1, 5, 1],
  38: [2, 2, 0, 1, 5, 1],
  39: [2, 2, 0, 1, 5, 1],
  40: [3, 2, 0, 1, 5, 1],
  41: [3, 2, 0, 1, 5, 1],
  42: [3, 2, 0, 1, 6, 1],
  43: [3, 2, 0, 1, 6, 1],
  44: [3, 2, 0, 1, 6, 2],
  45: [3, 2, 0, 1, 6, 2],
  46: [3, 2, 1, 1, 6, 2],
  47: [3, 2, 1, 2, 6, 2],
  48: [3, 2, 1, 2, 6, 2],
  49: [3, 3, 1, 2, 6, 2],
  50: [3, 3, 1, 2, 7, 2],
  51: [3, 3, 1, 2, 7, 2],
  52: [3, 3, 1, 2, 7, 2],
  53: [3, 3, 1, 2, 7, 2],
  54: [3, 3, 1, 2, 7, 2],
  55: [3, 3, 1, 2, 7, 2],
  56: [3, 3, 1, 2, 7, 2],
  57: [3, 3, 1, 2, 7, 2],
  58: [3, 3, 1, 2, 7, 2],
  59: [3, 3, 1, 2, 7, 2],
  60: [3, 3, 1, 2, 7, 2],
  61: [3, 3, 1, 2, 7, 2],
  62: [3, 3, 1, 2, 7, 2],
  63: [3, 3, 1, 2, 7, 2],
  64: [3, 3, 1, 2, 7, 2],
  65: [3, 3, 1, 2, 7, 2],
  66: [3, 3, 1, 2, 7, 2],
  67: [3, 3, 1, 2, 7, 2],
  68: [3, 3, 1, 2, 7, 2],
  69: [3, 3, 1, 2, 7, 2],
  70: [3, 3, 1, 2, 7, 2],
};

const _jobBonusTable: Record<number, [number, number, number, number, number, number]> = {
  1: [0, 0, 0, 0, 0, 0],
  2: [0, 0, 0, 0, 1, 0],
  3: [0, 0, 0, 0, 1, 0],
  4: [0, 0, 0, 0, 1, 0],
  5: [0, 0, 0, 0, 1, 0],
  6: [1, 0, 0, 0, 1, 0],
  7: [1, 0, 0, 0, 1, 0],
  8: [1, 0, 0, 0, 1, 0],
  9: [1, 0, 0, 0, 1, 0],
  10: [1, 0, 0, 1, 1, 0],
  11: [1, 0, 0, 1, 1, 0],
  12: [1, 0, 0, 1, 1, 0],
  13: [1, 0, 0, 1, 1, 0],
  14: [1, 0, 0, 1, 2, 0],
  15: [1, 0, 0, 1, 2, 0],
  16: [1, 0, 0, 1, 2, 0],
  17: [1, 0, 0, 1, 2, 0],
  18: [1, 0, 0, 1, 3, 0],
  19: [1, 0, 0, 1, 3, 0],
  20: [1, 0, 0, 1, 3, 0],
  21: [1, 0, 0, 1, 3, 0],
  22: [1, 0, 0, 1, 3, 1],
  23: [1, 0, 0, 1, 3, 1],
  24: [1, 0, 0, 1, 3, 1],
  25: [1, 0, 0, 1, 3, 1],
  26: [1, 1, 0, 1, 3, 1],
  27: [1, 1, 0, 1, 3, 1],
  28: [1, 1, 0, 1, 3, 1],
  29: [1, 1, 0, 1, 3, 1],
  30: [1, 1, 0, 1, 4, 1],
  31: [1, 1, 0, 1, 4, 1],
  32: [1, 1, 0, 1, 4, 1],
  33: [1, 2, 0, 1, 4, 1],
  34: [1, 2, 0, 1, 4, 1],
  35: [1, 2, 0, 1, 4, 1],
  36: [1, 2, 0, 1, 5, 1],
  37: [1, 2, 0, 1, 5, 1],
  38: [2, 2, 0, 1, 5, 1],
  39: [2, 2, 0, 1, 5, 1],
  40: [3, 2, 0, 1, 5, 1],
  41: [3, 2, 0, 1, 5, 1],
  42: [3, 2, 0, 1, 6, 1],
  43: [3, 2, 0, 1, 6, 1],
  44: [3, 2, 0, 1, 6, 2],
  45: [3, 2, 0, 1, 6, 2],
  46: [3, 2, 1, 1, 6, 2],
  47: [3, 2, 1, 2, 6, 2],
  48: [3, 2, 1, 2, 6, 2],
  49: [3, 3, 1, 2, 6, 2],
  50: [3, 3, 1, 2, 7, 2],
  51: [3, 3, 1, 2, 7, 2],
  52: [3, 3, 1, 2, 7, 2],
  53: [3, 3, 1, 2, 7, 2],
  54: [3, 3, 1, 2, 7, 2],
  55: [3, 3, 1, 2, 7, 2],
  56: [3, 3, 1, 2, 7, 2],
  57: [3, 3, 1, 2, 7, 2],
  58: [3, 3, 1, 2, 7, 2],
  59: [3, 3, 1, 2, 7, 2],
  60: [3, 3, 1, 2, 7, 2],
  61: [3, 3, 1, 2, 7, 2],
  62: [3, 3, 1, 2, 7, 2],
  63: [3, 3, 1, 2, 7, 2],
  64: [3, 3, 1, 2, 7, 2],
  65: [3, 3, 1, 2, 7, 2],
  66: [3, 3, 1, 2, 7, 2],
  67: [3, 3, 1, 2, 7, 2],
  68: [3, 3, 1, 2, 7, 2],
  69: [3, 3, 1, 2, 7, 2],
  70: [3, 3, 1, 2, 7, 2],
};

export class Archer extends CharacterBase {
  protected CLASS_NAME = ClassName.Archer;
  protected readonly JobBonusTable = jobBonusTableHi;

  protected initialStatusPoint = 100;
  protected classNames = [ClassName.Archer];
  /**
   * The Arqueiro's own three offensive skills — card fLHaAqiBPMgALZZ0V9O7 asked for them so a
   * Sentinela can see what they hit for, the list having been empty until now. They are declared
   * here because this is the tier they belong to, so `inheritSkills` carries them to every class
   * promoted from the Arqueiro. A parent's entries come first in the picker and so open it for
   * those classes, as the Mercador's Mammonita already does for the Criador.
   *
   * None carries an `element`: each takes the equipped arrow's, which is what a bow skill does
   * and what Flecha Melódica and Disparo Certeiro leave unset for the same reason.
   *
   * https://browiki.org/wiki/Rajada_de_Flechas
   * https://browiki.org/wiki/Chuva_de_Flechas
   * https://browiki.org/wiki/Disparo_Violento
   */
  protected readonly _atkSkillList: AtkSkillModel[] = [
    {
      /**
       * Rajada de Flechas (AC_DOUBLE, 46): 100% at Nv1, +10% per level, twice. The client prints
       * the column as "100% x2" and bROWiki as "Atira 2 flechas em 1 único ataque", so the figure
       * is what *each* arrow deals — `totalHit`, which applies the ratio twice, rather than `hit`,
       * which would split one ratio into two packets and halve the damage.
       *
       * Kept equal to the `ITEM_AUTO_CAST_SKILLS` copy, which an item fires on classes that never
       * learn the skill; `skillForId` prefers this entry, so the two must not drift.
       *
       * The passive dropdown of the same name (`DoubleStrafeFn`) is not a second source of damage
       * — it is the learned level an item's skill-damage bonus keys on.
       */
      name: 'Double Strafe',
      label: 'Double Strafe Lv10',
      value: 'Double Strafe==10',
      levelList: atkSkillLevelList('Double Strafe', 10),
      acd: 0.1,
      fct: 0,
      vct: 0,
      cd: 0,
      totalHit: 2,
      formula: ({ skillLevel }: AtkSkillFormulaInput): number => 90 + skillLevel * 10,
    },
    {
      /**
       * Chuva de Flechas (AC_SHOWER, 47): 160% at Nv1, +10% per level. The 3x3-to-5x5 area and
       * the 2-cell knockback both sources describe are not damage, so nothing here models them —
       * the figure is what one target takes.
       */
      name: 'Arrow Shower',
      label: 'Arrow Shower Lv10',
      value: 'Arrow Shower==10',
      levelList: atkSkillLevelList('Arrow Shower', 10),
      acd: 0.1,
      fct: 0,
      vct: 0,
      cd: 0,
      formula: ({ skillLevel }: AtkSkillFormulaInput): number => 150 + skillLevel * 10,
    },
    {
      /**
       * Disparo Violento (AC_CHARGEARROW, 148): one level, 150% of ATQ. It is a quest skill
       * ("Pré-requisitos: Completar Missão"), not learnt by levelling, which is why it sits last
       * here and does not open the picker.
       *
       * Alone among the three it has no `Nível l ATQ` table to parse, the client stating the
       * ratio in prose instead — there being only one level to tabulate. The spec beside this
       * file holds the 150 to that sentence; the cast numbers below are the client's as usual.
       *
       * The 5-cell knockback the description also mentions is not damage, so nothing models it.
       * The three client languages disagree on it anyway (pt-BR says 5 cells, the Spanish and
       * English texts 4), which is one more reason to read only the pt-BR ratio here.
       */
      name: 'Charge Arrow',
      label: 'Charge Arrow',
      value: 'Charge Arrow==1',
      acd: 0,
      fct: 0.8,
      vct: 0.4,
      cd: 0,
      formula: (): number => 150,
    },
  ];
  // Concentrar is the Arqueiro's own buff, so the whole line gets it here, under
  // "Habilidades e efeitos ativos". The shared `JobBuffs` row — the one every other class
  // receives from a party or from 12796 Elixir Rubro — is the same factory, and the panel
  // hides it for a class that has this one (`supersededBuffNames`).
  protected _activeSkillList: ActiveSkillModel[] = [ImproveConcentrationFn()];
  protected _passiveSkillList: PassiveSkillModel[] = [OwlsEyeFn(), VulturesEyeFn(), DoubleStrafeFn()];
}
