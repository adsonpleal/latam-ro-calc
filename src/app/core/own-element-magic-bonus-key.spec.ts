import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AbyssChaser } from '../jobs';
import { createMainModel } from '../utils';
import { Calculator } from './calculator';
import { CalculatorController } from './calculator-controller';

const ITEMS = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8')) as Record<string, any>;
const LATAM_ITEMS = JSON.parse(readFileSync('src/assets/demo/data/latam-items.json', 'utf8')) as Record<string, any>;
const MONSTERS = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8')) as Record<string, any>;
const HP_SP_TABLE = JSON.parse(readFileSync('src/assets/demo/data/hp_sp_table.json', 'utf8'));

/** Training Dummy (Fire Lv1) — a target whose own property is not Neutral, so nothing but
 *  the caster-side channel can move a Neutral skill's damage against it. */
const FIRE_DUMMY = 21080;
const PLAGA_CARD = 27310;
/** Ayam: a one-slot upper headgear to hold the card. Its only bonus is gated to the
 *  Taekwon line, so it adds nothing of its own to a Mandraque. */
const CARD_HOST_HEADGEAR = 5174;

const ELEMENT_BY_PT: Record<string, string> = {
  neutro: 'neutral', agua: 'water', terra: 'earth', fogo: 'fire', vento: 'wind',
  veneno: 'poison', sagrado: 'holy', sombrio: 'dark', fantasma: 'ghost', 'morto-vivo': 'undead',
};
const unaccented = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const plainText = (description: string) => description.replace(/\^[0-9a-fA-F]{6}/g, '');

function elementsNamedBy(line: string): string[] {
  const named = line.match(/propriedade[s]?\s+([^+]*?)\s*\+/i);
  if (!named) return [];
  return unaccented(named[1]).split(/,| e /).map((part) => ELEMENT_BY_PT[part.trim()]).filter(Boolean);
}

function hasKey(script: string, family: 'm_element' | 'm_my_element', element: string): boolean {
  return new RegExp(`"(chance__)?${family}_(${element}|all)"`).test(script);
}

/** Every magic-damage line of a LATAM description that names properties, split by the two
 *  channels the wording distinguishes. */
function magicPropertyLines(channel: 'own' | 'target') {
  const rows: { id: string; name: string; line: string; elements: string[] }[] = [];
  for (const [id, record] of Object.entries(LATAM_ITEMS)) {
    const description = (record as any)?.description;
    if (!description || !ITEMS[id]) continue;
    for (const line of plainText(description).split('\n')) {
      if (!/Dano\s+m[aá]gico/i.test(line) || !/\+\s*\d/.test(line)) continue;
      const againstTarget = /contra\s+(oponentes|a[s]?\s+propriedade)/i.test(line);
      if (againstTarget !== (channel === 'target')) continue;
      const elements = elementsNamedBy(line);
      if (elements.length) rows.push({ id, name: ITEMS[id].name, line: line.trim(), elements });
    }
  }
  return rows;
}

function abyssChaserSummary(gear: Record<string, number>) {
  const cls = new AbyssChaser();
  const bonuses = cls.setLearnSkills({
    activeSkillIds: cls.activeSkills.map(() => 0),
    passiveSkillIds: cls.passiveSkills.map((skill) => (skill.name === 'Abyss Square' ? 5 : 0)),
  }).getSkillBonusAndName();
  const model = {
    ...createMainModel(), class: cls.classId, level: 250, jobLevel: 60,
    int: 110, dex: 100, spl: 100, weapon: 510030, ...gear,
  } as any;
  const calc = new Calculator().setMasterItems(ITEMS).setHpSpTable(HP_SP_TABLE).setClass(cls);
  calc.loadItemFromModel(model);
  new CalculatorController().runChain(calc, {
    monster: MONSTERS[FIRE_DUMMY], ...bonuses, buffEquips: {}, buffMasterys: {}, consumeData: [],
    extraOptionScripts: [], selectedAtkSkill: 'Abyss Square==5', selectedChances: [], usedHpL: false,
  } as any);
  const summary = calc.getTotalSummary() as any;
  return { bonus: (calc as any).totalEquipStatus as Record<string, number>, dmg: summary.dmg };
}

/**
 * Card suMsnPjrhMNonpQwNtre: on a Mandraque auto-cast build the neutral-damage bonuses were
 * not raising the skill's damage. Two different channels hide behind nearly identical pt-BR
 * wording, and six items carried the wrong one — or none at all:
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
    const offenders = magicPropertyLines('own').flatMap(({ id, name, line, elements }) => {
      const script = JSON.stringify(ITEMS[id].script ?? {});
      return elements
        .filter((element) => hasKey(script, 'm_element', element) && !hasKey(script, 'm_my_element', element))
        .map((element) => `${id} ${name}: ${element} — ${line}`);
    });
    expect(offenders).toEqual([]);
  });

  it('never stores a described target-property line in the caster-side channel', () => {
    const offenders = magicPropertyLines('target').flatMap(({ id, name, line, elements }) => {
      const script = JSON.stringify(ITEMS[id].script ?? {});
      return elements
        .filter((element) => hasKey(script, 'm_my_element', element) && !hasKey(script, 'm_element', element))
        .map((element) => `${id} ${name}: ${element} — ${line}`);
    });
    expect(offenders).toEqual([]);
  });

  // The seven items the card uncovered, each read off its own pt-BR client description.
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
    expect(ITEMS[id].script).toMatchObject(expected);
  });

  // The same slip the other way round. "Dano mágico contra as propriedades Maldito e Sagrado
  // +20%" is the target channel, and on this staff alone of the Schmidt set it had landed in
  // the physical one — its two siblings, 26166 Royal Magician Wand and 26216 Royal Whip, carry
  // the identical line as `m_element_holy` / `m_element_undead`.
  it('keeps the Royal Cleric Staff set line on the magical target channel', () => {
    const condition = 'EQUIP[King Schmidt\'s Suit&&King Schmidt\'s Manteau]REFINE[weapon,armor,garment==30]===20';
    expect(ITEMS[26165].script).toMatchObject({
      m_element_holy: [condition], m_element_undead: [condition],
    });
    expect(ITEMS[26165].script).not.toHaveProperty('p_element_holy');
    expect(ITEMS[26165].script).not.toHaveProperty('p_element_undead');
  });

  it('raises a Mandraque Fenda do Abismo against a Fire target with Carta Plaga', () => {
    const bare = abyssChaserSummary({ headUpper: CARD_HOST_HEADGEAR });
    const carded = abyssChaserSummary({ headUpper: CARD_HOST_HEADGEAR, headUpperCard: PLAGA_CARD });
    const refined = abyssChaserSummary({
      headUpper: CARD_HOST_HEADGEAR, headUpperCard: PLAGA_CARD, headUpperRefine: 9,
    });

    expect(carded.bonus.m_my_element_neutral).toBe(5);
    expect(refined.bonus.m_my_element_neutral).toBe(10);
    // Fenda do Abismo is Neutral magic and the dummy is Fire: the target-property channel
    // contributes nothing here, which is why the card saw no increase at all.
    expect(carded.dmg.skillMaxDamage).toBeGreaterThan(bare.dmg.skillMaxDamage);
    expect(refined.dmg.skillMaxDamage).toBeGreaterThan(carded.dmg.skillMaxDamage);
  });
});
