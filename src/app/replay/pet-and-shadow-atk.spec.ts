import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Calculator } from 'src/app/core/calculator';
import { CalculatorController } from 'src/app/core/calculator-controller';
import { parseOptionScripts } from 'src/app/core/option-scripts';
import { DEFAULT_PET_LOYALTY, PetLoyalty, petLoyaltyFromIntimacy } from 'src/app/constants';
import { NightWatch } from 'src/app/jobs/NightWatch';
import { SKILL_ID_BY_NAME } from 'src/app/skills';
import { loadReplayFixture } from './__tests__/load-fixture';
import { decodeReplay } from 'rrfparser';
import { importReplayBuffer } from './replay-to-model';

/**
 * `nw-mira-pet.rrf` — a gravação "Armas + Mira" do shummuy (Guarda Noturno nível 241 /
 * classe 50, tra_fild, 31/07/2026), importada inteira e conferida contra os pacotes
 * ZC_PAR_CHANGE que ela própria carrega. É a fixture que fecha dois furos encontrados no
 * mapeamento equipamento-a-equipamento:
 *
 *  1. **Manopla Sombria POD (24751)** — a descrição pt-BR abre com "ATQ e ATQM +1 por
 *     refino" e o script não tinha essa linha. No +9 são 9 de ATQ e 9 de ATQM, e era
 *     exatamente o que faltava: a gravação anuncia ATQ Equip. 9 acima do simulador com
 *     **todas** as cinco armas, e ATQM equip. 9 contra 0.
 *  2. **Mascote** — o replay traz o bicho como entidade (não como item de inventário), e
 *     o importador não olhava para lá. Agora olha, pela tabela do próprio cliente.
 *
 * A **intimidade** também sai daqui, mas não de pacote nenhum: ela mora no bloco do
 * mascote (contêiner 9, chunk 5308), que é de onde o cliente monta a Janela de Mascote ao
 * reproduzir o replay. Nesta gravação vale 850, que a escala do cliente chama de "Normal"
 * — a mesma faixa que shummuy relatou e a que faz os críticos baterem exato.
 */

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const monsters = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));
const hpSpTable = JSON.parse(readFileSync('src/assets/demo/data/hp_sp_table.json', 'utf8'));

const OVO_ORC_HEROI = 9121;
const MANOPLA_SOMBRIA_POD = 24751;

/** Monta a build da gravação e devolve o painel de status do simulador. */
function painel(opts: { weapon: number; refine: number; cards?: number[]; mira?: boolean; loyalty?: PetLoyalty }) {
  const { model, learnedSkills, summary } = importReplayBuffer(loadReplayFixture('nw-mira-pet.rrf'), items);
  const m: any = model;
  m.class = 4306;
  // Talentos não vêm no replay; são os que o shummuy confirmou.
  m.pow = 100; m.sta = 0; m.wis = 0; m.spl = 0; m.con = 62; m.crt = 0;
  m.weapon = opts.weapon; m.weaponRefine = opts.refine;
  m.weaponCard1 = opts.cards?.[0] ?? 0; m.weaponCard2 = opts.cards?.[1] ?? 0;
  if (opts.loyalty) m.petLoyalty = opts.loyalty;

  const cls = new NightWatch();
  const b = cls.getJobBonusStatus(m.jobLevel);
  Object.assign(m, {
    jobStr: b.str, jobAgi: b.agi, jobVit: b.vit, jobInt: b.int, jobDex: b.dex, jobLuk: b.luk,
    jobPow: b.pow, jobSta: b.sta, jobWis: b.wis, jobSpl: b.spl, jobCon: b.con, jobCrt: b.crt,
  });
  const skillValue = 'Only One Bullet==1';
  m.selectedAtkSkill = skillValue;

  const passiveIds = cls.passiveSkills.map((s) => {
    const id = SKILL_ID_BY_NAME[s.name];
    return id ? learnedSkills[id] ?? 0 : 0;
  });
  const activeIds = cls.activeSkills.map((s) => (s.name === 'Intensive Aim' && opts.mira ? 1 : 0));
  const { equipAtks, masteryAtks, activeSkillNames, learnedSkillMap } = cls
    .setLearnSkills({ activeSkillIds: activeIds, passiveSkillIds: passiveIds })
    .getSkillBonusAndName();

  const calc = new Calculator().setMasterItems(items).setHpSpTable(hpSpTable).setClass(cls);
  calc.loadItemFromModel(m);
  new CalculatorController().runChain(calc, {
    monster: monsters['21076'], equipAtks, masteryAtks, buffEquips: {}, buffMasterys: {},
    consumeData: [], aspdPotion: undefined,
    extraOptionScripts: parseOptionScripts((m.rawOptionTxts ?? []).filter(Boolean)),
    activeSkillNames, learnedSkillMap, selectedAtkSkill: skillValue, selectedChances: [], usedHpL: false,
  } as any);

  const t: any = calc.getTotalSummary();
  return {
    model: m,
    summary,
    /** "ATQ Equip." da janela de status (SP_ATK2): arma + refino + equipamento. */
    atkEquip: (t.weapon?.baseWeaponAtk ?? 0) + (t.weapon?.refineBonus ?? 0) + t.calc.totalEquipAtk,
    atkStatus: t.calc.totalStatusAtk as number,
    criticoBase: t.calc.totalCri as number,
    luk: (calc as any).dmgCalculator.status.totalLuk as number,
    totalBonus: (calc as any).totalEquipStatus as Record<string, number>,
  };
}

