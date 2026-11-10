import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Calculator } from 'src/app/core/calculator';
import { CalculatorController } from 'src/app/core/calculator-controller';
import { ArchMage, RuneKnight, Warlock } from 'src/app/jobs';
import { SKILL_META } from 'src/app/skills';
import { createMainModel } from 'src/app/utils';
import { ELMO, ITEM_DB, wornBonus } from './worn-bonus';

/**
 * "Dano de [Perícia] +N%" on a card — the per-skill bonus whose key IS the skill id
 * (docs/item-json.md §3.1).
 *
 * Tracker card tsasuuTzUtOWBW78UJo4, reported by Bruxula: "A carta Banshee não está
 * aplicando o bonus na habilidade vulcão napalm na simulação de dano do arcano". It was
 * not a Vulcão Napalm problem and not an Arcano problem — 4438's record held only the
 * HP/SP half of its text, because the pt-BR phrase table that writes card scripts
 * (tools/card-catalog.mjs) had no rule for a damage line that names a skill. Twenty-one
 * cards were in the same state and five of them did nothing at all in the calculator.
 *
 * The source for every magnitude below is the card's own client description, overlaid at
 * runtime from latam-items.json, which is also what this spec re-reads: the data is held
 * against the text the player sees in the tooltip, not against a number typed here.
 */

const latam = JSON.parse(readFileSync('src/assets/demo/data/latam-items.json', 'utf8'));
const monsters = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));

/** The Neutral Lv1 training dummy: no DEF, no MDEF, no resistance, so nothing but the card moves. */
const NEUTRAL_DUMMY = '21077';

const BANSHEE = 4438;
const NAPALM_VULCAN = 400; // Vulcão Napalm
const NAPALM_BEAT = 11; // Ataque Espiritual
const SOUL_STRIKE = 13; // Espíritos Anciões

/** pt-BR skill label -> id, the join the client's bracketed names need. */
const ID_BY_LABEL = new Map<string, number>(
  Object.values(SKILL_META as Record<string, { id?: number; label?: string }>)
    .filter((meta) => meta.id !== undefined && meta.label)
    .map((meta) => [meta.label as string, meta.id as number]),
);

const plain = (description: string) => (description || '').replace(/\^[0-9a-fA-F]{6}/g, '');

/**
 * Vulcão Napalm Lv5's top packet, with the card compounded into the helm or without it.
 *
 * The whole build is one inert helm, so the only thing that can move the number between
 * the two runs is the card — and the card's other two lines (HP máx. -100, SP máx. +100)
 * cannot move damage.
 */
function napalmVulcanDamage(card?: number): number {
  const cls: any = new Warlock();
  const activeIds = cls.activeSkills.map((skill: { name: string }) => (skill.name === 'Napalm Vulcan' ? 5 : 0));
  const { equipAtks, masteryAtks, activeSkillNames, learnedSkillMap } = cls
    .setLearnSkills({ activeSkillIds: activeIds, passiveSkillIds: cls.passiveSkills.map(() => 0) })
    .getSkillBonusAndName();

  const items: Record<number, any> = { [ELMO]: { ...ITEM_DB[ELMO], itemTypeId: 2, itemSubTypeId: 512 } };
  if (card) items[card] = { ...ITEM_DB[card], itemTypeId: 6, itemSubTypeId: 0 };

  const model: any = createMainModel();
  model.level = 250;
  model.jobLevel = 50;
  model.int = 120;
  model.headUpper = ELMO;
  if (card) model.headUpperCard = card;

  const selectedAtkSkill = 'Napalm Vulcan==5';
  model.selectedAtkSkill = selectedAtkSkill;

  const calc = new Calculator()
    .setMasterItems(items as any)
    .setHpSpTable([{ jobs: {}, baseHp: Array(251).fill(1000), baseSp: Array(251).fill(100) }] as any)
    .setClass(cls);
  calc.loadItemFromModel(model);
  new CalculatorController().runChain(calc, {
    monster: monsters[NEUTRAL_DUMMY], equipAtks, masteryAtks, buffEquips: {}, buffMasterys: {}, consumeData: [],
    aspdPotion: undefined, extraOptionScripts: [], activeSkillNames, learnedSkillMap,
    selectedAtkSkill, selectedChances: [], usedHpL: false,
  } as any);

  return (calc as any).damageSummary.skillMaxDamage as number;
}

describe('Carta Banshee (4438) — the three skills its own text names', () => {
  // "Magos e evoluções: … Dano de [Espíritos Anciões], [Ataque Espiritual] e
  // [Vulcão Napalm] +20%." — one magnitude shared by the three skills the line lists,
  // under the same class lineage as the card's HP/SP half.
  it('pays +20% on each of them to the Mage lineage', () => {
    const worn = { headUpper: ELMO, headUpperCard: BANSHEE, cls: new Warlock() };

    expect(wornBonus(worn)).toMatchObject({
      [SOUL_STRIKE]: 20,
      [NAPALM_BEAT]: 20,
      [NAPALM_VULCAN]: 20,
      hp: -100,
      sp: 100,
    });
  });

  it('reaches the Arcano Supremo too, the lineage being read off the class tree', () => {
    expect(wornBonus({ headUpper: ELMO, headUpperCard: BANSHEE, cls: new ArchMage() })[NAPALM_VULCAN]).toBe(20);
  });

  // The key is still there, at zero: `USED[Mage]` gates the value, not the key.
  it('pays nothing outside the lineage', () => {
    const worn = wornBonus({ headUpper: ELMO, headUpperCard: BANSHEE, cls: new RuneKnight() });

    expect(worn[NAPALM_VULCAN]).toBe(0);
    expect(worn[NAPALM_BEAT]).toBe(0);
    expect(worn[SOUL_STRIKE]).toBe(0);
    expect(worn.hp).toBe(0);
  });

  /**
   * The report itself: not "the key is in the record" but "the damage moves". The pool the
   * key lands in is read once by the magic pipeline as (100 + bonus) / 100, so +20% on the
   * skill is +20% on the packet — the stage is multiplicative over the whole formula and
   * Vulcão Napalm's `finalDmgFormula` (× skillLevel) does not change that.
   */
  it('shows up in the Arcano\'s Vulcão Napalm damage, which is what was reported', () => {
    const bare = napalmVulcanDamage();
    const withCard = napalmVulcanDamage(BANSHEE);

    expect(bare).toBeGreaterThan(0);
    expect(withCard / bare).toBeCloseTo(1.2, 2);
  });
});

