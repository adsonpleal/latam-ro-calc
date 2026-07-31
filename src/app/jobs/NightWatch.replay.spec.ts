import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Calculator } from 'src/app/core/calculator';
import { CalculatorController } from 'src/app/core/calculator-controller';
import { PetLoyalty } from 'src/app/constants';
import { createMainModel } from 'src/app/utils';
import { NightWatch } from './NightWatch';

/**
 * Guarda Noturno — as porcentagens por nível das habilidades de arma e de granada,
 * conferidas contra cinco gravações LATAM feitas por shummuy em 31/07/2026 no tra_fild,
 * contra o "Dummy - Morto-Vivo" (monstro 21076, raça Morto-Vivo, propriedade Neutro 1):
 *
 *   Armas + Ataque Basico + Skill.rrf   sem equipamento nenhum além da arma e da munição
 *   Armas + Ult.rrf                     equipado, Carta na Manga Nv.10
 *   Armas + Mira.rrf                    equipado, Mira Focalizada
 *   Armas + Ult + Mira.rrf              equipado, as duas
 *   Granadas Skill.rrf                  granadas, equipamento parcial
 *
 * Personagem (instantâneo da sessão + os talentos que shummuy confirmou):
 *   nível base 241, nível de classe 50, classe 4306
 *   FOR 83  AGI 100  VIT 100  INT 100  DES 120  SOR 100
 *   POD 100  CON 62  (STA/SAB/FEI/CRV zerados)
 *   A.D.P Nv.10 e Perícia em Granada Nv.10; **todas as habilidades de ataque no Nv.1**
 *   (é o que os pacotes 0x01de carregam no campo de nível, e o que shummuy relatou:
 *   "Ultimate estava no nv 10, e as duas passivas tbm o resto, tudo nv1").
 *
 * As cinco gravações trocam de arma no meio, uma por segmento, e cada arma exercita
 * exatamente as habilidades que ela habilita — é isso que separa as duas fórmulas de
 * cada habilidade. Só a gravação sem equipamento é usada para o teste de dano ponta a
 * ponta — nela o simulador bate **exato** nos críticos. As outras três ainda têm um
 * resíduo de ~3,6% que não vem das habilidades nem do mascote, e está sendo investigado
 * pelo lado do equipamento.
 *
 * O que elas provaram: as tabelas `[V2]` (blog do Sigma) estavam erradas em seis das sete
 * habilidades. As corretas são as da descrição do cliente, e a gravação sem equipamento
 * confirma todas.
 */

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const monsters = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));
const hpSpTable = JSON.parse(readFileSync('src/assets/demo/data/hp_sp_table.json', 'utf8'));

/** "Dummy - Morto-Vivo" — o alvo das cinco gravações. */
const DUMMY_MORTO_VIVO = '21076';
const NIVEL_BASE = 241;
const NIVEL_CLASSE = 50;
/** CON total = 62 alocado + 9 do bônus de classe + 10 da Perícia em Granada. */
const CON_TOTAL = 81;
/** Munição das gravações: Projétil de Purificação (Sagrado, ATQ 40) — vs. Neutro, ×1. */
const MUNICAO = 13220;
/**
 * O mascote está fora em todas as cinco gravações (entidade 18010, "Orc Herói"), e o
 * shummuy confirmou a lealdade. Ele não é equipamento — não aparece no inventário nem no
 * ATQ Equip. dos pacotes —, mas o bônus dele é ATQ +4% e Dano crít. +1%, e é o que faz os
 * críticos desta gravação baterem exatos. Sem ele o simulador fica 1,62% abaixo.
 */
const OVO_ORC_HEROI = 9121;
const LEALDADE = PetLoyalty.Normal;

