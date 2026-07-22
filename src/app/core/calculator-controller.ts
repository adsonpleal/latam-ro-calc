import { MainModel } from 'src/app/models/main.model';
import { MonsterModel } from 'src/app/models/monster.model';
import { Calculator } from './calculator';
import { PlayerTargetProfile, PvpMode } from './pvp';

/**
 * Framework-free orchestration for the calculator.
 *
 * The UI component owns form state and DOM concerns; everything that turns that
 * state into a solved {@link Calculator} lives here so it can be unit-tested
 * without Angular. The two `collect*` helpers are pure (state in, value out) and
 * {@link CalculatorController.runChain} is the single "solve the whole thing"
 * entry point that drives the engine's fluent pipeline.
 */

/** A consumable/aspd item id whose script is one of the calculator's buffs. */
type ConsumableId = number;

/** The id of the Superior Battle Pill — when active it suppresses the regular
 *  Battle Pill (12791) so the two don't stack. */
const SUPERIOR_BATTLE_PILL = 12792;
const REGULAR_BATTLE_PILL = 12791;
/** HP Increase Potion (L) — consumed flag is needed by the HP/SP step. */
const HP_INCREASE_POTION_L = 12424;

export interface ConsumableSelection {
  /** The item scripts to feed into `Calculator.setConsumables`. */
  scripts: any[];
  /** Per-consumable numeric bonus maps for the bonus-breakdown modal, keyed
   *  `consumable_<itemId>`. Only plain numeric script entries are kept —
   *  conditional tokens don't apply to consumables. */
  sources: Record<string, Record<string, number>>;
  /** Whether HP Increase Potion (L) is active (drives the HP/SP calc). */
  usedHpL: boolean;
  /** Whether the Superior Battle Pill is active (suppresses the regular one). */
  usedSupBattlePill: boolean;
}

/**
 * Resolve the active consumable scripts from the model's selected ids.
 * Mirrors the rule that the Superior Battle Pill replaces the regular one.
 */
export function collectConsumables(
  model: Pick<MainModel, 'consumables' | 'consumables2' | 'aspdPotions'>,
  items: Record<number, { script?: any }>,
): ConsumableSelection {
  const consumables = model.consumables ?? [];
  const usedSupBattlePill = consumables.includes(SUPERIOR_BATTLE_PILL);
  const usedHpL = consumables.includes(HP_INCREASE_POTION_L);

  const ids = [...consumables, ...(model.consumables2 ?? []), ...(model.aspdPotions ?? [])]
    .filter(Boolean)
    // when the superior pill is on, drop the regular pill so they don't stack
    .filter((id: ConsumableId) => !usedSupBattlePill || id !== REGULAR_BATTLE_PILL);

  const sources: Record<string, Record<string, number>> = {};
  for (const id of ids) {
    const script = items[id]?.script;
    if (!script || typeof script !== 'object') continue;
    const bonus: Record<string, number> = {};
    for (const [attr, value] of Object.entries(script)) {
      const num = Number(value); // script values are single-entry arrays, e.g. ["7"]
      if (Number.isFinite(num) && num !== 0) bonus[attr] = num;
    }
    if (Object.keys(bonus).length) sources[`consumable_${id}`] = bonus;
  }

  return { scripts: ids.map((id: ConsumableId) => items[id].script), sources, usedHpL, usedSupBattlePill };
}

/**
 * Display-only breakdown sources for the selected ASPD potions (Concentração 645,
 * Despertar 656, Fúria 657, Poção de Ouro 12684). Their effect isn't a plain
 * script bonus — it's an AGI-scaled term inside the ASPD formula — so they never
 * appear via {@link collectConsumables}. Here we surface each one's fixed potion
 * value under `aspdPercent` purely so the VelAtq bonus-breakdown modal can list it
 * (keyed `consumable_<id>` to reuse the item label/icon resolver). NOT fed to the
 * engine, so it can't double-count.
 */
export function collectAspdPotionSources(
  model: Pick<MainModel, 'aspdPotion' | 'aspdPotions'>,
  fixBonus: Map<number, number>,
  totalAgi: number,
): { sources: Record<string, Record<string, number>>; tooltips: Record<string, string> } {
  const sources: Record<string, Record<string, number>> = {};
  const tooltips: Record<string, string> = {};
  const add = (id?: number) => {
    const bonus = id ? fixBonus.get(id) : undefined;
    if (!bonus) return;
    // An ASPD potion is a flat bonus fed through `potionAspds` and scaled by AGI
    // (× AGI / 200), NOT an ASPD% multiplier. Surface that real AGI-scaled value in
    // the breakdown (the nominal bonus would over-state it), with the formula in a
    // tooltip so the AGI dependency is clear.
    const scaled = Math.round((bonus * totalAgi) / 200);
    sources[`consumable_${id}`] = { aspd: scaled };
    tooltips[`consumable_${id}`] = `VelAtq da poção é baseada na AGI: ${bonus} × AGI ${totalAgi} ÷ 200 ≈ ${scaled}.`;
  };
  add(model.aspdPotion);
  for (const id of model.aspdPotions ?? []) add(id);
  return { sources, tooltips };
}

/** One selectable buff row (a subset of `JobBuffs`). */
export interface BuffDef {
  name: string;
  isMasteryAtk?: boolean;
  dropdown: { value: any; isUse?: boolean; bonus?: any }[];
}

/** Guarana Candy — on use it casts Increase Agility Lv 5 and applies the
 *  Concentration Potion effect. Neither part stacks with a stronger source:
 *  a selected ASPD potion replaces the Concentration part, and a higher-level
 *  "Aumentar Agilidade" buff (or the character casting it) replaces the
 *  Increase Agility part. */
