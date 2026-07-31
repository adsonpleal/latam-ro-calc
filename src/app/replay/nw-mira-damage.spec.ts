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
 * `nw-mira-pet.rrf` ("Armas + Mira" do shummuy) conferida **pelo dano**, com a build
 * inteira importada do próprio replay — o oposto de `NightWatch.replay.spec.ts`, que usa a
 * gravação sem equipamento para isolar as porcentagens das habilidades.
 *
 * O personagem passa por quatro armas e dispara cinco habilidades no Nv.1, sempre com a
 * Mira Focalizada ligada e a contagem de mira em 10 (os ticks de 500 ms do EFST 1346
 * chegam sempre a dez entre um disparo e o seguinte).
 *
 * Foi este conjunto que achou o conjunto que faltava na **Cesta de Mascotes (410599)**:
 * a descrição pt-BR dá "Dano físico a distância +10%" quando o mascote é Orc Herói,
 * Bafomé ou Abelha-Rainha, e o script só tinha o "Dano físico e mágico +5%" incondicional.
 * Sem essa linha o simulador ficava ~5% abaixo em **todos** os dezoito pacotes, com quatro
 * deles estourando o teto da faixa.
 */

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const monsters = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));
const hpSpTable = JSON.parse(readFileSync('src/assets/demo/data/hp_sp_table.json', 'utf8'));

const DUMMY_MORTO_VIVO = '21076';
const CESTA_DE_MASCOTES = 410599;

/** As quatro armas da gravação, na ordem em que os pacotes de equipamento as trocam. */
const ARMAS = {
  escopeta: { id: 820004, refine: 8, cards: [4115, 4115], nome: 'Retalhador Consertado +8' },
  metralhadora: { id: 830008, refine: 0, cards: [] as number[], nome: 'Aspersor Consertado +0' },
  lancaGranadas: { id: 840001, refine: 8, cards: [300241, 300240], nome: 'Lança-Granadas Primordial +8' },
  fuzil: { id: 810005, refine: 0, cards: [] as number[], nome: 'Atirador Consertado +0' },
  pistola: { id: 13115, refine: 7, cards: [] as number[], nome: 'Pistola Aprimorável +7' },
} as const;
type Arma = typeof ARMAS[keyof typeof ARMAS];

function simular(skillName: string, arma: Arma, opts: { pet?: number } = {}) {
  const { model, learnedSkills } = importReplayBuffer(loadReplayFixture('nw-mira-pet.rrf'), items);
  const m: any = model;
  m.class = 4306;
  // Talentos não vêm no replay; são os que o shummuy confirmou.
  m.pow = 100; m.sta = 0; m.wis = 0; m.spl = 0; m.con = 62; m.crt = 0;
  m.petLoyalty = PetLoyalty.Normal;
  if (opts.pet !== undefined) m.pet = opts.pet;
  m.weapon = arma.id; m.weaponRefine = arma.refine;
  m.weaponCard1 = arma.cards[0] ?? 0; m.weaponCard2 = arma.cards[1] ?? 0;

  const cls = new NightWatch();
  const b = cls.getJobBonusStatus(m.jobLevel);
  Object.assign(m, {
    jobStr: b.str, jobAgi: b.agi, jobVit: b.vit, jobInt: b.int, jobDex: b.dex, jobLuk: b.luk,
    jobPow: b.pow, jobSta: b.sta, jobWis: b.wis, jobSpl: b.spl, jobCon: b.con, jobCrt: b.crt,
  });
  const skillValue = `${skillName}==1`;
  m.selectedAtkSkill = skillValue;

  const passiveIds = cls.passiveSkills.map((s) => {
    const id = SKILL_ID_BY_NAME[s.name];
    return id ? learnedSkills[id] ?? 0 : 0;
  });
  // Mira Focalizada ligada e contagem de mira cheia, como na gravação inteira.
  const activeIds = cls.activeSkills.map((s) =>
    s.name === 'Intensive Aim' ? 1 : s.name === '_NightWatch_Aiming Count' ? 10 : 0);
  const { equipAtks, masteryAtks, activeSkillNames, learnedSkillMap } = cls
    .setLearnSkills({ activeSkillIds: activeIds, passiveSkillIds: passiveIds })
    .getSkillBonusAndName();

  const calc = new Calculator().setMasterItems(items).setHpSpTable(hpSpTable).setClass(cls);
  calc.loadItemFromModel(m);
  new CalculatorController().runChain(calc, {
    monster: monsters[DUMMY_MORTO_VIVO], equipAtks, masteryAtks, buffEquips: {}, buffMasterys: {},
    consumeData: [], aspdPotion: undefined,
    extraOptionScripts: parseOptionScripts((m.rawOptionTxts ?? []).filter(Boolean)),
    activeSkillNames, learnedSkillMap, selectedAtkSkill: skillValue, selectedChances: [], usedHpL: false,
  } as any);

  const s = (calc as any).damageSummary;
  const podeCritar = !!s.skillCanCri;
  return {
    golpes: s.skillTotalHit as number,
    podeCritar,
    min: (podeCritar ? s.skillMinDamageNoCri : s.skillMinDamage) as number,
    max: (podeCritar ? s.skillMaxDamageNoCri : s.skillMaxDamage) as number,
    critico: (podeCritar ? s.skillMaxDamage : 0) as number,
    bonus: (calc as any).totalEquipStatus as Record<string, number>,
  };
}

