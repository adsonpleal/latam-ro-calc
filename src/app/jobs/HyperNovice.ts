import { JOB_4_MAX_JOB_LEVEL, JOB_4_MIN_MAX_LEVEL } from '../app-config';
import { ElementType } from '../constants';
import { genSkillList } from '../utils';
import { SuperNovice } from './SuperNovice';
import { ActiveSkillModel, AtkSkillFormulaInput, AtkSkillModel, PassiveSkillModel } from './_character-base.abstract';
import { ClassName } from './_class-name';

/** Every level of a skill, for the level picker in the UI. */
const levelList = (name: string, maxLv = 10) =>
  Array.from({ length: maxLv }, (_, i) => ({ label: `${name} Lv${i + 1}`, value: `${name}==${i + 1}` }));

/**
 * Job bonuses, from the "Job & Talent Bonuses" grid on irowiki.org/wiki/Hyper_Novice
 * (read 2026-08-11): each stat's row lists the job levels at which it gains its next +1.
 *
 * The DEX column is the one correction to the wiki. It prints 56 for the sixth step, past
 * the job cap of 50, while the page's own summary box lists DEX +6 as the bonus at max —
 * and the hn-magic-lv1.rrf status window needs DEX 100 (94 allocated + 6) at job 50, since
 * `floor(DEX/5)` is what put both status ATK and status MATK one point low. Clamped to 50.
 */
const jobBonusTable: Record<number, [number, number, number, number, number, number]> = {
  1: [1, 1, 0, 0, 0, 1],
  2: [1, 1, 0, 1, 1, 1],
  3: [1, 1, 1, 1, 1, 1],
  4: [1, 1, 1, 1, 1, 1],
  5: [2, 2, 1, 1, 1, 1],
  6: [2, 2, 1, 2, 2, 1],
  7: [2, 2, 2, 2, 2, 1],
  8: [2, 2, 2, 2, 2, 2],
  9: [2, 2, 2, 2, 3, 2],
  10: [2, 3, 2, 2, 3, 2],
  11: [2, 3, 2, 2, 3, 2],
  12: [2, 3, 3, 2, 3, 2],
  13: [2, 3, 3, 3, 3, 3],
  14: [2, 3, 3, 4, 3, 3],
  15: [3, 3, 3, 4, 3, 3],
  16: [3, 3, 3, 4, 3, 3],
  17: [4, 3, 4, 4, 3, 3],
  18: [5, 3, 4, 4, 3, 3],
  19: [5, 3, 4, 5, 3, 3],
  20: [6, 3, 4, 5, 3, 3],
  21: [6, 3, 4, 5, 3, 3],
  22: [6, 3, 4, 6, 3, 3],
  23: [6, 3, 4, 7, 3, 3],
  24: [6, 3, 4, 7, 3, 3],
  25: [7, 3, 4, 7, 3, 3],
  26: [7, 4, 4, 7, 3, 3],
  27: [7, 4, 4, 7, 3, 3],
  28: [7, 4, 4, 7, 4, 3],
  29: [7, 4, 5, 7, 4, 3],
  30: [7, 4, 5, 7, 4, 3],
  31: [7, 4, 6, 7, 4, 3],
  32: [7, 4, 6, 7, 4, 3],
  33: [7, 4, 6, 7, 4, 3],
  34: [7, 4, 6, 7, 4, 3],
  35: [8, 4, 6, 8, 4, 3],
  36: [8, 4, 6, 8, 4, 3],
  37: [8, 4, 6, 8, 4, 4],
  38: [8, 4, 6, 8, 4, 4],
  39: [8, 4, 6, 8, 4, 4],
  40: [8, 4, 6, 8, 4, 4],
  41: [9, 4, 6, 8, 4, 4],
  42: [9, 4, 6, 9, 4, 4],
  43: [9, 4, 6, 9, 4, 4],
  44: [9, 4, 6, 9, 4, 5],
  45: [9, 4, 6, 9, 4, 5],
  46: [9, 4, 6, 9, 4, 6],
  47: [9, 4, 6, 9, 4, 6],
  48: [10, 4, 6, 10, 4, 6],
  49: [10, 4, 6, 10, 4, 6],
  50: [10, 5, 6, 10, 6, 6],
  51: [10, 5, 6, 10, 6, 6],
  52: [10, 5, 6, 10, 6, 6],
  53: [10, 5, 6, 10, 6, 6],
  54: [10, 5, 6, 10, 6, 6],
  55: [10, 5, 6, 10, 6, 6],
  56: [10, 5, 6, 10, 6, 6],
  57: [10, 5, 6, 10, 6, 6],
  58: [10, 5, 6, 10, 6, 6],
  59: [10, 5, 6, 10, 6, 6],
  60: [10, 5, 6, 10, 6, 6],
  61: [10, 5, 6, 10, 6, 6],
  62: [10, 5, 6, 10, 6, 6],
  63: [10, 5, 6, 10, 6, 6],
  64: [10, 5, 6, 10, 6, 6],
  65: [10, 5, 6, 10, 6, 6],
  66: [10, 5, 6, 10, 6, 6],
  67: [10, 5, 6, 10, 6, 6],
  68: [10, 5, 6, 10, 6, 6],
  69: [10, 5, 6, 10, 6, 6],
  70: [10, 5, 6, 10, 6, 6],
};

