import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Calculator } from 'src/app/core/calculator';
import { CalculatorController } from 'src/app/core/calculator-controller';
import { parseOptionScripts } from 'src/app/core/option-scripts';
import { PetLoyalty } from 'src/app/constants';
import { NightWatch } from 'src/app/jobs/NightWatch';
import { SKILL_ID_BY_NAME } from 'src/app/skills';
import { loadReplayFixture } from './__tests__/load-fixture';
import { importReplayBuffer } from './replay-to-model';

/**
 * **O resíduo em aberto do Guarda Noturno, medido.**
 *
 * Depois que o conjunto da Cesta de Mascotes entrou (ver `nw-mira-damage.spec.ts`), sobrou
 * uma diferença de 0,33% a 0,48%: o dano gravado é sempre um pouco **maior** que o
 * simulado. Este arquivo não corrige nada — ele mede o buraco com precisão, para que a
 * próxima tentativa de explicá-lo tenha contra o que se validar.
 *
 * As três gravações equipadas do shummuy têm **o mesmo equipamento** e diferem só nos
 * buffs, o que dá quatro combinações de multiplicador sobre a mesma build:
 *
 *   nw-mira-pet.rrf   Mira Focalizada (ATQ +150, contagem de mira 10)
 *   nw-ult.rrf        Carta na Manga Nv.10 (dano à distância +100%, P.ATQ +30), sem mira
 *   nw-ult-mira.rrf   as duas
 *
 * Os oito pacotes usados aqui são **críticos**, e um crítico é determinístico: ele usa o
 * ATQ máximo da arma, sem variância nenhuma. Cada um é uma equação exata.
 *
 * **O que a medição diz.** O buraco não é uma porcentagem: se fosse, a razão
 * gravado/simulado seria a mesma nas quatro combinações, e ela varia (0,48% com só a mira,
 * 0,33% com as duas). O tamanho encolhe exatamente na proporção em que o ATQ total cresce
 * — é um valor **fixo somado ao ATQ**, e somado **depois** do multiplicador de P.ATQ (por
 * isso encolhe quando a Carta na Manga entra, que só mexe em P.ATQ e alcance). Esse é o
 * estágio do "ATQ de maestria" na engine (`calcTotalAtk`: `... * pAtkMultiplier +
 * masteryAtk`), e medido por lá o valor é **~30**, igual nas quatro combinações, nas duas
 * armas e nas três habilidades.
 *
 * **O que já foi descartado**, cada um por medição e não por opinião:
 *   - qualquer bônus percentual (dano físico %, à distância, por tamanho/raça/elemento/
 *     classe, dano crítico, T.CRÍT): dariam razão constante, e ela não é;
 *   - ATQ de equipamento e ATQ da arma: passam pelo multiplicador de P.ATQ, então a razão
 *     também ficaria constante;
 *   - alcance (`range`): a gravação com Carta na Manga e a com as duas têm o mesmo total de
 *     alcance e resíduos diferentes;
 *   - POD/CON/FOR/DES/SOR: POD +1 sairia em SP_ATK1 (851 contra os 846 que o pacote traz);
 *   - o mascote e a munição: iguais em todas as cinco gravações;
 *   - as duas cartas que faltam no item.json (310991 "MHP 2Lv" e 29013 "Absorção de HP 3"):
 *     as descrições pt-BR só dão HP;
 *   - buff escondido: os EFST ativos no início das gravações são 802/942/983/984/1084/1085
 *     (contadores de tempo de jogo e de período de item/EXP da conta), 695 (ícone de
 *     munição equipada) e 1345/1346 (a própria Mira Focalizada) — nenhum mexe em dano.
 *
 * **O controle que fecha o cerco**: a gravação **sem equipamento** bate exato
 * (`NightWatch.replay.spec.ts` compara os críticos por igualdade). O que falta, portanto,
 * vem do equipamento — e nenhuma das peças equipadas tem, na descrição pt-BR, uma linha de
 * ATQ que a engine não esteja aplicando.
 */

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const monsters = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));
const hpSpTable = JSON.parse(readFileSync('src/assets/demo/data/hp_sp_table.json', 'utf8'));

const DUMMY_MORTO_VIVO = '21076';
/** Peça equipada nas três gravações — usada como ponto de injeção da sonda de maestria. */
const CESTA_DE_MASCOTES = '410599';

const FUZIL = { id: 810005, refine: 0, cards: [] as number[], nome: 'Atirador Consertado +0' };
const PISTOLA = { id: 13115, refine: 7, cards: [] as number[], nome: 'Pistola Aprimorável +7' };

