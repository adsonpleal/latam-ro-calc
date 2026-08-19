import { describe, expect, it } from 'vitest';
import { ITEM_DB, wornBonus } from './worn-bonus';

/**
 * Botas do Bem e do Mal (470207-470238) and the 36 Good/Evil Vigor enchants that carry
 * their set bonus — the other half of the Coroa do Bem e do Mal set, which shipped in
 * 0.1.72-beta (see good-evil-crown-sets.spec.ts).
 *
 * Same story as the crowns: records and enchant pools were already in the repo but
 * `presentInLatam` hid them, so nothing had ever exercised them. They are surfaced by
 * the `preRelease` opt-in (docs/item-json.md).
 *
 * The boots themselves carry no combo line at all. Everything conditional lives in the
 * slot-3 Vigor enchant, and every Vigor line is gated on the *crown's* spell enchant —
 * Good Vigor wants Good Spell, Evil Vigor wants Evil Spell. So a player only collects
 * the set bonus with both pieces enchanted, which is what most of this file pins down.
 *
 * Bonuses are read off the whole worn set, so each expectation is stated as a delta from
 * a baseline: the crown and the boots pay their own refine lines regardless.
 *
 * https://hazyforest.com/enchants:good_evil_boots_shadow_cross
 */

const BOOTS_SHC = 470222;
const CROWN_SHC = 400382;
const GOOD_VIGOR_SHC = 312650;
const EVIL_VIGOR_SHC = 312653;

const GOOD_SPELL = 312014;
const EVIL_SPELL = 312021;

const SAVAGE_IMPACT = '5287';
const ETERNAL_SLASH = '5289';
const IMPACT_CRATER = '5292';

/** Every boot in the family, in id order. */
const ALL_BOOTS = [
  470207, 470208, 470209, 470210, 470211, 470212, 470213, 470214, 470215,
  470221, 470222, 470223, 470224, 470225, 470226, 470236, 470237, 470238,
];