/** As quatro armas dos segmentos, com o refino e as cartas que as gravações mostram. */
const ARMAS = {
  fuzil: { id: 810005, refine: 0, cards: [] as number[] },            // Atirador Consertado
  metralhadora: { id: 830008, refine: 0, cards: [] as number[] },     // Aspersor Consertado
  escopeta: { id: 820004, refine: 8, cards: [4115, 4115] },           // Retalhador Consertado
  lancaGranadas: { id: 840001, refine: 8, cards: [300241, 300240] },  // Lança-Granadas Primordial
  pistola: { id: 13115, refine: 7, cards: [] as number[] },           // Pistola Aprimorável
} as const;
type Arma = typeof ARMAS[keyof typeof ARMAS];

function simular(skillName: string, level: number, arma: Arma, aim = 0, opts: { semMascote?: boolean } = {}) {
  const cls = new NightWatch();

  // A.D.P e Perícia em Granada no Nv.10; nenhuma habilidade ativa além da contagem de
  // mira, que a gravação sem equipamento não usa (Mira Focalizada nunca é ligada nela).
  const passiveIds = cls.passiveSkills.map((s) => (s.name === 'PFI' || s.name === 'Grenade Mastery' ? 10 : 0));
  const activeIds = cls.activeSkills.map((s) => (s.name === '_NightWatch_Aiming Count' ? aim : 0));
  const { equipAtks, masteryAtks, activeSkillNames, learnedSkillMap } = cls
    .setLearnSkills({ activeSkillIds: activeIds, passiveSkillIds: passiveIds })
    .getSkillBonusAndName();

  const bonus = cls.getJobBonusStatus(NIVEL_CLASSE);
  const model: any = createMainModel();
  model.class = 4306;
  model.level = NIVEL_BASE;
  model.jobLevel = NIVEL_CLASSE;
  model.str = 83; model.agi = 100; model.vit = 100; model.int = 100; model.dex = 120; model.luk = 100;
  model.pow = 100; model.sta = 0; model.wis = 0; model.spl = 0; model.con = 62; model.crt = 0;
  model.jobStr = bonus.str; model.jobAgi = bonus.agi; model.jobVit = bonus.vit;
  model.jobInt = bonus.int; model.jobDex = bonus.dex; model.jobLuk = bonus.luk;
  model.jobPow = bonus.pow; model.jobSta = bonus.sta; model.jobWis = bonus.wis;
  model.jobSpl = bonus.spl; model.jobCon = bonus.con; model.jobCrt = bonus.crt;
  if (!opts.semMascote) {
    model.pet = OVO_ORC_HEROI;
    model.petLoyalty = LEALDADE;
  }
  model.weapon = arma.id;
  model.weaponRefine = arma.refine;
  model.weaponCard1 = arma.cards[0] ?? 0;
  model.weaponCard2 = arma.cards[1] ?? 0;
  model.ammo = MUNICAO;

  const skillValue = `${skillName}==${level}`;
  model.selectedAtkSkill = skillValue;

  const calc = new Calculator().setMasterItems(items).setHpSpTable(hpSpTable).setClass(cls);
  calc.loadItemFromModel(model);

  new CalculatorController().runChain(calc, {
    monster: monsters[DUMMY_MORTO_VIVO],
    equipAtks, masteryAtks,
    buffEquips: {}, buffMasterys: {},
    consumeData: [], aspdPotion: undefined,
    extraOptionScripts: [],
    activeSkillNames, learnedSkillMap,
    selectedAtkSkill: skillValue,
    selectedChances: [], usedHpL: false,
  } as any);

  const s = (calc as any).damageSummary;
  const podeCritar = !!s.skillCanCri;
  const total: any = calc.getTotalSummary();
  return {
    /** o "ATQ Equip." da janela de status do cliente (SP_ATK2): arma + refino + equipamento */
    atkEquip: (total.weapon?.baseWeaponAtk ?? 0) + (total.weapon?.refineBonus ?? 0) + total.calc.totalEquipAtk,
    /** o "ATQ" da esquerda na janela de status (SP_ATK1) */
    atkStatus: total.calc.totalStatusAtk as number,
    /** o "Crítico" da janela de status (SP_CRITICAL) */
    criticoBase: total.calc.totalCri as number,
    /** porcentagem da habilidade, por golpe, já truncada pela engine */
    razao: s.baseSkillDamage as number,
    golpes: s.skillTotalHit as number,
    podeCritar,
    min: (podeCritar ? s.skillMinDamageNoCri : s.skillMinDamage) as number,
    max: (podeCritar ? s.skillMaxDamageNoCri : s.skillMaxDamage) as number,
    critico: (podeCritar ? s.skillMaxDamage : 0) as number,
  };
}

