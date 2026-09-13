import { readFileSync } from 'node:fs';
import { Inquisitor, Mechanic } from 'src/app/jobs';
import { createMainModel } from 'src/app/utils';
import { Calculator } from './calculator';
import { CalculatorController } from './calculator-controller';
import { equipStatusOf, makeCalculator } from './__tests__/make-calculator';

/**
 * A piece whose refine was never picked must not erase the rest of the build's bonuses.
 *
 * Reported anonymously (tracker AKrHoH6GV0m5kxgR4ETg): a Sombra Cruzada whose Lâminas
 * Retalhadoras hit for 7.085K in game showed 4.217.899 on the site, and the "Dano
 * crítico" total read 30% while the popover listing its sources added up to 157%.
 *
 * The piece that did it was a Bota Temporal SOR at refine 0. `bootRefine` is `undefined`
 * in that state — `createMainModel()`'s own default, and `isEmpty` in the share codec
 * drops a 0 so every shared link comes back that way — and the boot's "A cada 3 refinos:
 * Dano crítico +2%" line then computed `floor(undefined / 3) * 2` = NaN. NaN is falsy, so
 * `updateTotalStatus`'s "nothing collected yet" branch fired and the NEXT piece's bonus
 * *replaced* the running total instead of adding to it. Everything summed before the
 * unrefined piece was thrown away: 127 of the 187 points of Dano crítico here, and the
 * whole HP and SP totals, which the panel then rendered blank.
 *
 * Two guards, because either one alone would have hidden the other: the refine lookup
 * lands on 0 (`getRefineLevelByItemType`), and a bonus that still fails to evaluate is
 * skipped rather than allowed to reset a key (`updateTotalStatus`).
 */

const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));

const BOTA_TEMPORAL_SOR = 22005; // criDmg: ["3---2", "luk:120===30"] — the step line is the trap
const MANTO_TEMPORAL_AGI = 20964; // criDmg: ["2---3", …] — a refined piece summed before it
const M_FATAL = 310094; // criDmg: ["10"] — a flat piece summed after it
const COLAR_SOMBRIO_INICIAL = 24392; // hp: ["1---10"] — the same trap on a shadow slot
const BROCHE_DEMONIACO = 2983; // inert accessory, here only to open the enchant slot

const withSlot = (id: number, itemTypeId: number, itemSubTypeId: number) => ({ ...db[id], itemTypeId, itemSubTypeId });

/** The three pieces above worn together, with the boot's refine left as the caller says. */
const critDamage = (bootRefine: number | undefined) => {
  const items = {
    [BOTA_TEMPORAL_SOR]: withSlot(BOTA_TEMPORAL_SOR, 2, 516),
    [MANTO_TEMPORAL_AGI]: withSlot(MANTO_TEMPORAL_AGI, 2, 515),
    [M_FATAL]: db[M_FATAL],
    [COLAR_SOMBRIO_INICIAL]: withSlot(COLAR_SOMBRIO_INICIAL, 12, 0),
    [BROCHE_DEMONIACO]: withSlot(BROCHE_DEMONIACO, 2, 510),
  };

  const model: any = createMainModel();
  model.level = 217;
  model.luk = 125; // clears the boot's "SOR base 120 ou mais: Dano crítico +30%"
  model.garment = MANTO_TEMPORAL_AGI;
  model.garmentRefine = 10;
  model.boot = BOTA_TEMPORAL_SOR;
  model.bootRefine = bootRefine;
  model.accRight = BROCHE_DEMONIACO;
  model.accRightEnchant3 = M_FATAL;
  model.shadowPendant = COLAR_SOMBRIO_INICIAL;

  return equipStatusOf(makeCalculator(items), model);
};

describe('a refine left unset (tracker AKrHoH6GV0m5kxgR4ETg)', () => {
  it('sums every source of Dano crítico, exactly as if the refine were 0', () => {
    // Manto +10 (floor(10/2) × 3) + boot's SOR 120 clause + M-Fatal.
    expect(critDamage(undefined)['criDmg']).toBe(15 + 30 + 10);
    expect(critDamage(undefined)['criDmg']).toBe(critDamage(0)['criDmg']);
  });

  it('still counts the piece own refine tiers once a refine is picked', () => {
    // The boot's own "A cada 3 refinos: Dano crítico +2%" on top of the three above.
    expect(critDamage(9)['criDmg']).toBe(15 + 30 + 10 + 6);
  });

  it('leaves HP a number rather than NaN', () => {
    // The boot's flat +300 and the pendant's "+10 por refino" (0 refines, so nothing).
    expect(critDamage(undefined)['hp']).toBe(300);
  });
});

/**
 * Two more reports of the same day, both filed before the fix above landed, both reading
 * as something else from where the reporter sat.
 *
 * - AvDKpmZyeLp46CBjiT2f: "Manopla Sombria do Canhão zerando o dano" of a Mecânico's
 *   Canhão, with Colar and Brinco Sombrios do Canhão lowering it. The manopla carries
 *   "ATQ e ATQM +1 por refino"; unrefined, that line was the NaN that reset the whole
 *   `atk` total — no ATQ, no damage. The colar's "A cada 2 refinos: Dano de [Canhão] +2%"
 *   did the same to the skill's own bonus total, which is a drop rather than a zero.
 * - qJ1ixiuCLkAK51jbIkc4: "Fogueira Espiritual do Inquisidor não está calculando o dano"
 *   — the skill showed but contributed nothing. Its formula adds 20% of HP máx., and an
 *   unrefined shadow piece with "HP máx. +10 por refino" (most of them) blanked the HP
 *   total, so this one skill came out NaN while the rest of the build computed.
 */
