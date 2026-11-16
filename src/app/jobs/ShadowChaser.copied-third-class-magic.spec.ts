import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ElementType } from '../constants/element-type.const';
import { Calculator } from '../core/calculator';
import { CalculatorController } from '../core/calculator-controller';
import { clientRatioTable } from '../skills/client-ratio-table';
import {
  ADORAMUS, DRAIN_LIFE, EARTH_GRAVE, FROST_MISTY, HELL_INFERNO, JACK_FROST, METALIC_SOUND, POISON_BURST,
  VARETYR_SPEAR,
} from '../skills/shared-skills';
import { SKILL_META } from '../skills';
import { createMainModel } from '../utils';
import { AbyssChaser } from './AbyssChaser';
import { AtkSkillFormulaInput, AtkSkillModel, CharacterBase } from './_character-base.abstract';
import { ShadowChaser } from './ShadowChaser';
import { Warlock } from './Warlock';
import { ClassIDEnum } from './_class-name';

/**
 * https://issues.latam-tools.com.br/t/xdHALIZd5ORoGrBwMufK
 *
 * Mimetismo copies a third-class skill and the Renegado then casts it himself, so every
 * magic attack on bROWiki's list of what it copies has to be pickable here, at every level
 * — the copy's level is Mimetismo's, not the spell's own maximum:
 * https://browiki.org/wiki/Mimetismo#Habilidades
 *
 * Card YuCYWGJl6T71nXVIyoCd brought in the eight the Arco Híbrido names; this one closes
 * the list. What it does **not** change is Desejo das Sombras: "Não autoconjura magias de
 * classes 3, expandidas e de propriedade Sagrado, com exceção de Curar"
 * (https://browiki.org/wiki/Desejo_das_Sombras, and iROwiki's Auto Shadow Spell says the
 * same), so none of these may reach the Auto-conjuração slots. The slots build their
 * options out of this very skill list, which is the regression this card could have caused;
 * it stays pinned where the other eight already were, in ShadowChaser.copied-autocast.spec.ts.
 *
 * Each ratio is checked against the per-level ATQM column the client prints in the skill's
 * own description, the same source `skills/skill-ratio-client-table.spec.ts` holds the
 * rebalance reference to.
 */
type JobCtor = new () => CharacterBase;

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const monsters = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));
const hpSpTable = JSON.parse(readFileSync('src/assets/demo/data/hp_sp_table.json', 'utf8'));
const monster = { ...monsters[21067], id: 21067 }; // Neutral training dummy.

/**
 * The whole copyable magic set, pt-BR name first because that is how the list reads, with
 * the maximum level the client allows. `column` names the header cell for the two
 * descriptions that print more than one ATQM column; `intPerLevel` is the INT coefficient
 * the client's column leaves out, so the comparison can zero it.
 */
const COPIED_MAGIC: {
  pt: string; name: string; id: number; max: number; column?: string;
  intPerLevel?: (level: number) => number; shared?: AtkSkillModel;
}[] = [
  // The eight of card YuCYWGJl6T71nXVIyoCd.
  { pt: 'Impacto Espiritual', name: 'Soul Expansion', id: 2202, max: 5, intPerLevel: () => 1 },
  { pt: 'Abalo Sísmico', name: 'Earth Strain', id: 2216, max: 5 },
  { pt: 'Meteoro Escarlate', name: 'Crimson Rock', id: 2211, max: 5 },
  { pt: 'Pó de Diamante', name: 'Diamond Dust', id: 2447, max: 5, intPerLevel: (level) => level + 2 },
  { pt: 'Corrente Elétrica', name: 'Chain Lightning', id: 2214, max: 5 },
  { pt: 'Onda Psíquica', name: 'Psychic Wave', id: 2449, max: 5, intPerLevel: () => 5 },
  { pt: 'Judex', name: 'Judex', id: 2038, max: 10 },
  { pt: 'Maldição de Jormungand', name: 'Killing Cloud', id: 2450, max: 5, intPerLevel: () => 3 },
  // The nine of this card.
  { pt: 'Zero Absoluto', name: 'Frost Misty', id: 2203, max: 5, shared: FROST_MISTY },
  { pt: 'Esquife de Gelo', name: 'Jack Frost', id: 2204, max: 5, shared: JACK_FROST },
  { pt: 'Drenar Vida', name: 'Drain Life', id: 2210, max: 5, intPerLevel: () => 1, shared: DRAIN_LIFE },
  { pt: 'Chamas de Hela', name: 'Hell Inferno', id: 2212, max: 5, column: 'ATQM (Fogo)', shared: HELL_INFERNO },
  {
    pt: 'Castigo de Nerthus', name: 'Earth Grave', id: 2446, max: 5,
    intPerLevel: (level) => level + 2, shared: EARTH_GRAVE,
  },
  { pt: 'Implosão Tóxica', name: 'Poison Burst', id: 2448, max: 5, intPerLevel: () => 1, shared: POISON_BURST },
  {
    pt: 'Lanças dos Aesir', name: 'Varetyr Spear', id: 2454, max: 10,
    intPerLevel: (level) => (level + 4) / 2, shared: VARETYR_SPEAR,
  },
  { pt: 'Adoramus', name: 'Adoramus', id: 2040, max: 10, shared: ADORAMUS },
  { pt: 'Ruído Estridente', name: 'Metalic Sound', id: 2413, max: 10, shared: METALIC_SOUND },
];

