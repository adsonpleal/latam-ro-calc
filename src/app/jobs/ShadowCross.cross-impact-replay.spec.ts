import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Calculator } from 'src/app/core/calculator';
import { CalculatorController } from 'src/app/core/calculator-controller';
import { parseOptionScripts } from 'src/app/core/option-scripts';
import { loadReplayFixture } from 'src/app/replay/__tests__/load-fixture';
import { importReplayBuffer } from 'src/app/replay/replay-to-model';
import { SKILL_ID_BY_NAME } from 'src/app/skills';
import { ShadowCross } from './ShadowCross';

/**
 * Shadow Cross — Lâminas Retalhadoras (Cross Impact, GC_CROSSIMPACT 2022) checked against
 * `sc-cross-impact.rrf`, an Executor 240/50 hitting the **Dummy - Médio** on tra_fild,
 * submitted by Merda Miserável (tracker card `yjTJhsS8K9`, 16/08/2026).
 *
 * Nine casts, all Lv5, all against the same dummy, with **no equipment change** and no
 * damage-affecting buff in the EFST stream — the only status the recording carries is 46
 * (post-delay), which switches on at each cast for 500 ms and matches the skill's own
 * `acd: 0.5`. The packets hold exactly two distinct numbers, each repeated verbatim:
 *
 *   6.525.064  (4 pacotes: 899, 7625, 13190, 15122 ms)
 *   7.019.425  (5 pacotes: 3812, 5856, 9456, 11098, 17159 ms)
 *
 * Both are **criticals**: the simulator puts this build's Tx. Crítico for the skill at
 * 126% (SOR 132 + 87 de equipamentos, doubled by the katar, halved by the skill's own
 * "a chance é a metade do CRIT"), i.e. capped at 100%, and a critical uses the weapon's
 * maximum ATK — which is why every packet repeats an exact integer instead of spreading
 * over the weapon's variance. The non-critical range for the same build is
 * 1.688.251–1.817.343, four times below anything recorded.
 *
 * **What separates the two numbers** is the Manopla Sombria do Katar (24539), whose
 * pt-BR description reads "Ao realizar ataques físicos: 30% de chance de ativar um
 * [Efeito] por 5 segundos" — Dano crítico +10% and Dano físico contra todos os tamanhos
 * +10%, each +5% more at refino +7 (this one is +8, so +15/+15). The timeline fits a
 * single roll per cast, at the advertised 30%, whose buff applies from the following cast:
 *
 *   proc em    899 -> janela [899, 5899]   pega 3812 e 5856;  7625 já fora
 *   proc em  7.625 -> janela [7625, 12625] pega 9456 e 11098; 13190 já fora
 *   proc em 15.122 -> janela [15122, 20122] pega 17159
 *
 * Three procs in nine casts, and every one of the nine packets lands on the right side of
 * the window. Nothing here is fitted: the effect's size comes from the item's own script
 * and its refino comes from the `.rrf`.
 *
 * **The build is never retyped.** `importReplayBuffer` reads the whole paper doll off the
 * recording — Katar Primordial-LT +11 with two Cartas Andarilho Poluto, the six shadow
 * pieces, the enchants and the seven random options. Only the six talents are supplied by
 * hand: a session recorded inside a single map never fires `ZC_COUPLESTATUS`, so the file
 * carries none, and these are the ones the submission dialog collected.
 *
 * **This recording carries no status window.** Its only `ZC_PAR_CHANGE` is SP (sp=7), so
 * the usual §3 cross-check against SP_ATK1/SP_ATK2/SP_CRATE is not available here. What
 * replaces it is that the *same* build reproduces two independent damage figures 7.6%
 * apart — one with the shadow-glove effect and one without — which pins the ATK, the crit
 * damage and the size multiplier separately instead of as one lump.
 *
 * **What this recording fixed.** Both packets first came out 35 low — the same 35, in both
 * states, which is what said the cause was additive rather than a missing multiplier (a
 * multiplier of 1,0000054 fitted state A and then missed state B by 3). Walking the chain
 * backwards put it at or after the skill ratio, and the soft DEF was not the culprit:
 * `wh-ilimitar.rrf` matches exactly through a `DEF -50` whose only remaining stage is the
 * critical, so 50 is right. What was left were the three stages that recording's chain does
 * not have — the equipment skill bonus, Perícia com Katar Avançada, and the split into 7
 * hits — and no reordering of the last two, no floor placement and no way of splitting the
 * hits got closer than 28 short.
 *
 * The answer was **Perícia com Katar Avançada** (`advKatar`, +20% at Lv5). The engine
 * applied it as the very last multiplier, after the soft DEF, so the dummy's 50 points of
 * soft DEF were scaled by 1,20 along with the damage and cost 60. Moving it to before the
 * subtraction — which is where the engine's own `calcBasicCriDamage` already had it, and
 * where rAthena applies ASC_KATAR, inside `battle_calc_weapon_attack` before
 * `battle_calc_defense` — makes both packets exact, and it is the **only** one of the four
 * possible positions that does:
 *
 *   antes da DEF          6.525.064 / 7.019.425   <- gravado
 *   depois da DEF         6.525.029 / 7.019.390
 *   depois do bônus hab.  6.525.029 / 7.019.390
 *   depois do crítico     6.525.029 / 7.019.390   <- o que o motor fazia
 *
 * The gap is therefore 0, and this spec asserts equality rather than a tolerance.
 */

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const monsters = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));
const hpSpTable = JSON.parse(readFileSync('src/assets/demo/data/hp_sp_table.json', 'utf8'));