/**
 * Trait bonuses, same irowiki grid. The STA column was wrong at **every** level — it ran to
 * +10 at job 50 where the wiki gives +4 — which the recording caught independently:
 * `res = STA + floor(STA/3) x 5` reads 88 in the status packets, and only STA 33
 * (29 allocated + 4) produces it. Same failure the Sky Emperor table had.
 */
const traitBonusTable: Record<number, [number, number, number, number, number, number]> = {
  1: [0, 0, 0, 0, 0, 0],
  2: [0, 0, 0, 0, 0, 0],
  3: [0, 0, 0, 0, 0, 0],
  4: [0, 0, 0, 0, 0, 0],
  5: [1, 0, 0, 0, 0, 0],
  6: [1, 0, 0, 1, 0, 0],
  7: [1, 0, 0, 1, 0, 0],
  8: [1, 0, 0, 1, 1, 0],
  9: [1, 0, 0, 1, 1, 0],
  10: [1, 0, 0, 1, 1, 0],
  11: [1, 1, 0, 1, 1, 0],
  12: [1, 1, 0, 1, 1, 0],
  13: [1, 1, 1, 1, 1, 0],
  14: [1, 1, 1, 1, 1, 0],
  15: [1, 1, 1, 1, 1, 0],
  16: [1, 1, 1, 1, 1, 1],
  17: [1, 1, 1, 1, 2, 1],
  18: [1, 1, 1, 1, 2, 1],
  19: [1, 1, 1, 2, 2, 1],
  20: [2, 1, 1, 2, 2, 1],
  21: [2, 1, 1, 2, 2, 2],
  22: [2, 1, 1, 3, 2, 2],
  23: [2, 1, 1, 3, 2, 2],
  24: [3, 2, 1, 3, 2, 2],
  25: [3, 2, 1, 3, 2, 2],
  26: [3, 2, 1, 3, 2, 2],
  27: [3, 2, 1, 3, 3, 2],
  28: [3, 2, 1, 3, 3, 2],
  29: [3, 2, 1, 3, 3, 2],
  30: [4, 2, 1, 4, 3, 2],
  31: [4, 2, 1, 4, 3, 2],
  32: [4, 2, 2, 4, 3, 2],
  33: [5, 2, 2, 5, 3, 2],
  34: [5, 3, 2, 5, 3, 2],
  35: [5, 3, 2, 5, 3, 2],
  36: [5, 3, 2, 5, 4, 2],
  37: [5, 3, 2, 5, 4, 2],
  38: [5, 3, 2, 5, 4, 3],
  39: [5, 3, 3, 6, 4, 3],
  40: [6, 3, 3, 6, 5, 3],
  41: [6, 3, 3, 6, 5, 3],
  42: [6, 3, 3, 6, 5, 3],
  43: [7, 4, 3, 6, 5, 3],
  44: [7, 4, 3, 6, 5, 3],
  45: [7, 4, 4, 7, 5, 3],
  46: [7, 4, 4, 7, 5, 3],
  47: [7, 4, 4, 7, 5, 3],
  48: [7, 4, 4, 7, 6, 3],
  49: [8, 4, 4, 8, 6, 3],
  50: [8, 4, 4, 8, 6, 3],
  51: [8, 4, 4, 8, 6, 3],
  52: [8, 4, 4, 8, 6, 3],
  53: [8, 4, 4, 8, 6, 3],
  54: [8, 4, 4, 8, 6, 3],
  55: [8, 4, 4, 8, 6, 3],
  56: [8, 4, 4, 8, 6, 3],
  57: [8, 4, 4, 8, 6, 3],
  58: [8, 4, 4, 8, 6, 3],
  59: [8, 4, 4, 8, 6, 3],
  60: [8, 4, 4, 8, 6, 3],
  61: [8, 4, 4, 8, 6, 3],
  62: [8, 4, 4, 8, 6, 3],
  63: [8, 4, 4, 8, 6, 3],
  64: [8, 4, 4, 8, 6, 3],
  65: [8, 4, 4, 8, 6, 3],
  66: [8, 4, 4, 8, 6, 3],
  67: [8, 4, 4, 8, 6, 3],
  68: [8, 4, 4, 8, 6, 3],
  69: [8, 4, 4, 8, 6, 3],
  70: [8, 4, 4, 8, 6, 3],
};

