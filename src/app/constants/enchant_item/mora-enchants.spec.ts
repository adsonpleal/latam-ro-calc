import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SLOTS_BY_KEY } from '../../app-config/equipment-slots';
import { bonusKeyLabel } from '../../core/bonus-key-label';
import { Calculator } from '../../core/calculator';
import { deriveSlot } from '../../core/equipment-slot-derivation';
import { ArchBishop } from '../../jobs';
import { ItemModel } from '../../models/item.model';
import { createMainModel } from '../../utils';
import { ItemTypeEnum } from '../item-type.enum';
import { MORA_ENCHANTS_BY_ID } from './mora';

/**
 * Relíquias de Mora enchants (tracker card xIlnddHoI4wlYFqVqI2B, "não é possível colocar os
 * encantamentos nas peças do set Manuk"). The pools are bROWiki's Encantamentos de Mora,
 * read by label; see mora.ts for how the two page shapes map onto positions.
 *
 * Fifteen of the stones those pools name were not in item.json at all (DEFM +2/4/6/8, DEF
 * +6/9/12, HP +100, Esquiva +1/3/12, Fator de Cura 1-4), and five that were could not be
 * picked: the enchant map is keyed by aegisName, and Esquiva +6 / Cura 1 / Catolicismo 1
 * all carried "안실라" while Cura 1 and Catolicismo 1 were typed as cards with empty scripts.
 */

const items: Record<string, ItemModel> = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const latam: Record<string, { name: string }> = JSON.parse(readFileSync('src/assets/demo/data/latam-items.json', 'utf8'));

const ENCHANT = 11;
const enchantItems = Object.values(items).filter((item) => item.itemTypeId === ENCHANT);
const mapEnchant = new Map(enchantItems.map((item) => [item.aegisName, item]));

const byAegis = (aegisName: string) => mapEnchant.get(aegisName)!;

/** The pt-BR names each enchant position offers, as the picker would render them. */
const offered = (key: ItemTypeEnum, id: number): (string[] | null)[] =>
  deriveSlot({ descriptor: SLOTS_BY_KEY.get(key)!, item: items[id], mapEnchant, refineList: [], shadowRefineList: [] }).enchantLists.map(
    (list) => list && list.map((option) => latam[option.value as number]?.name ?? String(option.value)),
  );

describe('the Mora relic table', () => {
  it('covers the 58 relics on the page, every one a LATAM item in the database', () => {
    const ids = Object.keys(MORA_ENCHANTS_BY_ID);
    expect(ids).toHaveLength(58);
    for (const id of ids) {
      expect(items[id], id).toBeDefined();
      expect(latam[id], id).toBeDefined();
    }
  });

  it('names only enchant stones that exist, so a typo cannot silently empty a list', () => {
    const names = new Set(Object.values(MORA_ENCHANTS_BY_ID).flatMap((positions) => positions.flatMap((p) => p ?? [])));
    const unknown = [...names].filter((name) => !mapEnchant.has(name));

    expect(unknown).toEqual([]);
  });

  it('leaves no two enchant stones sharing an aegisName, bar the one pair that predates it', () => {
    const seen = new Map<string, number[]>();
    for (const item of enchantItems) seen.set(item.aegisName, [...(seen.get(item.aegisName) ?? []), item.id]);
    const shared = [...seen.entries()].filter(([, ids]) => ids.length > 1);

    // 4993/29057 "푸른묘안석" is not a Mora stone; the ratchet is that nothing joins it.
    expect(shared).toEqual([['푸른묘안석', [4993, 29057]]]);
  });
});

describe('the Manuk set of the card', () => {
  it('Botas dos Manuks: three enchants, Pesquisa Básica 1 plus Pesquisa sobre Crítico', () => {
    const [card, ...enchants] = offered(ItemTypeEnum.boot, 2477);

    expect(card).toBeNull();
    for (const list of enchants) {
      expect(list).toEqual(expect.arrayContaining(['DEF +6', 'DEFM +4', 'SP +150', 'VIT +1', 'Pedra de Crítico 3', 'CRIT +7', 'SOR +5']));
      expect(list).not.toContain('Espírito do Lutador 1');
    }
  });

  it('Capuz dos Manuks: three enchants, Esquiva plus Crítico', () => {
    const [, ...enchants] = offered(ItemTypeEnum.garment, 2577);

    for (const list of enchants) {
      expect(list).toEqual(expect.arrayContaining(['Esquiva +1', 'Esquiva +3', 'Esquiva +6', 'Esquiva +12', 'AGI +5', 'Pedra de Crítico 1']));
    }
  });

  it('Vestimenta dos Manuks: three enchants, Crítico plus Corporal', () => {
    const [, ...enchants] = offered(ItemTypeEnum.armor, 15038);

    for (const list of enchants) {
      expect(list).toEqual(expect.arrayContaining(['CRIT +5', 'DEF +9', 'HP +100', 'Vel.Atq +1']));
    }
  });

  it('Anel dos Manuks: two enchants, in the last two positions', () => {
    const [, second, third, fourth] = offered(ItemTypeEnum.accRight, 2886);

    expect(second).toEqual([]);
    expect(third).toEqual(expect.arrayContaining(['DEF +9', 'AGI +2']));
    expect(fourth).toEqual(third);
  });
});

