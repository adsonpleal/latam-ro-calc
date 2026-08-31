import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Calculator } from 'src/app/core/calculator';
import { CalculatorController } from 'src/app/core/calculator-controller';
import { parseOptionScripts } from 'src/app/core/option-scripts';
import { DEFAULT_PET_LOYALTY, PetLoyalty, petLoyaltyFromIntimacy } from 'src/app/constants';
import { NightWatch } from 'src/app/jobs/NightWatch';
import { SKILL_ID_BY_NAME } from 'src/app/skills';
import { PET_EGG_BY_VIEW } from './pet-egg-map';
import { loadReplayFixture } from './__tests__/load-fixture';
import { decodeReplay } from 'rrfparser';
import { importReplayBuffer } from './replay-to-model';

/**
 * `nw-mira-pet.rrf` — shummuy's "Armas + Mira" recording (Night Watch base level 241 /
 * job 50, tra_fild, 31/07/2026), imported whole and checked against the ZC_PAR_CHANGE
 * packets it carries itself. This is the fixture that closes two gaps found while mapping
 * the gear piece by piece:
 *
 *  1. **Manopla Sombria POD (24751)** — the pt-BR description opens with "ATQ e ATQM +1
 *     por refino" and the script had no such line. At +9 that is 9 ATK and 9 MATK, which
 *     is exactly what was missing: the recording reports equip ATK 9 above the simulator
 *     with **all** five weapons, and equip MATK 9 against 0.
 *  2. **The pet** — the replay carries the animal as an entity (not as an inventory
 *     item), and the importer never looked there. It does now, via the client's own table.
 *
 * **Intimacy** comes from here too, but from no packet at all: it lives in the pet block
 * (container 9, chunk 5308), which is what the client builds the Pet Window from when
 * replaying the file. In this recording it is 850, which the client's scale calls
 * "Normal" — the same tier shummuy reported, and the one that makes the criticals land
 * exactly.
 */

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const monsters = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));
const hpSpTable = JSON.parse(readFileSync('src/assets/demo/data/hp_sp_table.json', 'utf8'));

const OVO_ORC_HEROI = 9121;
const MANOPLA_SOMBRIA_POD = 24751;

/** Builds the recording's build and returns the simulator status panel. */
function painel(opts: { weapon: number; refine: number; cards?: number[]; mira?: boolean; loyalty?: PetLoyalty; pet?: number }) {
  const { model, learnedSkills, summary } = importReplayBuffer(loadReplayFixture('nw-mira-pet.rrf'), items);
  const m: any = model;
  m.class = 4306;
  // Traits do not travel in the replay; these are the ones shummuy confirmed.
  m.pow = 100; m.sta = 0; m.wis = 0; m.spl = 0; m.con = 62; m.crt = 0;
  m.weapon = opts.weapon; m.weaponRefine = opts.refine;
  m.weaponCard1 = opts.cards?.[0] ?? 0; m.weaponCard2 = opts.cards?.[1] ?? 0;
  if (opts.loyalty) m.petLoyalty = opts.loyalty;
  if (opts.pet !== undefined) m.pet = opts.pet;

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
    /** The status window's "ATQ Equip." (SP_ATK2): weapon + refine + gear. */
    atkEquip: (t.weapon?.baseWeaponAtk ?? 0) + (t.weapon?.refineBonus ?? 0) + t.calc.totalEquipAtk,
    atkStatus: t.calc.totalStatusAtk as number,
    criticoBase: t.calc.totalCri as number,
    luk: (calc as any).dmgCalculator.status.totalLuk as number,
    totalBonus: (calc as any).totalEquipStatus as Record<string, number>,
  };
}

