import { ElementType, RaceType } from 'src/app/constants';
import { isNumber } from 'src/app/utils';

/**
 * Pure builders for the calculator's "Bônus de Habilidade / Multiplicadores"
 * summary tables. Each takes the engine's flat `totalSummary` (attr -> value)
 * and returns the rows the template renders. No Angular, no component state —
 * so the table-shaping logic is unit-testable on its own.
 */

/** The engine's computed summary: a flat bag of `attr -> number` (+ some non-numerics). */
export type DamageSummaryLike = Record<string, any>;

export interface ElementDataModel {
  name: string;
  /** pt-BR label shown in the UI; `name` stays English for CSS (property_*) + logic. */
  displayName?: string;
  physicalElementToMonster: number;
  magicalElementToMonster: number;
  myElement: number;
  /** Target elemental-resistance reduction (Oratio / Infecção) for this element — shown
   *  in its own "R.R. Elem." column, since it boosts my attacks of that property. */
  elementResistReduction: number;
}

export interface RaceDataModel {
  name: string;
  /** pt-BR label shown in the UI; `name` stays English for any name-based logic. */
  displayName?: string;
  physical: number;
  magical: number;
}

export interface AtkTypeDataModel {
  name: string;
  displayName?: string;
  value: number;
}

export interface SkillMultiplierModel {
  name: string;
  /** pt-BR skill label shown in the UI (falls back to `name`). */
  displayName?: string;
  /** ragassets skill-icon id (from the LATAM skill map); absent if unmapped. */
  icon?: number;
  value: number;
  cd: string;
}

const elements = Object.values(ElementType).map((a) => [a, a.toLowerCase()]);
const races = Object.values(RaceType).map((a) => [a, a.toLowerCase()]);
const sizes: [string, string][] = [
  ['Small', 's'],
  ['Medium', 'm'],
  ['Large', 'l'],
];
const monsterTypes: [string, string][] = [
  ['Boss', 'boss'],
  ['Normal', 'normal'],
];

// pt-BR labels for the summary tables. Keyed by the English identifier
// (ElementType/RaceType value or literal) that stays on `name` for CSS classes
// (property_*) and name-based logic.
const ELEMENT_PT: Record<string, string> = {
  Neutral: 'Neutro', Water: 'Água', Earth: 'Terra', Fire: 'Fogo', Wind: 'Vento',
  Poison: 'Veneno', Holy: 'Sagrado', Dark: 'Sombrio', Ghost: 'Fantasma', Undead: 'Morto-Vivo',
};
const RACE_PT: Record<string, string> = {
  Formless: 'Amorfo', Undead: 'Morto-Vivo', Brute: 'Bruto', Plant: 'Planta', Insect: 'Inseto',
  Fish: 'Peixe', Demon: 'Demônio', DemiHuman: 'Semi-Humano', Angel: 'Anjo', Dragon: 'Dragão',
};
const SIZE_PT: Record<string, string> = { Small: 'Pequeno', Medium: 'Médio', Large: 'Grande' };
const MONSTER_TYPE_PT: Record<string, string> = { Boss: 'Chefe', Normal: 'Normal' };
const ATK_TYPE_PT: Record<string, string> = { Melee: 'Corpo a corpo', Range: 'À distância', MATK: 'MATK' };

// Each numeric cell gets an optional `<field>2` compare counterpart, sourced from
// `compareSummary` (the build being compared). The template shows a `main → sim`
// arrow when the two differ. Passing no `compareSummary` keeps the old shape (no
// `*2` keys), so non-comparison callers — and their `toEqual` tests — are unchanged.

/** Target elemental-resistance reductions that make MY attacks of that property land for
 *  more. The engine adds these straight onto the property modifier (see damage-calculator
 *  `getElementResistReduction`): Oratio → Sagrado; Infecção (Maldição de Jormungand) and
 *  Intoxicação (Poço Venenoso) → Veneno (they stack); Geladinho (Jack Frost Nova) → Água.
 *  They affect both physical and magical attacks of that element (so NOT a magic-only
 *  "Elem. Mágico" bonus) — hence their own "R.R. Elem." column. Keyed by lowercase element;
 *  each element lists every bonus key that feeds the column. */
export const RESIST_REDUCTION_KEYS_BY_ELE: Record<string, string[]> = { holy: ['oratio'], poison: ['infection', 'intoxication'], water: ['bitterCold'] };

function elementCell(summary: DamageSummaryLike, ele: string) {
  const reductionKeys = RESIST_REDUCTION_KEYS_BY_ELE[ele] ?? [];
  return {
    physicalElementToMonster: (summary['p_element_all'] || 0) + (summary[`p_element_${ele}`] || 0),
    magicalElementToMonster: (summary['m_element_all'] || 0) + (summary[`m_element_${ele}`] || 0),
    myElement: (summary['m_my_element_all'] || 0) + (summary[`m_my_element_${ele}`] || 0),
    elementResistReduction: reductionKeys.reduce((sum, k) => sum + (summary[k] || 0), 0),
  };
}

export function buildElementTable(totalSummary: DamageSummaryLike, compareSummary?: DamageSummaryLike): ElementDataModel[] {
  return elements.map(([eleShow, ele]) => {
    const row: any = { name: eleShow, displayName: ELEMENT_PT[eleShow] ?? eleShow, ...elementCell(totalSummary, ele) };
    if (compareSummary) {
      const c = elementCell(compareSummary, ele);
      row.physicalElementToMonster2 = c.physicalElementToMonster;
      row.magicalElementToMonster2 = c.magicalElementToMonster;
      row.myElement2 = c.myElement;
      row.elementResistReduction2 = c.elementResistReduction;
    }
    return row;
  });
}

