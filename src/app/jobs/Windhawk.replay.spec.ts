import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Calculator } from 'src/app/core/calculator';
import { CalculatorController } from 'src/app/core/calculator-controller';
import { parseOptionScripts } from 'src/app/core/option-scripts';
import { Windhawk } from 'src/app/jobs/Windhawk';
import { loadReplayFixture } from 'src/app/replay/__tests__/load-fixture';
import { importReplayBuffer } from 'src/app/replay/replay-to-model';
import { SKILL_ID_BY_NAME } from 'src/app/skills';

/**
 * `wh-ilimitar.rrf` — Falcão do Vento nv 233/50 batendo no **Dummy - Sombrio**, enviado
 * por Shummuy pelo modal "Ajude o simulador" (envio `pDVbjdvnXT`). Primeira gravação a
 * conferir esta classe.
 *
 * A gravação tem dois estados do **mesmo equipamento**, o que é o que a torna útil sem
 * uma gravação sem equipamento: os 26 pacotes se dividem em "sem buff" (até 21,2s) e
 * "Ilimitar 5 + Ventos Sinistros" (EFST 722 e 1252, ligados em 21216 ms e 21227 ms).
 * Duas equações, e a diferença entre elas separa o que é multiplicador de dano à
 * distância do que é multiplicador solto.
 *
 * **O que a conferência achou.** As três fórmulas estão certas; o que faltava era o
 * **Grau de Encantamento**. O Gakkung Primordial-LT de Shummuy é **Grau C**, e sem ele a
 * build importada perdia `atkPercent +3` (Grau D), `pAtk +1` e `range +15` (Grau C) —
 * 12,2% de dano a menos sem buff e 5,9% a menos com Ilimitar. Era esse o "dano um tanto
 * diferente" que ele relatou.
 *
 * O grau **está** no arquivo: quem assiste à gravação no cliente lê "+11 [C] Gakkung
 * Primordial-LT". O que faltava era o leitor expô-lo — o rrfparser 1.0.0 passou a andar
 * pela cadeia TLV do registro e trouxe a etiqueta 299. Nada aqui informa o grau à mão:
 * ele vem do próprio `.rrf`, e é por isso que este teste também prova a importação.
 */

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const monsters = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));
const hpSpTable = JSON.parse(readFileSync('src/assets/demo/data/hp_sp_table.json', 'utf8'));

const DUMMY_SOMBRIO = '21084';
/** Talentos, coletados no envio — estes o replay realmente não carrega. */
const TALENTOS = { pow: 100, sta: 0, wis: 0, spl: 0, con: 30, crt: 0 };

type Buffs = { ilimitar?: number; ventos?: number };

function simular(skillValue: string, buffs: Buffs = {}) {
  const { model, learnedSkills } = importReplayBuffer(loadReplayFixture('wh-ilimitar.rrf'), items);
  const m: any = model;
  m.class = 4257;
  Object.assign(m, TALENTOS);

  const cls = new Windhawk();
  const b = cls.getJobBonusStatus(m.jobLevel);
  Object.assign(m, {
    jobStr: b.str, jobAgi: b.agi, jobVit: b.vit, jobInt: b.int, jobDex: b.dex, jobLuk: b.luk,
    jobPow: b.pow, jobSta: b.sta, jobWis: b.wis, jobSpl: b.spl, jobCon: b.con, jobCrt: b.crt,
  });
  m.selectedAtkSkill = skillValue;

  const passiveIds = cls.passiveSkills.map((s) => {
    const id = SKILL_ID_BY_NAME[s.name];
    return id ? learnedSkills[id] ?? 0 : 0;
  });
  const activeIds = cls.activeSkills.map((s) => {
    if (s.name === 'No Limits') return buffs.ilimitar ?? 0;
    if (s.name === 'Calamity Gale') return buffs.ventos ?? 0;
    return 0;
  });
  const { equipAtks, masteryAtks, activeSkillNames, learnedSkillMap } = cls
    .setLearnSkills({ activeSkillIds: activeIds, passiveSkillIds: passiveIds })
    .getSkillBonusAndName();

  const calc = new Calculator().setMasterItems(items).setHpSpTable(hpSpTable).setClass(cls);
  calc.loadItemFromModel(m);
  new CalculatorController().runChain(calc, {
    monster: monsters[DUMMY_SOMBRIO], equipAtks, masteryAtks, buffEquips: {}, buffMasterys: {},
    consumeData: [], aspdPotion: undefined,
    extraOptionScripts: parseOptionScripts((m.rawOptionTxts ?? []).filter(Boolean)),
    activeSkillNames, learnedSkillMap, selectedAtkSkill: skillValue, selectedChances: [], usedHpL: false,
  } as any);

  const s = (calc as any).damageSummary;
  return {
    golpes: s.skillTotalHit as number,
    critico: s.skillMaxDamage as number,
    /** Crítico com o medidor zerado — só faz sentido nas habilidades que acumulam. */
    semAcumulo: s.noStackMaxCriDamage as number,
    min: (s.skillCanCri ? s.skillMinDamageNoCri : s.skillMinDamage) as number,
    max: (s.skillCanCri ? s.skillMaxDamageNoCri : s.skillMaxDamage) as number,
    podeCritar: !!s.skillCanCri,
  };
}

