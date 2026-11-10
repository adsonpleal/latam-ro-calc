import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ElementType } from '../constants/element-type.const';
import { ElementNamePtBr } from '../constants/monster-i18n';
import { AbyssChaser } from '../jobs';
import { createMainModel } from '../utils';
import { foldForSearch } from '../utils/fuzzy-search';
import { plainDescription } from './__tests__/refine-line';
import { ITEM_DB, wornBonus } from './__tests__/worn-bonus';
import { Calculator } from './calculator';
import { CalculatorController } from './calculator-controller';

const LATAM_ITEMS = JSON.parse(readFileSync('src/assets/demo/data/latam-items.json', 'utf8')) as Record<string, any>;
const MONSTERS = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8')) as Record<string, any>;
const HP_SP_TABLE = JSON.parse(readFileSync('src/assets/demo/data/hp_sp_table.json', 'utf8'));

/** Training Dummy (Fire Lv1) — a target whose own property is not Neutral, so nothing but
 *  the caster-side channel can move a Neutral skill's damage against it. */
const FIRE_DUMMY = 21080;
const PLAGA_CARD = 27310;
/** Ayam: a one-slot upper headgear to hold the card. `ELMO` from `__tests__/worn-bonus` is
 *  the folder's usual inert host, but it is "Only 3rd Cls" and a Mandraque is a fourth, so
 *  it would not be worn at all. This one is `usableClass: all`, and its single bonus is
 *  gated to the Taekwon line, so it adds nothing of its own here either. */
const CARD_HOST_HEADGEAR = 5174;

type Channel = 'own' | 'target';
type Family = 'm_element' | 'm_my_element';

/**
 * The pt-BR element word the client prints → the suffix the engine spells its bonus keys
 * with. Derived from the app's own vocabulary rather than hand-listed, so an element the
 * rest of the app learns to name cannot quietly drop out of the sweeps below.
 *
 * Worth knowing while reading a description: the Undead *element* is "Maldito".
 * "Morto-Vivo" is the Undead *race*, which is a different bonus family (`m_race_undead`).
 */
const ELEMENT_BY_PT: Record<string, string> = Object.fromEntries(
  Object.values(ElementType).map((element) => [foldForSearch(ElementNamePtBr[element]), element.toLowerCase()]),
);

function elementsNamedBy(line: string): string[] {
  const named = line.match(/propriedade[s]?\s+([^+]*?)\s*\+/i);
  if (!named) return [];
  return foldForSearch(named[1]).split(/,| e /).map((part) => ELEMENT_BY_PT[part.trim()]).filter(Boolean);
}

function hasKey(script: Record<string, unknown>, family: Family, element: string): boolean {
  const key = new RegExp(`^(chance__)?${family}_(${element}|all)$`);
  return Object.keys(script).some((stored) => key.test(stored));
}

/** Every magic-damage line of a LATAM description that names properties, tagged with the
 *  channel its wording points at. One pass: both sweeps below read this. */
function magicPropertyLines() {
  const rows: { id: string; name: string; line: string; elements: string[]; channel: Channel }[] = [];
  for (const [id, record] of Object.entries(LATAM_ITEMS)) {
    const description = record?.description;
    if (!description || !ITEM_DB[id]) continue;
    for (const line of plainDescription(description).split('\n')) {
      if (!/Dano\s+m[aá]gico/i.test(line) || !/\+\s*\d/.test(line)) continue;
      const elements = elementsNamedBy(line);
      if (!elements.length) continue;
      const channel: Channel = /contra\s+(oponentes|a[s]?\s+propriedade)/i.test(line) ? 'target' : 'own';
      rows.push({ id, name: ITEM_DB[id].name, line: line.trim(), elements, channel });
    }
  }
  return rows;
}

const MAGIC_LINES = magicPropertyLines();

/** Lines whose wording points at `channel` but whose script stores that element in the
 *  other one. An item carrying *both* keys for the element is not an offender: several
 *  legitimately describe one line of each kind (26165 below is one). */