/** "Dummy - Médio" (view 21065), the recording's target — Médio, Sem Propriedade, Neutro 1. */
const DUMMY_MEDIO = '21065';
/** Manopla Sombria do Katar — the chance is keyed by the item's English name. */
const MANOPLA_SOMBRIA = 'Katar Shadow Weapon';
/** Talents, typed into the "Ajude o simulador" dialog — the only thing the file lacks. */
const TALENTOS = { pow: 100, sta: 0, wis: 0, spl: 0, con: 0, crt: 59 };

function simular(skillValue: string, chances: string[] = []) {
  const { model, learnedSkills }: any = importReplayBuffer(loadReplayFixture('sc-cross-impact.rrf'), items);
  const m: any = model;
  m.class = 4254;
  Object.assign(m, TALENTOS);

  const cls = new ShadowCross();
  const b = cls.getJobBonusStatus(m.jobLevel);
  Object.assign(m, {
    jobStr: b.str, jobAgi: b.agi, jobVit: b.vit, jobInt: b.int, jobDex: b.dex, jobLuk: b.luk,
    jobPow: b.pow, jobSta: b.sta, jobWis: b.wis, jobSpl: b.spl, jobCon: b.con, jobCrt: b.crt,
  });
  m.selectedAtkSkill = skillValue;

  // Passives come from the recorded skill tree; no active skill is switched on, because
  // the EFST stream carries none (Ocultação, Carrasco Sombrio and EDP are all absent).
  const passiveIds = (cls as any).passiveSkills.map((s: any) => {
    const id = SKILL_ID_BY_NAME[s.name];
    return id ? learnedSkills[id] ?? 0 : 0;
  });
  const activeIds = (cls as any).activeSkills.map(() => 0);
  const { equipAtks, masteryAtks, activeSkillNames, learnedSkillMap } = cls
    .setLearnSkills({ activeSkillIds: activeIds, passiveSkillIds: passiveIds })
    .getSkillBonusAndName();

  const calc = new Calculator().setMasterItems(items).setHpSpTable(hpSpTable).setClass(cls);
  calc.loadItemFromModel(m);
  new CalculatorController().runChain(calc, {
    monster: monsters[DUMMY_MEDIO], equipAtks, masteryAtks, buffEquips: {}, buffMasterys: {},
    consumeData: [], aspdPotion: undefined,
    extraOptionScripts: parseOptionScripts((m.rawOptionTxts ?? []).filter(Boolean)),
    activeSkillNames, learnedSkillMap, selectedAtkSkill: skillValue, selectedChances: chances,
    usedHpL: false,
  } as any);

  const s = (calc as any).damageSummary;
  return {
    model: m,
    baseSkillDamage: s.baseSkillDamage as number,
    podeCritar: !!s.skillCanCri,
    golpesExibidos: s.skillHit as number,
    golpesDeDano: s.skillTotalHit as number,
    txCritico: s.skillCriRateToMonster as number,
    critico: s.skillMaxDamage as number,
    criticoMin: s.skillMinDamage as number,
    semCriMin: s.skillMinDamageNoCri as number,
    semCriMax: s.skillMaxDamageNoCri as number,
    /** The "Efeitos" column: this is where a selected chance bonus lands. */
    criticoComEfeito: s.effectedSkillDamageMax as number,
    criticoComEfeitoMin: s.effectedSkillDamageMin as number,
    etapas: (s.skillFormulaGraph?.max?.nodes ?? []).map((n: any) => n.id) as string[],
  };
}

