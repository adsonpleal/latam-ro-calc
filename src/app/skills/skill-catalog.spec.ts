import { describe, expect, it } from 'vitest';
import { SKILL_DESC_BY_ID, SKILL_ID_BY_NAME, SKILL_META, VALID_SKILL_IDS, resolveSkillMeta } from './index';

describe('skill catalog', () => {
  it('carries id, pt-BR label and description per skill', () => {
    const arrowStorm = SKILL_META['Arrow Storm'];
    expect(arrowStorm.id).toBe(2233);
    expect(arrowStorm.label).toBe('Tempestade de Flechas');
    expect(arrowStorm.description).toContain('Tempestade de Flechas');
  });

  it('maps internal name -> id (unambiguous direction)', () => {
    expect(SKILL_ID_BY_NAME['Holy Light']).toBe(156);
    expect(SKILL_ID_BY_NAME['Storm Gust']).toBe(89);
  });

  it('leaves out Dragonic Breath (6001), which LATAM does not have', () => {
    // DK_DRAGONIC_BREATH is a real kRO skill and NOT a mistranslation of Aura
    // Draconiana (5210) — it is its own skill, which is why this test used to insist it
    // kept an id apart from the Rune Knight's Sopro do Dragão (2008). LATAM simply never
    // received it: it is absent from the client skill feed, bROWiki omits it from the
    // Cavaleiro Draconiano tree, and every item.json record keying a bonus on 6001 is
    // `presentInLatam: false`. Its label was invented, so it carried no client
    // description and ragassets served no icon for it. Removed on 17/08/2026 — see the
    // note in jobs/DragonKnight.ts. The two skills that DO exist stay put.
    expect(SKILL_ID_BY_NAME['Dragon Breath']).toBe(2008);
    expect(SKILL_ID_BY_NAME['Dragon Breath - WATER']).toBe(5004);
    expect(SKILL_ID_BY_NAME['Dragonic Aura']).toBe(5210);
    expect(SKILL_ID_BY_NAME['Dragonic Breath']).toBeUndefined();
    expect(VALID_SKILL_IDS.has(6001)).toBe(false);
  });

  it('maps id -> description for the hover tooltip', () => {
    // the client description opens with "<pt-BR> (<English>)"
    expect(SKILL_DESC_BY_ID[2233]).toContain('(Arrow Storm)');
  });

  it('exposes the set of valid skill ids for item.json validation', () => {
    expect(VALID_SKILL_IDS.has(2233)).toBe(true);
    expect(VALID_SKILL_IDS.has(156)).toBe(true);
    expect(VALID_SKILL_IDS.has(999999)).toBe(false);
  });

  it('keeps id-less internal markers as valid skill names (English fallback)', () => {
    const internal = resolveSkillMeta('_ElementalMaster_spirit');
    expect(internal).toBeDefined();
    expect(internal!.id).toBeUndefined();
  });
});
