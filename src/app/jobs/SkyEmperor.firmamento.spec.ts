import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { decodeReplay } from 'rrfparser';
import { Calculator } from 'src/app/core/calculator';
import { CalculatorController } from 'src/app/core/calculator-controller';
import { createMainModel } from 'src/app/utils';
import { importReplayBuffer } from 'src/app/replay/replay-to-model';
import { loadReplayFixture } from 'src/app/replay/__tests__/load-fixture';
import { SkyEmperor } from './SkyEmperor';

/**
 * Mestre Celestial — **Firmamento** (All in the Sky, id 5474) contra
 * `fixtures/se-firmamento.rrf`, gravada em tra_fild em 13/08/2026 por Ted ("Ted Uju") e
 * enviada pelo modal "Ajude o simulador" (envio VrFeDxBoFM).
 *
 * A gravação é curta de propósito e é justamente por isso que fecha: **nenhum equipamento**
 * (nem arma), então não há variância de ATQ e cada pacote é um inteiro determinístico.
 * Dois pacotes, contra o "Dummy - Humanoide" (monstro 21070, raça DemiHuman, DEF suave 50):
 *
 *   t=2829  ataque básico              4.295          count 1  normal
 *   t=7138  Firmamento Nv.10       6.576.267          count 3  "double" (NÃO crítico)
 *
 * Os talentos não viajam no `.rrf`; vieram no formulário do envio: **POD 100, CRV 52**,
 * o resto 0. Com o bônus de classe no nível de classe 50 (POD +11) dá POD total 111.
 *
 * **Como as três incógnitas foram separadas.** O ataque básico dá o ATQ de graça:
 * 4.295 + 50 de DEF suave = **ATQ 4.345**, que é exatamente o que o motor produz para
 * este personagem (⌊2.349 × 1,85⌋, o Kihop Nv.5 sobre o ATQ inteiro). Sobrando só a razão:
 *
 *   por golpe = ⌊ATQ × razão ÷ 100⌋ − 50 = 2.192.089  ->  razão = 50.452
 *
 * e 50.452 = ⌊21.110 × 239/100⌋, com 21.110 = 2.000×10 + 111×10. Nenhum outro inteiro
 * cabe. Daí saem as três decisões do modelo:
 *
 *  - **São 3 golpes CHEIOS, não um pacote repartido.** As irmãs da classe usam `hit`, em
 *    que o servidor parte UM dano em N mostradores (⌊total÷N⌋×N). Se Firmamento fosse
 *    assim, o dano único seria ~6,58 mi e **não existe razão inteira** que o produza. Como
 *    3 × 2.192.089 fecha exato, é `totalHit`. A divine-pride concorda: rotula a coluna da
 *    tabela como "ATK per Hit". A condição de raça (Humanoide/Demônio) só faz sentido
 *    assim — contra as outras raças é 1 golpe.
 *  - **A Maestria Celestial NÃO entra.** A descrição diz que entra, mas essa linha é texto
 *    padrão repetido em toda a classe: a tabela do cliente para Firmamento é a única sem a
 *    coluna "Nv. Maestria", que é de onde sai o `skillLevel × maestria × 5` das irmãs. Com
 *    Maestria 10 na gravação, qualquer termo de maestria estoura o inteiro medido.
 *  - **O coeficiente de POD é 10, não 5.** Todas as irmãs usam POD×5 (e têm nível máximo
 *    5); aqui 21.110 − 20.000 = 1.110 = 111 × 10 exatamente. Como só há dado no Nv.10,
 *    POD×10 e POD×NívelDaHabilidade são indistinguíveis — por isso o seletor expõe apenas
 *    o Nv.10, e é só ele que este spec trava.
 *
 * **O que esta gravação NÃO mede** (deixado em aberto de propósito):
 *  - o crítico. O pacote é `double`, não `critical` — Ted tinha Crítico 41 e não critou.
 *    O modelo copia as irmãs (chance = CRIT cheio, dano de crítico pela metade).
 *  - tempos de conjuração/recarga. O bloco pt-BR do cliente só traz o custo de AP (100), e
 *    as fontes externas discordam entre si e do LATAM até no ATQ por nível (divine-pride
 *    1.450-12.250%, gnjoy TH 5.000-23.000%, cliente LATAM 2.000-20.000% — e é a tabela do
 *    cliente que a gravação confirma). Os campos acd/fct/vct/cd da habilidade são chute e
 *    só afetam o DPS exibido.
 */

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const monsters = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));
const hpSpTable = JSON.parse(readFileSync('src/assets/demo/data/hp_sp_table.json', 'utf8'));

const FIXTURE = 'se-firmamento.rrf';
/** "Dummy - Humanoide" — raça DemiHuman, que é o que libera os 3 golpes. */
const ALVO_HUMANOIDE = '21070';
/** "Dummy - Bruto" — raça Brute, para provar que fora de Humanoide/Demônio é 1 golpe. */
const ALVO_BRUTO = '21069';

/** Talentos informados por quem gravou (não existem no `.rrf`). */
const TALENTOS = { pow: 100, sta: 0, wis: 0, spl: 0, con: 0, crt: 52 };