function misKeyed(channel: Channel): string[] {
  const stored: Family = channel === 'own' ? 'm_element' : 'm_my_element';
  const wanted: Family = channel === 'own' ? 'm_my_element' : 'm_element';
  return MAGIC_LINES.filter((row) => row.channel === channel).flatMap(({ id, name, line, elements }) =>
    elements
      .filter((element) => hasKey(ITEM_DB[id].script ?? {}, stored, element) && !hasKey(ITEM_DB[id].script ?? {}, wanted, element))
      .map((element) => `${id} ${name}: ${element} — ${line}`),
  );
}

function abyssChaserMaxDamage(gear: Record<string, number>): number {
  const cls = new AbyssChaser();
  const bonuses = cls.setLearnSkills({
    activeSkillIds: cls.activeSkills.map(() => 0),
    passiveSkillIds: cls.passiveSkills.map((skill) => (skill.name === 'Abyss Square' ? 5 : 0)),
  }).getSkillBonusAndName();
  const model = {
    ...createMainModel(), class: cls.classId, level: 250, jobLevel: 60,
    int: 110, dex: 100, spl: 100, weapon: 510030, ...gear,
  } as any;
  const calc = new Calculator().setMasterItems(ITEM_DB).setHpSpTable(HP_SP_TABLE).setClass(cls);
  calc.loadItemFromModel(model);
  new CalculatorController().runChain(calc, {
    monster: MONSTERS[FIRE_DUMMY], ...bonuses, buffEquips: {}, buffMasterys: {}, consumeData: [],
    extraOptionScripts: [], selectedAtkSkill: 'Abyss Square==5', selectedChances: [], usedHpL: false,
  } as any);
  return (calc.getTotalSummary() as any).dmg.skillMaxDamage;
}

/**
 * Card suMsnPjrhMNonpQwNtre: on a Mandraque auto-cast build the neutral-damage bonuses were
 * not raising the skill's damage. Two different channels hide behind nearly identical pt-BR
 * wording, and seven items carried the wrong one — or none at all:
 *
 * - "Dano mágico **de propriedade** Neutro +N%" is the caster's own attack property,
 *   `m_my_element_<ele>`, and applies whatever the target is made of;
 * - "Dano mágico **contra (oponentes de) propriedade** Neutro +N%" is the target's property,
 *   `m_element_<ele>`, and applies only against a Neutral monster.
 *
 * Stored in the target channel, a described own-property bonus silently disappears against
 * every monster that is not of that property.
 */
