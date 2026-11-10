import { ClassName } from './_class-name';
import {
  ActiveSkillModel,
  AtkSkillFormulaInput,
  AtkSkillModel,
  CharacterBase,
  PassiveSkillModel,
} from './_character-base.abstract';
import { requiresWeaponSubType } from '../constants/weapon-type-mapper';
import { atkSkillLevelList } from '../utils';

const jobBonusTable: Record<number, [number, number, number, number, number, number]> = {
  1: [0, 0, 0, 0, 1, 0],
  2: [0, 0, 0, 0, 1, 1],
  3: [0, 0, 0, 0, 1, 1],
  4: [0, 0, 0, 0, 1, 2],
  5: [0, 0, 0, 0, 1, 2],
  6: [0, 0, 0, 0, 2, 2],
  7: [0, 0, 0, 0, 2, 2],
  8: [0, 0, 0, 0, 2, 2],
  9: [0, 0, 0, 0, 2, 2],
  10: [0, 0, 0, 0, 2, 2],
  11: [0, 0, 0, 0, 3, 2],
  12: [0, 0, 0, 0, 3, 3],
  13: [0, 0, 0, 0, 3, 3],
  14: [0, 0, 0, 0, 3, 3],
  15: [0, 0, 0, 0, 3, 3],
  16: [0, 0, 0, 0, 3, 3],
  17: [0, 0, 0, 0, 4, 3],
  18: [0, 0, 0, 0, 4, 3],
  19: [0, 0, 0, 0, 4, 3],
  20: [0, 0, 0, 0, 4, 3],
  21: [0, 0, 0, 0, 4, 4],
  22: [0, 0, 0, 0, 4, 4],
  23: [0, 0, 0, 0, 4, 4],
  24: [0, 0, 0, 0, 4, 4],
  25: [0, 0, 0, 0, 5, 4],
  26: [0, 0, 0, 0, 5, 4],
  27: [0, 0, 0, 0, 5, 4],
  28: [0, 0, 0, 0, 5, 4],
  29: [0, 0, 0, 0, 5, 4],
  30: [0, 0, 0, 0, 5, 4],
  31: [0, 0, 0, 0, 5, 5],
  32: [1, 0, 0, 0, 5, 5],
  33: [1, 0, 0, 0, 5, 5],
  34: [1, 0, 0, 0, 5, 5],
  35: [1, 0, 0, 0, 6, 5],
  36: [1, 0, 0, 0, 6, 5],
  37: [1, 0, 0, 0, 6, 5],
  38: [1, 0, 0, 0, 6, 5],
  39: [1, 0, 0, 0, 6, 5],
  40: [1, 0, 0, 0, 6, 5],
  41: [2, 0, 0, 0, 6, 5],
  42: [2, 0, 0, 0, 6, 5],
  43: [2, 0, 0, 0, 6, 5],
  44: [2, 0, 0, 0, 6, 5],
  45: [2, 0, 0, 0, 7, 5],
  46: [2, 0, 0, 0, 7, 5],
  47: [2, 0, 0, 0, 7, 5],
  48: [2, 0, 0, 0, 7, 5],
  49: [2, 0, 0, 0, 7, 5],
  50: [3, 0, 0, 0, 7, 5],
  51: [3, 0, 0, 0, 7, 6],
  52: [3, 0, 0, 1, 7, 6],
  53: [3, 0, 0, 1, 7, 6],
  54: [3, 0, 0, 1, 7, 6],
  55: [3, 0, 0, 1, 8, 6],
  56: [3, 0, 0, 1, 8, 6],
  57: [3, 0, 0, 1, 8, 6],
  58: [3, 0, 0, 1, 8, 6],
  59: [3, 1, 0, 1, 8, 6],
  60: [3, 1, 1, 1, 8, 6],
  61: [3, 1, 1, 2, 8, 6],
  62: [3, 1, 1, 2, 9, 6],
  63: [3, 1, 1, 2, 9, 7],
  64: [4, 1, 1, 2, 9, 7],
  65: [4, 1, 1, 2, 9, 7],
  66: [4, 1, 1, 2, 9, 7],
  67: [4, 1, 1, 2, 9, 7],
  68: [4, 1, 1, 2, 9, 7],
  69: [4, 1, 1, 2, 9, 7],
  70: [4, 1, 1, 2, 9, 7],
};

export class Gunslinger extends CharacterBase {
  protected CLASS_NAME = ClassName.Gunslinger;
  protected JobBonusTable = jobBonusTable;
  protected initialStatusPoint = 40;

