/**
 * Validates the bonus keys and class names declared in item.json.
 *
 * This used to be a dev-only sweep inside RoService, which re-walked all 9,555 items on
 * every reload in development and dumped `console.error` output nobody read. As a spec it
 * runs on pre-push and genuinely fails when the item database gains a key the engine does
 * not know.
 *
 * Why the keys matter: a bonus misspelled in item.json raises an error nowhere — the item
 * simply does nothing in the calculation.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRawTotalBonus } from 'src/app/utils';
import { VALID_SKILL_IDS } from 'src/app/skills';
import { validClassNameSet } from './valid-bonuses';

const items: Record<string, any> = JSON.parse(
  readFileSync(join(process.cwd(), 'src/assets/demo/data/item.json'), 'utf8'),
);

/** Time/cooldown modifiers prefixed onto an already valid key. */
const PREFIXES = ['fix_vct__', 'vct__', 'chance__', 'fctPercent__', 'fct__', 'acd__', 'cd__'];

/** Prefixes stack — `chance__cd__2447` is a cooldown-reduction chance for skill 2447. */
const stripPrefix = (key: string) => {
  let out = key;
  for (let changed = true; changed; ) {
    changed = false;
    for (const p of PREFIXES) {
      if (out.startsWith(p)) {
        out = out.slice(p.length);
        changed = true;
        break;
      }
    }
  }
  return out;
};

/**
 * Key families assembled dynamically at runtime, which is why they do not appear in the
 * static createRawTotalBonus():
 *
 *   cri_race_<race>  — read in damage-calculator.ts:538 (`cri_race_${race}`).
 */
const DYNAMIC_KEY_PATTERNS = [/^cri_race_\w+$/];

/**
 * Keys the database declares and the engine does NOT consume. These are not typos: they
 * are bonuses not yet modelled. They are pinned here so the spec passes today and still
 * breaks if the database gains a new unknown key. When a bonus gets modelled, delete its
 * line.
 *
 *   dmg__<monster> — damage against one specific monster. Only Diabolus Manteau (2537)
 *                    and Diabolus Ring (2729) use it, against Lucifer Morocc.
 *
 *   6001           — Dragonic Breath (DK_DRAGONIC_BREATH). A real kRO Dragon Knight
 *                    skill, so this is not a typo, but not one LATAM has: it is absent
 *                    from the client skill feed and bROWiki leaves it out of the
 *                    Cavaleiro Draconiano tree. The skill was dropped from the catalog on
 *                    17/08/2026 (see jobs/DragonKnight.ts), which left these keys behind.
 *                    All 20 items carrying one are `presentInLatam: false`, so nothing a
 *                    player can equip references it — deleting the keys would mean
 *                    editing upstream records the calculator never shows. Delete this
 *                    line if LATAM ever receives the skill.
 */
const CHAVES_NAO_MODELADAS = ['dmg__Lucifer Morocc', '6001'];

describe('item.json: chaves de bônus', () => {
  const validStatusSet = new Set(Object.keys(createRawTotalBonus()));

  const desconhecidas = new Map<string, string[]>();

  for (const key of Object.keys(items)) {
    const script = items[key].script as Record<string, unknown> | undefined;
    if (!script) continue;

    for (const bonusKey of Object.keys(script)) {
      const realKey = stripPrefix(bonusKey);
      if (validStatusSet.has(realKey)) continue;
      // skill bonus keys are the game's skill ids (see the Skill Catalog)
      if (/^\d+$/.test(realKey) && VALID_SKILL_IDS.has(Number(realKey))) continue;
      if (DYNAMIC_KEY_PATTERNS.some((re) => re.test(realKey))) continue;

      const donos = desconhecidas.get(realKey) ?? [];
      donos.push(key);
      desconhecidas.set(realKey, donos);
    }
  }

  it('introduces no keys the engine does not know', () => {
    const inesperadas = [...desconhecidas.keys()].filter((k) => !CHAVES_NAO_MODELADAS.includes(k));
    expect(inesperadas).toEqual([]);
  });

  it('keeps the unmodelled-bonus list from growing', () => {
    // If one of these leaves the database (or becomes modelled), delete it from the
    // constant — the spec warns rather than letting the list rot.
    expect([...desconhecidas.keys()].sort()).toEqual([...CHAVES_NAO_MODELADAS].sort());
  });
});

describe('item.json: combo conditions', () => {
  /**
   * `EQUIP[<english name>]` is the legacy way of naming a combo partner and is not to be
   * used in new records — `EQUIP_ID[<id>]` is (docs/item-json.md). Matching on the display
   * name breaks whenever a pt-BR rename lands, and it silently couples every record that
   * happens to share a name: the client re-issues items under new ids keeping the old
   * name, so one clause can fire for a partner nobody meant to include.
   *
   * A ratchet rather than a ban, because 1.500 records still carry the old form. The
   * number may only fall. When a run migrates a family, drop it to what that run leaves
   * behind so the ground gained is not given back.
   *
   * Cards are at zero: the family was migrated whole, 434 clauses on 201 records, against
   * the behavioural baseline in card-set-migration.spec.ts. What is left is equipment, and
   * it is being taken in batches rather than wholesale — the most recent was the 14 records
   * (59 clauses) the Dragon Knight replay audit walked through, guarded by
   * equipment-set-combo-migration.spec.ts.
   */
  const RECORDS_ON_LEGACY_EQUIP = 1500;
  const usesLegacyEquip = (item: any) => /EQUIP\[/.test(JSON.stringify(item.script ?? {}));

  it('does not grow the number of records matching a combo partner by name', () => {
    const legacy = Object.values(items).filter(usesLegacyEquip);
    expect(legacy.length).toBeLessThanOrEqual(RECORDS_ON_LEGACY_EQUIP);
  });

  it('keeps the card family fully id-based', () => {
    // Migrated whole — 434 clauses on 201 records. Guarded here as well as in
    // card-set-migration.spec.ts so a new card cannot reintroduce the form.
    const offenders = Object.entries(items)
      .filter(([, it]) => it.itemTypeId === 6 && it.itemSubTypeId === 0 && usesLegacyEquip(it))
      .map(([id]) => id);
    expect(offenders).toEqual([]);
  });

  it('keeps the Visual-enchant stone family fully id-based', () => {
    // Migrated wholesale — 159 records, 330 clauses. Guarded here as well as in
    // costume-enchant-combo-migration.spec.ts so a new stone cannot reintroduce the form.
    const STONE_SUBS = [71, 72, 73, 74, 75, 76];
    const offenders = Object.entries(items)
      .filter(([, it]) => STONE_SUBS.includes(it.itemSubTypeId) && usesLegacyEquip(it))
      .map(([id]) => id);
    expect(offenders).toEqual([]);
  });
});

describe('item.json: class names', () => {
  it('uses only known class names in usableClass/unusableClass', () => {
    const invalidas = new Set<string>();

    for (const key of Object.keys(items)) {
      for (const field of ['usableClass', 'unusableClass'] as const) {
        const list = items[key][field];
        if (!Array.isArray(list)) continue;
        for (const className of list) {
          if (!validClassNameSet.has(className)) invalidas.add(className);
        }
      }
    }

    expect([...invalidas]).toEqual([]);
  });
});
