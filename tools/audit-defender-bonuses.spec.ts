import { describe, expect, it } from 'vitest';
import { applyDefenderAudit, armorElementOf, auditDefenderBonuses, mapDefenderLine } from './audit-defender-bonuses.mjs';

describe('defender description audit', () => {
  it('maps vulnerabilities, damage channels, monster class and element exclusions', () => {
    expect(mapDefenderLine('Resistência a monstros chefes -50%.')).toEqual({ keys: ['subclass_boss'], value: -50 });
    expect(mapDefenderLine('Resistência a monstros Normais e Chefes +7%.')).toEqual({ keys: ['subclass_all'], value: 7 });
    expect(mapDefenderLine('Resistência física as raças Bruto e Inseto +10%.')).toEqual({ keys: ['subrace_brute_physical', 'subrace_insect_physical'], value: 10 });
    expect(mapDefenderLine('Resistência a danos físicos de todas as propriedades -2%')).toEqual({ keys: ['subele_all_physical'], value: -2 });
    const exclusion = mapDefenderLine('Resistência a todas as propriedades, exceto Neutro +10%.');
    expect(exclusion.keys).toHaveLength(9);
    expect(exclusion.keys).not.toContain('subele_neutral');
    expect(mapDefenderLine('Resistência a danos físicos +20% por 1 minuto.')).toBeNull();
  });

  it('replaces a legacy untyped copy and maps other-race vulnerabilities without doubling existing aliases', () => {
    const report = auditDefenderBonuses({ 1: { script: { subsize_s: ['EQUIP_ID[2]20'], subclass_all: ['7'] } }, 2: { script: {} } }, {
      1: { name: 'Test', description: 'Resistência a monstros Normais e Chefes +7%.\nResistência as raças Humano e Humanoide +2%.\nResistência a todas as outras raças -200%.\n---\nConjunto\n[Partner]\nResistência física ao tamanho Pequeno +20%.' },
      2: { name: 'Partner', description: '' },
    });
    expect(report.changes).toContainEqual({ id: 1, name: 'Test', key: 'subsize_s', previous: ['EQUIP_ID[2]20'], entries: [] });
    expect(report.changes.find(change => change.key === 'subrace_dragon')?.entries).toEqual(['-200']);
    expect(report.changes.some(change => change.key === 'subclass_all' || change.key === 'subclass_boss')).toBe(false);
  });

  it('keeps unknown conditions and incomplete sets out of unconditional bonuses', () => {
    const descriptions = { 1: { name: 'Test', description: 'Efeito:\nResistência a monstros Chefes +90%.\n---\nConjunto\n[Missing partner]\nResistência a raça Dragão +50%.' } };
    const report = auditDefenderBonuses({ 1: { script: {} } }, descriptions);
    expect(report.changes).toEqual([]);
    expect(report.unresolved).toHaveLength(2);
  });

  it('combines an enclosing refine with a base-stat gate and leaves unrelated scripts alone', () => {
    const descriptions = { 1: { name: 'Test', description: 'Refino +9 ou mais:\nVIT base 90 ou mais:\nResistência a propriedade Neutro +5%.' } };
    const report = auditDefenderBonuses({ 1: { script: { atk: ['123'] } } }, descriptions);
    expect(report.changes).toEqual([{ id: 1, name: 'Test', key: 'subele_neutral', previous: [], entries: ['vit:90&&9===5'] }]);
  });

  it('preserves record order and untouched text when applying a correction', () => {
    const source = '{\n  "20": {\n    "id": 20,\n    "script": {}\n  },\n  "1": {\n    "id": 1,\n    "script": {}\n  }\n}\n';
    const result = applyDefenderAudit(source, { changes: [{ id: 1, key: 'subclass_boss', entries: ['40'] }], armorChanges: [] });
    expect(result.startsWith(source.slice(0, source.indexOf('  "1"')))).toBe(true);
    expect(JSON.parse(result)['1'].script).toEqual({ subclass_boss: ['40'] });
  });

  it('does not register a proc as a permanent armor element', () => {
    expect(armorElementOf('Encanta a vestimenta com a propriedade Fantasma.')).toBe('Ghost');
    expect(armorElementOf('Ao receber dano:\nEncanta a vestimenta com a propriedade Fantasma.')).toBeNull();
  });
});
