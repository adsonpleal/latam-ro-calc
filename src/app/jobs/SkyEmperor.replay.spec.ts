import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Calculator } from 'src/app/core/calculator';
import { CalculatorController } from 'src/app/core/calculator-controller';
import { createMainModel } from 'src/app/utils';
import { AtkSkillModel } from './_character-base.abstract';
import { SkyEmperor } from './SkyEmperor';

/**
 * Mestre Celestial (Sky Emperor) — razões de habilidade validadas contra uma gravação
 * LATAM em jogo.
 *
 * Fonte: https://recap.latam-tools.com.br/?r=ghbGkHpHjy  (MestreCelestialSemArma.rrf,
 * gravada por Ted em tra_fild contra o "Dummy - Amorfo", 30/07/2026).
 *
 * A gravação é **sem arma e sem nenhum equipamento** — sem variância de ATQ da arma,
 * cada pacote repete o mesmo inteiro. Nenhum EFST ativo no início afeta dano (Armazém,
 * Bônus de DROP/EXP, Manual de Mascar).
 *
 * Estado do personagem (snapshot da sessão + os talentos que Ted confirmou):
 *
 *   nível base 229, nível de classe 46, classe 4302 (Mestre Celestial)
 *   status base FOR 120, AGI 1, VIT 120, INT 50, DES 100, SOR 120
 *   talentos    POD 100 alocado; STA/SAB/FEI/CON/CRV 0 alocados
 *   Maestria Celestial Nv. 10 (ZC_SKILLINFO_LIST)
 *
 * Em t=22,8 s o personagem usa Elo Celestial; o estado [União Celestial] (EFST 1392)
 * fica ativo até o fim, e é sob ele que Entardecer, Explosão Crepuscular, Chute
 * Meia-Lua e Alvorada foram usadas.
 *
 * Pacotes de dano (`div` = golpes do pacote, dano é o total dos golpes):
 *
 *   5473 Explosão Galática Nv.5    335.514 × 86        div 3
 *   5469 Chute Meia-Lua    Nv.5    796.410 × 3         div 2
 *   5470 Alvorada          Nv.5    393.126 × 3         div 2
 *   5466 Entardecer        Nv.5    652.380 × 4  /  926.378 × 3 (crítico)   div 2
 *   5467 Explosão Crepuscular Nv.5 306.708 × 6  /  435.526 × 4 (crítico)   div 2
 *   5471 Constelação       Nv.1     91.818 × 4         div 3
 *   (ataque básico crítico: 5.883, div 1)
 *
 * **Como as razões abaixo foram medidas.** O dano segue
 *   dano = ⌊ATQ × razão ÷ 100⌋ − DEF suave 50, depois repartido em ⌊total÷div⌋ × div.
 * Com seis equações e razões obrigatoriamente inteiras, (ATQ, razão) tem solução única
 * numa varredura de ATQ de 200 a 60.000: **ATQ 4.193** e as seis razões afirmadas aqui.
 * O ataque básico fecha por fora: ⌊(4.193 − 50) × 1,42⌋ = 5.883 ✓ (1,42 = 1,40 base +
 * T.Crít 2%, de CRV 6 do bônus de classe). As razões batem exatamente com a descrição
 * pt-BR do cliente (ver src/app/skills) e com browiki.org — as tabelas do blog do Sigma
 * ("V2"), que esta classe usava, estão desatualizadas para o LATAM.
 *
 * **De onde sai o ATQ 4.193.** ATQ Status 797 (o próprio snapshot da gravação, e a
 * janela de Atributos em jogo) × 2 × P.ATQ 36% = 2.167. Somam-se então duas passivas da
 * linha Taekwon, nesta ordem:
 *
 *   Corrida Nv.10  +100 de ATQ, **só com as mãos livres**   ->  2.267
 *   Kihop Nv.5     +85% sobre o ATQ inteiro                 ->  ⌊2.267 × 1,85⌋ = 4.193
 *
 * A segunda gravação, com arma, é o que separa as duas: lá o +100 da Corrida some e o
 * Kihop sozinho explica os números (ver SkyEmperor.replay-arma.spec.ts). O Kihop já
 * estava no motor (StarEmperor.modifyFinalAtk, `powerLv × 15 + 10` = 85 no Nv.5); a
 * Corrida é que faltava, e entrou como ATQ de Maestria em Taekwondo.getMasteryAtk.
 */

const BASE_LEVEL = 229;
/** POD 100 alocado + 9 do bônus de talento no nível de classe 46. */
const TOTAL_POW = 109;
const SKY_MASTERY = 10;

/** Elo Celestial — ver CelestialSpace em SkyEmperor.ts. */
const CELESTIAL_UNITY = 7;

