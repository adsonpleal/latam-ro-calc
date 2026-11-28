import { readFileSync } from 'node:fs';
import { ArchBishop } from 'src/app/jobs';
import { ClassName } from 'src/app/jobs/_class-name';
import { createMainModel } from 'src/app/utils';
import {
  findHealSkill, hasHealingPanel, HEAL_SKILLS, healSkillsForClass, healSkillTiming,
} from 'src/app/skills/healing-skills';
import { calcHeal, calcHealPerSecond, healFactor } from './healing';
import { equipStatusOf, makeCalculator } from './__tests__/make-calculator';

/**
 * The Cura panel's model — card c3W2qySdAGV69qMOyM5w.
 *
 * Two sources back every number here and nothing else does:
 *
 * - the **client's own text**, for the skills' names, their level tables and their
 *   cast/cooldown rows (`skill-meta.generated.ts` and `skill-delay.json`);
 * - **bROWiki**, for the Curar formula, Sopro Divino's party term and Meditatio's
 *   effectiveness column, which the client's description leaves out of its table.
 *
 * No recorded heal packet has been read against any of it — see the note on `calcHeal`
 * about the flooring. A replay carrying a heal is what would turn this from
 * source-faithful into measured.
 */

const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const DELAYS: Record<string, { maxLevel: number; fct: number | number[]; vct: number | number[]; acd: number | number[]; cd: number | number[]; }> =
  JSON.parse(readFileSync('src/assets/demo/data/skill-delay.json', 'utf8'));

describe('the Curar formula', () => {
  it('Fator is 3 per level, the whole of bROWiki\'s column', () => {
    expect([1, 2, 5, 10].map(healFactor)).toEqual([3, 6, 15, 30]);
  });

  it('bare-handed, Cura B is zero and the heal is Cura A alone', () => {
    // floor((200 + 150) / 5) x 30 = 70 x 30.
    const heal = calcHeal({ baseLevel: 200, int: 150, skillLevel: 10, weaponMatk: 0, weaponLevel: 0, healPower: 0 });

    expect(heal.healA).toBe(2100);
    expect(heal.healB).toBe(0);
    expect(heal.total).toBe(2100);
  });

  it('the division by 5 truncates before the Fator multiplies', () => {
    // (200 + 154) / 5 = 70,8 -> 70, not 70,8 x 30 = 2124.
    expect(calcHeal({ baseLevel: 200, int: 154, skillLevel: 10, weaponMatk: 0, weaponLevel: 0, healPower: 0 }).healA).toBe(2100);
    // 355 / 5 = 71 exactly, the next step up.
    expect(calcHeal({ baseLevel: 200, int: 155, skillLevel: 10, weaponMatk: 0, weaponLevel: 0, healPower: 0 }).healA).toBe(2130);
  });

  it('Cura B is the weapon ATQM scaled by its level, not by the character', () => {
    // 200 ATQM on a level 4 weapon: 200 x 1,04 = 208.
    const heal = calcHeal({ baseLevel: 200, int: 150, skillLevel: 10, weaponMatk: 200, weaponLevel: 4, healPower: 0 });

    expect(heal.healB).toBe(208);
    expect(heal.baseHeal).toBe(2100 + 208);
  });

  it('"Efetividade de cura" scales the base, Cura B included', () => {
    const heal = calcHeal({ baseLevel: 200, int: 150, skillLevel: 10, weaponMatk: 200, weaponLevel: 4, healPower: 15 });

    // floor(2308 x 1,15) = floor(2654,2).
    expect(heal.withHealPower).toBe(2654);
    expect(heal.total).toBe(2654);
  });

  it('the target\'s "Cura recebida" multiplies last', () => {
    const heal = calcHeal({
      baseLevel: 200, int: 150, skillLevel: 10, weaponMatk: 0, weaponLevel: 0,
      healPower: 0, targetHealReceived: 30,
    });

    expect(heal.total).toBe(2730); // 2100 x 1,3
  });

  it('a level 1 heal on a level 1 character is the smallest reading', () => {
    const heal = calcHeal({ baseLevel: 1, int: 1, skillLevel: 1, weaponMatk: 0, weaponLevel: 0, healPower: 0 });

    expect(heal.total).toBe(0); // floor(2 / 5) = 0
  });
});