/** Sum the `<prefix>all` bonus with the category-specific `<prefix><key>` bonus. */
function sumBonus(summary: DamageSummaryLike, prefix: string, key: string): number {
  return (summary[`${prefix}all`] || 0) + (summary[`${prefix}${key}`] || 0);
}

/** A `{ physical, magical }` row for a `p_`/`m_` bonus family, with optional `*2` compare. */
function physMagRow(
  name: string,
  displayName: string,
  key: string,
  base: string,
  totalSummary: DamageSummaryLike,
  compareSummary?: DamageSummaryLike,
): RaceDataModel {
  const row: any = {
    name,
    displayName,
    physical: sumBonus(totalSummary, `p_${base}_`, key),
    magical: sumBonus(totalSummary, `m_${base}_`, key),
  };
  if (compareSummary) {
    row.physical2 = sumBonus(compareSummary, `p_${base}_`, key);
    row.magical2 = sumBonus(compareSummary, `m_${base}_`, key);
  }
  return row;
}

export function buildRaceTables(
  totalSummary: DamageSummaryLike,
  compareSummary?: DamageSummaryLike,
): { raceTable: RaceDataModel[]; peneRaceTable: RaceDataModel[] } {
  const raceTable = races.map(([raceShow, race]) => physMagRow(raceShow, RACE_PT[raceShow] ?? raceShow, race, 'race', totalSummary, compareSummary));
  const peneRaceTable = races.map(([raceShow, race]) => physMagRow(raceShow, RACE_PT[raceShow] ?? raceShow, race, 'pene_race', totalSummary, compareSummary));

  return { raceTable, peneRaceTable };
}

export function buildSizeTable(totalSummary: DamageSummaryLike, compareSummary?: DamageSummaryLike): RaceDataModel[] {
  return sizes.map(([sizeShow, size]) => physMagRow(sizeShow, SIZE_PT[sizeShow] ?? sizeShow, size, 'size', totalSummary, compareSummary));
}

export function buildMonsterTypeTables(
  totalSummary: DamageSummaryLike,
  compareSummary?: DamageSummaryLike,
): { classTable: RaceDataModel[]; peneClassTable: RaceDataModel[] } {
  const classTable = monsterTypes.map(([classShow, _class]) => physMagRow(classShow, MONSTER_TYPE_PT[classShow] ?? classShow, _class, 'class', totalSummary, compareSummary));
  const peneClassTable = monsterTypes.map(([classShow, _class]) => physMagRow(classShow, MONSTER_TYPE_PT[classShow] ?? classShow, _class, 'pene_class', totalSummary, compareSummary));

  return { classTable, peneClassTable };
}

export function buildAtkTypeTable(totalSummary: DamageSummaryLike, compareSummary?: DamageSummaryLike): AtkTypeDataModel[] {
  const attr: Record<string, string> = { Melee: 'melee', Range: 'range', MATK: 'matkPercent' };
  return ['Melee', 'Range', 'MATK'].map((name) => {
    const row: any = { name, displayName: ATK_TYPE_PT[name], value: totalSummary[attr[name]] || 0 };
    if (compareSummary) row.value2 = compareSummary[attr[name]] || 0;
    return row;
  });
}

/**
 * Build the skill-multiplier rows. Any capitalised summary attr is treated as a
 * skill multiplier; `cd__<skill>` attrs fold a cooldown delta into the matching
 * row. `resolveSkill` overlays the pt-BR name + icon when the row maps to a
 * known LATAM skill.
 */
/** Collect the skill-multiplier rows (name -> { value?, cd? }) from one summary. */
function collectSkillMultipliers(summary: DamageSummaryLike): Map<string, any> {
  const dMap = new Map<string, any>();
  const addValue = (key: string, val: Partial<SkillMultiplierModel>) => {
    dMap.set(key, dMap.has(key) ? { ...dMap.get(key), ...val } : val);
  };

  for (const [attr, value] of Object.entries(summary)) {
    if (!isNumber(value)) continue;

    const firstCap = attr.charAt(0);
    if (firstCap === firstCap.toUpperCase()) {
      addValue(attr, { name: attr, value });
      continue;
    }

    if (attr.startsWith('cd__')) {
      const actualAttr = attr.replace('cd__', '');
      addValue(actualAttr, {
        name: actualAttr,
        cd: value < 0 ? `+${value * -1}` : `-${value}`,
      });
    }
  }

  return dMap;
}

export function buildSkillMultiplierTable(
  totalSummary: DamageSummaryLike,
  resolveSkill: (name: string) => { id: number; name: string } | undefined,
  compareSummary?: DamageSummaryLike,
): SkillMultiplierModel[] {
  const dMap = collectSkillMultipliers(totalSummary);
  // Comparing: union the compare build's skills so a multiplier that only the
  // compared item grants (or one it removes) still gets a row with a `*2` value.
  const compareMap = compareSummary ? collectSkillMultipliers(compareSummary) : undefined;
  const names = [...dMap.keys()];
  if (compareMap) for (const name of compareMap.keys()) if (!dMap.has(name)) names.push(name);

  return names.map((name) => {
    const row: any = { ...(dMap.get(name) ?? { name }) };
    if (compareMap) {
      const c = compareMap.get(name);
      row.value2 = c?.value ?? 0;
      row.cd2 = c?.cd ?? '';
    }
    const pt = resolveSkill(row.name);
    return pt ? { ...row, displayName: pt.name, icon: pt.id } : row;
  });
}