/**
 * The magic entries on the same page that stay out, and why. Keeping them here is what
 * makes the exclusion a decision rather than an oversight: a formula landing for either
 * Passos has to come back through this list.
 */
const LEFT_OUT = [
  { pt: 'Passos de Salamandra', why: 'no formula in the engine, and no entry in the skill catalog' },
  { pt: 'Passos de Sílfide', why: 'no formula in the engine, and no entry in the skill catalog' },
  { pt: 'Curatio', name: 'Highness Heal', why: 'heals instead of attacking' },
];

/**
 * Entries whose client column is not the same quantity as the engine's figure, so the two
 * are not comparable. Corrente Elétrica's column is the damage of one corrente — the
 * description prints the count beside it, and bROWiki writes the formula as "Dano por
 * corrente = {[100 × (9 - Nº de correntes)] × (Nv. de base ÷ 100)}%", which decays as the
 * sequence goes — while the engine's entry is one figure for the whole cast. Reconciling
 * them is not this card's job; the entry predates it and is left as found.
 * https://browiki.org/wiki/Corrente_Elétrica
 */
const NOT_COMPARABLE = new Set(['Corrente Elétrica']);

/**
 * What a hand-cast entry may override on top of the shared definition, beyond cast and
 * delay, and why. Everything else has to come straight from the shared constant: that is
 * what stops the picker and an auto-cast of the same id printing two different numbers
 * (`skillForId` in core/auto-cast.ts), and the sibling
 * ShadowChaser.copied-third-class-skills.spec.ts holds the same check for the other eight.
 */
const ALLOWED_OVERRIDES: Record<string, { fields: (keyof AtkSkillModel)[]; why: string }> = {
  'Frost Misty': {
    fields: ['hit', 'totalHit'],
    why: "the shared copy applies the column five times, the Arcano's own entry splits it over "
      + 'the five crystals, and a copy deals what the Arcano deals',
  },
  'Hell Inferno': {
    fields: ['part1LabelKey', 'part2'],
    why: 'the Sombrio half, which an auto-cast does not print',
  },
  'Metalic Sound': {
    fields: ['levelList', 'formula'],
    why: 'the Menestrel offers Nv10 alone where Mimetismo can copy it at any level, and the '
      + '2026 rebalance replaces the formula by name (resolveRebalancedSkill), which the shared '
      + 'constant does not carry',
  },
};

/** The two whose ratio is the INT term alone once the Feiticeiro's tree is gone. */
const INT_DRIVEN = ['Earth Grave', 'Varetyr Spear'];

const INT = 100;

/** The client's table describes base level 100, every mastery and endow at zero. */
function input(level: number): AtkSkillFormulaInput {
  return {
    skillLevel: level, model: { level: 100 }, stack: 0,
    status: { totalInt: INT, totalPow: 0, totalSpl: 0, totalCon: 0 },
    skills: { isActive: () => false, activeLevel: () => 0, learnedLevel: () => 0 },
    monster: { size: 'm', data: { level: 100 }, isRace: () => false, isElement: () => false },
    weapon: { data: { weight: 0, baseWeaponLevel: 4 }, isType: () => false, isSubType: () => false },
    equipmentBonus: { shield: {} }, totalBonus: {}, maxHp: 0, maxSp: 0, ammoElement: ElementType.Fire,
  } as unknown as AtkSkillFormulaInput;
}

