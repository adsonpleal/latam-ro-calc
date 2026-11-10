/**
 * The damage skills the transclasses, the Justiceiro and the Ninja brought in, checked
 * level by level against the per-level ATQ/ATQM table the client prints in each skill's own
 * description (`skill-meta.generated.ts`, client of 28/10/2026).
 *
 * `skill-ratio-client-table.spec.ts` does this for everything the rebalance reference
 * covers, which is where the 3rd and 4th jobs live; these skills are not in that reference,
 * so they would otherwise ship with nothing holding their ratios to the client. The rule is
 * the same: the client table is the source of truth, so **fix the job file, not the
 * expectation**.
 *
 * Two of these descriptions are laid out differently and used to need their tables copied
 * in here by hand: Ferir Alvo prints one ATQ column per weapon ("Nível l ATQ (Pistola) l
 * ATQ (Rifle) l Chance") and Arremessar Huuma writes its separator as a pipe ("Nível l ATQ
 * | Área"). `clientRatioTable` reads both now — it takes the header cell to read and
 * accepts either separator — so no figure in this file is transcribed.
 */
import { describe, expect, it } from 'vitest';
import { AtkSkillFormulaInput, CharacterBase } from '../jobs/_character-base.abstract';
import { ElementType } from '../constants/element-type.const';
import { clientRatioTable } from './client-ratio-table';
import { ITEM_AUTO_CAST_SKILLS } from './item-auto-cast-skills';
import { SKILL_META } from './index';
import { Bard } from '../jobs/Bard';
import { Champion } from '../jobs/Champion';
import { Creator } from '../jobs/Creator';
import { Dancer } from '../jobs/Dancer';
import { Gunslinger } from '../jobs/Gunslinger';
import { LordKnight } from '../jobs/LordKnight';
import { Merchant } from '../jobs/Merchant';
import { Ninja } from '../jobs/Ninja';

type Ctor = new () => CharacterBase;

/** The class with its skill bonuses resolved, which is what `getAtkSkills` needs. */
function job(Klass: Ctor): CharacterBase {
  const cls = new Klass();
  cls.setLearnSkills({
    activeSkillIds: cls.activeSkills.map(() => 0),
    passiveSkillIds: cls.passiveSkills.map(() => 0),
  }).getSkillBonusAndName();

  return cls;
}

/**
 * Base level 100 so the "nível de base" factor is the identity, every stat and trait at
 * zero and no stack — the state the client's table describes. `isSubType` answers for the
 * weapon the case names, which is the one thing Ferir Alvo's table splits on.
 */
function input(level: number, subType = ''): AtkSkillFormulaInput {
  return {
    skillLevel: level, model: { level: 100 }, stack: 0,
    status: { totalPow: 0, totalSpl: 0, totalCon: 0, totalInt: 0, totalStr: 0 },
    skills: { isActive: () => false, activeLevel: () => 0, learnedLevel: () => 0 },
    monster: { size: 'm', data: { level: 100, vit: 0 }, isRace: () => false, isElement: () => false },
    weapon: {
      data: { weight: 0, baseWeaponLevel: 4 },
      isType: () => false,
      isSubType: (name: string) => name === subType,
    },
    equipmentBonus: { shield: {} }, totalBonus: {}, maxHp: 0, maxSp: 0, ammoElement: ElementType.Fire,
  } as unknown as AtkSkillFormulaInput;
}

/** One skill of one class, at the levels its picker offers. */
interface RatioCase {
  label: string;
  Klass: Ctor;
  skill: string;
  maxLevel: number;
  subType?: string;
  /** The header cell to read, for the one description that prints two ATQ columns. */
  column?: string;
}