describe('own-property magic damage reads the caster-side bonus key', () => {
  it('never stores a described own-property line in the target-property channel', () => {
    expect(misKeyed('own')).toEqual([]);
  });

  it('never stores a described target-property line in the caster-side channel', () => {
    expect(misKeyed('target')).toEqual([]);
  });

  /**
   * The sweeps above forbid the wrong channel, not a missing bonus, so this freezes the
   * described-but-unregistered rows instead — the way `auto-cast-audit.spec.ts` freezes its
   * candidate count. A new client item printing an own-property line has to be added here
   * deliberately, rather than joining the gap unnoticed, which is how this bug arrived.
   *
   * Why each is still a gap: 2007-2014/2046/26119/28616 are starter and elemental staves
   * whose lines belong to sets this database does not model yet (26119's is one third of a
   * five-piece block); 4457 and 27166 are registered cards whose damage half the catalogue
   * never read; 550010 and 640010 word theirs as "A cada nível de [perícia]", which the
   * script grammar cannot express. 312021 Dom Infernal arrived with the 10/11/2026 client:
   * its holy line is one clause of the EP19 Bem e Mal bundle — three crowns, six weapons
   * and two enchants whose whole effect is set bonuses — which is a port of its own, not a
   * sync. Clearing them is a sweep of its own, not this report.
   */
  it('freezes the own-property lines no script registers yet', () => {
    const unregistered = MAGIC_LINES.filter((row) => row.channel === 'own').flatMap(({ id, elements }) =>
      elements
        .filter((element) => !hasKey(ITEM_DB[id].script ?? {}, 'm_my_element', element)
          && !hasKey(ITEM_DB[id].script ?? {}, 'm_element', element))
        .map((element) => `${id} ${element}`),
    );
    expect([...new Set(unregistered)].sort((a, b) => Number(a.split(' ')[0]) - Number(b.split(' ')[0])
      || a.localeCompare(b))).toEqual([
      '2007 wind', '2008 water', '2009 fire', '2010 earth', '2011 wind', '2012 water',
      '2013 fire', '2014 earth', '2039 dark', '2039 fire', '2039 wind', '2046 fire',
      '4457 ghost', '19264 holy', '20840 fire', '26119 neutral', '27166 fire', '28255 ghost',
      '28616 holy', '312021 holy', '480683 fire', '480683 water', '550010 poison', '640010 ghost',
    ]);
  });

  // Six of the seven items the card uncovered, each read off its own pt-BR client
  // description; the seventh, 26165, is the opposite slip and gets its own test below.
  it.each([
    // "Dano mágico de propriedade Neutro e Terra +5%."
    [26151, { m_my_element_neutral: ['5'], m_my_element_earth: ['5'] }],
    // "Dano mágico de propriedade Neutro +5%.", "+5% adicional" at refine +9.
    [27310, { m_my_element_neutral: ['5', '9===5'] }],
    // "Dano mágico de propriedade Neutro e Terra +10%.", "+30% adicional" at refine +9. The
    // Thai description this record came from reads "Neutral, Fire" on the +9 tier; the LATAM
    // client says Terra, and the LATAM text is the one this database follows.
    [550075, { m_my_element_neutral: ['10', '9===30'], m_my_element_earth: ['10', '9===30'] }],
    // Refine +11: "Dano mágico de propriedade Fogo, Terra e Neutro +5%."
    [640059, { m_my_element_fire: ['11===5'], m_my_element_earth: ['11===5'], m_my_element_neutral: ['11===5'] }],
    // Refine +11: "Dano mágico de propriedade Neutro, Sagrado, Sombrio e Fantasma +10%."
    [470413, {
      m_my_element_neutral: ['11===10'], m_my_element_holy: ['11===10'],
      m_my_element_dark: ['11===10'], m_my_element_ghost: ['11===10'],
    }],
    // Refine +11 rolls a 10 s [efeito]: "Dano mágico de propriedade Neutro e Sagrado +20%."
    [20955, { chance__m_my_element_neutral: ['11===20'], chance__m_my_element_holy: ['11===20'] }],
  ])('keys item %i on the caster side', (id, expected) => {
    expect(ITEM_DB[id].script).toMatchObject(expected);
  });

  // The same slip the other way round. "Dano mágico contra as propriedades Maldito e Sagrado
  // +20%" is the target channel, and on this staff alone of the Schmidt set it had landed in
  // the physical one — its two siblings, 26166 Royal Magician Wand and 26216 Royal Whip, carry
  // the identical line as `m_element_holy` / `m_element_undead`.
  it('keeps the Royal Cleric Staff set line on the magical target channel', () => {
    const condition = 'EQUIP[King Schmidt\'s Suit&&King Schmidt\'s Manteau]REFINE[weapon,armor,garment==30]===20';
    expect(ITEM_DB[26165].script).toMatchObject({
      m_element_holy: [condition], m_element_undead: [condition],
    });
    expect(ITEM_DB[26165].script).not.toHaveProperty('p_element_holy');
    expect(ITEM_DB[26165].script).not.toHaveProperty('p_element_undead');
  });

  it('sums Carta Plaga onto the caster-side neutral bonus', () => {
    const worn = { headUpper: CARD_HOST_HEADGEAR, headUpperCard: PLAGA_CARD };
    expect(wornBonus(worn).m_my_element_neutral).toBe(5);
    expect(wornBonus({ ...worn, headUpperRefine: 9 }).m_my_element_neutral).toBe(10);
  });

  it('raises a Mandraque Fenda do Abismo against a Fire target with Carta Plaga', () => {
    const bare = abyssChaserMaxDamage({ headUpper: CARD_HOST_HEADGEAR });
    const carded = abyssChaserMaxDamage({ headUpper: CARD_HOST_HEADGEAR, headUpperCard: PLAGA_CARD });
    const refined = abyssChaserMaxDamage({
      headUpper: CARD_HOST_HEADGEAR, headUpperCard: PLAGA_CARD, headUpperRefine: 9,
    });

    // Fenda do Abismo is Neutral magic and the dummy is Fire: the target-property channel
    // contributes nothing here, which is why the card saw no increase at all.
    expect(carded).toBeGreaterThan(bare);
    expect(refined).toBeGreaterThan(carded);
  });
});