/**
 * O conjunto da Cesta de Mascotes é o único caso do item.json em que o parceiro do
 * `EQUIP_ID` é o **mascote** — ele entra no `equipItem` como qualquer outra peça, então a
 * condição funciona igual. Os deltas abaixo são contra a mesma build sem mascote nenhum, e
 * por isso incluem o que o próprio ovo dá (o Bafomé, por exemplo, já traz "Dano físico a
 * distância +5%" sozinho, daí o 15 em vez de 10).
 */
describe('Cesta de Mascotes — o conjunto muda com a família do mascote', () => {
  const semMascote = () => simular('The Vigilante at Night', ARMAS.metralhadora, { pet: 0 }).bonus;

  it.each([
    { nome: 'Orc Herói', pet: 9121, chave: 'range', delta: 10 },
    { nome: 'Abelha-Rainha', pet: 9193, chave: 'range', delta: 10 },
    { nome: 'Freeoni', pet: 9111, chave: 'melee', delta: 10 },
    { nome: 'Flor do Luar', pet: 9112, chave: 'melee', delta: 10 },
    { nome: 'Pesar Noturno', pet: 9122, chave: 'm_my_element_all', delta: 10 },
    { nome: 'Senhor das Trevas', pet: 9148, chave: 'm_my_element_all', delta: 10 },
  ])('$nome: $chave +$delta', ({ pet, chave, delta }) => {
    const base = semMascote();
    const com = simular('The Vigilante at Night', ARMAS.metralhadora, { pet }).bonus;
    expect(com[chave] - base[chave]).toBe(delta);
  });

  it('o mascote da família da conjuração dá Pós-conj. e Conj. variável -5%', () => {
    const base = semMascote();
    const com = simular('The Vigilante at Night', ARMAS.metralhadora, { pet: 9125 }).bonus; // Patinho
    expect(com['acd'] - base['acd']).toBe(5);
    expect(com['vct'] - base['vct']).toBe(5);
  });

  it('as famílias não se misturam — o Orc Herói não dá dano corpo a corpo nem mágico', () => {
    const base = semMascote();
    const com = simular('The Vigilante at Night', ARMAS.metralhadora, { pet: 9121 }).bonus;
    expect(com['melee'] - base['melee']).toBe(0);
    expect(com['m_my_element_all'] - base['m_my_element_all']).toBe(0);
    expect(com['acd'] - base['acd']).toBe(0);
  });

  /**
   * Quatro dos mascotes que a descrição cita não têm registro no item.json e por isso
   * ficaram de fora das condições: 9109 Quinding, 9113 Esqueleão, 9114 Pouring e
   * 9171 Vigia do Tempo. Como não dá para equipá-los na calculadora, a falta não muda
   * resultado nenhum — mas o dia em que forem cadastrados, o conjunto precisa crescer.
   */
  it('as condições citam só mascotes que existem no item.json', () => {
    const script = items[CESTA_DE_MASCOTES].script;
    const ids = JSON.stringify(script).match(/\d{4,}/g)!.map(Number);
    expect(ids.filter((id) => !items[String(id)])).toEqual([]);
    expect([9109, 9113, 9114, 9171].filter((id) => items[String(id)])).toEqual([]);
  });
});

/**
 * Os dezoito pacotes 0x01de da gravação. `dano` é o total do pacote; `golpesPacote` é o
 * `count` que ele carrega, que **não** é sempre o número de golpes lógicos — o Tiroteio
 * chega com 3 (a engine modela isso como `hit: 3`, três golpes de exibição para um golpe
 * de dano). Por isso a divisão usa o `skillTotalHit` do simulador, e um teste separado
 * confere que os dois batem onde devem bater.
 */