describe('the three skills, against the client\'s own tables', () => {
  it('the catalog holds exactly the three skills the client publishes for this line', () => {
    expect(HEAL_SKILLS.map((s) => s.name)).toEqual(['Heal', 'Highness Heal', 'Coluceo Heal']);
    expect(HEAL_SKILLS.map((s) => s.id)).toEqual([28, 2051, 2043]);
  });

  /**
   * The same check `skill-delay.spec.ts` runs over every attack skill, for these three:
   * the engine's seconds must be the client's milliseconds. A diff here is the client
   * having retuned a heal, not a bug in the test.
   */
  it.each(HEAL_SKILLS.map((skill) => [skill.name, skill] as const))(
    '%s carries the client\'s cast and delay row',
    (_name, skill) => {
      const row = DELAYS[String(skill.id)];
      expect(row, `skill ${skill.id} missing from skill-delay.json`).toBeDefined();
      expect(skill.maxLevel).toBe(row.maxLevel);

      for (const field of ['fct', 'vct', 'acd', 'cd'] as const) {
        const client = row[field];
        const mine = skill[field];
        const expected = Array.isArray(client) ? client.map((ms) => ms / 1000) : client / 1000;
        expect(mine, `${skill.name} ${field}`).toEqual(expected);
      }
    },
  );

  it('Curatio reproduces its published effectiveness column, 200 to 320%', () => {
    const curatio = findHealSkill('Highness Heal');

    expect([1, 2, 3, 4, 5].map((lv) => curatio.effectiveness(lv, 0))).toEqual([200, 230, 260, 290, 320]);
  });

  it('Curatio multiplies the base heal by that percentage', () => {
    const heal = calcHeal({
      baseLevel: 200, int: 150, skillLevel: 10, weaponMatk: 0, weaponLevel: 0,
      healPower: 0, skillEffectiveness: 320,
    });

    expect(heal.total).toBe(6720); // 2100 x 3,2
  });

  it('Sopro Divino adds 2,5% of the base per party member, and its level does not', () => {
    const sopro = findHealSkill('Coluceo Heal');

    expect(sopro.effectiveness(1, 0)).toBe(100);
    expect(sopro.effectiveness(1, 12)).toBe(130);
    // The level sets the area and the fixed cast, never the amount.
    expect(sopro.effectiveness(3, 12)).toBe(sopro.effectiveness(1, 12));
  });

  it('Sopro Divino\'s fixed cast is the one per-level row, 1,0 / 0,5 / 0,0 s', () => {
    const timing = healSkillTiming(findHealSkill('Coluceo Heal'));

    expect([1, 2, 3].map((lv) => (timing.fct as (l: number) => number)(lv))).toEqual([1, 0.5, 0]);
  });
});

describe('heal per second', () => {
  it('is one cast times the rate the engine already derives for a skill', () => {
    expect(calcHealPerSecond(2100, 2)).toBe(4200);
  });

  it('truncates rather than overstating a slow heal', () => {
    expect(calcHealPerSecond(2100, 0.333333)).toBe(699);
  });
});

describe('which classes get the panel', () => {
  it('is the ArchBishop line and nothing else', () => {
    for (const name of [ClassName.Acolyte, ClassName.HighPriest, ClassName.ArchBishop, ClassName.Cardinal]) {
      expect(hasHealingPanel(name), name).toBe(true);
    }
    // The Monk branch extends the same Acolyte in src/app/jobs and was not asked for.
    for (const name of [ClassName.Sura, ClassName.Inquisitor, ClassName.RuneKnight, ClassName.Cardinal_1]) {
      expect(hasHealingPanel(name), name).toBe(false);
    }
  });

  it('an Acolyte casts Curar alone; the ArchBishop line adds the other two', () => {
    expect(healSkillsForClass(ClassName.Acolyte).map((s) => s.name)).toEqual(['Heal']);
    expect(healSkillsForClass(ClassName.HighPriest).map((s) => s.name)).toEqual(['Heal']);
    expect(healSkillsForClass(ClassName.ArchBishop).map((s) => s.name)).toEqual(['Heal', 'Highness Heal', 'Coluceo Heal']);
    expect(healSkillsForClass(ClassName.Cardinal).map((s) => s.name)).toEqual(['Heal', 'Highness Heal', 'Coluceo Heal']);
  });

  it('no class outside the line can reach a healing skill', () => {
    expect(healSkillsForClass(ClassName.RuneKnight)).toEqual([]);
  });
});

/**
 * The geared reading, end to end through the real engine: the item's `healPower` has to
 * reach the heal, and the weapon's own ATQM has to be the only ATQM that does.
 */