describe('import do replay — mascote', () => {
  it('traz o Ovo de Orc Herói a partir da entidade do bicho', () => {
    const { model, summary } = painel({ weapon: 810005, refine: 0 });
    expect(model.pet).toBe(OVO_ORC_HEROI);
    expect(summary.pet).toEqual({
      itemId: OVO_ORC_HEROI,
      view: 20571,
      loyaltyKnown: true,
      intimacy: 850,
      loyalty: PetLoyalty.Normal,
    });
  });

  /**
   * A gravação traz intimidade **850**. Na escala do cliente (`msgstringtable_ml.csv`)
   * 750..909 é `MSI_FRIENDLY`, "Normal" em pt-BR — e é exatamente o que a Janela de
   * Mascote mostra quando o replay é reproduzido no jogo. A faixa importada tem que ser
   * essa, não o padrão.
   */
  it('a intimidade 850 do arquivo vira a Lealdade Normal', () => {
    const { model, summary } = painel({ weapon: 810005, refine: 0 });
    expect(summary.pet?.intimacy).toBe(850);
    expect(model.petLoyalty).toBe(PetLoyalty.Normal);
    expect(model.petLoyalty).not.toBe(DEFAULT_PET_LOYALTY);
  });
});

/**
 * A escala crua (0 a 1000) e os limiares do servidor. Os rótulos são os do cliente:
 * MSI_VERY_AWKWARD "Baixíssima", MSI_AWKWARD "Baixa", MSI_NORMAL "Nenhuma",
 * MSI_FRIENDLY "Normal", MSI_VERY_FRIENDLY "Alta" — as duas primeiras entram juntas na
 * faixa `Baixa`, porque a descrição dos ovos as escreve numa linha só.
 */
describe('intimidade crua → faixa', () => {
  it.each([
    [0, PetLoyalty.Baixa], [1, PetLoyalty.Baixa], [99, PetLoyalty.Baixa],
    [100, PetLoyalty.Baixa], [249, PetLoyalty.Baixa],
    [250, PetLoyalty.Nenhuma], [749, PetLoyalty.Nenhuma],
    [750, PetLoyalty.Normal], [850, PetLoyalty.Normal], [909, PetLoyalty.Normal],
    [910, PetLoyalty.Alta], [1000, PetLoyalty.Alta],
  ])('%i → faixa %i', (intimidade, faixa) => {
    expect(petLoyaltyFromIntimacy(intimidade)).toBe(faixa);
  });
});

describe('bloco do mascote nas outras gravações', () => {
  // Mesmo personagem e mesmo bicho nas três: nível 50, intimidade 850. A fome cai ao
  // longo da sessão, o que confirma que os campos são do bloco e não de um pacote fixo.
  it.each([
    ['nw-mira-pet.rrf', 41],
    ['nw-ult.rrf', 47],
    ['nw-ult-mira.rrf', 44],
  ])('%s: intimidade 850, nível 50, fome %i', (fixture, fome) => {
    const pet = decodeReplay(loadReplayFixture(fixture)).pet!;
    expect(pet.name).toBe('Orc Herói');
    expect(pet.view).toBe(20571);
    expect(pet.level).toBe(50);
    expect(pet.intimacy).toBe(850);
    expect(pet.hunger).toBe(fome);
  });
});