const sky = (celestialSpace = 0): SkyEmperor => {
  const c = new SkyEmperor();
  (c as any).bonuses = {
    activeSkillNames: new Set<string>(celestialSpace ? ['_SkyEmperor_Celestial_Space'] : []),
    equipAtks: {},
    masteryAtks: {},
    learnedSkillMap: new Map<string, number>([['Sky Mastery', SKY_MASTERY]]),
    usedSkillMap: new Map<string, number>(celestialSpace ? [['_SkyEmperor_Celestial_Space', celestialSpace]] : []),
  };
  return c;
};

const findSkill = (char: SkyEmperor, name: string): AtkSkillModel => {
  const skill = char.atkSkills.find((s) => s.name === name);
  if (!skill) throw new Error(`habilidade não encontrada: ${name}`);
  return skill;
};

/** A razão como o servidor a usa: Math.floor puro (int cast), não o floor do repo. */
const ratioOf = (char: SkyEmperor, name: string, skillLevel: number) =>
  Math.floor(
    findSkill(char, name).formula({
      model: { level: BASE_LEVEL },
      skillLevel,
      status: { totalPow: TOTAL_POW },
    } as any),
  );

const canCriOf = (char: SkyEmperor, name: string) => (findSkill(char, name).canCri as () => boolean)();

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const monsters = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));
const hpSpTable = JSON.parse(readFileSync('src/assets/demo/data/hp_sp_table.json', 'utf8'));

/** "Dummy - Amorfo", o alvo da gravação sem arma. */
const DUMMY_AMORFO = '21067';

/**
 * Roda a cadeia inteira, como a página. `corrida`/`kihop` existem para o teste que
 * mostra que o ATQ só fecha com as duas passivas ligadas.
 */
function danoDe(
  skillValue: string,
  opts: { corrida?: number; kihop?: number; weapon?: number; refine?: number; monsterId?: string; space?: number } = {},
) {
  const { corrida = 10, kihop = 5, weapon, refine, monsterId = DUMMY_AMORFO, space = CELESTIAL_UNITY } = opts;
  const cls = new SkyEmperor();
  const { equipAtks, masteryAtks, activeSkillNames, learnedSkillMap, usedSkillMap } = cls
    .setLearnSkills({ activeSkillIds: [], passiveSkillIds: [] })
    .getSkillBonusAndName();
  learnedSkillMap.set('Sky Mastery', SKY_MASTERY);
  if (corrida) learnedSkillMap.set('Run', corrida);
  // Kihop é passivo: entra pelo nível aprendido, não pela aba de habilidades ativas.
  if (kihop) learnedSkillMap.set('Power', kihop);
  activeSkillNames.add('_SkyEmperor_Celestial_Space');
  usedSkillMap.set('_SkyEmperor_Celestial_Space', space);

  const calc = new Calculator().setMasterItems(items).setHpSpTable(hpSpTable).setClass(cls);
  const bonus = cls.getJobBonusStatus(46);
  const model: any = createMainModel();
  model.class = 4302;
  model.level = BASE_LEVEL;
  model.jobLevel = 46;
  model.str = 120; model.agi = 1; model.vit = 120; model.int = 50; model.dex = 100; model.luk = 120;
  model.pow = 100; model.sta = 0; model.wis = 0; model.spl = 0; model.con = 0; model.crt = 0;
  model.jobStr = bonus.str; model.jobAgi = bonus.agi; model.jobVit = bonus.vit;
  model.jobInt = bonus.int; model.jobDex = bonus.dex; model.jobLuk = bonus.luk;
  model.jobPow = bonus.pow; model.jobSta = bonus.sta; model.jobWis = bonus.wis;
  model.jobSpl = bonus.spl; model.jobCon = bonus.con; model.jobCrt = bonus.crt;
  if (weapon) { model.weapon = weapon; model.weaponRefine = refine; }
  model.selectedAtkSkill = skillValue;
  calc.loadItemFromModel(model);

  new CalculatorController().runChain(calc, {
    monster: monsters[monsterId],
    equipAtks, masteryAtks,
    buffEquips: {}, buffMasterys: {},
    consumeData: [], aspdPotion: undefined,
    extraOptionScripts: [],
    activeSkillNames, learnedSkillMap,
    selectedAtkSkill: skillValue,
    selectedChances: [], usedHpL: false,
  } as any);

  const s = (calc as any).damageSummary;
  return { max: s.skillMaxDamage as number, min: s.skillMinDamage as number, noCri: s.skillMaxDamageNoCri as number };
}