describe('a geared ArchBishop', () => {
  const healSummary = (model: Record<string, any>, items: Record<string, any>, params: Record<string, any> = {}) => {
    const cls = new ArchBishop();
    cls.setLearnSkills({ activeSkillIds: [], passiveSkillIds: [] }).getSkillBonusAndName();
    const calc = makeCalculator(items, cls);
    calc.loadItemFromModel({ ...createMainModel(), level: 200, int: 150, ...model })
      .prepareAllItemBonus().calcAllAtk().calcAllDefs();

    return calc.getHealSummary({ skillName: 'Heal', skillLevel: 10, healLevel: 10, ...params });
  };

  it('Cajado de Cinzas 1669: its 15% effectiveness and its 200 ATQM both land', () => {
    // 1669 is a level 4 Rod carrying "Efetividade de cura +15%", MATK +200 and INT +6.
    const summary = healSummary({ weapon: 1669 }, { 1669: { ...db[1669], usableClass: ['all'] } });

    expect(summary.healPower).toBe(15);
    expect(summary.healB).toBe(208); // 200 x 1,04
    // Cura A reads TOTAL INT, so the staff's own +6 is in it: floor((200 + 156) / 5) x 30.
    expect(summary.healA).toBe(2130);
    expect(summary.baseHeal).toBe(2130 + 208);
    expect(summary.total).toBe(2688); // floor(2338 x 1,15)
  });

  it('Curatio on the same build: 320% of that same base', () => {
    const summary = healSummary(
      { weapon: 1669 },
      { 1669: { ...db[1669], usableClass: ['all'] } },
      { skillName: 'Highness Heal', skillLevel: 5 },
    );

    expect(summary.skillEffectiveness).toBe(320);
    expect(summary.total).toBe(8601); // floor(2688 x 3,2)
  });

  it('Curatio\'s per-second reading uses the client\'s 3s recarga', () => {
    const summary = healSummary(
      { weapon: 1669 },
      { 1669: { ...db[1669], usableClass: ['all'] } },
      { skillName: 'Highness Heal', skillLevel: 5 },
    );

    // fct 0 + vct 1s reduced by DEX/INT, blocked by the 3s recarga: one cast per >3s.
    expect(summary.frequency.cd).toBe(3);
    expect(summary.frequency.reducedCd).toBe(3);
    expect(summary.healPerSecond).toBeLessThan(summary.total);
    expect(summary.healPerSecond).toBeGreaterThan(0);
  });

  it('an ATQM line that is not the weapon\'s own stays out of Cura B', () => {
    // 2124 Escudo is a plain slotted shield; 4675 Carta Arcebispa Margaretha pays this
    // line 15% effectiveness. Neither adds weapon ATQM, so Cura B stays zero.
    const summary = healSummary(
      { shield: 2124, shieldCard: 4675 },
      { 2124: db[2124], 4675: { ...db[4675], usableClass: ['all'] } },
    );

    expect(summary.healPower).toBe(15);
    expect(summary.healB).toBe(0); // no weapon equipped, so no Cura B at all
    // The card carries INT +10 of its own, which Cura A counts: floor((200 + 160) / 5) x 30.
    expect(summary.healA).toBe(2160);
    expect(summary.total).toBe(2484); // floor(2160 x 1,15)
  });

  it('the target\'s effectiveness is the panel\'s field, not the caster\'s own gear', () => {
    const items = { 2124: db[2124], 300100: db[300100] };
    // 300099/300100 Carta Papilia pay "Cura recebida", which is the TARGET's stat.
    const summary = healSummary({ shield: 2124, shieldCard: 300100 }, items);

    expect(summary.ownHealReceived).toBe(30);
    expect(summary.targetHealReceived).toBe(0);
    expect(summary.total).toBe(2100); // the caster's own 30% does not touch what he casts

    const onSelf = healSummary({ shield: 2124, shieldCard: 300100 }, items, { targetHealReceived: 30 });
    expect(onSelf.total).toBe(2730);
  });

  it('an unknown skill name reads as no healing at all', () => {
    expect(healSummary({}, {}, { skillName: 'Judex' })).toBeNull();
  });
});

