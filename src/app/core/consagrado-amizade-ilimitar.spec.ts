import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CharacterBase, Troubadour, Trouvere } from '../jobs';
import { createMainModel } from '../utils';
import { CalculatorController, collectChanceSources } from './calculator-controller';
import { makeCalculator } from './__tests__/make-calculator';

/**
 * Colar Consagrado: Amizade (491112), Ilimitar branch.
 *
 * Tracker 07U7lMEjHBdbQ1AH8aP3: a Maestro/Diva player could not switch the buff on even
 * though the necklace grants it. `latam-items.json` states the clause under the "Açoite
 * Vivatus Fides ou Violino Vivatus Fides" Conjunto, weapon at refine +10: "Ao usar
 * [Atirar Rosas], 3% de chance de ativar o efeito de [Ilimitar] nv.3 por 5 segundos."
 * (491112's item.json record carries no description of its own.)
 *
 * It is an activation, not a learned buff: an `autoCastEffect` ticked in Efeitos, the same
 * mechanism as the Bota Temporal's Instinto and the Boné Maratonista's ten-second state.
 * Three conditions gate it — the Conjunto weapon, that weapon's refine, and [Atirar Rosas]
 * being in the rotation, since nothing else can activate it.
 *
 * `range` 250 is the skill's own client table (id 5002, "Nível l Dano físico a distância":
 * x1,5 … x3,5, i.e. 100 + 50 per level) read at nv.3. Both Conjunto weapons are long-range
 * (`IsLongRange` in src/app/domain/weapon.ts), so the bonus does reach Atirar Rosas.
 */

const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const HP_SP_TABLE = JSON.parse(readFileSync('src/assets/demo/data/hp_sp_table.json', 'utf8'));
/** "Dummy - Médio": resists nothing, so a ranged bonus arrives whole. `makeCalculator`'s
 *  INERT_MONSTER is not usable here — it carries its element under `stats` only, and the
 *  full `runChain` damage pass reads `monster.elementName` at the top level. */
const MONSTER = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'))[21065];

const NECKLACE = 491112;
const EFFECT = 'Ilimitar do Colar Consagrado: Amizade';
const ROSE = 'Rose Blossom==5';
/** `usableClass` locks one Conjunto weapon to each class: 570019 Violino is Troubadour-only
 *  and 580019 Açoite is Trouvere-only. 570020 Harpa belongs to the same Conjunto but to its
 *  magic branch (Fúria Estridente), whose clause does not mention Ilimitar. */
const VIOLINO = 570019;
const ACOITE = 580019;
const HARPA = 570020;

const CLASSES = [
  { name: 'Maestro', make: () => new Troubadour(), weapon: VIOLINO },
  { name: 'Diva', make: () => new Trouvere(), weapon: ACOITE },
];

function solve(cls: CharacterBase, overrides: Record<string, unknown> = {}, selectedChances: string[] = []) {
  const calc = makeCalculator(db, cls).setHpSpTable(HP_SP_TABLE);
  const { equipAtks, masteryAtks, activeSkillNames, learnedSkillMap } = cls
    .setLearnSkills({ activeSkillIds: [], passiveSkillIds: [] }).getSkillBonusAndName();
  const model = Object.assign(createMainModel(), {
    level: 250, jobLevel: 50, pow: 100, con: 100, dex: 100,
    weaponRefine: 10, accLeft: NECKLACE, rotation: [ROSE], selectedAtkSkill: ROSE,
  }, overrides);

  calc.loadItemFromModel(model);
  new CalculatorController().runChain(calc, {
    monster: MONSTER, equipAtks, masteryAtks, buffEquips: {}, buffMasterys: {}, consumeData: [],
    aspdPotion: 0, extraOptionScripts: [], activeSkillNames, learnedSkillMap,
    selectedAtkSkill: model.selectedAtkSkill, selectedChances, usedHpL: false,
  } as any);

  return calc;
}

const effectOf = (cls: CharacterBase, overrides: Record<string, unknown> = {}) =>
  solve(cls, overrides).chanceList.find((entry) => entry.name === EFFECT);

describe('Colar Consagrado: Amizade offers Ilimitar as an activation', () => {
  it.each(CLASSES)('the $name sees it in Efeitos, labelled with its trigger and duration', ({ make, weapon }) => {
    const effect = effectOf(make(), { weapon })!;

    expect(effect.label).toBe('Colar Consagrado: Amizade — Ilimitar nv.3');
    expect(effect.label2).toContain('Ao usar Atirar Rosas · 5 segundos');
    expect(effect.bonus).toEqual({ range: 250 });
    expect(effect.itemId).toBe(NECKLACE);
  });

  it.each(CLASSES)('the $name only sees it while Atirar Rosas is in the rotation', ({ make, weapon }) => {
    expect(effectOf(make(), { weapon, rotation: ['Rhythm Shooting==5'], selectedAtkSkill: 'Rhythm Shooting==5' })).toBeUndefined();
    // A second skill beside the trigger is still a rotation that casts it.
    expect(effectOf(make(), { weapon, rotation: ['Rhythm Shooting==5', ROSE] })).toBeDefined();
  });

  it('reads the single-skill mirror too, which is all the older readings set', () => {
    // MainModel.selectedAtkSkill mirrors the rotation's first real entry; the "Resumo de
    // Batalha (antigo)" tab, the MCP server and most engine specs set only that.
    expect(effectOf(new Troubadour(), { weapon: VIOLINO, rotation: [] })).toBeDefined();
    expect(effectOf(new Troubadour(), { weapon: VIOLINO, rotation: [], selectedAtkSkill: '' })).toBeUndefined();
  });

  it('needs the Conjunto weapon, at +10, and the necklace', () => {
    expect(effectOf(new Troubadour(), { weapon: VIOLINO, weaponRefine: 9 })).toBeUndefined();
    expect(effectOf(new Troubadour(), { weapon: HARPA })).toBeUndefined();
    expect(effectOf(new Troubadour(), { weapon: VIOLINO, accLeft: 0 })).toBeUndefined();
  });

  it.each(CLASSES)('hands the $name engine 250% ranged damage once ticked, and nothing before', ({ make, weapon }) => {
    const calc = solve(make(), { weapon }, [EFFECT]);

    expect(collectChanceSources(calc.chanceList, [EFFECT])).toEqual({ [`chance_${NECKLACE}`]: { range: 250 } });
    expect(collectChanceSources(calc.chanceList, [])).toEqual({});
  });

  it.each(CLASSES)('raises the $name Atirar Rosas damage only while it is ticked', ({ make, weapon }) => {
    const off = solve(make(), { weapon }).getTotalSummary().dmg;
    const on = solve(make(), { weapon }, [EFFECT]).getTotalSummary().dmg;

    expect(off.skillMaxDamage).toBeGreaterThan(0);
    expect(on.skillMaxDamage).toBe(off.skillMaxDamage);
    expect(on.effectedSkillDamageMax).toBeGreaterThan(on.skillMaxDamage);
  });
});