/** Estados de buff das três gravações. */
const MIRA = { mira: 1, aim: 10, ult: 0 };
const ULT = { mira: 0, aim: 0, ult: 10 };
const AMBOS = { mira: 1, aim: 10, ult: 10 };

type Caso = {
  nome: string; fixture: string; skill: string;
  arma: typeof FUZIL; buffs: typeof MIRA; gravado: number;
};

/**
 * Os oito críticos determinísticos. Cada valor aparece repetido na sua gravação (é o que
 * prova que são críticos: dano idêntico em disparos diferentes).
 */
const CRITICOS: Caso[] = [
  { nome: 'mira · Disparo Único', fixture: 'nw-mira-pet.rrf', skill: 'Only One Bullet', arma: FUZIL, buffs: MIRA, gravado: 2628657 },
  { nome: 'mira · Atirar em Espiral', fixture: 'nw-mira-pet.rrf', skill: 'Spiral Shooting', arma: FUZIL, buffs: MIRA, gravado: 1954171 },
  { nome: 'mira · Artilharia Pesada', fixture: 'nw-mira-pet.rrf', skill: 'Magazine for One', arma: PISTOLA, buffs: MIRA, gravado: 3674718 / 6 },
  { nome: 'ult · Atirar em Espiral', fixture: 'nw-ult.rrf', skill: 'Spiral Shooting', arma: FUZIL, buffs: ULT, gravado: 1529673 },
  { nome: 'ult · Disparo Único', fixture: 'nw-ult.rrf', skill: 'Only One Bullet', arma: FUZIL, buffs: ULT, gravado: 1579455 },
  { nome: 'ambos · Disparo Único', fixture: 'nw-ult-mira.rrf', skill: 'Only One Bullet', arma: FUZIL, buffs: AMBOS, gravado: 4470524 },
  { nome: 'ambos · Atirar em Espiral', fixture: 'nw-ult-mira.rrf', skill: 'Spiral Shooting', arma: FUZIL, buffs: AMBOS, gravado: 3323434 },
  { nome: 'ambos · Artilharia Pesada', fixture: 'nw-ult-mira.rrf', skill: 'Magazine for One', arma: PISTOLA, buffs: AMBOS, gravado: 6130452 / 6 },
];

function simular(c: Caso, maestriaExtra = 0) {
  const its = maestriaExtra
    ? { ...items, [CESTA_DE_MASCOTES]: { ...items[CESTA_DE_MASCOTES], script: { ...items[CESTA_DE_MASCOTES].script, cannonballAtk: [String(maestriaExtra)] } } }
    : items;

  const { model, learnedSkills } = importReplayBuffer(loadReplayFixture(c.fixture), its);
  const m: any = model;
  m.class = 4306;
  m.pow = 100; m.sta = 0; m.wis = 0; m.spl = 0; m.con = 62; m.crt = 0;
  m.petLoyalty = PetLoyalty.Normal;
  m.weapon = c.arma.id; m.weaponRefine = c.arma.refine;
  m.weaponCard1 = c.arma.cards[0] ?? 0; m.weaponCard2 = c.arma.cards[1] ?? 0;

  const cls = new NightWatch();
  const b = cls.getJobBonusStatus(m.jobLevel);
  Object.assign(m, {
    jobStr: b.str, jobAgi: b.agi, jobVit: b.vit, jobInt: b.int, jobDex: b.dex, jobLuk: b.luk,
    jobPow: b.pow, jobSta: b.sta, jobWis: b.wis, jobSpl: b.spl, jobCon: b.con, jobCrt: b.crt,
  });
  const skillValue = `${c.skill}==1`;
  m.selectedAtkSkill = skillValue;

  const passiveIds = cls.passiveSkills.map((s) => {
    const id = SKILL_ID_BY_NAME[s.name];
    return id ? learnedSkills[id] ?? 0 : 0;
  });
  const activeIds = cls.activeSkills.map((s) =>
    s.name === 'Intensive Aim' ? c.buffs.mira
      : s.name === '_NightWatch_Aiming Count' ? c.buffs.aim
        : s.name === 'Hidden Card' ? c.buffs.ult : 0);
  const { equipAtks, masteryAtks, activeSkillNames, learnedSkillMap } = cls
    .setLearnSkills({ activeSkillIds: activeIds, passiveSkillIds: passiveIds })
    .getSkillBonusAndName();

  const calc = new Calculator().setMasterItems(its).setHpSpTable(hpSpTable).setClass(cls);
  calc.loadItemFromModel(m);
  new CalculatorController().runChain(calc, {
    monster: monsters[DUMMY_MORTO_VIVO], equipAtks, masteryAtks, buffEquips: {}, buffMasterys: {},
    consumeData: [], aspdPotion: undefined,
    extraOptionScripts: parseOptionScripts((m.rawOptionTxts ?? []).filter(Boolean)),
    activeSkillNames, learnedSkillMap, selectedAtkSkill: skillValue, selectedChances: [], usedHpL: false,
  } as any);

  // `skillMaxDamage` já é por golpe — os valores gravados da tabela também (o total do
  // pacote dividido pelo número de golpes).
  const s = (calc as any).damageSummary;
  return {
    critico: s.skillMaxDamage as number,
    podeCritar: !!s.skillCanCri,
    range: ((calc as any).totalEquipStatus as Record<string, number>)['range'],
  };
}