describe('faixas de lealdade do mascote', () => {
  // Descrição pt-BR do 9121: Baixa/Baixíssima +1%, Nenhuma +2%,
  // Normal +4% e Dano crít. +1%, Alta +7% e Dano crít. +3%.
  it.each([
    { faixa: PetLoyalty.Baixa, atkPercent: 1, criDmg: 0 },
    { faixa: PetLoyalty.Nenhuma, atkPercent: 2, criDmg: 0 },
    { faixa: PetLoyalty.Normal, atkPercent: 4, criDmg: 1 },
    { faixa: PetLoyalty.Alta, atkPercent: 7, criDmg: 3 },
  ])('faixa $faixa: ATQ +$atkPercent% e Dano crít. +$criDmg%', ({ faixa, atkPercent, criDmg }) => {
    const base = painel({ weapon: 810005, refine: 0, loyalty: PetLoyalty.Alta }).totalBonus;
    const alvo = painel({ weapon: 810005, refine: 0, loyalty: faixa }).totalBonus;
    // Só o mascote muda entre as duas builds, então a diferença é o efeito da faixa.
    expect(alvo['atkPercent'] - base['atkPercent']).toBe(atkPercent - 7);
    expect(alvo['criDmg'] - base['criDmg']).toBe(criDmg - 3);
  });

  it('as faixas se substituem, não somam', () => {
    const alta = painel({ weapon: 810005, refine: 0, loyalty: PetLoyalty.Alta }).totalBonus;
    const baixa = painel({ weapon: 810005, refine: 0, loyalty: PetLoyalty.Baixa }).totalBonus;
    // Se somassem, a Alta traria 1+2+4+7 = 14 pontos a mais que a build sem as faixas.
    expect(alta['atkPercent'] - baixa['atkPercent']).toBe(6);
  });
});

/**
 * ATQ Equip. (SP_ATK2) por arma, como a gravação anuncia a cada troca. Sem arma são 219;
 * com a Mira Focalizada ligada, 369 (os +150 de ATQ da habilidade). O valor por arma é a
 * soma desses 219 com o ATQ da arma e o que o script dela dá.
 */
describe('ATQ Equip. conferido contra os pacotes da gravação', () => {
  it.each([
    { nome: 'Atirador Consertado +0', weapon: 810005, refine: 0, cards: [], spAtk2: 669 },
    { nome: 'Aspersor Consertado +0', weapon: 830008, refine: 0, cards: [], spAtk2: 659 },
    { nome: 'Lança-Granadas Primordial +8', weapon: 840001, refine: 8, cards: [300241, 300240], spAtk2: 845 },
    { nome: 'Pistola Aprimorável +7', weapon: 13115, refine: 7, cards: [], spAtk2: 559 },
  ])('com Mira Focalizada e $nome: SP_ATK2 = $spAtk2', ({ weapon, refine, cards, spAtk2 }) => {
    expect(painel({ weapon, refine, cards, mira: true }).atkEquip).toBe(spAtk2);
  });

  it('SP_ATK1 (ATQ base) = 846', () => {
    expect(painel({ weapon: 810005, refine: 0, mira: true }).atkStatus).toBe(846);
  });

  /**
   * **Divergência conhecida, de 1 ponto de SOR.** A gravação anuncia SP_CRITICAL = 65 com
   * a Mira Focalizada ligada (+30 de Crítico); o simulador dá 66. O crítico base é
   * ⌊SOR/3⌋ e a calculadora chega a SOR 108 — 100 alocada, +7 do bônus de classe e +1 do
   * encante 4750 "SOR +1" da armadura. O jogo se comporta como SOR 107.
   *
   * O que impede de simplesmente tirar um ponto: **o ATQ base da mesma gravação exige
   * 108**. SP_ATK1 = 846 só sai com SOR 108..110; SP_CRITICAL = 65 só sai com SOR 105..107.
   * As faixas não se cruzam, então ou a fórmula do ATQ base ou a do crítico ainda está
   * errada, e nenhuma das cinco gravações separa os casos. Aguarda a SOR real do
   * personagem.
   */
  it('SP_CRITICAL: o simulador dá 66 e a gravação 65 — 1 ponto de SOR em aberto', () => {
    const r = painel({ weapon: 810005, refine: 0, mira: true });
    expect(r.luk).toBe(108);
    expect(r.criticoBase).toBe(66);
    expect(r.criticoBase - 65).toBe(1);
  });

  // O que o item 24751 acrescenta, isolado: sem a linha "ATQ e ATQM +1 por refino" cada
  // um dos números acima ficava 9 abaixo do que a gravação anuncia.
  it('a Manopla Sombria POD +9 dá 9 de ATQ e 9 de ATQM', () => {
    const { totalBonus } = painel({ weapon: 810005, refine: 0 });
    const script = items[MANOPLA_SOMBRIA_POD].script;
    expect(script.atk).toEqual(['1---1']);
    expect(script.matk).toEqual(['1---1']);
    expect(totalBonus['atk']).toBeGreaterThanOrEqual(9);
    expect(totalBonus['matk']).toBe(9);
  });
});
