import { describe, expect, it } from 'vitest';
import { randomOptionToScript } from './random-option-map';

const opt = (id: number, value = 1, param = 0) => ({ id, value, param });

describe('randomOptionToScript', () => {
  it('maps the common scalar offensive options', () => {
    expect(randomOptionToScript(opt(17, 65))).toBe('atk:65'); // ATQ +65
    expect(randomOptionToScript(opt(19, 7))).toBe('matk:7'); // ATQM +7
    expect(randomOptionToScript(opt(13, 5))).toBe('atkPercent:5'); // ATQ da arma +5%
    expect(randomOptionToScript(opt(14, 10))).toBe('matkPercent:10'); // Dano mágico +10%
    expect(randomOptionToScript(opt(164, 12))).toBe('criDmg:12'); // Dano crítico +12%
    expect(randomOptionToScript(opt(170, 10))).toBe('vct:10'); // Conjuração variável -10%
    expect(randomOptionToScript(opt(171, 8))).toBe('acd:8'); // Pós-conjuração -8%
  });

  it('maps base + trait stats', () => {
    expect(randomOptionToScript(opt(3, 9))).toBe('str:9');
    expect(randomOptionToScript(opt(8, 5))).toBe('luk:5');
    expect(randomOptionToScript(opt(243, 4))).toBe('pow:4');
    expect(randomOptionToScript(opt(250, 3))).toBe('sMatk:3');
  });

  it('maps the trait-derived rolls (TEN/MTEN/C.Mais/T.CRÍT)', () => {
    expect(randomOptionToScript(opt(251, 10))).toBe('res:10'); // TEN +10
    expect(randomOptionToScript(opt(252, 8))).toBe('mres:8'); // MTEN +8
    expect(randomOptionToScript(opt(253, 5))).toBe('hplus:5'); // C.Mais +5
    expect(randomOptionToScript(opt(254, 6))).toBe('cRate:6'); // T.CRÍT +6
  });

  it('maps the element / race / size / class damage families by index', () => {
    expect(randomOptionToScript(opt(43, 15))).toBe('p_element_fire:15'); // Dano físico vs Fogo
    expect(randomOptionToScript(opt(63, 15))).toBe('m_element_fire:15'); // Dano mágico vs Fogo
    expect(randomOptionToScript(opt(103, 20))).toBe('p_race_demon:20'); // Dano físico vs Demônio
    expect(randomOptionToScript(opt(113, 20))).toBe('m_race_demon:20'); // Dano mágico vs Demônio
    expect(randomOptionToScript(opt(133, 50))).toBe('p_pene_race_demon:50'); // Ignora DEF de Demônio
    expect(randomOptionToScript(opt(143, 50))).toBe('m_pene_race_demon:50'); // Ignora DEFM de Demônio
    expect(randomOptionToScript(opt(148, 25))).toBe('p_class_boss:25'); // Dano físico vs Chefes
    expect(randomOptionToScript(opt(157, 30))).toBe('p_size_s:30'); // Dano físico vs Pequenos
    expect(randomOptionToScript(opt(189, 30))).toBe('m_size_l:30'); // Dano mágico vs Grandes
    expect(randomOptionToScript(opt(224, 40))).toBe('m_my_element_fire:40'); // Dano mágico Fogo
  });

  it('treats ignore-size-penalty as a flag and skips unsupported / empty rolls', () => {
    expect(randomOptionToScript(opt(163, 0))).toBe('ignore_size_penalty:1');
    expect(randomOptionToScript(opt(11, 5))).toBeNull(); // natural HP regen — not modeled
    expect(randomOptionToScript(opt(0, 5))).toBeNull(); // empty slot
    expect(randomOptionToScript(opt(17, 0))).toBeNull(); // zero magnitude
    expect(randomOptionToScript(opt(17, -3))).toBeNull(); // negative magnitude
  });
});