/**
 * As tabelas da **descrição do cliente** (skill-meta.generated.ts), transcritas nível a
 * nível. `atk[i]` é a porcentagem do Nv.i+1 com contagem de mira 0 e `mira[i]` é quanto
 * cada ponto de contagem soma nesse nível. O termo de CON não aparece na descrição
 * ("Damage is additionally increased ... according to ... CON") — o coeficiente é o
 * medido pelas gravações, e o teste seguinte é quem o fixa.
 */
const TABELA_DO_CLIENTE: { skill: string; arma: Arma; atk: number[]; mira: number[]; con: number }[] = [
  // Vigília Noturna — a única que já estava certa antes destas gravações.
  { skill: 'The Vigilante at Night', arma: ARMAS.metralhadora, atk: [300, 600, 900, 1200, 1500], mira: [100, 200, 300, 400, 500], con: 2 },
  { skill: 'The Vigilante at Night', arma: ARMAS.escopeta, atk: [1500, 2200, 2900, 3600, 4300], mira: [200, 400, 600, 800, 1000], con: 3 },
  { skill: 'Only One Bullet', arma: ARMAS.fuzil, atk: [1350, 2200, 3050, 3900, 4750], mira: [250, 500, 750, 1000, 1250], con: 3 },
  { skill: 'Spiral Shooting', arma: ARMAS.fuzil, atk: [1300, 2200, 3100, 4000, 4900], mira: [150, 300, 450, 600, 750], con: 3 },
  { skill: 'Spiral Shooting', arma: ARMAS.lancaGranadas, atk: [2000, 3000, 4000, 5000, 6000], mira: [150, 300, 450, 600, 750], con: 3 },
  { skill: 'Magazine for One', arma: ARMAS.metralhadora, atk: [500, 800, 1100, 1400, 1700], mira: [50, 100, 150, 200, 250], con: 2 },
  { skill: 'Wild Fire', arma: ARMAS.escopeta, atk: [2000, 3500, 5000, 6500, 8000], mira: [500, 1000, 1500, 2000, 2500], con: 3 },
  { skill: 'Wild Fire', arma: ARMAS.lancaGranadas, atk: [1800, 3100, 4400, 5700, 7000], mira: [500, 1000, 1500, 2000, 2500], con: 3 },
  // Granadas: não dependem da arma, e o termo extra é o nível de Perícia em Granada (10).
  { skill: 'Basic Grenade', arma: ARMAS.escopeta, atk: [1900, 2800, 3700, 4600, 5500].map((a) => a + 10 * 50), mira: [0, 0, 0, 0, 0], con: 5 },
  { skill: 'Hasty Fire in the Hole', arma: ARMAS.escopeta, atk: [2400, 3300, 4200, 5100, 6000].map((a) => a + 10 * 20), mira: [0, 0, 0, 0, 0], con: 3 },
];