const unlearned = (Job: JobCtor): CharacterBase => {
  const cls = new Job();
  cls.setLearnSkills({ activeSkillIds: cls.activeSkills.map(() => 0), passiveSkillIds: cls.passiveSkills.map(() => 0) })
    .getSkillBonusAndName();

  return cls;
};

function solve(Job: JobCtor, skill: string) {
  const cls = unlearned(Job);
  const { equipAtks, masteryAtks, activeSkillNames, learnedSkillMap } = cls.getSkillBonusAndName();
  const model = Object.assign(createMainModel(), {
    class: Job === AbyssChaser ? ClassIDEnum.AbyssChaser : ClassIDEnum.ShadowChaser,
    level: 200, jobLevel: 70, int: 130, dex: 100, agi: 100, selectedAtkSkill: skill,
  });
  const calc = new Calculator().setMasterItems(items).setHpSpTable(hpSpTable).setClass(cls);
  calc.loadItemFromModel(model);
  new CalculatorController().runChain(calc, {
    monster, equipAtks, masteryAtks, buffEquips: {}, buffMasterys: {},
    consumeData: [], aspdPotion: 0, extraOptionScripts: [], activeSkillNames, learnedSkillMap,
    selectedAtkSkill: skill, selectedChances: [], usedHpL: false,
  });

  return calc.getTotalSummary().dmg;
}

