/**
 * Runs the real calculation pipeline, ported from `RoCalculatorComponent#prepare`
 * (non-compare branch) plus `#calculate`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SYNCHRONOUS SECTION — do not introduce `await` anywhere between newInstance()
 * and the end of this function.
 *
 * The engine is stateful, and this module's safety argument rests entirely on the
 * event loop not being able to interleave two solves. A single `await` in here
 * would let a second request mutate the same shared class/JobBuffs state mid-solve
 * and produce silently wrong damage.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { JobBuffs } from 'src/app/constants/job-buffs';
import { Calculator } from 'src/app/core/calculator';
import { applyGuaranaCandy, CalculatorController, collectBuffBonuses, collectConsumables } from 'src/app/core/calculator-controller';
import { parseOptionScripts } from 'src/app/core/option-scripts';
import { Dataset } from '../data/dataset';
import { ResolvedBuild } from './build-input';

const controller = new CalculatorController();

/**
 * Solve a build against a target and return the (stateful) Calculator, so callers can
 * read summaries or re-target it cheaply via `setMonster().prepareAllItemBonus()`.
 *
 * `selectedChances` is intentionally empty on the first pass: the available proc
 * effects only exist on `calc.chanceList` *after* a solve, so a caller wanting them
 * applied re-solves with `effects`.
 */
export function solve(rb: ResolvedBuild, dataset: Dataset, monster: any, effects: string[] = []): Calculator {
  const { model, char } = rb;

  const { equipAtks, masteryAtks, activeSkillNames, learnedSkillMap } = char
    .setLearnSkills({ activeSkillIds: (model as any).activeSkills, passiveSkillIds: (model as any).passiveSkills })
    .getSkillBonusAndName();

  const { scripts: consumeData, usedHpL } = collectConsumables(model as any, dataset.items);
  const { aspdPotion, buffBonuses } = applyGuaranaCandy({
    consumables: (model as any).consumables,
    aspdPotion: (model as any).aspdPotion,
    buffDefs: JobBuffs,
    selectedBuffValues: (model as any).skillBuffs,
    activeSkillNames,
    buffBonuses: collectBuffBonuses(JobBuffs, (model as any).skillBuffs, activeSkillNames),
  });

  const calc = new Calculator()
    .setMasterItems(dataset.items)
    .setHpSpTable(dataset.hpSpTable)
    .setClass(char)
    .loadItemFromModel(model as any);

  controller.runChain(calc, {
    monster,
    equipAtks,
    masteryAtks,
    buffEquips: buffBonuses.equipAtk,
    buffMasterys: buffBonuses.masteryAtk,
    consumeData,
    aspdPotion,
    extraOptionScripts: parseOptionScripts((model as any).rawOptionTxts),
    activeSkillNames,
    learnedSkillMap,
    selectedAtkSkill: (model as any).selectedAtkSkill,
    selectedChances: effects,
    usedHpL,
  });

  return calc;
}