describe('Mestre Celestial — razões medidas na gravação (Elo Celestial ativo)', () => {
  it('Entardecer Nv.5 → 15560', () => {
    expect(ratioOf(sky(CELESTIAL_UNITY), 'Noon Blast', 5)).toBe(15560);
  });

  it('Explosão Crepuscular Nv.5 → 7316', () => {
    expect(ratioOf(sky(CELESTIAL_UNITY), 'Sunset Blast', 5)).toBe(7316);
  });

  it('Chute Meia-Lua Nv.5 → 18995 (usa o valor de Meia-Noite)', () => {
    expect(ratioOf(sky(CELESTIAL_UNITY), 'Midnight Kick', 5)).toBe(18995);
  });

  it('Alvorada Nv.5 → 9377 (usa o valor de Pôr da Lua)', () => {
    expect(ratioOf(sky(CELESTIAL_UNITY), 'Dawn Break', 5)).toBe(9377);
  });

  it('Constelação Nv.1 → 2191', () => {
    expect(ratioOf(sky(CELESTIAL_UNITY), 'Twinkling Galaxy', 1)).toBe(2191);
  });

  it('Explosão Galática Nv.5 → 8003', () => {
    expect(ratioOf(sky(CELESTIAL_UNITY), 'Star Cannon', 5)).toBe(8003);
  });
});

/**
 * As tabelas do blog do Sigma "Sky Emperor (3rd version)" (fev/2026) **não** descrevem o
 * LATAM: nenhum ATQ entre 1 e 60.000, em nenhuma DEF suave (0 a 126), reproduz os seis
 * pacotes com elas. Elas dariam Entardecer 19.797 / Crepuscular 8.576 / Meia-Lua 21.972 /
 * Alvorada 9.606 / Constelação 2.649 / Galática 8.690. Se essa versão chegar ao LATAM um
 * dia, é este spec que vai acusar.
 *
 * O post V3 confirma, por outro lado, duas coisas que valem: os golpes por pacote
 * ("1 hit, dmg exibido 2 vezes" nas quatro de estado; 3 vezes em Constelação e Explosão
 * Galática), e que a chance de crítico é o CRIT CHEIO do usuário — não a metade, como diz
 * a tradução pt-BR do cliente. A gravação concorda com o CRIT cheio: 7 críticos em 17
 * lançamentos (41%) com Crítico 40 no painel; se fosse metade (20%), P(X>=7) seria 3,8%.
 */
describe('Mestre Celestial — golpes por pacote, como o `div` da gravação', () => {
  const cases: { name: string; hit: number }[] = [
    { name: 'Noon Blast', hit: 2 },
    { name: 'Sunset Blast', hit: 2 },
    { name: 'Midnight Kick', hit: 2 },
    { name: 'Dawn Break', hit: 2 },
    { name: 'Twinkling Galaxy', hit: 3 },
    { name: 'Star Cannon', hit: 3 },
  ];

  it.each(cases)('$name reparte em $hit golpes', ({ name, hit }) => {
    expect(findSkill(sky(), name).hit).toBe(hit);
  });
});

describe('Mestre Celestial — o Elo Celestial libera o efeito máximo', () => {
  // Entardecer e Explosão Crepuscular só criticam no seu próprio estado; na gravação
  // ambas criticaram sob Elo Celestial, sem nenhum Amanhecer no meio.
  it('Entardecer critica no Meio-Dia e sob Elo Celestial', () => {
    expect(canCriOf(sky(2), 'Noon Blast')).toBe(true);
    expect(canCriOf(sky(CELESTIAL_UNITY), 'Noon Blast')).toBe(true);
    expect(canCriOf(sky(1), 'Noon Blast')).toBe(false);
  });

  it('Explosão Crepuscular critica no Pôr do Sol e sob Elo Celestial', () => {
    expect(canCriOf(sky(3), 'Sunset Blast')).toBe(true);
    expect(canCriOf(sky(CELESTIAL_UNITY), 'Sunset Blast')).toBe(true);
    expect(canCriOf(sky(2), 'Sunset Blast')).toBe(false);
  });

  it('Chute Meia-Lua fora de Meia-Noite/Elo Celestial cai no valor normal', () => {
    expect(ratioOf(sky(4), 'Midnight Kick', 5)).toBe(
      Math.floor((500 + 5 * (1000 + SKY_MASTERY * 5) + TOTAL_POW * 5) * (BASE_LEVEL / 100)),
    );
  });

  it('Alvorada fora de Pôr da Lua/Elo Celestial cai no valor normal', () => {
    expect(ratioOf(sky(5), 'Dawn Break', 5)).toBe(
      Math.floor((300 + 5 * (400 + SKY_MASTERY * 5) + TOTAL_POW * 5) * (BASE_LEVEL / 100)),
    );
  });
});