describe('the heal panel changes no damage number', () => {
  it('reading a heal summary leaves the damage pipeline untouched', () => {
    const items = { 1669: { ...db[1669], usableClass: ['all'] } };
    const model = { ...createMainModel(), level: 200, int: 150, weapon: 1669 };

    const solve = (readHeal: boolean) => {
      const cls = new ArchBishop();
      cls.setLearnSkills({ activeSkillIds: [], passiveSkillIds: [] }).getSkillBonusAndName();
      const calc = makeCalculator(items, cls);
      calc.setHpSpTable(JSON.parse(readFileSync('src/assets/demo/data/hp_sp_table.json', 'utf8')))
        .setMonster(JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'))[1038]);
      calc.loadItemFromModel(model).prepareAllItemBonus().calcAllAtk().calcAllDefs()
        .calculateHpSp({ isUseHpL: false }).calculateAllDamages('');
      if (readHeal) calc.getHealSummary({ skillName: 'Heal', skillLevel: 10, healLevel: 10 });

      return calc.getTotalSummary().dmg;
    };

    expect(solve(true)).toEqual(solve(false));
  });

  it('"Efetividade de cura" is still outside every damage key', () => {
    // The guarantee healing-stats.spec.ts made when the key was display-only has to
    // survive the panel: the heal reads it, the damage side still never does.
    const model = { ...createMainModel(), level: 200, weapon: 1201 };
    const bare: any = equipStatusOf(makeCalculator({ 1201: db[1201] }), model);
    const healed: any = equipStatusOf(
      makeCalculator({ 1201: db[1201], 1669: { ...db[1669], usableClass: ['all'] } }),
      { ...model, weapon: 1669 },
    );

    expect(healed.healPower).toBe(15);
    for (const key of ['atkPercent', 'matkPercent', 'melee', 'range', 'criDmg', 'flatDmg']) {
      expect(healed[key] || 0, key).toBe(bare[key] || 0);
    }
  });
});

describe('where "Efetividade de cura" comes from', () => {
  const sources = (opts: { items?: Record<string, any>; model?: Record<string, any>; learn?: any; } = {}) => {
    const cls = new ArchBishop();
    cls.setLearnSkills(opts.learn ?? { activeSkillIds: [], passiveSkillIds: [] }).getSkillBonusAndName();
    const calc = makeCalculator(opts.items ?? {}, cls);
    calc.loadItemFromModel({ ...createMainModel(), level: 200, int: 150, ...opts.model })
      .prepareAllItemBonus().calcAllAtk().calcAllDefs();

    return calc.getHealSummary({ skillName: 'Heal', skillLevel: 10, healLevel: 10 });
  };

  it('with nothing learned and nothing worn it is zero, from the equipment line alone', () => {
    const summary = sources();

    expect(summary.healPower).toBe(0);
    expect(summary.healPowerSources).toEqual([{ key: 'equipment', value: 0 }]);
  });

  /**
   * Both skill-sourced lines come from the class's own learned/active state, which the
   * Habilidades panel fills positionally — `passiveSkillIds[i]` is the level of
   * `passiveSkills[i]`. Built here the same way the session builds it.
   */
  const withSkill = (kind: 'passive' | 'active', skillName: string, level: number) => {
    const job = new ArchBishop();
    const list = kind === 'passive' ? job.passiveSkills : job.activeSkills;
    const index = list.findIndex((skill: any) => skill.name === skillName);
    expect(index, `${skillName} is in the class's ${kind} list`).toBeGreaterThanOrEqual(0);
    const levels = list.map((_skill: any, i: number) => (i === index ? level : 0));

    // After makeCalculator, never before: that harness resets whatever class it is
    // handed to "nothing learned", which is right for an item spec and wrong here.
    const calc = makeCalculator({}, job);
    job.setLearnSkills({
      activeSkillIds: kind === 'active' ? levels : [],
      passiveSkillIds: kind === 'passive' ? levels : [],
    }).getSkillBonusAndName();
    calc.loadItemFromModel({ ...createMainModel(), level: 200, int: 150 })
      .prepareAllItemBonus().calcAllAtk().calcAllDefs();

    return calc.getHealSummary({ skillName: 'Heal', skillLevel: 10, healLevel: 10 });
  };

  it('Meditatio adds 2% a level, the column the client description omits', () => {
    expect(withSkill('passive', 'Meditation', 10).healPower).toBe(20);
    expect(withSkill('passive', 'Meditation', 4).healPower).toBe(8);
    expect(withSkill('passive', 'Meditation', 10).healPowerSources)
      .toContainEqual({ key: 'Meditation', level: 10, value: 20 });
  });

  it('Offertorium adds 30% a level, its own published table', () => {
    expect(withSkill('active', 'Offertorium', 5).healPower).toBe(150);
    expect(withSkill('active', 'Offertorium', 5).healPowerSources)
      .toContainEqual({ key: 'Offertorium', level: 5, value: 150 });
  });

  it('the lines add up rather than multiplying', () => {
    // Meditatio 10 (+20%) with a 15% staff is 135% of the base, not 1,2 x 1,15.
    const job = new ArchBishop();
    const index = job.passiveSkills.findIndex((skill: any) => skill.name === 'Meditation');
    const levels = job.passiveSkills.map((_s: any, i: number) => (i === index ? 10 : 0));
    const calc = makeCalculator({ 1669: { ...db[1669], usableClass: ['all'] } }, job);
    job.setLearnSkills({ activeSkillIds: [], passiveSkillIds: levels }).getSkillBonusAndName();
    calc.loadItemFromModel({ ...createMainModel(), level: 200, int: 150, weapon: 1669 })
      .prepareAllItemBonus().calcAllAtk().calcAllDefs();
    const summary = calc.getHealSummary({ skillName: 'Heal', skillLevel: 10, healLevel: 10 });

    expect(summary.healPower).toBe(35);
    expect(summary.total).toBe(Math.floor(summary.baseHeal * 1.35));
  });
});