describe('Guarda Noturno — porcentagem por nível vs. a descrição do cliente', () => {
  it.each(TABELA_DO_CLIENTE)('$skill (arma $arma.id): os 5 níveis batem com a tabela do cliente', ({ skill, arma, atk, con }) => {
    for (let lv = 1; lv <= 5; lv++) {
      const esperado = Math.floor((atk[lv - 1] + CON_TOTAL * con) * (NIVEL_BASE / 100));
      expect(simular(skill, lv, arma).razao, `${skill} Nv.${lv}`).toBe(esperado);
    }
  });

  it.each(TABELA_DO_CLIENTE.filter((t) => t.mira[0] > 0))(
    '$skill (arma $arma.id): a contagem de mira soma o valor do nível, não um valor fixo',
    ({ skill, arma, atk, mira, con }) => {
      for (const lv of [1, 5]) {
        for (const contagem of [1, 10]) {
          const esperado = Math.floor((atk[lv - 1] + mira[lv - 1] * contagem + CON_TOTAL * con) * (NIVEL_BASE / 100));
          expect(simular(skill, lv, arma, contagem).razao, `${skill} Nv.${lv} mira ${contagem}`).toBe(esperado);
        }
      }
    },
  );

  it('todos os níveis são selecionáveis — as gravações estão no Nv.1', () => {
    const cls = new NightWatch();
    for (const nome of ['The Vigilante at Night', 'Only One Bullet', 'Spiral Shooting', 'Magazine for One', 'Wild Fire', 'Basic Grenade', 'Hasty Fire in the Hole']) {
      const skill = cls.atkSkills.find((a) => a.name === nome)!;
      expect(skill.levelList?.map((l) => l.value), nome).toEqual([1, 2, 3, 4, 5].map((lv) => `${nome}==${lv}`));
    }
  });
});

/**
 * Pacotes 0x01de da gravação **sem equipamento** (Armas + Ataque Basico + Skill.rrf),
 * habilidades no Nv.1, contagem de mira 0. `dano` é o total do pacote e `golpes` é o
 * `count` que ele carrega; o simulador trabalha por golpe, então a comparação é
 * `dano / golpes`. Os dois pacotes críticos do segmento da Pistola ficam no bloco de
 * críticos, no fim do arquivo.
 */
const PACOTES_SEM_EQUIPAMENTO: { ms: number; skill: string; arma: Arma; dano: number; golpes: number; critico?: boolean }[] = [
  { ms: 8786, skill: 'Only One Bullet', arma: ARMAS.pistola, dano: 227400, golpes: 1 },
  { ms: 11339, skill: 'Only One Bullet', arma: ARMAS.pistola, dano: 227995, golpes: 1 },
  { ms: 21036, skill: 'Magazine for One', arma: ARMAS.pistola, dano: 327660, golpes: 6 },
  { ms: 36893, skill: 'The Vigilante at Night', arma: ARMAS.escopeta, dano: 929360, golpes: 4 },
  { ms: 43694, skill: 'Wild Fire', arma: ARMAS.escopeta, dano: 232635, golpes: 1 },
  { ms: 50754, skill: 'The Vigilante at Night', arma: ARMAS.metralhadora, dano: 261583, golpes: 7 },
  { ms: 56286, skill: 'Magazine for One', arma: ARMAS.metralhadora, dano: 559500, golpes: 10 },
  { ms: 74889, skill: 'Spiral Shooting', arma: ARMAS.lancaGranadas, dano: 514996, golpes: 2 },
  { ms: 79905, skill: 'Wild Fire', arma: ARMAS.lancaGranadas, dano: 247083, golpes: 1 },
  { ms: 86203, skill: 'Only One Bullet', arma: ARMAS.fuzil, dano: 130437, golpes: 1 },
  { ms: 88369, skill: 'Only One Bullet', arma: ARMAS.fuzil, dano: 133163, golpes: 1 },
  { ms: 94769, skill: 'Spiral Shooting', arma: ARMAS.fuzil, dano: 130117, golpes: 1 },
  { ms: 100471, skill: 'Spiral Shooting', arma: ARMAS.fuzil, dano: 131046, golpes: 1 },
  { ms: 126187, skill: 'The Vigilante at Night', arma: ARMAS.metralhadora, dano: 278019, golpes: 7 },
];

/**
 * Nenhuma folga: com o mascote no lugar, todo pacote desta gravação cai dentro da faixa
 * fechada do simulador. Antes de o mascote ser modelado, dois deles passavam do máximo
 * por 0,42% e 0,52% e este teste precisava de 1,006 de tolerância.
 */
const FOLGA_TETO = 1;