/** The two numbers the recording repeats, verbatim. */
const SEM_EFEITO = 6525064;
const COM_EFEITO = 7019425;

describe('Shadow Cross — job/talent bonuses at job level 50', () => {
  // Asserted apart from the damage so a table regression names itself instead of
  // surfacing as an unexplained diff.
  const bonus = new ShadowCross().getJobBonusStatus(50);

  it('job bonuses → FOR 8 / AGI 11 / VIT 6 / INT 5 / DES 9 / SOR 4', () => {
    expect([bonus.str, bonus.agi, bonus.vit, bonus.int, bonus.dex, bonus.luk]).toEqual([8, 11, 6, 5, 9, 4]);
  });

  it('talent bonuses → POD 11 / STA 7 / SAB 4 / FEI 0 / CON 6 / CRV 5', () => {
    expect([bonus.pow, bonus.sta, bonus.wis, bonus.spl, bonus.con, bonus.crt]).toEqual([11, 7, 4, 0, 6, 5]);
  });
});

describe('Shadow Cross — the build comes from the recording', () => {
  it('imports the katar, its cards and the shadow glove that drives the proc', () => {
    const { model }: any = importReplayBuffer(loadReplayFixture('sc-cross-impact.rrf'), items);
    expect(model.class).toBe(4254);
    expect([model.level, model.jobLevel]).toEqual([240, 50]);
    expect([model.weapon, model.weaponRefine]).toEqual([610033, 11]);
    expect([model.weaponCard1, model.weaponCard2]).toEqual([27361, 27361]);
    // Refino +8 is what upgrades the [Efeito] from +10% to +15%.
    expect([model.shadowWeapon, model.shadowWeaponRefine]).toEqual([24539, 8]);
    expect(model.rawOptionTxts.filter(Boolean)).toHaveLength(7);
  });
});

describe('Shadow Cross — Lâminas Retalhadoras Nv5 vs "Dummy - Médio"', () => {
  const r = simular('Cross Impact==5');

  it('is a single damage hit displayed as 7, and it can crit', () => {
    expect(r.podeCritar).toBe(true);
    expect(r.golpesExibidos).toBe(7);
    // `hit: 7` is display only: the packet's 7 is the client's animation, and the whole
    // packet is one damage figure — which is why nothing below is divided by 7.
    expect(r.golpesDeDano).toBe(1);
  });

  it('skill ratio is 5.160% (1.400 + Nv5 × 150, × nível base 240/100)', () => {
    // Client table, skill-meta.generated.ts id 2022: [Nv 5] 2.150%. No POD term — the
    // description credits only the base level.
    expect(r.baseSkillDamage).toBe(5160);
  });

  it('crit rate passes 100%, so every packet in the recording is a critical', () => {
    expect(r.txCritico).toBeGreaterThanOrEqual(100);
  });

  it('the critical is deterministic (max ATK), matching the repeated packets', () => {
    expect(r.critico).toBe(r.criticoMin);
  });

  it(`without the [Efeito] → exactly ${SEM_EFEITO}`, () => {
    expect(r.critico).toBe(SEM_EFEITO);
  });

  it(`with the Manopla Sombria [Efeito] → exactly ${COM_EFEITO}`, () => {
    const efeito = simular('Cross Impact==5', [MANOPLA_SOMBRIA]);
    expect(efeito.criticoComEfeito).toBe(efeito.criticoComEfeitoMin);
    expect(efeito.criticoComEfeito).toBe(COM_EFEITO);
  });

  // Pinned separately from the damage so that putting the katar bonus back at the end of
  // the chain names itself, instead of surfacing as two unexplained numbers 35 short.
  it('Perícia com Katar Avançada is applied before the soft DEF, not after the critical', () => {
    const katar = r.etapas.indexOf('advKatar');
    const def = r.etapas.indexOf('softDef');
    expect(katar).toBeGreaterThanOrEqual(0);
    expect(katar).toBeLessThan(def);
    expect(r.etapas).not.toContain('finalMultipliers');
  });

  it('no recorded packet can be a non-critical: the non-crit range is four times lower', () => {
    expect(r.semCriMax).toBeLessThan(SEM_EFEITO / 3);
    // Guard against a wrong ratio still fitting: the non-crit spread stays tight.
    expect(r.semCriMax / r.semCriMin).toBeLessThan(1.12);
  });
});