const PACOTES: { ms: number; skill: string; arma: Arma; dano: number; golpesPacote: number; critico?: boolean }[] = [
  { ms: 1912, skill: 'The Vigilante at Night', arma: ARMAS.escopeta, dano: 8883184, golpesPacote: 4 },
  { ms: 9497, skill: 'Wild Fire', arma: ARMAS.escopeta, dano: 3426240, golpesPacote: 3 },
  { ms: 14530, skill: 'The Vigilante at Night', arma: ARMAS.metralhadora, dano: 4061666, golpesPacote: 7 },
  { ms: 19697, skill: 'Magazine for One', arma: ARMAS.metralhadora, dano: 4688600, golpesPacote: 10 },
  { ms: 26129, skill: 'Spiral Shooting', arma: ARMAS.lancaGranadas, dano: 4287206, golpesPacote: 2 },
  { ms: 31047, skill: 'Wild Fire', arma: ARMAS.lancaGranadas, dano: 3812133, golpesPacote: 3 },
  { ms: 36779, skill: 'Only One Bullet', arma: ARMAS.fuzil, dano: 2628657, golpesPacote: 1, critico: true },
  { ms: 42580, skill: 'Only One Bullet', arma: ARMAS.fuzil, dano: 2628657, golpesPacote: 1, critico: true },
  { ms: 47513, skill: 'Only One Bullet', arma: ARMAS.fuzil, dano: 2628657, golpesPacote: 1, critico: true },
  { ms: 52430, skill: 'Only One Bullet', arma: ARMAS.fuzil, dano: 2628657, golpesPacote: 1, critico: true },
  { ms: 57529, skill: 'Only One Bullet', arma: ARMAS.fuzil, dano: 2628657, golpesPacote: 1, critico: true },
  { ms: 62430, skill: 'Only One Bullet', arma: ARMAS.fuzil, dano: 2628657, golpesPacote: 1, critico: true },
  { ms: 67563, skill: 'Only One Bullet', arma: ARMAS.fuzil, dano: 1655573, golpesPacote: 1 },
  { ms: 72546, skill: 'Spiral Shooting', arma: ARMAS.fuzil, dano: 1281588, golpesPacote: 1 },
  { ms: 77629, skill: 'Spiral Shooting', arma: ARMAS.fuzil, dano: 1954171, golpesPacote: 1, critico: true },
  { ms: 84413, skill: 'Only One Bullet', arma: ARMAS.pistola, dano: 1802761, golpesPacote: 1 },
  { ms: 89748, skill: 'Magazine for One', arma: ARMAS.pistola, dano: 3674718, golpesPacote: 6, critico: true },
  { ms: 95146, skill: 'Magazine for One', arma: ARMAS.pistola, dano: 2409960, golpesPacote: 6 },
];

/**
 * **Folga de 0,5%, e ela ainda mede um buraco de verdade.** Com o conjunto da Cesta no
 * lugar os oito críticos — que são determinísticos, porque um crítico usa o ATQ **máximo**
 * da arma — ficam 0,38% (fuzil) a 0,48% (revólver) acima do simulador, e três pacotes
 * não-críticos passam do teto por 0,12% a 0,36%. É o resíduo que sobrou depois do conjunto
 * e ainda não tem explicação; duas cartas da build seguem fora do item.json (310991
 * "MHP 2Lv" e 29013 "Absorção de HP 3"), mas as duas são só HP.
 */
const FOLGA = 1.005;

describe('dano da gravação Armas + Mira', () => {
  it.each(PACOTES.filter((p) => !p.critico))(
    '$skill @$ms ($arma.nome): $dano cai na faixa do simulador',
    ({ skill, arma, dano }) => {
      const r = simular(skill, arma);
      const porGolpe = dano / r.golpes;
      expect(Number.isInteger(porGolpe), `${dano} não divide por ${r.golpes}`).toBe(true);
      expect(porGolpe).toBeGreaterThanOrEqual(r.min);
      expect(porGolpe).toBeLessThanOrEqual(Math.floor(r.max * FOLGA));
    },
  );

  it.each(PACOTES.filter((p) => p.critico))(
    '$skill @$ms ($arma.nome): o crítico $dano bate o máximo determinístico',
    ({ skill, arma, dano }) => {
      const r = simular(skill, arma);
      expect(r.podeCritar).toBe(true);
      const porGolpe = dano / r.golpes;
      expect(porGolpe).toBeGreaterThanOrEqual(r.critico);
      expect(porGolpe).toBeLessThanOrEqual(Math.floor(r.critico * FOLGA));
    },
  );

  // Sem esta guarda o teste acima passaria com uma faixa larga demais.
  it('a faixa é justa — a variação é a do ATQ da arma, não uma margem larga', () => {
    for (const { skill, arma } of PACOTES) {
      const r = simular(skill, arma);
      expect(r.max / r.min, `${skill} ${arma.nome}`).toBeLessThan(1.12);
    }
  });

  it('o count do pacote é o número de golpes, menos no Tiroteio (3 de exibição, 1 de dano)', () => {
    for (const p of PACOTES) {
      const esperado = p.skill === 'Wild Fire' ? 1 : p.golpesPacote;
      expect(simular(p.skill, p.arma).golpes, `${p.skill} @${p.ms}`).toBe(esperado);
    }
  });
});

/**
 * O tamanho do resíduo que sobrou, fixado de propósito: se alguém achar o que falta, este
 * teste quebra e é o sinal de que a folga acima pode encolher.
 */
describe('resíduo em aberto', () => {
  it.each([
    { skill: 'Only One Bullet', arma: ARMAS.fuzil, dano: 2628657, razao: 1.0038 },
    { skill: 'Spiral Shooting', arma: ARMAS.fuzil, dano: 1954171, razao: 1.0038 },
    { skill: 'Magazine for One', arma: ARMAS.pistola, dano: 3674718 / 6, razao: 1.0048 },
  ])('$skill: o crítico gravado é $razao× o simulado', ({ skill, arma, dano, razao }) => {
    expect(dano / simular(skill, arma).critico).toBeCloseTo(razao, 4);
  });
});