const replay: any = decodeReplay(loadReplayFixture(FIXTURE));
const imported: any = importReplayBuffer(loadReplayFixture(FIXTURE), items);

/** Os dois pacotes da gravação, lidos do arquivo em vez de redigitados. */
const basico = replay.damage.find((d: any) => d.skillId === 0);
const firmamento = replay.damage.find((d: any) => d.skillId === 5474);

/**
 * Roda a cadeia inteira como a página. Os níveis de habilidade saem da árvore da própria
 * gravação (`learnedSkills`), não de números redigitados aqui.
 */
function simular(
  skillValue: string,
  opts: { kihop?: number; monsterId?: string } = {},
) {
  const aprendidas: Record<number, number> = imported.learnedSkills;
  const { kihop = aprendidas[424], monsterId = ALVO_HUMANOIDE } = opts;

  const cls = new SkyEmperor();
  const { equipAtks, masteryAtks, activeSkillNames, learnedSkillMap } = cls
    .setLearnSkills({ activeSkillIds: [], passiveSkillIds: [] })
    .getSkillBonusAndName();
  learnedSkillMap.set('Sky Mastery', aprendidas[5463]);
  learnedSkillMap.set('War Book Mastery', aprendidas[5464]);
  learnedSkillMap.set('Run', aprendidas[411]);
  if (kihop) learnedSkillMap.set('Power', kihop);

  const calc = new Calculator().setMasterItems(items).setHpSpTable(hpSpTable).setClass(cls);
  const bonus = cls.getJobBonusStatus(imported.model.jobLevel);
  const model: any = createMainModel();
  // Classe, níveis e status base vêm do próprio arquivo.
  Object.assign(model, {
    class: imported.model.class,
    level: imported.model.level,
    jobLevel: imported.model.jobLevel,
    str: imported.model.str, agi: imported.model.agi, vit: imported.model.vit,
    int: imported.model.int, dex: imported.model.dex, luk: imported.model.luk,
    ...TALENTOS,
    jobStr: bonus.str, jobAgi: bonus.agi, jobVit: bonus.vit,
    jobInt: bonus.int, jobDex: bonus.dex, jobLuk: bonus.luk,
    jobPow: bonus.pow, jobSta: bonus.sta, jobWis: bonus.wis,
    jobSpl: bonus.spl, jobCon: bonus.con, jobCrt: bonus.crt,
    selectedAtkSkill: skillValue,
  });
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
  return {
    porGolpe: s.skillMaxDamageNoCri || s.skillMaxDamage,
    golpes: s.skillTotalHit as number,
    basico: s.basicMaxDamage as number,
  };
}

describe('Mestre Celestial — a gravação de Firmamento', () => {
  it('é o personagem certo: nv 239/50, sem nenhum equipamento', () => {
    expect(imported.model.class).toBe(4302);
    expect(imported.model.level).toBe(239);
    expect(imported.model.jobLevel).toBe(50);
    expect(imported.summary.equippedCount).toBe(0);
    // Nada ficou fora do banco: o resíduo não pode ser item faltando.
    expect(imported.summary.skippedItems).toEqual([]);
  });

  it('tem Firmamento Nv.10, Maestria Celestial 10, Perícia com Livro 10 e Kihop 5', () => {
    expect(imported.learnedSkills[5474]).toBe(10);
    expect(imported.learnedSkills[5463]).toBe(10);
    expect(imported.learnedSkills[5464]).toBe(10);
    expect(imported.learnedSkills[424]).toBe(5);
  });

  it('os dois pacotes são os esperados, e o de Firmamento não é crítico', () => {
    expect(basico.damage).toBe(4295);
    expect(firmamento.skillLevel).toBe(10);
    expect(firmamento.damage).toBe(6576267);
    expect(firmamento.hits).toBe(3);
    // "double" = ação 8/9. Crítico seria "critical" (ação 10/13).
    expect(firmamento.hitType).toBe('double');
  });
});

describe('Mestre Celestial — Firmamento Nv.10 vs "Dummy - Humanoide"', () => {
  // 6.576.267 ÷ 3 = 2.192.089 exato.
  const POR_GOLPE = 2192089;

  it('bate 2.192.089 por golpe, em 3 golpes — o pacote de 6.576.267', () => {
    const r = simular('All in the Sky==10');
    expect(r.porGolpe).toBe(POR_GOLPE);
    expect(r.golpes).toBe(3);
    expect(r.porGolpe * r.golpes).toBe(firmamento.damage);
  });

  it('contra raça fora de Humanoide/Demônio é 1 golpe, com o mesmo dano por golpe', () => {
    const r = simular('All in the Sky==10', { monsterId: ALVO_BRUTO });
    expect(r.golpes).toBe(1);
    expect(r.porGolpe).toBe(POR_GOLPE);
  });

  it('o ataque básico da mesma gravação fecha em 4.295 — é ele que trava o ATQ 4.345', () => {
    expect(simular('All in the Sky==10').basico).toBe(basico.damage);
  });

  it('sem o Kihop aprendido o número quebra (guarda da correção do passivo)', () => {
    const r = simular('All in the Sky==10', { kihop: 0 });
    expect(r.porGolpe).not.toBe(POR_GOLPE);
    expect(r.basico).not.toBe(basico.damage);
  });
});