describe('Guarda Noturno — dano da gravação sem equipamento', () => {
  it.each(PACOTES_SEM_EQUIPAMENTO)('$skill @$ms (arma $arma.id): $dano em $golpes golpe(s)', ({ skill, arma, dano, golpes }) => {
    const r = simular(skill, 1, arma);
    expect(r.golpes, 'número de golpes').toBe(golpes);

    const porGolpe = dano / golpes;
    expect(Number.isInteger(porGolpe), `${dano} não divide por ${golpes}`).toBe(true);
    expect(porGolpe).toBeGreaterThanOrEqual(r.min);
    expect(porGolpe).toBeLessThanOrEqual(Math.floor(r.max * FOLGA_TETO));
  });

  // Sem esta guarda o teste acima passaria com uma faixa larga demais: a variação do ATQ
  // da arma é de poucos por cento, então errar a tabela de porcentagem joga o dano
  // inteiro para fora da faixa.
  it('a faixa é justa — a variação do simulador é a da arma, não uma margem larga', () => {
    for (const { skill, arma } of PACOTES_SEM_EQUIPAMENTO) {
      const r = simular(skill, 1, arma);
      expect(r.max / r.min, `${skill} ${arma.id}`).toBeLessThan(1.12);
    }
  });

  // Com as porcentagens antigas (blog do Sigma, "[V2]") o dano observado cairia FORA da
  // faixa do simulador em todas as seis — é o que a gravação decide. `razaoAntiga` é a
  // porcentagem do Nv.1 sem o termo de CON, como estava no código antes destas gravações.
  it.each([
    { skill: 'Only One Bullet', arma: ARMAS.fuzil, razaoAntiga: 800 + 1350, con: 3, porGolpe: 130437 },
    { skill: 'Spiral Shooting', arma: ARMAS.fuzil, razaoAntiga: 1200 + 1700, con: 3, porGolpe: 130117 },
    { skill: 'Spiral Shooting', arma: ARMAS.lancaGranadas, razaoAntiga: 1000 + 1500, con: 3, porGolpe: 514996 / 2 },
    { skill: 'Magazine for One', arma: ARMAS.metralhadora, razaoAntiga: 200 + 350, con: 2, porGolpe: 559500 / 10 },
    { skill: 'Wild Fire', arma: ARMAS.escopeta, razaoAntiga: 1000 + 2450, con: 3, porGolpe: 232635 },
    { skill: 'Wild Fire', arma: ARMAS.lancaGranadas, razaoAntiga: 1000 + 2300, con: 3, porGolpe: 247083 },
  ])('$skill (arma $arma.id): a porcentagem antiga [V2] jogaria o pacote para fora da faixa', ({ skill, arma, razaoAntiga, con, porGolpe }) => {
    const r = simular(skill, 1, arma);
    // O dano escala linearmente com a porcentagem, então a faixa antiga é a atual × k.
    const k = Math.floor((razaoAntiga + CON_TOTAL * con) * (NIVEL_BASE / 100)) / r.razao;
    expect(k).toBeGreaterThan(1.05);
    const foraDaFaixa = porGolpe < r.min * k || porGolpe > Math.floor(r.max * k * FOLGA_TETO);
    expect(foraDaFaixa, `${porGolpe} ainda caberia em [${r.min * k}, ${r.max * k}]`).toBe(true);
  });
});

/**
 * A janela de status do cliente aparece nos pacotes ZC_PAR_CHANGE, e ela confere o
 * personagem inteiro por fora do dano. Estes são os que as gravações carregam.
 */