const CASES: RatioCase[] = [
  // Lorde
  { label: 'Lorde — Golpe Traumático', Klass: LordKnight, skill: 'Head Crush', maxLevel: 5 },
  { label: 'Lorde — Ataque Vital', Klass: LordKnight, skill: 'Vital Strike', maxLevel: 10 },
  // Mestre
  { label: 'Mestre — Golpe da Palma em Fúria', Klass: Champion, skill: 'Palm Strike', maxLevel: 5 },
  { label: 'Mestre — Punho do Tigre', Klass: Champion, skill: 'Tiger Fist', maxLevel: 5 },
  { label: 'Mestre — Combo Esmagador', Klass: Champion, skill: 'Chain Crush Combo', maxLevel: 10 },
  // Mercador, whose own tier the whole Merchant branch reaches
  { label: 'Mercador — Mammonita', Klass: Merchant, skill: 'Mammonite', maxLevel: 10 },
  // Criador
  { label: 'Criador — Bomba Ácida', Klass: Creator, skill: 'Acid Bomb', maxLevel: 10 },
  // Menestrel e Cigana
  { label: 'Menestrel — Flecha Melódica', Klass: Bard, skill: 'Melody Strike', maxLevel: 5 },
  { label: 'Cigana — Estilingue', Klass: Dancer, skill: 'Throw Arrow', maxLevel: 5 },
  // Justiceiro
  { label: 'Justiceiro — Rastrear o Alvo', Klass: Gunslinger, skill: 'Tracking', maxLevel: 10, subType: 'Revolver' },
  // The one skill whose table has a column per weapon, so each is driven separately.
  { label: 'Justiceiro — Ferir Alvo (Pistola)', Klass: Gunslinger, skill: 'Wounding Shot', maxLevel: 5, subType: 'Revolver', column: 'ATQ (Pistola)' },
  { label: 'Justiceiro — Ferir Alvo (Rifle)', Klass: Gunslinger, skill: 'Wounding Shot', maxLevel: 5, subType: 'Rifle', column: 'ATQ (Rifle)' },
  { label: 'Justiceiro — Rajada Certeira', Klass: Gunslinger, skill: 'Rapid Shower', maxLevel: 10, subType: 'Revolver' },
  { label: 'Justiceiro — Desperado', Klass: Gunslinger, skill: 'Desperado', maxLevel: 10, subType: 'Revolver' },
  { label: 'Justiceiro — Controle de Multidão', Klass: Gunslinger, skill: 'Dust', maxLevel: 10, subType: 'Shotgun' },
  { label: 'Justiceiro — Ataque Total', Klass: Gunslinger, skill: 'Full Blast', maxLevel: 10, subType: 'Shotgun' },
  { label: 'Justiceiro — Disparo Espalhado', Klass: Gunslinger, skill: 'Spread Shot', maxLevel: 10, subType: 'Shotgun' },
  { label: 'Justiceiro — Mina do Justiceiro', Klass: Gunslinger, skill: 'Gunslinger Mine', maxLevel: 10, subType: 'Grenade Launcher' },
  // Ninja
  { label: 'Ninja — Arremessar Shuriken', Klass: Ninja, skill: 'Throw Shuriken', maxLevel: 10 },
  { label: 'Ninja — Arremessar Kunai', Klass: Ninja, skill: 'Throw Kunai', maxLevel: 5 },
  { label: 'Ninja — Arremessar Huuma', Klass: Ninja, skill: 'Throw Huuma Shuriken', maxLevel: 5, subType: 'Shuriken' },
  { label: 'Ninja — Virar Tatami', Klass: Ninja, skill: 'Flip Tatami', maxLevel: 5 },
  { label: 'Ninja — Corte da Névoa', Klass: Ninja, skill: 'Haze Slasher', maxLevel: 10 },
  { label: 'Ninja — Descarga Elétrica', Klass: Ninja, skill: 'Lightning Jolt', maxLevel: 5 },
];

describe('pre-3rd damage skills against the client table', () => {
  for (const { label, Klass, skill, maxLevel, subType, column } of CASES) {
    it(label, () => {
      const parsed = clientRatioTable(skill, column);
      const want = Array.from({ length: maxLevel }, (_, index) => parsed?.get(index + 1));
      // A table that stops short of the level the picker offers is the other way this can
      // go wrong, so every level has to have a client figure behind it.
      expect(want.filter((value) => value === undefined), `${skill}: client table shorter than Nv${maxLevel}`).toEqual([]);

      const entry = job(Klass).getAtkSkills().find((row) => row.name === skill);
      expect(entry, `${skill} is not on the class`).toBeDefined();

      const diffs: string[] = [];
      for (let level = 1; level <= maxLevel; level++) {
        const got = Math.round(entry.formula(input(level, subType)));
        if (Math.abs(got - want[level - 1]) >= 1) diffs.push(`Nv${level}: cliente ${want[level - 1]}, motor ${got}`);
      }

      expect(diffs, skill).toEqual([]);
    });
  }

  it('reads every one of these tables out of the client description', () => {
    const unparsed = CASES
      .filter(({ skill, column }) => !clientRatioTable(skill, column))
      .map(({ label }) => label);

    expect(unparsed).toEqual([]);
  });

  it('names the ATQ column the client header actually prints', () => {
    // `column` picks a header cell by its exact text, so a client that renames or reorders
    // those columns has to show up here rather than silently selecting the wrong one.
    const header = (skill: string) => (SKILL_META[skill].description ?? '')
      .replace(/\^[0-9a-fA-F]{6}/g, '')
      .split('\n')
      .find((line) => line.startsWith('Nível l '))
      .split(/ l | \| /)
      .map((cell) => cell.trim());

    expect(header('Wounding Shot')).toEqual(['Nível', 'ATQ (Pistola)', 'ATQ (Rifle)', 'Chance']);
    expect(header('Throw Huuma Shuriken')).toEqual(['Nível', 'ATQ', 'Área']);
  });

  it('agrees with the copy an item auto-cast fires', () => {
    // `ITEM_AUTO_CAST_SKILLS` carries its own definition of a few of these, so that an item
    // can cast them on a class that never learns them. `skillForId` prefers the class entry
    // when there is one, so a build of these classes would read one number and every other
    // build the other. Both have to be the client's.
    const diffs: string[] = [];
    const checked: string[] = [];
    for (const item of ITEM_AUTO_CAST_SKILLS) {
      const table = clientRatioTable(item.name);
      const owner = CASES.find(({ skill }) => skill === item.name);
      if (!table || !owner) continue;

      checked.push(item.name);
      for (const [level, want] of table) {
        const got = Math.round(item.formula(input(level, owner.subType)));
        if (Math.abs(got - want) >= 1) diffs.push(`${item.name} Nv${level}: cliente ${want}, item ${got}`);
      }
    }

    // Named, so the check cannot quietly become vacuous when a skill moves or is renamed.
    expect(checked.sort()).toEqual(['Lightning Jolt', 'Spread Shot', 'Tracking', 'Vital Strike']);
    expect(diffs).toEqual([]);
  });
});