describe('the cards whose only effect is a skill-damage line', () => {
  // Five records were literally `"script": {}` — the card showed in the slot and changed
  // nothing. Each entry below is the line the client prints, at the magnitude it prints.
  it.each([
    [4345, 'Carta Vento da Colina', { 21: ['5'], 84: ['5'], 85: ['5'] }], // Tempestade de Raios, Trovão de Júpiter, Ira de Thor
    [4350, 'Carta Laurell Weinder', { 88: ['3'], 89: ['3'] }], // Congelar, Nevasca
    [4380, 'Carta Ferus Escarlate', { 80: ['5'], 83: ['5'] }], // Coluna de Fogo, Chuva de Meteoros
    [4429, 'Carta Salamandra', { 80: ['40'], 83: ['40'] }], // the same two, at the Salamandra's magnitude
  ])('%i %s', (id, _name, script) => {
    expect(ITEM_DB[id].script).toEqual(script);
  });
});

/**
 * The family guard, which is the test that would have caught the report.
 *
 * Every card that names a skill inside a damage line has to carry that skill's id in its
 * script. Only the exceptions below may not, and each one is a gap with a name rather than
 * a card nobody looked at.
 */
describe('every card that prints a skill in a damage line registers that skill', () => {
  const EXCEPTIONS = new Map<number, string>([
    // "Dano de [Punição Divina] e [Escudo Bumerangue] +10%" — Punição Divina has no id in
    // the Skill Catalog, and half a line is not a bonus: registering the Escudo Bumerangue
    // half alone would ship a cheaper card than the client's.
    [4304, 'Punição Divina is not in the Skill Catalog'],
    // Same shape: "[Choque Rápido] e [Sacrifício do Mártir] +10%".
    [4371, 'Sacrifício do Mártir is not in the Skill Catalog'],
    // Three refine bands on one skill ("+10%", then "+20% adicional" at +10 and again at
    // +14). effectLines hands the third line both thresholds and an entry holds one value,
    // so the writable part would pay +30% at +14 where the card says +50% — wrong at the
    // refines people build for. Out whole until gates of the same family are read as the
    // siblings they are.
    [27173, 'the +14 band needs sibling refine gates'],
    // The same card for Rajada Certeira, and the same three bands. Only visible since the
    // Justiceiro's skills entered the catalog — before that the label resolved to nothing.
    [27174, 'the +14 band needs sibling refine gates'],
  ]);

  const CARDS = Object.keys(latam).filter((id) => /^Carta /.test(latam[id].name || '') && ITEM_DB[id]);

  /** Every skill label a card's damage lines name, in the order the client prints them. */
  const namedSkills = (id: string | number): string[] =>
    [...plain(latam[id].description).matchAll(/Dano de ((?:\[[^\]]+]\s*(?:,|e|ou)?\s*)+)[+-]\s*\d/g)]
      .flatMap((line) => [...line[1].matchAll(/\[([^\]]+)]/g)].map((m) => m[1].trim()));

  /** The skills a card names and its record does not pay. `cd__400` counts as paying 400. */
  const unregistered = (id: string | number): string[] => {
    const keys = new Set(Object.keys(ITEM_DB[id].script || {}).map((key) => key.split('__').pop()));

    return namedSkills(id).filter((label) => {
      const skillId = ID_BY_LABEL.get(label);
      // A label the Skill Catalog has no id for is nothing the script could key on, so it
      // is not evidence either way — those cards are in EXCEPTIONS for that reason.
      return skillId !== undefined && !keys.has(String(skillId));
    });
  };

  it('holds for every card the client ships', () => {
    const missing = CARDS
      .filter((id) => !EXCEPTIONS.has(Number(id)))
      .flatMap((id) => unregistered(id).map((label) => `${id} ${latam[id].name}: [${label}] -> ${ID_BY_LABEL.get(label)}`));

    expect(missing).toEqual([]);
  });

  it('keeps the exception list honest — an exception that stops being one is a line to delete', () => {
    for (const [id, why] of EXCEPTIONS) {
      // 4304 and 4371 have no resolvable label at all, so their shortfall shows as the
      // whole line being absent rather than as an unregistered id.
      const stillShort = unregistered(id).length > 0 || namedSkills(id).some((label) => !ID_BY_LABEL.has(label));

      expect(stillShort, `${id} ${latam[id].name} — ${why}`).toBe(true);
    }
  });
});
