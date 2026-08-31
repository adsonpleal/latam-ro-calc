import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { decodeReplay } from 'rrfparser';
import { Calculator } from 'src/app/core/calculator';
import { CalculatorController } from 'src/app/core/calculator-controller';
import { parseOptionScripts } from 'src/app/core/option-scripts';
import { ClassAmmoMapper, WeaponAmmoMapper } from 'src/app/constants/weapon-ammo-mapper';
import { ItemSubTypeId } from 'src/app/constants/item-sub-type.enum';
import { ClassName } from 'src/app/jobs/_class-name';
import { SKILL_ID_BY_NAME } from 'src/app/skills';
import { loadReplayFixture } from 'src/app/replay/__tests__/load-fixture';
import { replayToModel } from 'src/app/replay/replay-to-model';
import { GuillotineCross } from 'src/app/jobs/GuillotineCross';

/**
 * The Faca Envenenada (1771) is `Type: Ammo / SubType: Dagger` in rAthena, restricted to the
 * Assassin line, and the skill of the same name throws it out of the ammo slot while the
 * character wields a katar or a dagger. Neither of those weapon types opens a quiver, so it
 * reaches the slot the way kunai and cannonballs do — through `ClassAmmoMapper`, which exists
 * for exactly this: a class that keeps ammo equipped because a *skill* throws it.
 *
 * The item was added to `item.json` on 29/08/2026 (three replays were importing it as "fora do
 * banco de dados") and wired to a slot on 30/08/2026.
 *
 * What this file mostly guards is the other half — that opening the slot did **not** hand the
 * Sicário 30 free ATK. Ammo ATK is gated: a melee skill never counts the quiver, and a basic
 * attack counts it only with a ranged weapon or with no weapon at all. A katar is neither.
 */

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const monsters = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));
const hpSpTable = JSON.parse(readFileSync('src/assets/demo/data/hp_sp_table.json', 'utf8'));

const FACA_ENVENENADA = 1771;
const DUMMY_MEDIO = '21065';

describe('Faca Envenenada — a aljava da linha do Sicário', () => {
  it('is registered as throwing-dagger ammo restricted to the Assassin line', () => {
    const faca = items[String(FACA_ENVENENADA)];
    expect(faca).toBeDefined();
    expect(faca.itemTypeId).toBe(4); // ammo
    expect(faca.itemSubTypeId).toBe(ItemSubTypeId.ThrowingDagger);
    expect(faca.attack).toBe(30);
    expect(faca.usableClass).toEqual(['Assassin']);
  });

  /**
   * `setAmmoDropdownList` keeps an entry when `ammo.itemSubTypeId === getAmmoSubTypeId()`, and
   * `getAmmoSubTypeId` reads `WeaponAmmoMapper[weapon] || ClassAmmoMapper[class]`. So the four
   * classes below are the ones that can pick it, and the katar/dagger they carry contributes
   * nothing to that lookup — which is the point of routing it by class.
   */
  it.each([ClassName.Assassin, ClassName.AssassinCross, ClassName.GuillotineCross, ClassName.ShadowCross])(
    'opens the quiver for %s whatever the weapon is',
    (cName) => {
      expect(ClassAmmoMapper[cName]).toBe(ItemSubTypeId.ThrowingDagger);
    },
  );

  it('leaves every other class out of it', () => {
    const donos = Object.entries(ClassAmmoMapper)
      .filter(([, sub]) => sub === ItemSubTypeId.ThrowingDagger)
      .map(([c]) => c)
      .sort();
    expect(donos).toEqual(['Assassin', 'AssassinCross', 'GuillotineCross', 'ShadowCross']);
    // And no weapon type grants it — a bow in Sicário hands still takes arrows, because
    // `getAmmoSubTypeId` reads the weapon mapper first.
    expect(Object.values(WeaponAmmoMapper)).not.toContain(ItemSubTypeId.ThrowingDagger);
    expect(WeaponAmmoMapper.bow).toBe(ItemSubTypeId.Arrow);
  });

  it('is the only throwing dagger in the database', () => {
    const facas = Object.values(items).filter((i: any) => i.itemSubTypeId === ItemSubTypeId.ThrowingDagger);
    expect(facas.map((i: any) => i.id)).toEqual([FACA_ENVENENADA]);
  });

  /**
   * The regression that matters. `gc-cross-impact-unbuffed-180.rrf` is a katar Sicário who
   * really was carrying the Faca Envenenada — the recording is where the missing item was
   * noticed — so the fixture imports with `ammo: 1771` and the same build with the quiver
   * emptied is the control. Cross Impact is melee and the basic attack is katar, so **neither
   * may move**: an ammo ATK that leaked here would have inflated the class by 30 flat.
   */
  it('adds no ATK to a katar build — not to the skill, not to the basic attack', () => {
    const replay: any = decodeReplay(loadReplayFixture('gc-cross-impact-unbuffed-180.rrf'));
    const base = replayToModel(replay, items).model as any;
    expect(base.ammo).toBe(FACA_ENVENENADA); // the recording really had it equipped

    const run = (ammo: number | undefined) => {
      const m = { ...base, ammo, selectedAtkSkill: 'Cross Impact==5' };
      const cls: any = new GuillotineCross();
      const b = cls.getJobBonusStatus(m.jobLevel);
      Object.assign(m, {
        jobStr: b.str, jobAgi: b.agi, jobVit: b.vit, jobInt: b.int, jobDex: b.dex, jobLuk: b.luk,
        jobPow: b.pow, jobSta: b.sta, jobWis: b.wis, jobSpl: b.spl, jobCon: b.con, jobCrt: b.crt,
      });
      const learned: Record<number, number> = {};
      for (const [id, lv] of replay.learnedSkills) learned[id] = lv;
      const passiveIds = cls.passiveSkills.map((p: any) => {
        const sid = SKILL_ID_BY_NAME[p.name];
        return sid ? learned[sid] ?? 0 : 0;
      });
      const { equipAtks, masteryAtks, activeSkillNames, learnedSkillMap } = cls
        .setLearnSkills({ activeSkillIds: cls.activeSkills.map(() => 0), passiveSkillIds: passiveIds })
        .getSkillBonusAndName();
      const calc = new Calculator().setMasterItems(items).setHpSpTable(hpSpTable).setClass(cls);
      calc.loadItemFromModel(m);
      new CalculatorController().runChain(calc, {
        monster: monsters[DUMMY_MEDIO], equipAtks, masteryAtks, buffEquips: {}, buffMasterys: {},
        consumeData: [], aspdPotion: undefined,
        extraOptionScripts: parseOptionScripts((m.rawOptionTxts ?? []).filter(Boolean)),
        activeSkillNames, learnedSkillMap, selectedAtkSkill: 'Cross Impact==5', selectedChances: [], usedHpL: false,
      } as any);
      const ds: any = (calc as any).damageSummary;
      const tot: any = calc.getTotalSummary();
      return {
        equipAtk: (tot.weapon?.baseWeaponAtk ?? 0) + (tot.weapon?.refineBonus ?? 0) + tot.calc.totalEquipAtk,
        skill: Math.round(ds.skillMaxDamage),
        basicCrit: Math.round(ds.criMaxDamage),
      };
    };

    const comAljava = run(FACA_ENVENENADA);
    const semAljava = run(undefined);
    expect(comAljava).toEqual(semAljava);
    // And the build is the one the recording's own status window reports, quiver and all.
    expect(comAljava.equipAtk).toBe(569); // SP 42 gravado
  });
});