describe('relics that share a Korean aegisName still take their own pool', () => {
  it('Cajado do Açoite de Ouro and its Fortalecido version differ', () => {
    const [, plainSlot2, plainSlot3] = offered(ItemTypeEnum.weapon, 2007);
    const [, strongSlot2, strongSlot3] = offered(ItemTypeEnum.weapon, 2011);

    expect(items[2007].aegisName).toBe(items[2011].aegisName);
    expect(plainSlot2).toEqual([]);
    expect(plainSlot3).toEqual(expect.arrayContaining(['INT +5', 'ATQM +2%', 'SP +50', 'HP +100']));
    expect(strongSlot2).toEqual(expect.arrayContaining(['Pedra de Encantamento 1', 'INT +5', 'ATQM +3%']));
    expect(strongSlot3).toEqual(strongSlot2);
  });

  it('Cajado da Afeição Fortalecido opens Fator de Cura', () => {
    expect(offered(ItemTypeEnum.weapon, 1660)[1]).toEqual(expect.arrayContaining(['Fator de Cura 1', 'Fator de Cura 4', 'Pedra de Encantamento 4']));
    expect(offered(ItemTypeEnum.weapon, 1657)[2]).not.toContain('Fator de Cura 1');
  });

  it('each Arcebispo accessory carries its own signature stone in the fourth position', () => {
    expect(offered(ItemTypeEnum.accRight, 2864)[3]).toContain('Cura 1');
    expect(offered(ItemTypeEnum.accRight, 2865)[3]).toContain('Catolicismo 1');
    expect(offered(ItemTypeEnum.accRight, 2866)[3]).toContain('Fator de Cura 1');
    expect(offered(ItemTypeEnum.accRight, 2864)[3]).not.toContain('Catolicismo 1');
  });
});

describe('the stones', () => {
  it.each([
    ['Evasion1', { flee: ['1'] }],
    ['Evasion12', { flee: ['12'] }],
    ['Mdef8', { mdef: ['8'] }],
    ['Def12', { def: ['12'] }],
    ['HP100', { hp: ['100'] }],
    ['Heal_Amount2', { healPower: ['3'] }],
    ['Heal_Amount5', { healPower: ['20'], spCostPercent: ['15'] }],
    ['Highness_Heal_3sec', { cd__2051: ['3'] }],
    ['Coluceo_Heal30', { spCost__2043: ['-30'] }],
  ])('%s carries its client text', (aegisName, script) => {
    expect(byAegis(aegisName).script).toEqual(script);
  });

  it('labels the per-skill effects by the skill they name', () => {
    expect(bonusKeyLabel('cd__2051')).toContain('Curatio');
    expect(bonusKeyLabel('spCost__2043')).toBe('Custo de SP de Sopro Divino');
  });

  it('adds the display-only lines to the build totals', () => {
    const totalsWith = (withEnchants: boolean) => {
      const cls = new ArchBishop();
      cls.setLearnSkills({ activeSkillIds: [], passiveSkillIds: [] }).getSkillBonusAndName();

      const model = createMainModel();
      model.level = 200;
      model.accRight = 2865; // Selo da Catedral
      model.accLeft = 2866; // Anel do Arcebispo
      if (withEnchants) {
        model.accRightEnchant3 = byAegis('Coluceo_Heal30').id;
        model.accLeftEnchant3 = byAegis('Heal_Amount5').id;
      }

      const calc = new Calculator()
        .setMasterItems(items as any)
        .setHpSpTable([{ jobs: {}, baseHp: Array(251).fill(1000), baseSp: Array(251).fill(100) }] as any)
        .setClass(cls);
      calc.loadItemFromModel(model).prepareAllItemBonus();
      return (calc as any).totalEquipStatus as Record<string, number>;
    };
    const bare = totalsWith(false);
    const enchanted = totalsWith(true);
    const delta = (key: string) => (enchanted[key] || 0) - (bare[key] || 0);

    expect(delta('healPower')).toBe(20);
    expect(delta('spCostPercent')).toBe(15);
    expect(delta('spCost__2043')).toBe(-30);
  });
});