describe('Guarda Noturno — status conferido contra os pacotes ZC_PAR_CHANGE', () => {
  it('SP_ATK1 (ATQ base) = 789 na gravação sem equipamento', () => {
    expect(simular('Only One Bullet', 1, ARMAS.fuzil).atkStatus).toBe(789);
  });

  /**
   * SP_CRITICAL = 35 sem equipamento nenhum. Este é o valor que tirou o `1 +` do crítico
   * base: a SOR total aqui é 107 (100 alocada + 7 do bônus de classe), não há uma única
   * peça dando Crítico, e ⌊107/3⌋ = 35 — com a constante daria 36. O número vem do
   * servidor, não do cálculo do cliente.
   */
  it('SP_CRITICAL = 35 — o crítico base é ⌊SOR/3⌋, sem constante somada', () => {
    expect(simular('Only One Bullet', 1, ARMAS.fuzil).criticoBase).toBe(35);
  });

  // A troca de arma no meio da gravação manda um SP_ATK2 novo, o que dá um valor exato
  // por arma. O da Pistola Aprimorável +7 é o que fecha o item 13115 recém-cadastrado:
  // 35 (ATQ base) + 35 (refino, arma nível 3) + 35 (+5 por refino) + 85 (+5 a cada 10
  // níveis de base a partir do 70, 17 degraus no nível 241) = 190.
  it.each([
    { nome: 'Pistola Aprimorável +7', arma: ARMAS.pistola, spAtk2: 190 },
    { nome: 'Atirador Consertado +0', arma: ARMAS.fuzil, spAtk2: 300 },
    { nome: 'Aspersor Consertado +0', arma: ARMAS.metralhadora, spAtk2: 290 },
    { nome: 'Retalhador Consertado +8', arma: ARMAS.escopeta, spAtk2: 394 },
  ])('SP_ATK2 (ATQ equip.) com $nome = $spAtk2', ({ arma, spAtk2 }) => {
    expect(simular('Only One Bullet', 1, arma).atkEquip).toBe(spAtk2);
  });
});

/**
 * Os pacotes críticos da gravação sem equipamento. Um crítico usa o ATQ **máximo** da
 * arma, então ele é determinístico — é por isso que 197.340 e 467.394 aparecem repetidos.
 * Isso faz deles o ponto mais exigente do conjunto: eles medem o teto do ATQ sem nenhuma
 * variância no meio, e por isso a comparação aqui é por **igualdade**, não por faixa.
 *
 * Foram eles que acharam o mascote. Enquanto o Ovo de Orc Herói não era modelado, os três
 * ficavam acima do simulador por fatores que não fechavam entre si (1,62% no Atirador
 * Consertado +0 e 1,02% na Pistola Aprimorável +7), e a suspeita era a variância do ATQ da
 * arma em getWeaponAtk. Não era: com ATQ +4% e Dano crít. +1% do mascote na Lealdade
 * Normal, os três batem exato e os dois fatores diferentes se explicam — um é ATQ, o outro
 * é ATQ mais dano crítico.
 */
describe('Guarda Noturno — críticos da gravação sem equipamento', () => {
  it.each([
    { skill: 'Only One Bullet', arma: ARMAS.fuzil, dano: 197340 },
    { skill: 'Spiral Shooting', arma: ARMAS.fuzil, dano: 191118 },
    { skill: 'Magazine for One', arma: ARMAS.pistola, dano: 467394 / 6 },
  ])('$skill (arma $arma.id): o crítico bate exato', ({ skill, arma, dano }) => {
    const r = simular(skill, 1, arma);
    expect(r.podeCritar).toBe(true);
    expect(r.critico).toBe(dano);
  });

  // Crítico base 140% + T.Crít 1% (a gravação carrega SP_CRATE = 1), e por cima o Dano
  // crít. +1% do mascote, que a habilidade aplica pela metade (criDmgPercentage 0,5).
  it('o multiplicador de crítico é 1,41 × 1,005', () => {
    const r = simular('Only One Bullet', 1, ARMAS.fuzil);
    // 3 casas: o arredondamento por golpe do dano máximo já move a razão na quarta.
    expect(r.critico / r.max).toBeCloseTo(1.41 * 1.005, 3);
  });

  it('sem o mascote o simulador ficaria 1,6% abaixo — é o que a gravação exclui', () => {
    const semPet = simular('Only One Bullet', 1, ARMAS.fuzil, 0, { semMascote: true });
    expect(197340 / semPet.critico).toBeCloseTo(1.0162, 4);
  });
});
