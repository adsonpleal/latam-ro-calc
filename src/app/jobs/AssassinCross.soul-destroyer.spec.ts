import { describe, expect, it } from 'vitest';
import { loadDatasetFromDisk } from '../../../mcp/src/data/dataset.node';
import { BuildInput, resolveBuild } from '../../../mcp/src/engine/build-input';
import { solve } from '../../../mcp/src/engine/solve';
import { SkillType } from '../models/damage-summary.model';
import { clientRatioTable } from '../skills/client-ratio-table';
import { AtkSkillFormulaInput, AtkSkillModel } from './_character-base.abstract';
import { AssassinCross } from './AssassinCross';
import { GuillotineCross } from './GuillotineCross';
import { ShadowCross } from './ShadowCross';

/**
 * Card IHlKr77s69PF8VQBtRAw: Destruidor de Almas (Soul Destroyer, id 379) sat in the
 * Algoz's passive list and could not be picked as an attack, because the engine declared
 * it on the Guillotine Cross while the client puts it in the Assassin Cross tree.
 * https://issues.latam-tools.com.br/t/IHlKr77s69PF8VQBtRAw
 *
 * Sources, in the order CLAUDE.md asks for them: the client's own pt-BR description
 * ("Causa dano físico a distância influenciado pela FOR, INT e nível de base do usuário.
 * Tem chance do ataque ser crítico. A chance é a metade do CRIT do usuário.") for the
 * ratio table, the stats and the half crit rate; and bROWiki
 * (https://browiki.org/wiki/Destruidor_de_Almas) for the whole formula,
 * "(Dano base + INT + FOR) × (Nv. de base ÷ 100)".
 *
 * Not pinned here: the cast and delay times, which `skills/skill-delay.spec.ts` already
 * holds against the client feed for every class that lists the skill; and
 * `criDmgPercentage: 0.5`, which neither source states — it is the engine's convention for
 * half-crit-rate skills and came over with the definition untouched.
 */

const dataset = loadDatasetFromDisk();
const base: BuildInput = {
  class: 4013, level: 99, jobLevel: 70, gear: { weapon: 1250 },
  stats: { str: 80, agi: 80, vit: 20, int: 50, dex: 1, luk: 1 }, atkSkill: 'Soul Destroyer==10',
};

function calculate(overrides: Partial<BuildInput> = {}) {
  const resolved = resolveBuild({ ...base, ...overrides }, dataset);
  return { dmg: solve(resolved, dataset, dataset.monsters[21077]).damageSummary };
}

const skill = (): AtkSkillModel => {
  const found = new AssassinCross().atkSkills.find((entry: AtkSkillModel) => entry.name === 'Soul Destroyer');
  if (!found) throw new Error('Soul Destroyer is not an attack skill on the Assassin Cross');
  return found;
};

describe('the Algoz can attack with Destruidor de Almas', () => {
  it('resolves the skill through the engine, as ranged damage that can crit', () => {
    const { dmg } = calculate();

    expect(dmg.baseSkillDamage).toBeGreaterThan(0);
    expect(dmg.dmgType).toBe(SkillType.RANGE);
    expect(dmg.skillCanCri).toBe(true);
  });

  it('offers every level the client publishes, not only the cap', () => {
    expect(skill().levelList?.map((entry) => entry.value))
      .toEqual(Array.from({ length: 10 }, (_, index) => `Soul Destroyer==${index + 1}`));

    for (let level = 1; level <= 10; level++) {
      expect(calculate({ atkSkill: `Soul Destroyer==${level}` }).dmg.baseSkillDamage).toBeGreaterThan(0);
    }
  });

  it('is declared once, so the later generations inherit it instead of redeclaring it', () => {
    for (const cls of [new AssassinCross(), new GuillotineCross(), new ShadowCross()]) {
      const names = cls.atkSkills.map((entry: AtkSkillModel) => entry.name);
      expect(names.filter((name) => name === 'Soul Destroyer')).toHaveLength(1);
    }
  });

  it('keeps the learnable passive, which is where a saved build stores the level', () => {
    expect(new AssassinCross().passiveSkills.map((entry) => entry.name)).toContain('Soul Destroyer');
  });
});

describe('Destruidor de Almas ratio', () => {
  /** Base level 100 makes the `baseLevel / 100` factor the identity, with no stat term. */
  const ratioAt = (skillLevel: number, totalStr = 0, totalInt = 0, level = 100) => Math.floor(skill().formula(
    { skillLevel, model: { level }, status: { totalStr, totalInt } } as unknown as AtkSkillFormulaInput,
  ));

  const client = [150, 300, 450, 600, 750, 900, 1050, 1200, 1350, 1500];

  it('reads 150% per level in the client table', () => {
    expect([...(clientRatioTable('Soul Destroyer') ?? new Map()).values()]).toEqual(client);
  });

  it.each(client.map((percent, index) => ({ lv: index + 1, percent })))('Nv $lv -> $percent%', ({ lv, percent }) => {
    // The server int-casts the ratio; see [[skill-ratio-truncation]].
    expect(ratioAt(lv)).toBe(percent);
  });

  it('adds FOR and INT to the ratio, one point each, and scales the sum by base level', () => {
    expect(ratioAt(10, 120, 90)).toBe(1500 + 120 + 90);
    expect(ratioAt(10, 120, 90, 150)).toBe(Math.floor((1500 + 120 + 90) * 1.5));
  });
});