const ILIMITAR: Buffs = { ilimitar: 5, ventos: 1 };

/**
 * Os críticos da gravação. Um crítico usa o ATQ **máximo** da arma, então é
 * determinístico: cada um destes números se repetiu idêntico de 3 a 7 vezes nos
 * pacotes, e por isso a comparação é por igualdade e não por faixa.
 */
describe('Falcão do Vento — o grau vem da própria gravação', () => {
  it('a arma importa como Grau C, e o resto do equipamento sem grau', () => {
    const { model }: any = importReplayBuffer(loadReplayFixture('wh-ilimitar.rrf'), items);
    expect(model.weapon).toBe(700046);
    expect(model.weaponGrade).toBe('C');
    expect([model.headUpperGrade, model.armorGrade, model.garmentGrade]).toEqual(['', '', '']);
  });
});

describe('Falcão do Vento — os críticos gravados, por igualdade', () => {
  it.each([
    { nome: 'Tiro Preciso Lv5, sem buff', skill: 'Focused Arrow Strike==5', buffs: {}, dano: 1008719, pacotes: 7 },
    { nome: 'Tiro Crescente Lv10 (3 acúmulos), sem buff', skill: 'Crescive Bolt==10', buffs: {}, dano: 2469710, pacotes: 3 },
    { nome: 'Tiro Crescente Lv10 (3 acúmulos), Ilimitar', skill: 'Crescive Bolt==10', buffs: ILIMITAR, dano: 9528458, pacotes: 3 },
    { nome: 'Vendaval de Flechas Lv10, Ilimitar', skill: 'Gale Storm==10', buffs: ILIMITAR, dano: 4855835, pacotes: 2 },
    { nome: 'Tiro Preciso Lv5, Ilimitar', skill: 'Focused Arrow Strike==5', buffs: ILIMITAR, dano: 3243387, pacotes: 5 },
  ])('$nome = $dano ($pacotes pacotes idênticos)', ({ skill, buffs, dano }) => {
    const r = simular(skill, buffs);
    expect(r.podeCritar).toBe(true);
    // `hit: 5` do Vendaval é de exibição: o pacote inteiro é um golpe de dano.
    expect(r.golpes).toBe(1);
    expect(r.critico).toBe(dano);
  });
});

/**
 * Sem Ventos Sinistros o Vendaval não pode critar, então os três pacotes são rolagens
 * normais e só dão um intervalo. A faixa é apertada (max/min ≈ 1,06), o que impede uma
 * porcentagem errada de passar despercebida dentro dela.
 */
describe('Falcão do Vento — Vendaval sem buff cai na faixa sem crítico', () => {
  const gravados = [721465, 709725, 730005];

  it('não crita sem Ventos Sinistros', () => {
    expect(simular('Gale Storm==10').podeCritar).toBe(false);
  });

  it.each(gravados)('%i está dentro da faixa simulada', (dano) => {
    const r = simular('Gale Storm==10');
    expect(dano).toBeGreaterThanOrEqual(r.min);
    expect(dano).toBeLessThanOrEqual(r.max);
  });

  it('a faixa é apertada o bastante para o teste significar algo', () => {
    const r = simular('Gale Storm==10');
    expect(r.max / r.min).toBeLessThan(1.12);
  });
});

/**
 * O Tiro Crescente acumula até 3 vezes, e a gravação pegou os quatro estados em sequência
 * (12,2s a 17,6s). O simulador acerta **as duas pontas na unidade**: sem acúmulo nenhum e
 * no topo. Como o degrau é constante, isso fecha os quatro disparos.
 *
 * Cuidado com uma conta que engana: o degrau (190.020) **não** é 10% do primeiro disparo
 * (189.965). Não sobra nada por explicar — o `(1 + 0,1 × acúmulos)` da fórmula multiplica o
 * dano antes da DEF do alvo, então ele não escala o número final do pacote. Comparar
 * `gravado[0] × 1,1` com `gravado[1]` dá uma diferença de 0,03% que é só o efeito da DEF, e
 * não um bônus faltando.
 */
describe('Falcão do Vento — os quatro acúmulos do Tiro Crescente', () => {
  const porAcumulo = [1899649, 2089669, 2279690, 2469710];

  it('sem acúmulo = 1.899.649, na unidade', () => {
    expect(simular('Crescive Bolt==10').semAcumulo).toBe(porAcumulo[0]);
  });

  it('com 3 acúmulos = 2.469.710, na unidade', () => {
    expect(simular('Crescive Bolt==10').critico).toBe(porAcumulo[3]);
  });

  it('o degrau do simulador é o mesmo dos pacotes', () => {
    const r = simular('Crescive Bolt==10');
    const degrauSim = (r.critico - r.semAcumulo) / 3;
    const degrauGravado = (porAcumulo[3] - porAcumulo[0]) / 3;
    expect(degrauSim).toBe(degrauGravado);
    // ...e os pacotes do meio caem exatamente onde esse degrau os põe.
    expect(porAcumulo[1] - porAcumulo[0]).toBe(190020);
    expect(porAcumulo[2] - porAcumulo[1]).toBe(190021);
  });
});