/**
 * The class has **two** guardian-angel ultimates, one per damage type, and each boosts
 * only its own four skills — so a skill's ultimate multiplier has to say which angel
 * unlocks it. Both last 300 seconds and cost 150 AP.
 *
 *   Anjo da Magia (5462) — Ira da Terra +70%, Espectro Napalm +100%, Esquife Congelante
 *                          +70%, Zona Gravitacional +50%, Chuva de Meteoritos +50%,
 *                          Tempestade de Júpiter +70%
 *   Anjo do Poder (5461) — Golpe de Tyr +50%, Choque Violento +50%,
 *                          Cortar em Espiral +100%, Lâminas Devastadoras +100%
 *
 * Both lists are the client's own description text, from the ragassets `skills.json`
 * feed. The physical angel was missing from this class entirely until
 * `hn-physical-matrix.rrf` turned up: the "+50% on Choque Violento" the client states is
 * exactly the ratio that recording measures between two windows whose gear is identical
 * (see `HyperNovice.physical-replay.spec.ts`).
 */
type Angel = 'Angel of Magic' | 'Angel of Power';

export class HyperNovice extends SuperNovice {
  protected override CLASS_NAME = ClassName.HyperNovice;
  protected override JobBonusTable = jobBonusTable;
  protected override TraitBonusTable = traitBonusTable;

  protected override minMaxLevel = JOB_4_MIN_MAX_LEVEL;
  protected override maxJob = JOB_4_MAX_JOB_LEVEL;