/** The 36 Vigor enchants, read off the DB so a renamed record cannot silently drop out. */
const ALL_VIGOR = Object.keys(ITEM_DB)
  .filter((id) => /^(Good|Evil) Vigor \(/.test(ITEM_DB[id].name ?? ''))
  .map(Number);

describe('470222 Botas do Bem e do Mal (Shadow Cross)', () => {
  it('pays its own refine lines with nothing else worn', () => {
    const bonus = wornBonus({ boot: BOOTS_SHC, bootRefine: 11 });

    expect(bonus['hp']).toBe(500);
    expect(bonus['sp']).toBe(100);
    expect(bonus['hpPercent']).toBe(5); // every 2 refines, +1%
    expect(bonus['spPercent']).toBe(5);
    expect(bonus['atkPercent']).toBe(7); // +7
    expect(bonus['melee']).toBe(10); // +9
    expect(bonus['fct']).toBe(0.5); // +11
  });

  it('holds the +9 and +11 lines back below their refine', () => {
    const bonus = wornBonus({ boot: BOOTS_SHC, bootRefine: 8 });

    expect(bonus['atkPercent']).toBe(7); // +7 is reached
    expect(bonus['melee'] ?? 0).toBe(0);
    expect(bonus['fct'] ?? 0).toBe(0);
  });

  it('stacks the grade bonuses cumulatively, D through A', () => {
    const plain = wornBonus({ boot: BOOTS_SHC, bootRefine: 11 });
    const graded = wornBonus({ boot: BOOTS_SHC, bootRefine: 11, bootGrade: 'A' });

    expect(graded['res']).toBe(50); // grade D
    expect(graded['mres']).toBe(50);
    expect(graded['p_size_all']).toBe(10); // grade C
    expect(graded['pAtk']).toBe(7); // grade B
    expect(graded['sMatk']).toBe(7);
    expect(graded['fct'] - plain['fct']).toBe(0.5); // grade A, on top of the +11 line
  });

  it('pays nothing extra for a Vigor enchant while the crown has no spell', () => {
    const plain = wornBonus({ boot: BOOTS_SHC, bootRefine: 11, headUpper: CROWN_SHC });
    const enchanted = wornBonus({
      boot: BOOTS_SHC,
      bootRefine: 11,
      bootEnchants: [GOOD_VIGOR_SHC],
      headUpper: CROWN_SHC,
    });

    expect(enchanted[SAVAGE_IMPACT] ?? 0).toBe(plain[SAVAGE_IMPACT] ?? 0);
    expect(enchanted[ETERNAL_SLASH] ?? 0).toBe(plain[ETERNAL_SLASH] ?? 0);
    expect(enchanted['p_element_all'] ?? 0).toBe(plain['p_element_all'] ?? 0);
    expect(enchanted['cri'] ?? 0).toBe(plain['cri'] ?? 0);
  });

  it('pays the Good Vigor set once the crown carries Good Spell', () => {
    const base = wornBonus({
      boot: BOOTS_SHC,
      bootRefine: 11,
      headUpper: CROWN_SHC,
      headUpperEnchants: [GOOD_SPELL],
    });
    const full = wornBonus({
      boot: BOOTS_SHC,
      bootRefine: 11,
      bootEnchants: [GOOD_VIGOR_SHC],
      headUpper: CROWN_SHC,
      headUpperEnchants: [GOOD_SPELL],
    });

    expect(full[SAVAGE_IMPACT] - (base[SAVAGE_IMPACT] ?? 0)).toBe(40);
    expect(full[ETERNAL_SLASH] - (base[ETERNAL_SLASH] ?? 0)).toBe(20);
    expect(full['p_element_all'] - (base['p_element_all'] ?? 0)).toBe(20);
    expect(full['cri'] - (base['cri'] ?? 0)).toBe(5);
  });

  it('keeps the good and evil halves apart — the wrong spell pays nothing', () => {
    const base = wornBonus({
      boot: BOOTS_SHC,
      bootRefine: 11,
      headUpper: CROWN_SHC,
      headUpperEnchants: [EVIL_SPELL],
    });
    const wrong = wornBonus({
      boot: BOOTS_SHC,
      bootRefine: 11,
      bootEnchants: [GOOD_VIGOR_SHC],
      headUpper: CROWN_SHC,
      headUpperEnchants: [EVIL_SPELL],
    });

    expect(wrong[SAVAGE_IMPACT] ?? 0).toBe(base[SAVAGE_IMPACT] ?? 0);
    expect(wrong[ETERNAL_SLASH] ?? 0).toBe(base[ETERNAL_SLASH] ?? 0);
  });

  it('pays the Evil Vigor set on Evil Spell, on its own skill and stats', () => {
    const base = wornBonus({
      boot: BOOTS_SHC,
      bootRefine: 11,
      headUpper: CROWN_SHC,
      headUpperEnchants: [EVIL_SPELL],
    });
    const full = wornBonus({
      boot: BOOTS_SHC,
      bootRefine: 11,
      bootEnchants: [EVIL_VIGOR_SHC],
      headUpper: CROWN_SHC,
      headUpperEnchants: [EVIL_SPELL],
    });

    expect(full[IMPACT_CRATER] - (base[IMPACT_CRATER] ?? 0)).toBe(30);
    expect(full['criDmg'] - (base['criDmg'] ?? 0)).toBe(20);
    expect(full['p_element_all'] - (base['p_element_all'] ?? 0)).toBe(20);
    expect(full['aspdPercent'] - (base['aspdPercent'] ?? 0)).toBe(5);
  });
});

/**
 * The Night Watch pair is the only one that branches: five weapon-specific crowns, each
 * paying a different skill. It is the case that would break first if the conditions were
 * ever matched by display name again, since all five names differ by a bracketed suffix.
 */
describe('312805 Good Vigor (Night Watch) — one branch per crown', () => {
  const BOOTS_NW = 470238;
  const GOOD_VIGOR_NW = 312805;
  const CROWN_RIFLE = 400395;
  const CROWN_REVOLVER = 400392;

  const ONLY_ONE_BULLET = '5406';
  const SPIRAL_SHOOTING = '5407';
  const MAGAZINE_FOR_ONE = '5408';

  const worn = (headUpper: number, bootEnchants: number[] = []) =>
    wornBonus({ boot: BOOTS_NW, bootRefine: 11, bootEnchants, headUpper, headUpperEnchants: [GOOD_SPELL] });

  it('fires the Rifle branch and leaves the Revolver branch alone', () => {
    const base = worn(CROWN_RIFLE);
    const full = worn(CROWN_RIFLE, [GOOD_VIGOR_NW]);

    expect(full[ONLY_ONE_BULLET] - (base[ONLY_ONE_BULLET] ?? 0)).toBe(40);
    expect(full[SPIRAL_SHOOTING] - (base[SPIRAL_SHOOTING] ?? 0)).toBe(20);
    expect(full['aspdPercent'] - (base['aspdPercent'] ?? 0)).toBe(5);
    expect(full[MAGAZINE_FOR_ONE] ?? 0).toBe(base[MAGAZINE_FOR_ONE] ?? 0);
  });

  it('fires the Revolver branch instead when that crown is worn', () => {
    const base = worn(CROWN_REVOLVER);
    const full = worn(CROWN_REVOLVER, [GOOD_VIGOR_NW]);

    expect(full[MAGAZINE_FOR_ONE] - (base[MAGAZINE_FOR_ONE] ?? 0)).toBe(30);
    expect(full['range'] - (base['range'] ?? 0)).toBe(20);
    expect(full['cri'] - (base['cri'] ?? 0)).toBe(5);
    expect(full[ONLY_ONE_BULLET] ?? 0).toBe(base[ONLY_ONE_BULLET] ?? 0);
  });

  it('pays the shared 20% all-property line on either crown', () => {
    for (const crown of [CROWN_RIFLE, CROWN_REVOLVER]) {
      const base = worn(crown);
      const full = worn(crown, [GOOD_VIGOR_NW]);

      expect(full['p_element_all'] - (base['p_element_all'] ?? 0)).toBe(20);
    }
  });
});

describe('the family as a whole', () => {
  it('has all 18 boots and all 36 Vigor enchants', () => {
    expect(ALL_BOOTS.every((id) => ITEM_DB[id])).toBe(true);
    expect(ALL_VIGOR).toHaveLength(36);
  });

  it('shares one script shape across the 18 boots', () => {
    for (const id of ALL_BOOTS) {
      const script = ITEM_DB[id].script;

      expect(script['hp'], `${id}`).toEqual(['500']);
      expect(script['sp'], `${id}`).toEqual(['100']);
      expect(script['hpPercent'], `${id}`).toEqual(['2---1']);
      expect(script['spPercent'], `${id}`).toEqual(['2---1']);
      expect(script['fct'], `${id}`).toEqual(['11===0.5', 'GRADE[boot==A]===0.5']);
      expect(script['res'], `${id}`).toEqual(['GRADE[boot==D]===50']);
      expect(script['mres'], `${id}`).toEqual(['GRADE[boot==D]===50']);
      expect(script['pAtk'], `${id}`).toEqual(['GRADE[boot==B]===7']);
      expect(script['sMatk'], `${id}`).toEqual(['GRADE[boot==B]===7']);
    }
  });

  it('gates every Vigor line on a spell enchant, by id', () => {
    // Matching by id is what the crowns' audit settled on in 0.1.72-beta: it survives the
    // pt-BR rename that lands the day LATAM ships these, and the five Night Watch crowns
    // whose display names differ only by a bracketed suffix.
    for (const id of ALL_VIGOR) {
      for (const [key, lines] of Object.entries(ITEM_DB[id].script as Record<string, string[]>)) {
        for (const line of lines) {
          expect(line, `${id} ${key}`).toMatch(/^EQUIP_ID\[(312014|312021)(&&\d+)?]===/);
        }
      }
    }
  });
});

/**
 * The one divergence the description audit turned up in the upstream port. It was silent —
 * the item was unreachable, so nothing exercised it — and it is exactly the kind a re-port
 * would reintroduce.
 */
describe('audit fix against the iRO description', () => {
  it('makes the Abyss Chaser boots purely physical', () => {
    // 470224 had been copied from the hybrid template: it granted MATK + 7% at +7, all
    // property magic damage at +9, and magic damage per size at grade C. Divine-pride's
    // parsed server script and the description agree on none of those — the +7 line is
    // ATK only, the +9 line is melee and long-ranged physical, and the whole Abyss Chaser
    // set (crown 400383 and both Vigor enchants) is physical throughout.
    const script = ITEM_DB[470224].script;

    expect(script['atkPercent']).toEqual(['7===7']);
    expect(script['matkPercent']).toBeUndefined();
    expect(script['melee']).toEqual(['9===10']);
    expect(script['range']).toEqual(['9===10']);
    expect(script['m_my_element_all']).toBeUndefined();
    expect(script['p_size_all']).toEqual(['GRADE[boot==C]===10']);
    expect(script['m_size_all']).toBeUndefined();
  });

  it('leaves the genuinely hybrid boots with both halves', () => {
    // The guard against over-correcting: Cardinal and Imperial Guard really do read
    // "ATK, MATK + 7%" and pay magic damage per size at grade C.
    for (const id of [470207, 470236]) {
      expect(ITEM_DB[id].script['matkPercent'], `${id}`).toEqual(['7===7']);
      expect(ITEM_DB[id].script['m_size_all'], `${id}`).toEqual(['GRADE[boot==C]===10']);
    }
  });
});