describe('replay import — pet', () => {
  it('brings in the Ovo de Orc Herói from the animal entity', () => {
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
   * The recording carries intimacy **850**. On the client scale
   * (`msgstringtable_ml.csv`) 750..909 is `MSI_FRIENDLY`, "Normal" in pt-BR — and that is
   * exactly what the Pet Window shows when the replay is played back in game. The
   * imported tier has to be that one, not the default.
   */
  it('turns the file\'s intimacy 850 into the Normal loyalty tier', () => {
    const { model, summary } = painel({ weapon: 810005, refine: 0 });
    expect(summary.pet?.intimacy).toBe(850);
    expect(model.petLoyalty).toBe(PetLoyalty.Normal);
    expect(model.petLoyalty).not.toBe(DEFAULT_PET_LOYALTY);
  });
});

/**
 * The importer resolves the pet through `PET_EGG_BY_VIEW` and then drops it if the egg
 * is not in item.json, so an egg missing from the DB silently costs the build its pet.
 * Everything that table points at and the LATAM client actually ships now has a record.
 */
describe('every LATAM pet egg the client table names is in item.json', () => {
  const latam = JSON.parse(readFileSync('src/assets/demo/data/latam-items.json', 'utf8'));
  const isLatamPetEgg = (egg: number) =>
    /Tipo:\s*Ovo de Mascote/.test((latam[egg]?.description ?? '').replace(/\^[0-9a-fA-F]{6}/g, ''));

  it('leaves no mapped view pointing at an egg the DB does not have', () => {
    const mapped = Object.values(PET_EGG_BY_VIEW);
    const withoutRecord = mapped.filter((egg) => isLatamPetEgg(egg) && !items[egg]);
    expect(withoutRecord).toEqual([]);
    // Guards against the check passing because the table went empty.
    expect(mapped.filter(isLatamPetEgg).length).toBeGreaterThan(100);
  });
});

/**
 * The raw scale (0 to 1000) and the server thresholds. The labels are the client's:
 * MSI_VERY_AWKWARD "Baixíssima", MSI_AWKWARD "Baixa", MSI_NORMAL "Nenhuma",
 * MSI_FRIENDLY "Normal", MSI_VERY_FRIENDLY "Alta" — the first two collapse into the
 * `Baixa` tier, because the egg descriptions write them on a single line.
 */
describe('raw intimacy → tier', () => {
  it.each([
    [0, PetLoyalty.Baixa], [1, PetLoyalty.Baixa], [99, PetLoyalty.Baixa],
    [100, PetLoyalty.Baixa], [249, PetLoyalty.Baixa],
    [250, PetLoyalty.Nenhuma], [749, PetLoyalty.Nenhuma],
    [750, PetLoyalty.Normal], [850, PetLoyalty.Normal], [909, PetLoyalty.Normal],
    [910, PetLoyalty.Alta], [1000, PetLoyalty.Alta],
  ])('%i → tier %i', (intimidade, faixa) => {
    expect(petLoyaltyFromIntimacy(intimidade)).toBe(faixa);
  });
});

describe('the pet block in the other recordings', () => {
  // Same character and same animal in all three: level 50, intimacy 850. Hunger drops
  // over the session, which confirms the fields come from the block and not a fixed packet.
  it.each([
    ['nw-mira-pet.rrf', 41],
    ['nw-ult.rrf', 47],
    ['nw-ult-mira.rrf', 44],
  ])('%s: intimacy 850, level 50, hunger %i', (fixture, fome) => {
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
  ])('tier $faixa: ATK +$atkPercent% and crit damage +$criDmg%', ({ faixa, atkPercent, criDmg }) => {
    const base = painel({ weapon: 810005, refine: 0, loyalty: PetLoyalty.Alta }).totalBonus;
    const alvo = painel({ weapon: 810005, refine: 0, loyalty: faixa }).totalBonus;
    // Only the pet changes between the two builds, so the difference is the tier effect.
    expect(alvo['atkPercent'] - base['atkPercent']).toBe(atkPercent - 7);
    expect(alvo['criDmg'] - base['criDmg']).toBe(criDmg - 3);
  });

  it('replaces tiers rather than stacking them', () => {
    const alta = painel({ weapon: 810005, refine: 0, loyalty: PetLoyalty.Alta }).totalBonus;
    const baixa = painel({ weapon: 810005, refine: 0, loyalty: PetLoyalty.Baixa }).totalBonus;
    // If they stacked, Alta would bring 1+2+4+7 = 14 points more than the tier-less build.
    expect(alta['atkPercent'] - baixa['atkPercent']).toBe(6);
  });
});

/**
 * The same tier encoding on the rest of the eggs. Every one of them used to hand out its
 * top line unconditionally, so a pet below Lealdade Alta was over-credited.
 *
 * Each case swaps only the egg and the tier on the fixture's build, and measures against
 * the same build with no pet at all — so the numbers below are the egg's whole
 * contribution, not a difference between two tiers.
 */
describe('pet egg loyalty tiers across item.json', () => {
  /** What the egg alone adds to `key`, at that tier. */
  function petBonus(pet: number, loyalty: PetLoyalty, key: string): number {
    const withoutPet = painel({ weapon: 810005, refine: 0, pet: 0 }).totalBonus;
    const withPet = painel({ weapon: 810005, refine: 0, pet, loyalty }).totalBonus;

    return (withPet[key] ?? 0) - (withoutPet[key] ?? 0);
  }

  /**
   * 9193 Ovo de Abelha-Rainha, the one non-numeric case: "Anula a penalidade de tamanho
   * da arma" is written on the Alta line only, and the script granted it flat.
   */
  describe('9193 Ovo de Abelha-Rainha', () => {
    it.each([
      [PetLoyalty.Baixa, 1], [PetLoyalty.Nenhuma, 3], [PetLoyalty.Normal, 5], [PetLoyalty.Alta, 7],
    ])('tier %i: physical damage vs Normal monsters +%i%%', (loyalty, expected) => {
      expect(petBonus(9193, loyalty, 'p_class_normal')).toBe(expected);
    });

    it.each([
      [PetLoyalty.Baixa, 0], [PetLoyalty.Nenhuma, 0], [PetLoyalty.Normal, 0], [PetLoyalty.Alta, 1],
    ])('tier %i: cancels the weapon size penalty = %i', (loyalty, expected) => {
      expect(petBonus(9193, loyalty, 'ignore_size_penalty')).toBe(expected);
    });
  });

  // One egg per shape found in the descriptions: a bonus present on all four tiers, one
  // that only starts at a middle tier, one whose top two tiers are equal, and one whose
  // description names no tier below Normal.
  describe.each([
    { egg: 9087, name: 'Ovo de Grand Orc', key: 'atk', tiers: [10, 15, 20, 25] },
    { egg: 9091, name: 'Ovo de Choco', key: 'cri', tiers: [3, 5, 7, 9] },
    { egg: 9091, name: 'Ovo de Choco', key: 'range', tiers: [0, 1, 2, 3] },
    { egg: 9148, name: 'Ovo de Senhor das Trevas', key: 'm_my_element_dark', tiers: [3, 5, 7, 7] },
    { egg: 9128, name: 'Ovo de Sacerdote Maldito', key: 'm_element_holy', tiers: [0, 0, 2, 3] },
    { egg: 9111, name: 'Ovo de Freeoni', key: 'hit', tiers: [6, 10, 14, 18] },

    // Eggs the LATAM client has and item.json did not, added with the tiers already
    // encoded. Same shapes as above: four tiers, a bonus that starts partway up, two
    // equal top tiers, one Alta-only line, and one whose value drops on a lower tier.
    { egg: 9071, name: 'Ovo de Grand Peco', key: 'hp', tiers: [150, 200, 300, 400] },
    { egg: 9098, name: 'Ovo de Deletério', key: 'agi', tiers: [0, 1, 2, 3] },
    { egg: 9108, name: 'Ovo de Ursinho Abominável', key: 'sp', tiers: [50, 100, 150, 150] },
    { egg: 9113, name: 'Ovo de Esqueleão', key: 'atk', tiers: [0, 0, 0, 20] },
    { egg: 9133, name: 'Ovo de Cavaleiro Mutante', key: 'atkPercent', tiers: [0, 0, 1, 2] },
    { egg: 9169, name: 'Ovo de Gerente', key: 'flee', tiers: [0, 3, 6, 10] },
  ])('$egg $name — $key', ({ egg, key, tiers }) => {
    it.each([
      [PetLoyalty.Baixa, tiers[0]], [PetLoyalty.Nenhuma, tiers[1]],
      [PetLoyalty.Normal, tiers[2]], [PetLoyalty.Alta, tiers[3]],
    ])('tier %i grants %i', (loyalty, expected) => {
      expect(petBonus(egg, loyalty, key)).toBe(expected);
    });

    it('replaces tiers rather than stacking them', () => {
      // Stacking would show the tiers added together on the top one.
      const allTiersSummed = tiers.reduce((a, b) => a + b, 0);
      const alta = petBonus(egg, PetLoyalty.Alta, key);
      expect(alta).toBe(tiers[3]);
      // Only tells the two apart when more than one tier grants the bonus — an
      // Alta-only line has nothing below it to be added to.
      if (tiers.filter((v) => v !== 0).length > 1) expect(alta).toBeLessThan(allTiersSummed);
    });
  });
});

/**
 * Equip ATK (SP_ATK2) per weapon, as the recording reports on every swap. With no weapon
 * it is 219; with Mira Focalizada active, 369 (the skill's +150 ATK). The per-weapon value
 * is those 219 plus the weapon's ATK and whatever its script grants.
 */
describe('equip ATK checked against the recording packets', () => {
  it.each([
    { nome: 'Atirador Consertado +0', weapon: 810005, refine: 0, cards: [], spAtk2: 669 },
    { nome: 'Aspersor Consertado +0', weapon: 830008, refine: 0, cards: [], spAtk2: 659 },
    { nome: 'Lança-Granadas Primordial +8', weapon: 840001, refine: 8, cards: [300241, 300240], spAtk2: 845 },
    { nome: 'Pistola Aprimorável +7', weapon: 13115, refine: 7, cards: [], spAtk2: 559 },
  ])('with Mira Focalizada and $nome: SP_ATK2 = $spAtk2', ({ weapon, refine, cards, spAtk2 }) => {
    expect(painel({ weapon, refine, cards, mira: true }).atkEquip).toBe(spAtk2);
  });

  it('SP_ATK1 (base ATK) = 846', () => {
    expect(painel({ weapon: 810005, refine: 0, mira: true }).atkStatus).toBe(846);
  });

  /**
   * **CLOSED on 29/08/2026, and the contradiction was the point.** This used to record that
   * SP_ATK1 = 846 needs LUK 108..110 while SP_CRITICAL = 65 needs LUK 105..107, ranges that
   * do not overlap — so one of the two formulas had to be wrong rather than the LUK. It was
   * the crit one. Base crit was `⌊LUK/3⌋`, a ~0,333 slope; rAthena keeps CRIT in tenths as
   * `piso(nívelBase / 10) + 10 + LUK × 3` (0,3 per LUK, plus a flat +1,0 and +0,1 per 10
   * base levels) and truncates once, at display, after the flat equipment crit joins as
   * `× 10`.
   *
   * LUK 108 now satisfies **both** readings at once, which is what the old note was waiting
   * for and why no one had to go ask the character's real LUK.
   */
  it('SP_CRITICAL = 65 and SP_ATK1 = 846 agree on LUK 108', () => {
    const r = painel({ weapon: 810005, refine: 0, mira: true });
    expect(r.luk).toBe(108);
    expect(r.criticoBase).toBe(65);
  });

  // What item 24751 adds, in isolation: without the "ATQ e ATQM +1 por refino" line each
  // of the numbers above sat 9 below what the recording reports.
  it('gives 9 ATK and 9 MATK from Manopla Sombria POD +9', () => {
    const { totalBonus } = painel({ weapon: 810005, refine: 0 });
    const script = items[MANOPLA_SOMBRIA_POD].script;
    expect(script.atk).toEqual(['1---1']);
    expect(script.matk).toEqual(['1---1']);
    expect(totalBonus['atk']).toBeGreaterThanOrEqual(9);
    expect(totalBonus['matk']).toBe(9);
  });
});
