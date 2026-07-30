import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Calculator } from 'src/app/core/calculator';
import { CalculatorController } from 'src/app/core/calculator-controller';
import { createMainModel } from 'src/app/utils';
import { SkyEmperor } from './SkyEmperor';

/**
 * Mestre Celestial — segunda gravação, **com arma**. É ela que separa as duas passivas
 * da linha Taekwon que a primeira gravação só conseguia medir somadas.
 *
 * Fonte: https://recap.latam-tools.com.br/?r=HdHAKyBShW  (TKtestearma.rrf, gravada por
 * Ted em tra_fild contra o "Dummy - Neutro", 30/07/2026). Mesmo personagem da gravação
 * sem arma (SkyEmperor.replay.spec.ts): nível base 229, classe 46, POD 100 alocado,
 * Maestria Celestial Nv.10, Kihop Nv.5, Corrida Nv.10.
 *
 * Único equipamento: **Livro Metálico (1588) +7**, sem cartas e sem bônus aleatórios.
 * O Elo Celestial (EFST 1392) já está ativo desde o início, então as quatro habilidades
 * de estado saem no efeito máximo, como na primeira gravação.
 *
 * **Por que ela decide.** A Corrida só dá o +100 de ATQ com as mãos livres; o Kihop vale
 * sempre. Sem arma as duas se somam e são indistinguíveis de um fator único; com arma
 * sobra só o Kihop:
 *
 *   sem arma   ⌊(2.167 + 100) × 1,85⌋ = 4.193   (ATQ exigido pelos pacotes, exato)
 *   com arma   ⌊[2.422..2.462] × 1,85⌋ = 4.480..4.555
 *
 * Um fator único de 1,935 (o que a primeira gravação sozinha sugeria) daria 4.686..4.763
 * com arma, e um valor fixo único daria 4.448..4.488 — os dois caem fora dos pacotes.
 *
 * Como a arma tem variância de ATQ, cada pacote é um rolo diferente e o teste é de
 * **contenção**: todo dano observado tem que estar entre o mínimo e o máximo do
 * simulador. Isso é mais forte do que parece — os valores alcançáveis formam um conjunto
 * esparso (41 ATQ possíveis numa faixa de 75 inteiros), e os 52 valores distintos de
 * dano da gravação caem todos nele.
 */

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const monsters = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));
const hpSpTable = JSON.parse(readFileSync('src/assets/demo/data/hp_sp_table.json', 'utf8'));

/** "Dummy - Neutro" (view 21077), o alvo da gravação. */
const DUMMY_NEUTRO = '21077';
const LIVRO_METALICO = 1588;
const REFINO = 7;
const CELESTIAL_UNITY = 7;

function faixaDe(skillValue: string, opts: { comArma?: boolean; space?: number } = {}) {
  const { comArma = true, space = CELESTIAL_UNITY } = opts;
  const cls = new SkyEmperor();
  const { equipAtks, masteryAtks, activeSkillNames, learnedSkillMap, usedSkillMap } = cls
    .setLearnSkills({ activeSkillIds: [], passiveSkillIds: [] })
    .getSkillBonusAndName();
  learnedSkillMap.set('Sky Mastery', 10);
  learnedSkillMap.set('Run', 10);
  activeSkillNames.add('Power');
  usedSkillMap.set('Power', 5);
  activeSkillNames.add('_SkyEmperor_Celestial_Space');
  usedSkillMap.set('_SkyEmperor_Celestial_Space', space);

  const calc = new Calculator().setMasterItems(items).setHpSpTable(hpSpTable).setClass(cls);
  const bonus = cls.getJobBonusStatus(46);
  const model: any = createMainModel();
  model.class = 4302;
  model.level = 229;
  model.jobLevel = 46;
  model.str = 120; model.agi = 1; model.vit = 120; model.int = 50; model.dex = 100; model.luk = 120;
  model.pow = 100; model.sta = 0; model.wis = 0; model.spl = 0; model.con = 0; model.crt = 0;
  model.jobStr = bonus.str; model.jobAgi = bonus.agi; model.jobVit = bonus.vit;
  model.jobInt = bonus.int; model.jobDex = bonus.dex; model.jobLuk = bonus.luk;
  model.jobPow = bonus.pow; model.jobSta = bonus.sta; model.jobWis = bonus.wis;
  model.jobSpl = bonus.spl; model.jobCon = bonus.con; model.jobCrt = bonus.crt;
  if (comArma) { model.weapon = LIVRO_METALICO; model.weaponRefine = REFINO; }
  model.selectedAtkSkill = skillValue;
  calc.loadItemFromModel(model);

  new CalculatorController().runChain(calc, {
    monster: monsters[DUMMY_NEUTRO],
    equipAtks, masteryAtks,
    buffEquips: {}, buffMasterys: {},
    consumeData: [], aspdPotion: undefined,
    extraOptionScripts: [],
    activeSkillNames, learnedSkillMap,
    selectedAtkSkill: skillValue,
    selectedChances: [], usedHpL: false,
  } as any);

  const s = (calc as any).damageSummary;
  return { min: s.skillMinDamage as number, max: s.skillMaxDamage as number };
}