const monsters = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));
const hpSpTable = JSON.parse(readFileSync('src/assets/demo/data/hp_sp_table.json', 'utf8'));

const MANOPLA_SOMBRIA_CANHAO = 24473; // atk/matk: ["1---1"], range: ["3", "7===3", "9===4"]
const COLAR_SOMBRIO_CANHAO = 24474; // 2261 (Canhão): ["5", "2---2"]
const BRINCO_SOMBRIO_CANHAO = 24475; // hp: ["1---10"] and nothing the damage reads

/** Solve `model` for its selected skill on the Neutral dummy, no buffs and no consumables. */
function skillDamage(cls: any, model: any): { min: number; max: number; maxHp: number; atk: number } {
  const { equipAtks, masteryAtks, activeSkillNames, learnedSkillMap } = cls
    .setLearnSkills({ activeSkillIds: [], passiveSkillIds: [] })
    .getSkillBonusAndName();
  const calc = new Calculator().setMasterItems(db).setHpSpTable(hpSpTable).setClass(cls);
  calc.loadItemFromModel(model);
  new CalculatorController().runChain(calc, {
    monster: monsters['21077'], equipAtks, masteryAtks, buffEquips: {}, buffMasterys: {}, consumeData: [],
    aspdPotion: undefined, extraOptionScripts: [], activeSkillNames, learnedSkillMap,
    selectedAtkSkill: model.selectedAtkSkill, selectedChances: [], usedHpL: false,
  } as any);
  const ds: any = (calc as any).damageSummary;
  const tot: any = calc.getTotalSummary();

  return { min: ds.skillMinDamage, max: ds.skillMaxDamage, maxHp: tot.calc.maxHp, atk: tot.calc.totalEquipAtk };
}

describe('the same unset refine on the two Canhão/Fogueira reports (AvDKpmZyeLp46CBjiT2f, qJ1ixiuCLkAK51jbIkc4)', () => {
  const mechanic = (extra: Record<string, number | undefined>) =>
    skillDamage(new Mechanic(), Object.assign(createMainModel(), {
      class: 10, level: 170, jobLevel: 56, str: 120, dex: 125, weapon: 590011, selectedAtkSkill: 'Arm Cannon==5',
    }, extra));

  it('Manopla Sombria do Canhão raises the Canhão damage, refined or not', () => {
    const bare = mechanic({});
    const unset = mechanic({ shadowWeapon: MANOPLA_SOMBRIA_CANHAO });
    const zero = mechanic({ shadowWeapon: MANOPLA_SOMBRIA_CANHAO, shadowWeaponRefine: 0 });
    const nine = mechanic({ shadowWeapon: MANOPLA_SOMBRIA_CANHAO, shadowWeaponRefine: 9 });

    expect(Number.isFinite(unset.atk)).toBe(true);
    expect(unset).toEqual(zero);
    expect(unset.max).toBeGreaterThan(bare.max); // the +3% ranged line
    expect(nine.max).toBeGreaterThan(unset.max); // +9 ATQ, +7% ranged and the +9 tier
  });

  it('Colar and Brinco Sombrios do Canhão never lower it', () => {
    const bare = mechanic({});
    const colar = mechanic({ shadowPendant: COLAR_SOMBRIO_CANHAO });
    const brinco = mechanic({ shadowEarring: BRINCO_SOMBRIO_CANHAO });

    expect(colar.max).toBeGreaterThan(bare.max); // the flat +5% Canhão line
    expect(brinco.max).toBe(bare.max); // an SP-cost item, nothing for the damage to read
    expect(Number.isFinite(brinco.maxHp)).toBe(true);
  });

  it('Fogueira Espiritual keeps its 20% HP máx. term next to an unrefined shadow piece', () => {
    const inquisitor = (extra: Record<string, number | undefined>, lv = 5) =>
      skillDamage(new Inquisitor(), Object.assign(createMainModel(), {
        class: 4262, level: 200, jobLevel: 50, str: 100, vit: 80, dex: 90, pow: 60, selectedAtkSkill: `Third Flame Bomb==${lv}`,
      }, extra));

    const bare = inquisitor({});
    const unset = inquisitor({ shadowEarring: BRINCO_SOMBRIO_CANHAO });

    expect(Number.isFinite(bare.max)).toBe(true);
    expect(unset).toEqual(inquisitor({ shadowEarring: BRINCO_SOMBRIO_CANHAO, shadowEarringRefine: 0 }));
    expect(unset.maxHp).toBe(bare.maxHp);
    expect(unset.max).toBe(bare.max);
    for (const lv of [1, 2, 3, 4]) expect(inquisitor({ shadowEarring: BRINCO_SOMBRIO_CANHAO }, lv).max).toBeGreaterThan(0);
  });
});