describe.each([
  { name: 'Renegado', Job: ShadowChaser },
  { name: 'Mandraque', Job: AbyssChaser },
])('$name — magic copied with Mimetismo', ({ Job }) => {
  // Built once: every assertion below reads the same list, and `new Job()` re-materialises
  // the whole Ladino->Algoz->Renegado lineage.
  let cached: AtkSkillModel[];
  const offered = (): AtkSkillModel[] => (cached ??= unlearned(Job).getAtkSkills());
  const entryFor = (name: string) => offered().filter((skill) => skill.name === name);

  it('offers every copyable magic spell, at every level Mimetismo can copy', () => {
    for (const { pt, name, id, max } of COPIED_MAGIC) {
      expect(entryFor(name), pt).toHaveLength(1);
      expect(SKILL_META[name].id, pt).toBe(id);
      expect(entryFor(name)[0].isMatk, pt).toBe(true);
      expect(entryFor(name)[0].levelList?.map(({ value }) => value), pt)
        .toEqual(Array.from({ length: max }, (unused, index) => `${name}==${index + 1}`));
    }
  });

  it("matches the client's own ATQM column at every level", () => {
    const untabled: string[] = [];
    for (const { pt, name, max, column, intPerLevel } of COPIED_MAGIC) {
      const table = clientRatioTable(name, column);
      if (!table) { untabled.push(pt); continue; }
      const skill = entryFor(name)[0];
      const diffs: string[] = [];
      for (const [level, want] of table) {
        if (level > max) continue;
        const got = Math.round(skill.formula(input(level)) - (intPerLevel?.(level) ?? 0) * INT);
        if (Math.abs(got - want) >= 1) diffs.push(`Nv${level}: cliente ${want}, motor ${got}`);
      }
      if (NOT_COMPARABLE.has(pt)) expect(diffs.length, `${pt} now matches — drop its NOT_COMPARABLE entry`).toBeGreaterThan(0);
      else expect(diffs, pt).toEqual([]);
    }
    // The four the client describes as INT-driven without printing a column at all. The
    // two this card added are checked below; the other two came in with the bow's set.
    expect(untabled).toEqual(['Pó de Diamante', 'Onda Psíquica', 'Castigo de Nerthus', 'Lanças dos Aesir']);
  });

  /**
   * Both say "O dano é afetado pela INT, nível de base e pelo nível de Encantar com
   * Terremoto / Encantar com Ventania e Encanto de Órion" and print no ratio. The endows
   * and the Encanto are the Feiticeiro's own, and a copy brings no tree along — so what is
   * left is the INT term, and a learned level of either must not move it.
   */
  it('keeps the two INT-driven spells free of the Feiticeiro\'s own tree', () => {
    const withTree = (level: number): AtkSkillFormulaInput => {
      const base = input(level);

      return { ...base, skills: { ...base.skills, learnedLevel: () => 10 } };
    };
    for (const { pt, name, max, intPerLevel } of COPIED_MAGIC.filter((row) => INT_DRIVEN.includes(row.name))) {
      const skill = entryFor(name)[0];
      for (let level = 1; level <= max; level++) {
        expect(skill.formula(input(level)), `${pt} Nv${level}`).toBe(intPerLevel!(level) * INT);
        expect(skill.formula(withTree(level)), `${pt} Nv${level} with a tree`).toBe(intPerLevel!(level) * INT);
      }
    }
  });

  /**
   * Chamas de Hela lands a Fogo hit and a Sombrio one, and only the Fogo half has a shared
   * definition. bROWiki gives the second as "ATQM (sombrio) = {[(Nv. da habilidade × 600)]
   * × (Nv. de base ÷ 100)}%" with a table that reads 600% at Nv1 — where the client's own
   * cell reads 1.000%, breaking its own ×600 step. The formula is what the engine follows,
   * so that one cell is expected to disagree; every other level agrees.
   */
  it('lands both halves of Chamas de Hela, following the formula over the client Nv1 cell', () => {
    const inferno = entryFor('Hell Inferno')[0];
    const dark = clientRatioTable('Hell Inferno', 'ATQM (Sombrio)')!;
    expect(inferno.part2?.element).toBe(ElementType.Dark);
    expect(inferno.part2?.hit).toBe(3);
    for (let level = 1; level <= 5; level++) {
      expect(inferno.part2!.formula(input(level)), `Nv${level}`).toBe(level * 600);
    }
    expect([...dark].filter(([level, want]) => want !== level * 600)).toEqual([[1, 1000]]);
  });

  /**
   * A copy deals what the class it was taken from deals, so Zero Absoluto has to land the
   * Arcano's cast and not a multiple of it. The shared constant the entry spreads from
   * applies the column five times instead of splitting it over the five crystals, which is
   * the shape Esquife de Gelo was measured out of (Warlock.jack-frost-hits.spec.ts), so the
   * entry overrides it — and this is what stops the override from being dropped.
   */
  it('lands Zero Absoluto on the same cast the Arcano deals', () => {
    const copied = entryFor('Frost Misty')[0];
    const owner = new Warlock().getAtkSkills().filter(({ name }) => name === 'Frost Misty');

    expect(owner).toHaveLength(1);
    expect(copied.hit).toBe(owner[0].hit);
    expect(copied.totalHit).toBeUndefined();
    for (let level = 1; level <= 5; level++) {
      expect(copied.formula(input(level)), `Nv${level}`).toBe(owner[0].formula(input(level)));
    }
  });

  it('changes nothing but cast, delay and its own named overrides against the shared definition', () => {
    for (const { pt, name, shared } of COPIED_MAGIC) {
      if (!shared) continue;
      const ours: Partial<AtkSkillModel> = { ...entryFor(name)[0] };
      const theirs: Partial<AtkSkillModel> = { ...shared };
      const allowed = ALLOWED_OVERRIDES[name];
      for (const field of ['fct', 'vct', 'acd', 'cd', ...(allowed?.fields ?? [])] as (keyof AtkSkillModel)[]) {
        delete ours[field];
        delete theirs[field];
      }
      expect(ours, allowed ? `${pt} (overrides: ${allowed.why})` : pt).toEqual(theirs);
    }
  });

  it('calculates magic damage for each of them, growing with the level', () => {
    for (const { pt, name, max } of COPIED_MAGIC) {
      const low = solve(Job, `${name}==1`);
      const high = solve(Job, `${name}==${max}`);
      expect(low.baseSkillDamage, pt).toBeGreaterThan(0);
      expect(low.skillMaxDamage, pt).toBeGreaterThan(0);
      expect(high.skillMaxDamage * high.skillTotalHit, pt)
        .toBeGreaterThan(low.skillMaxDamage * low.skillTotalHit);
    }
  });

  it('leaves the magic spells it cannot calculate out of the picker', () => {
    const names = new Set(offered().map(({ name }) => name));
    for (const { pt, name, why } of LEFT_OUT) {
      if (name) expect(names.has(name), `${pt}: ${why}`).toBe(false);
      else expect(Object.values(SKILL_META).some((meta) => meta.label === pt), `${pt}: ${why}`).toBe(false);
    }
  });
});