/** Quanto de ATQ de maestria zeraria a diferença deste caso. */
function maestriaNecessaria(c: Caso) {
  const base = simular(c).critico;
  const comSonda = simular(c, 100).critico;
  return (c.gravado - base) / ((comSonda - base) / 100);
}

describe('resíduo do Guarda Noturno — direção e tamanho', () => {
  it.each(CRITICOS)('$nome: o gravado passa do simulado por menos de 0,5%', (c) => {
    const r = simular(c);
    expect(r.podeCritar).toBe(true);
    expect(c.gravado).toBeGreaterThan(r.critico);
    expect(c.gravado / r.critico).toBeLessThan(1.005);
  });
});

describe('resíduo do Guarda Noturno — não é uma porcentagem', () => {
  /**
   * Se faltasse um bônus percentual (dano físico, à distância, por tamanho…), a razão
   * gravado/simulado seria a mesma nas três gravações, porque o equipamento é o mesmo. Ela
   * não é: com só a Mira Focalizada sobra bem mais do que com as duas ligadas. É esta
   * diferença que exclui, de uma vez, toda a família de bônus multiplicativos.
   */
  it('a razão cai quando os buffs entram, em vez de ficar parada', () => {
    const razao = (nome: string) => {
      const c = CRITICOS.find((x) => x.nome === nome)!;
      return c.gravado / simular(c).critico;
    };
    const soMira = razao('mira · Disparo Único');
    const soUlt = razao('ult · Disparo Único');
    const asDuas = razao('ambos · Disparo Único');

    expect(soMira).toBeGreaterThan(soUlt);
    expect(soUlt).toBeGreaterThan(asDuas);
    // A queda é grande demais para ser arredondamento: 0,38% -> 0,33% é 1/7 do buraco.
    expect((soMira - 1) / (asDuas - 1)).toBeGreaterThan(1.1);
  });

  /**
   * E não é alcance: a Carta na Manga dá "dano físico à distância +100%", então as
   * gravações `ult` e `ult+mira` têm o **mesmo** total de alcance. Um `range` faltando
   * deixaria as duas com o mesmo resíduo — e elas têm resíduos diferentes.
   */
  it('não é alcance: mesmo total de alcance, resíduos diferentes', () => {
    const ult = CRITICOS.find((c) => c.nome === 'ult · Disparo Único')!;
    const ambos = CRITICOS.find((c) => c.nome === 'ambos · Disparo Único')!;
    expect(simular(ult).range).toBe(simular(ambos).range);
    expect(ult.gravado / simular(ult).critico).toBeGreaterThan(ambos.gravado / simular(ambos).critico);
  });
});

describe('resíduo do Guarda Noturno — ~30 de ATQ no estágio da maestria', () => {
  /**
   * O estágio da maestria (`calcTotalAtk`: `(status + grupos) * pAtkMultiplier +
   * masteryAtk`) é o único da engine que fica **fora** do multiplicador de P.ATQ e
   * **dentro** da porcentagem da habilidade. Medido por lá, o buraco dá o mesmo número nas
   * quatro combinações de buff, nas duas armas e nas três habilidades — que é a assinatura
   * de um valor fixo, e o que aponta o estágio.
   */
  it.each(CRITICOS)('$nome: precisa de ~30 de ATQ de maestria', (c) => {
    const n = maestriaNecessaria(c);
    expect(n).toBeGreaterThan(29.5);
    expect(n).toBeLessThan(31.5);
  });

  it('os oito casos concordam entre si dentro de 4%', () => {
    const ns = CRITICOS.map(maestriaNecessaria);
    expect(Math.max(...ns) / Math.min(...ns)).toBeLessThan(1.04);
  });
});
