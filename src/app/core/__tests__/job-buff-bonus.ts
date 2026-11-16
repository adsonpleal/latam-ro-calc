import { JobBuffs } from 'src/app/constants/job-buffs';
import { collectBuffBonuses } from '../calculator-controller';

/**
 * Resolving shared buffs by name, for the specs that need one.
 *
 * A spec cannot pick a received buff positionally: `JobBuffs` grows, and an index written
 * down today lands on a different buff tomorrow. Everything here keys off the name and
 * throws when it does not resolve, so a renamed buff fails on the name rather than on a
 * silently empty bonus.
 */

/** The `JobBuffs` row with this name. */
export function jobBuffEntry(name: string) {
  const entry = JobBuffs.find((buff) => buff.name === name);
  if (!entry) throw new Error(`${name} is not a shared job buff`);

  return entry;
}

/** The option that row offers for `level` — what the dropdown would have selected. */
export function jobBuffOption(name: string, level: number) {
  const option = jobBuffEntry(name).dropdown.find((o) => o.isUse && (o.skillLv ?? o.value) === level);
  if (!option) throw new Error(`${name} has no option for level ${level}`);

  return option;
}

/**
 * The `buffEquips` / `buffMasterys` maps the chain expects, for the buffs named in
 * `levels` — the same thing the view model produces from the buff panel. A buff that is
 * off is left out of `levels` rather than given level 0.
 *
 * `activeSkillNames` is passed through because `collectBuffBonuses` drops a buff the class
 * already casts itself — a caller reproducing a build that casts one has to say so.
 */
export function jobBuffBonuses(levels: Record<string, number>, activeSkillNames = new Set<string>()) {
  const chosen = new Map(Object.entries(levels).map(([name, level]) => [name, jobBuffOption(name, level).value]));

  return collectBuffBonuses(JobBuffs, JobBuffs.map((buff) => chosen.get(buff.name) ?? 0), activeSkillNames);
}