export const GUARANA_CANDY = 12414;
const CONCENTRATION_POTION = 645;
/** The `JobBuffs` row that models "Aumentar Agilidade". */
const INC_AGI_BUFF = 'Cantocandidus';
const GUARANA_INC_AGI_LEVEL = 5;
/** Increase Agility Lv 5 on the job-buff table's scale (agi = 2 + lv, aspd% = lv). */
const GUARANA_INC_AGI_BONUS = { agi: 7, aspdPercent: 5 };

/**
 * Layer Guarana Candy's two effects onto the already-collected buff bonuses
 * and the selected ASPD potion, applying the no-stack rules above. Pure:
 * returns the (possibly new) buff bonuses and the effective potion id.
 */
export function applyGuaranaCandy(input: {
  consumables: number[];
  aspdPotion: number | undefined;
  buffDefs: BuffDef[];
  selectedBuffValues: any[];
  activeSkillNames: Set<string>;
  buffBonuses: BuffBonuses;
}): { aspdPotion: number | undefined; buffBonuses: BuffBonuses } {
  const { consumables, aspdPotion, buffDefs, selectedBuffValues, activeSkillNames, buffBonuses } = input;
  if (!(consumables ?? []).includes(GUARANA_CANDY)) return { aspdPotion, buffBonuses };

  const i = buffDefs.findIndex((b) => b.name === INC_AGI_BUFF);
  const selected = i >= 0 ? buffDefs[i].dropdown.find((d) => d.value === selectedBuffValues?.[i]) : undefined;
  const selectedLevel = selected?.isUse ? selected.value : 0;
  const outranked = activeSkillNames.has(INC_AGI_BUFF) || selectedLevel >= GUARANA_INC_AGI_LEVEL;

  return {
    aspdPotion: aspdPotion || CONCENTRATION_POTION,
    buffBonuses: outranked
      ? buffBonuses
      : { ...buffBonuses, equipAtk: { ...buffBonuses.equipAtk, [INC_AGI_BUFF]: GUARANA_INC_AGI_BONUS } },
  };
}

export interface BuffBonuses {
  /** Buffs applied as equipment-style atk bonuses. */
  equipAtk: Record<string, any>;
  /** Buffs applied as mastery atk bonuses. */
  masteryAtk: Record<string, any>;
}

/**
 * Resolve the selected buff dropdown values into equip/mastery bonus maps.
 * A buff that the character already casts as an active skill is skipped (the
 * active skill already contributes it).
 */
export function collectBuffBonuses(buffDefs: BuffDef[], selectedValues: any[], activeSkillNames: Set<string>): BuffBonuses {
  const equipAtk: Record<string, any> = {};
  const masteryAtk: Record<string, any> = {};

  buffDefs.forEach((buffDef, i) => {
    const selected = buffDef.dropdown.find((d) => d.value === selectedValues[i]);
    if (!selected?.isUse || activeSkillNames.has(buffDef.name)) return;

    if (buffDef.isMasteryAtk) masteryAtk[buffDef.name] = selected.bonus;
    else equipAtk[buffDef.name] = selected.bonus;
  });

  return { equipAtk, masteryAtk };
}

/** Everything the fluent solve pipeline needs once items are loaded. */
export interface CalcChainInput {
  monster: MonsterModel;
  /** PVP: when set, the target is a player and this profile replaces `monster`. */
  playerTarget?: PlayerTargetProfile;
  /** PVP mode selecting the castle reduction layer (defaults to open PVP). */
  pvpMode?: PvpMode;
  equipAtks: Record<string, any>;
  masteryAtks: Record<string, any>;
  buffEquips: Record<string, any>;
  buffMasterys: Record<string, any>;
  consumeData: any[];
  aspdPotion: any;
  extraOptionScripts: any[];
  activeSkillNames: Set<string>;
  learnedSkillMap: Map<string, number>;
  selectedAtkSkill: any;
  selectedChances: any;
  usedHpL: boolean;
}

export class CalculatorController {
  /**
   * Drive the engine's fluent pipeline to fully solve a (already class-set,
   * already item-loaded) calculator: bonuses, atk, defs, HP/SP and damage.
   * This is the single place the whole computed state is produced.
   */
  runChain(calc: Calculator, input: CalcChainInput): Calculator {
    // PVP: a player target replaces the monster (setPlayerTarget also arms the
    // reduction context). Otherwise the normal vs-monster path.
    if (input.playerTarget) {
      calc.setPlayerTarget(input.playerTarget, input.pvpMode ?? 'pvp');
    } else {
      calc.setMonster(input.monster);
    }
    return calc
      .setEquipAtkSkillAtk(input.equipAtks)
      .setBuffBonus({ masteryAtk: input.buffMasterys, equipAtk: input.buffEquips })
      .setMasterySkillAtk(input.masteryAtks)
      .setConsumables(input.consumeData)
      .setAspdPotion(input.aspdPotion)
      .setExtraOptions(input.extraOptionScripts)
      .setUsedSkillNames(input.activeSkillNames)
      .setLearnedSkills(input.learnedSkillMap)
      .setOffensiveSkill(input.selectedAtkSkill)
      .prepareAllItemBonus()
      .calcAllAtk()
      .setSelectedChances(input.selectedChances)
      .calcAllDefs()
      .calculateHpSp({ isUseHpL: input.usedHpL })
      .calculateAllDamages(input.selectedAtkSkill);
  }
}