  protected readonly classNames = [ClassName.Gunslinger];
  /**
   * The Justiceiro's eight offensive skills. Every ratio is the per-level ATQ column the
   * client prints in the skill's own description, and every fct/vct/acd/cd is the
   * Conjuração/Espera row from `skill-delay.json` — `skill-delay.spec.ts` holds both to it.
   *
   * **The ratio is modelled as the whole cast, not as per-shot damage.** Five of these
   * fire several projectiles ("Dispara 5 tiros", "atirando até 10 vezes") while the client
   * prints a single ATQ figure, and as `totalHit`'s own documentation says, that does not
   * settle which of the two it is. So the shot count goes in `hit`, which splits the
   * packets for display and leaves the damage at the published figure; the day a recording
   * says otherwise, the count moves to `totalHit`.
   *
   * Left out, for want of a published number rather than by choice: Ataque Triplo
   * (GS_TRIPLEACTION) and Ataque Certeiro (GS_BULLSEYE), whose descriptions carry no ATQ
   * table at all, and Desarmar / Atirar Moedas / Tiro Bombinha, which do no damage.
   */
  protected readonly _atkSkillList: AtkSkillModel[] = [
    {
      // Rastrear o Alvo (GS_TRACKING, id 512): 300% at Nv1, +100% per level. Its variable
      // cast is the only one the client prints per level, 0,6s to 1,5s.
      name: 'Tracking',
      label: 'Tracking Lv10',
      value: 'Tracking==10',
      levelList: atkSkillLevelList('Tracking', 10),
      acd: 1.5,
      fct: 0,
      vct: (skillLevel: number): number => 0.5 + skillLevel * 0.1,
      cd: 0,
      verifyItemFn: requiresWeaponSubType('Revolver', 'Rifle'),
      formula: ({ skillLevel }: AtkSkillFormulaInput): number => 200 + skillLevel * 100,
    },
    {
      // Ferir Alvo (GS_PIERCINGSHOT, id 514): the one skill whose table has a column per
      // weapon — 220% +20%/level with a Pistola, 280% +30%/level with a Rifle. It also
      // "atira contra um oponente, ignorando a DEF".
      name: 'Wounding Shot',
      label: 'Wounding Shot Lv5',
      value: 'Wounding Shot==5',
      levelList: atkSkillLevelList('Wounding Shot', 5),
      acd: 0.5,
      fct: 0.3,
      vct: 1.2,
      cd: 0,
      isIgnoreDef: true,
      verifyItemFn: requiresWeaponSubType('Revolver', 'Rifle'),
      formula: ({ skillLevel, weapon }: AtkSkillFormulaInput): number =>
        (weapon.isSubType('Rifle') ? 250 + skillLevel * 30 : 200 + skillLevel * 20),
    },
    {
      // Rajada Certeira (GS_RAPIDSHOWER, id 515): 550% at Nv1, +50% per level, 5 shots.
      name: 'Rapid Shower',
      label: 'Rapid Shower Lv10',
      value: 'Rapid Shower==10',
      levelList: atkSkillLevelList('Rapid Shower', 10),
      acd: 1.5,
      fct: 0,
      vct: 0,
      cd: 0,
      hit: 5,
      verifyItemFn: requiresWeaponSubType('Revolver'),
      formula: ({ skillLevel }: AtkSkillFormulaInput): number => 500 + skillLevel * 50,
    },
    {
      // Desperado (GS_DESPERADO, id 516): 100% at Nv1, +50% per level, up to 10 shots.
      name: 'Desperado',
      label: 'Desperado Lv10',
      value: 'Desperado==10',
      levelList: atkSkillLevelList('Desperado', 10),
      acd: 1,
      fct: 0,
      vct: 0,
      cd: 0,
      hit: 10,
      verifyItemFn: requiresWeaponSubType('Revolver'),
      formula: ({ skillLevel }: AtkSkillFormulaInput): number => 50 + skillLevel * 50,
    },
    {
      // Controle de Multidão (GS_DUST, id 518): 150% at Nv1, +50% per level.
      name: 'Dust',
      label: 'Dust Lv10',
      value: 'Dust==10',
      levelList: atkSkillLevelList('Dust', 10),
      acd: 1,
      fct: 0,
      vct: 0,
      cd: 0,
      verifyItemFn: requiresWeaponSubType('Shotgun'),
      formula: ({ skillLevel }: AtkSkillFormulaInput): number => 100 + skillLevel * 50,
    },
    {
      // Ataque Total (GS_FULLBUSTER, id 519): 400% at Nv1, +100% per level, 2 projectiles.
      // Its pós-conjuração grows with the level, 1,2s to 3,0s.
      name: 'Full Blast',
      label: 'Full Blast Lv10',
      value: 'Full Blast==10',
      levelList: atkSkillLevelList('Full Blast', 10),
      acd: (skillLevel: number): number => 1 + skillLevel * 0.2,
      fct: 0.2,
      vct: 0.8,
      cd: 0,
      hit: 2,
      verifyItemFn: requiresWeaponSubType('Shotgun'),
      formula: ({ skillLevel }: AtkSkillFormulaInput): number => 300 + skillLevel * 100,
    },
    {
      // Disparo Espalhado (GS_SPREADATTACK, id 520): 230% at Nv1, +30% per level, 5
      // projectiles over an area that widens with the level.
      name: 'Spread Shot',
      label: 'Spread Shot Lv10',
      value: 'Spread Shot==10',
      levelList: atkSkillLevelList('Spread Shot', 10),
      acd: 1,
      fct: 0,
      vct: 0,
      cd: 0,
      hit: 5,
      verifyItemFn: requiresWeaponSubType('Shotgun', 'Grenade Launcher'),
      formula: ({ skillLevel }: AtkSkillFormulaInput): number => 200 + skillLevel * 30,
    },
    {
      // Mina do Justiceiro (GS_GROUNDDRIFT, id 521): 220% at Nv1, +20% per level. The
      // damage is the mine's, which the engine prices as one hit on the selected target.
      name: 'Gunslinger Mine',
      label: 'Gunslinger Mine Lv10',
      value: 'Gunslinger Mine==10',
      levelList: atkSkillLevelList('Gunslinger Mine', 10),
      acd: 1,
      fct: 0.2,
      vct: 0.8,
      cd: 0,
      verifyItemFn: requiresWeaponSubType('Grenade Launcher'),
      formula: ({ skillLevel }: AtkSkillFormulaInput): number => 200 + skillLevel * 20,
    },
  ];
  protected readonly _activeSkillList: ActiveSkillModel[] = [];
  protected readonly _passiveSkillList: PassiveSkillModel[] = [];
}