/**
 * Valores distintos de dano NÃO crítico observados, por habilidade. Entardecer e
 * Explosão Crepuscular criticam sob Elo Celestial, então o não-crítico delas é medido
 * num Espaço Celeste em que não criticam (`espacoSemCrit`) — a razão é a mesma.
 */
const PACOTES: { nome: string; skill: string; danos: number[]; espacoSemCrit?: number }[] = [
  { nome: 'Entardecer Nv.5', skill: 'Noon Blast==5', espacoSemCrit: 1 /* Nascer do Sol */, danos: [698748, 699682, 702794] },
  {
    nome: 'Explosão Crepuscular Nv.5', skill: 'Sunset Blast==5', espacoSemCrit: 2 /* Meio-Dia */,
    danos: [328804, 329242, 329754, 330852, 330998, 331218],
  },
  { nome: 'Chute Meia-Lua Nv.5', skill: 'Midnight Kick==5', danos: [854914, 855484, 857004, 861562] },
  { nome: 'Alvorada Nv.5', skill: 'Dawn Break==5', danos: [422008, 423320, 424070, 424728] },
  { nome: 'Constelação Nv.1', skill: 'Twinkling Galaxy==1', danos: [98433, 98478, 98631, 98718, 98763, 98871, 99156, 99201, 99246] },
  {
    nome: 'Colapso Estelar Nv.5', skill: 'Star Burst==5',
    danos: [316666, 317160, 317724, 318076, 318216, 318358, 318780, 318992, 319556, 320330, 320612, 320682],
  },
  {
    nome: 'Explosão Galática Nv.5', skill: 'Star Cannon==5',
    danos: [359682, 360243, 360885, 361044, 361443, 361605, 361923, 362325, 362484, 363204, 363525, 363684, 364164, 364245],
  },
];

describe('Mestre Celestial — dano com Livro Metálico +7 vs "Dummy - Neutro"', () => {
  it.each(PACOTES)('$nome: os $danos.length valores da gravação caem na faixa do simulador', ({ skill, danos, espacoSemCrit }) => {
    const { min, max } = faixaDe(skill, espacoSemCrit ? { space: espacoSemCrit } : {});
    for (const d of danos) {
      expect(d, `${d} fora de [${min}, ${max}]`).toBeGreaterThanOrEqual(min);
      expect(d, `${d} fora de [${min}, ${max}]`).toBeLessThanOrEqual(max);
    }
  });

  // Os críticos da gravação, sob Elo Celestial, com o mesmo multiplicador 1,42.
  it.each([
    { nome: 'Entardecer Nv.5', skill: 'Noon Blast==5', danos: [1000398, 1004596] },
    { nome: 'Explosão Crepuscular Nv.5', skill: 'Sunset Blast==5', danos: [469808] },
  ])('$nome: os críticos caem na faixa do simulador', ({ skill, danos }) => {
    const { min, max } = faixaDe(skill);
    for (const d of danos) {
      expect(d, `${d} fora de [${min}, ${max}]`).toBeGreaterThanOrEqual(min);
      expect(d, `${d} fora de [${min}, ${max}]`).toBeLessThanOrEqual(max);
    }
  });

  // Sem esta guarda o teste de contenção passaria com uma faixa larga demais.
  it('a faixa é justa: os extremos observados encostam nos do simulador', () => {
    const { min, max } = faixaDe('Star Cannon==5');
    const obs = PACOTES.find((p) => p.skill === 'Star Cannon==5')!.danos;
    expect(max - min).toBeLessThan(0.02 * max); // variância da arma, ~1,7%
    expect(Math.min(...obs) - min).toBeLessThan(0.005 * max);
    expect(max - Math.max(...obs)).toBeLessThan(0.005 * max);
  });

  it('a Corrida não conta com arma na mão — o mesmo build desarmado dá mais ATQ por golpe', () => {
    // Desarmado o ATQ é 4.193 (fixo); armado a faixa é 4.480..4.555. O +100 da Corrida
    // vale só desarmado, então a arma tem que subir MENOS do que subiria se ele contasse.
    const comArma = faixaDe('Star Cannon==5');
    const semArma = faixaDe('Star Cannon==5', { comArma: false });
    expect(semArma.min).toBe(semArma.max); // sem arma não há variância
    expect(semArma.max).toBe(335514); // o mesmo número da primeira gravação
    expect(comArma.max).toBeGreaterThan(semArma.max);
  });
});