/**
 * Os doze bônus abaixo vêm da janela "Atributos"/"Talentos" do MESMO personagem, no
 * mesmo nível de classe (print enviado por Ted): FOR 120+12, AGI 1+10, VIT 120+6,
 * INT 50+3, DES 100+9, SOR 120+3 / POD 100+9, STA 0+7, SAB 0+1, FEI 0, CON 0+4, CRV 0+6.
 * Batem, um a um, com a tabela por nível de irowiki.org/wiki/Sky_Emperor. A gravação
 * confirma POD 9 por um terceiro caminho: o ATQ Status do snapshot (797) e as seis
 * razões só fecham com POD total 109 — 100 alocados + 9 de bônus.
 *
 * Foi este print que pegou a coluna STA da tabela de talentos errada (dava 12 no nv. 46).
 */
describe('Mestre Celestial — bônus de classe/talento no nível de classe 46', () => {
  const bonus = new SkyEmperor().getJobBonusStatus(46);

  it('bônus de classe → FOR 12 / AGI 10 / VIT 6 / INT 3 / DES 9 / SOR 3', () => {
    expect([bonus.str, bonus.agi, bonus.vit, bonus.int, bonus.dex, bonus.luk]).toEqual([12, 10, 6, 3, 9, 3]);
  });

  it('bônus de talento → POD 9 / STA 7 / SAB 1 / FEI 0 / CON 4 / CRV 6', () => {
    expect([bonus.pow, bonus.sta, bonus.wis, bonus.spl, bonus.con, bonus.crt]).toEqual([9, 7, 1, 0, 4, 6]);
  });

  it('P.ATQ 36 e T.CRÍT 2, como a janela de Talentos mostra', () => {
    // P.ATQ = ⌊POD 109 / 3⌋ + ⌊CON 4 / 5⌋ = 36;  T.CRÍT = ⌊CRV 6 / 3⌋ = 2.
    // O 2 do T.CRÍT é o que dá o multiplicador de crítico 1,42 medido na gravação.
    const totalPow = 100 + bonus.pow;
    const totalCon = 0 + bonus.con;
    const totalCrt = 0 + bonus.crt;
    expect(Math.floor(totalPow / 3) + Math.floor(totalCon / 5)).toBe(36);
    expect(Math.floor(totalCrt / 3)).toBe(2);
  });
});

/**
 * Dano absoluto, ponta a ponta: a mesma cadeia que a página usa (classe + modelo + alvo)
 * contra os pacotes da gravação. É este bloco que trava o ATQ 4.193 e, com ele, as duas
 * passivas da linha Taekwon que o produzem — Corrida Nv.10 (+100, mãos livres) e
 * Kihop Nv.5 (+85%).
 */
describe('Mestre Celestial — dano absoluto vs "Dummy - Amorfo", gravação sem arma', () => {
  // `skillMaxDamageNoCri` pula a repartição em golpes de propósito (convenção do motor,
  // ver damage-calculator.ts), então o não-crítico é medido num Espaço Celeste em que a
  // habilidade não crita — que é exatamente o número não-crítico dos pacotes.
  const SEM_CRIT = { Entardecer: 1 /* Nascer do Sol */, Crepuscular: 2 /* Meio-Dia */ };
  const casos: { nome: string; skill: string; dano: number; espacoSemCrit?: number; cri?: number }[] = [
    { nome: 'Explosão Galática Nv.5', skill: 'Star Cannon==5', dano: 335514 },
    { nome: 'Chute Meia-Lua Nv.5', skill: 'Midnight Kick==5', dano: 796410 },
    { nome: 'Alvorada Nv.5', skill: 'Dawn Break==5', dano: 393126 },
    { nome: 'Constelação Nv.1', skill: 'Twinkling Galaxy==1', dano: 91818 },
    { nome: 'Entardecer Nv.5', skill: 'Noon Blast==5', dano: 652380, espacoSemCrit: SEM_CRIT.Entardecer, cri: 926378 },
    { nome: 'Explosão Crepuscular Nv.5', skill: 'Sunset Blast==5', dano: 306708, espacoSemCrit: SEM_CRIT.Crepuscular, cri: 435526 },
  ];

  it.each(casos)('$nome → $dano', ({ skill, dano, espacoSemCrit, cri }) => {
    expect(danoDe(skill, espacoSemCrit ? { space: espacoSemCrit } : {}).max).toBe(dano);
    if (cri !== undefined) expect(danoDe(skill).max).toBe(cri);
  });

  it('as duas passivas juntas produzem o ATQ 4.193 — tirar qualquer uma quebra', () => {
    const comAmbas = danoDe('Star Cannon==5');
    const semCorrida = danoDe('Star Cannon==5', { corrida: 0 });
    const semKihop = danoDe('Star Cannon==5', { kihop: 0 });
    expect(comAmbas.max).toBe(335514);
    expect(semCorrida.max).not.toBe(335514);
    expect(semKihop.max).not.toBe(335514);
  });
});