  private readonly classNames4th = [ClassName.Only_4th, ClassName.HyperNovice];
  /**
   * The per-level percentages come from the **client description** (SKILL_META), not
   * from Sigma's blog: the `[V2]` tables are the 2nd rebalance, which LATAM does not
   * run, and they were wrong on nearly every skill here. Each table has two columns —
   * the level's ATK/MATK and the "Nv. de Autodidata" one, which adds
   * `N x skill level x passive level` to the percentage.
   *
   * The POW/SPL term is not in the description; those coefficients are the measured
   * ones, pinned by `HyperNovice.replay.spec.ts` (SPL x2 on Jack Frost Nova's sphere,
   * x3 on Meteor Storm Buster, Napalm Vulcan Strike, Jupitel Thunderstorm and Hell's
   * Drive, x4 on the frost explosion, x2 and x5 on Ground Gravitation's two parts).
   */
  private readonly atkSkillList4th: AtkSkillModel[] = [
    {
      name: 'Double Bowling Bash',
      label: 'Double Bowling Bash Lv10',
      value: 'Double Bowling Bash==10',
      levelList: levelList('Double Bowling Bash'),
      acd: 1,
      fct: 0.35,
      vct: 0,
      cd: 0.7,
      hit: 5,
      isMelee: true,
      formula: (input: AtkSkillFormulaInput): number => {
        const { model, skillLevel, status } = input;
        const tacticsLv = this.learnLv('Self Study Tactics');

        return this.withPassiveBonus(
          (100 + skillLevel * (200 + tacticsLv * 3) + status.totalPow * 2) * (model.level / 100),
          tacticsLv,
          1.5,
          'Angel of Power',
        );
      },
    },
    {
      name: 'Mega Sonic Blow',
      label: 'Mega Sonic Blow Lv10',
      value: 'Mega Sonic Blow==10',
      levelList: levelList('Mega Sonic Blow'),
      acd: 0.5,
      fct: 0,
      vct: 0,
      cd: 0.3,
      isMelee: true,
      canCri: true,
      criDmgPercentage: 0.5,
      baseCriPercentage: 1,
      formula: (input: AtkSkillFormulaInput): number => {
        const { model, skillLevel, status } = input;
        const tacticsLv = this.learnLv('Self Study Tactics');

        return this.withPassiveBonus(
          (800 + skillLevel * (150 + tacticsLv * 5) + status.totalPow * 4) * (model.level / 100),
          tacticsLv,
          2,
          'Angel of Power',
        );
      },
    },
    {
      // The one skill Self Study Tactics boosts twice as much (+2% per level).
      name: 'Shield Chain Rush',
      label: 'Shield Chain Rush Lv10',
      value: 'Shield Chain Rush==10',
      levelList: levelList('Shield Chain Rush'),
      acd: 0.5,
      fct: 0.3,
      vct: 1.2,
      cd: 0.3,
      verifyItemFn: ({ model }) => (!model.shield ? 'Shield' : ''),
      formula: (input: AtkSkillFormulaInput): number => {
        const { model, skillLevel, status } = input;
        const tacticsLv = this.learnLv('Self Study Tactics');

        return this.withPassiveBonus(
          (400 + skillLevel * (300 + tacticsLv * 3) + status.totalPow * 3) * (model.level / 100),
          tacticsLv * 2,
          1.5,
          'Angel of Power',
        );
      },
    },
    {
      name: 'Spiral Pierce Max',
      label: 'Spiral Pierce Max Lv10',
      value: 'Spiral Pierce Max==10',
      levelList: levelList('Spiral Pierce Max'),
      acd: 0.5,
      fct: 0.3,
      vct: 1,
      cd: 0.3,
      formula: (input: AtkSkillFormulaInput): number => {
        const { model, skillLevel, status, monster } = input;
        const tacticsLv = this.learnLv('Self Study Tactics');
        const sizeModifier = { s: 1.5, m: 1.3, l: 1.2 }[monster.size];

        // The size multiplier scales the whole skill term, not just the per-level part.
        return this.withPassiveBonus(
          ((500 + skillLevel * (250 + tacticsLv * 3)) * sizeModifier + status.totalPow * 3) * (model.level / 100),
          tacticsLv,
          2,
          'Angel of Power',
        );
      },
    },
    {
      // Meteor Storm Buster (5455) — each meteor lands (1st damage) and then explodes
      // (2nd damage). The recording carries them as separate packets, hence two entries.
      name: 'Meteor Storm Buster',
      label: 'Meteor Storm Buster Lv10',
      labelSuffix: 'Queda',
      value: 'Meteor Storm Buster==10',
      levelList: levelList('Meteor Storm Buster'),
      acd: 0.3,
      fct: 1.5,
      vct: 4,
      cd: (lv) => [2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 3][lv - 1],
      hit: 3,
      isMatk: true,
      element: ElementType.Fire,
      formula: (input: AtkSkillFormulaInput): number => {
        const { model, skillLevel, status } = input;
        const sorceryLv = this.learnLv('Self Study Sorcery');

        // "ATQM" in the client table (600% -> 1.800%), and — unlike the first hit of Jack
        // Frost Nova and Ground Gravitation — this one DOES take the passive's damage
        // bonus. SKILL HA MAGICO.rrf settles it: at Lv1 both columns read 600%, so only a
        // Lv5 recording could tell the pair apart.
        return this.withPassiveBonus(
          (300 + skillLevel * (300 + sorceryLv * 5) + status.totalSpl * 3) * (model.level / 100),
          sorceryLv,
          1.5,
        );
      },
    },
    {
      // Meteor Storm Buster — the explosion that follows the landing ("2º ATQM").
      name: 'Meteor Storm Buster',
      label: 'Meteor Storm Buster Lv10',
      labelSuffix: 'Explosão',
      value: 'Meteor Storm Buster (Explosão)==10',
      levelList: levelList('Meteor Storm Buster (Explosão)'),
      acd: 0.3,
      fct: 1.5,
      vct: 4,
      cd: (lv) => [2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 3][lv - 1],
      hit: 1,
      isMatk: true,
      element: ElementType.Fire,
      formula: (input: AtkSkillFormulaInput): number => {
        const { model, skillLevel, status } = input;
        const sorceryLv = this.learnLv('Self Study Sorcery');

        // "2º ATQM" (600% -> 1.200%), and the one that does NOT take the passive bonus.
        return this.withUltimate(
          (450 + skillLevel * (150 + sorceryLv * 5) + status.totalSpl * 3) * (model.level / 100),
          1.5,
        );
      },
    },
    {
      // The one magic skill Self Study Sorcery boosts twice as much (+2% per level).
      name: 'Napalm Vulcan Strike',
      label: 'Napalm Vulcan Strike Lv10',
      value: 'Napalm Vulcan Strike==10',
      levelList: levelList('Napalm Vulcan Strike'),
      acd: 0.5,
      fct: 1,
      vct: 0.5,
      cd: 0.3,
      hit: 7,
      isMatk: true,
      element: ElementType.Ghost,
      formula: (input: AtkSkillFormulaInput): number => {
        const { model, skillLevel, status } = input;
        const sorceryLv = this.learnLv('Self Study Sorcery');

        return this.withPassiveBonus(
          (250 + skillLevel * (250 + sorceryLv * 4) + status.totalSpl * 3) * (model.level / 100),
          sorceryLv * 2,
          2,
        );
      },
    },
    {
      name: 'Jupitel Thunderstorm',
      label: 'Jupitel Thunderstorm Lv10',
      value: 'Jupitel Thunderstorm==10',
      levelList: levelList('Jupitel Thunderstorm'),
      acd: 0.5,
      fct: 1,
      vct: (lv) => [1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2][lv - 1],
      cd: 1.8,
      hit: 6,
      isMatk: true,
      element: ElementType.Wind,
      formula: (input: AtkSkillFormulaInput): number => {
        const { model, skillLevel, status } = input;
        const sorceryLv = this.learnLv('Self Study Sorcery');

        return this.withPassiveBonus(
          (skillLevel * (1800 + sorceryLv * 3) + status.totalSpl * 3) * (model.level / 100),
          sorceryLv,
          1.7,
        );
      },
    },
    {
      name: "Hell's Drive",
      label: "Hell's Drive Lv10",
      value: "Hell's Drive==10",
      levelList: levelList("Hell's Drive"),
      acd: 1,
      fct: 1,
      vct: 1.2,
      cd: (lv) => [2.5, 2.3, 2.1, 1.9, 1.7, 1.5, 1.3, 1.1, 0.9, 0.7][lv - 1],
      hit: 3,
      isMatk: true,
      element: ElementType.Earth,
      formula: (input: AtkSkillFormulaInput): number => {
        const { model, skillLevel, status } = input;
        const sorceryLv = this.learnLv('Self Study Sorcery');

        return this.withPassiveBonus(
          (1000 + skillLevel * (550 + sorceryLv * 4) + status.totalSpl * 3) * (model.level / 100),
          sorceryLv,
          1.7,
        );
      },
    },
    {
      // Jack Frost Nova (5457) — the ice sphere lands (1st damage) and then explodes
      // every 0.3s (2nd damage). This entry is the repeating explosion; the recording
      // shows 4 of them at Lv1. Leaves [Geladinho] on the target (constants/job-buffs.ts).
      name: 'Jack Frost Nova',
      label: 'Jack Frost Nova Lv10',
      labelSuffix: 'Explosão',
      value: 'Jack Frost Nova==10',
      levelList: levelList('Jack Frost Nova'),
      acd: 0.3,
      fct: 1.5,
      vct: (lv) => [1.6, 1.7, 1.8, 1.9, 2, 2.1, 2.2, 2.3, 2.4, 2.5][lv - 1],
      cd: 3,
      hit: 2,
      totalHit: 4,
      isMatk: true,
      element: ElementType.Water,
      formula: (input: AtkSkillFormulaInput): number => {
        const { model, skillLevel, status } = input;
        const sorceryLv = this.learnLv('Self Study Sorcery');

        return this.withPassiveBonus(
          (200 + skillLevel * (200 + sorceryLv * 3) + status.totalSpl * 4) * (model.level / 100),
          sorceryLv,
          1.7,
        );
      },
    },
    {
      // Jack Frost Nova — the initial sphere ("ATQM (Esfera)" in the table), a single hit.
      name: 'Jack Frost Nova',
      label: 'Jack Frost Nova Lv10',
      labelSuffix: 'Inicial',
      value: 'Jack Frost Nova (Inicial)==10',
      levelList: levelList('Jack Frost Nova (Inicial)'),
      acd: 0.3,
      fct: 1.5,
      vct: (lv) => [1.6, 1.7, 1.8, 1.9, 2, 2.1, 2.2, 2.3, 2.4, 2.5][lv - 1],
      cd: 3,
      hit: 1,
      isMatk: true,
      element: ElementType.Water,
      formula: (input: AtkSkillFormulaInput): number => {
        const { model, skillLevel, status } = input;
        const sorceryLv = this.learnLv('Self Study Sorcery');

        // First damage: no passive bonus, same as Meteor Storm Buster's landing.
        return this.withUltimate(
          (skillLevel * (200 + sorceryLv * 3) + status.totalSpl * 2) * (model.level / 100),
          1.7,
        );
      },
    },
    {
      // Ground Gravitation (5459) — an initial burst plus, for 5 seconds, a 2nd damage
      // every 0.5s (10 hits). This entry is the repeating one; leaves [Gravitação] on the
      // target (constants/job-buffs.ts).
      name: 'Ground Gravitation',
      label: 'Ground Gravitation Lv10',
      labelSuffix: 'Contínuo',
      value: 'Ground Gravitation==10',
      levelList: levelList('Ground Gravitation'),
      acd: (lv) => [2, 2, 2, 1.8, 1.8, 1.8, 1.6, 1.4, 1.2, 1][lv - 1],
      fct: 1.5,
      vct: (lv) => [3, 3, 3, 3.2, 3.5, 3.8, 4.1, 4.4, 4.7, 5][lv - 1],
      cd: 5,
      hit: 1,
      totalHit: 10,
      isMatk: true,
      element: ElementType.Neutral,
      formula: (input: AtkSkillFormulaInput): number => {
        const { model, skillLevel, status } = input;
        const sorceryLv = this.learnLv('Self Study Sorcery');

        return this.withPassiveBonus(
          (400 + skillLevel * (300 + sorceryLv * 2) + status.totalSpl * 2) * (model.level / 100),
          sorceryLv,
          1.5,
        );
      },
    },
    {
      // Ground Gravitation — the initial burst ("1º ATQM" in the table).
      name: 'Ground Gravitation',
      label: 'Ground Gravitation Lv10',
      labelSuffix: 'Inicial',
      value: 'Ground Gravitation (Inicial)==10',
      levelList: levelList('Ground Gravitation (Inicial)'),
      acd: (lv) => [2, 2, 2, 1.8, 1.8, 1.8, 1.6, 1.4, 1.2, 1][lv - 1],
      fct: 1.5,
      vct: (lv) => [3, 3, 3, 3.2, 3.5, 3.8, 4.1, 4.4, 4.7, 5][lv - 1],
      cd: 5,
      hit: 2,
      isMatk: true,
      element: ElementType.Neutral,
      formula: (input: AtkSkillFormulaInput): number => {
        const { model, skillLevel, status } = input;
        const sorceryLv = this.learnLv('Self Study Sorcery');

        // First damage: no passive bonus, same as Meteor Storm Buster's landing.
        return this.withUltimate(
          (3000 + skillLevel * (1500 + sorceryLv * 4) + status.totalSpl * 5) * (model.level / 100),
          1.5,
        );
      },
    },
  ];
  /**
   * "Anjo da Magia" (5462) is the magic ultimate. The client ships no description block
   * for it, so the multipliers live on the skills themselves and are the ones
   * **measured** in the hn-magic-lv1.rrf recording: with the buff up, every
   * skill ratio goes up by exactly x1.70 (Jupitel Thunderstorm, Hell's Drive, Jack Frost
   * Nova), x1.50 (Meteor Storm Buster, Ground Gravitation) and x2.00 (Napalm Vulcan
   * Strike). Only level 1 was recorded, so this is an on/off toggle, not a level picker.
   *
   * The physical ultimate, "Anjo do Poder" (5461), is deliberately left out: there is no
   * recording of it, and making up a percentage would be worse than leaving the gap.
   */
  private readonly activeSkillList4th: ActiveSkillModel[] = [
    {
      name: 'Angel of Magic',
      label: 'Angel of Magic',
      inputType: 'selectButton',
      dropdown: [
        { label: 'Sim', value: 1, isUse: true },
        { label: 'Não', value: 0, isUse: false },
      ],
    },
    {
      name: 'Angel of Power',
      label: 'Angel of Power',
      inputType: 'selectButton',
      dropdown: [
        { label: 'Sim', value: 1, isUse: true },
        { label: 'Não', value: 0, isUse: false },
      ],
    },
  ];
  /**
   * Both passives read "P.ATK/S.MATK +N, skill damage +N% (+2N% on one of them)" in the
   * client description. Only the P.ATK/S.MATK half lives here: the damage half is folded
   * into each skill's own ratio, because the recording shows it reaches the repeating
   * damage of a ground skill but not its first hit — a split the shared per-skill bonus
   * channel cannot express (both entries carry the same skill id).
   */
  private readonly passiveSkillList4th: PassiveSkillModel[] = [
    {
      name: 'Self Study Tactics',
      label: 'Self Study Tactics',
      inputType: 'dropdown',
      dropdown: genSkillList(10, lv => ({ pAtk: lv })),
    },
    {
      name: 'Self Study Sorcery',
      label: 'Self Study Sorcery',
      inputType: 'dropdown',
      dropdown: genSkillList(10, lv => ({ sMatk: lv })),
    },
  ];

  /**
   * How the client composes a magic/physical ratio, verified packet-exact against the
   * recording: the skill table is truncated first, then the passive's "+N% damage"
   * column is applied to that truncated value, and the ultimate multiplies last.
   */
  private withPassiveBonus(
    rawRatio: number,
    passiveBonusPercent: number,
    ultimateMultiplier = 1,
    angel: Angel = 'Angel of Magic',
  ) {
    return this.withUltimate(
      Math.floor(Math.floor(rawRatio) * (1 + passiveBonusPercent / 100)),
      ultimateMultiplier,
      angel,
    );
  }

  /** The ultimate's share alone — used by the first hit of the ground skills, which the
   *  recording shows the passive's damage bonus does not reach. */
  private withUltimate(rawRatio: number, ultimateMultiplier: number, angel: Angel = 'Angel of Magic') {
    if (!this.isSkillActive(angel)) return Math.floor(rawRatio);

    return Math.floor(Math.floor(rawRatio) * ultimateMultiplier);
  }

  constructor() {
    super();

    this.inheritSkills({
      activeSkillList: this.activeSkillList4th,
      atkSkillList: this.atkSkillList4th,
      passiveSkillList: this.passiveSkillList4th,
      classNames: this.classNames4th,
    });
  }
}
