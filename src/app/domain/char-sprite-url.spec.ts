import { describe, expect, it } from 'vitest';
import { bareJobSprite, buildCharSpriteUrl } from './char-sprite-url';

// id -> [view, slotMask], the shape tools/sync-latam-db.mjs emits into item-views.json.
// SLOT_BIT: top=1, mid=2, low=4, garment=8.
const VIEWS: Record<string, [number, number]> = {
  '2206': [44, 1], // top-slot headgear
  '2207': [4, 1], // another top-slot headgear
  '5000': [10, 2], // mid
  '5001': [20, 4], // low
  '2264': [51, 7], // costume covering top+mid+low
  '20502': [12, 8], // garment
  '20504': [14, 8], // costume garment
  '1101': [1, 0], // a weapon: has a view, no visual head/garment slot
};

const params = (url: string): URLSearchParams => new URLSearchParams(url.slice(url.indexOf('?') + 1));

describe('buildCharSpriteUrl', () => {
  it('maps the calc internal class id to the real sprite job id', () => {
    // ClassIcon: RuneKnight (internal 12) renders as job 4060.
    expect(params(buildCharSpriteUrl({ class: 12 }, VIEWS)).get('job')).toBe('4060');
    // A 4th-class id maps to itself.
    expect(params(buildCharSpriteUrl({ class: 4252 }, VIEWS)).get('job')).toBe('4252');
  });

  it('returns an empty string without a class', () => {
    expect(buildCharSpriteUrl({}, VIEWS)).toBe('');
    expect(buildCharSpriteUrl(null, VIEWS)).toBe('');
  });

  it('drops the canvas when the caller wants a tight crop', () => {
    // The social card asks for this: with no canvas the gateway crops to the drawn
    // pixels, so no headgear or cape can be clipped. The fixed canvas measurably does
    // clip — a sprite reaches 22px below the anchor and it allows 14.
    const tight = params(buildCharSpriteUrl({ class: 12 }, VIEWS, undefined, { tightCrop: true }));
    expect(tight.has('canvas')).toBe(false);
    expect(tight.get('job')).toBe('4060');
    // Everything else is unchanged, so both callers render the same character.
    expect(tight.get('action')).toBe('0');
  });

  it('pins the render canvas', () => {
    // Hand-measured against the live gateway; a change here silently reframes every card.
    expect(params(buildCharSpriteUrl({ class: 12 }, VIEWS)).get('canvas')).toBe('110x140+55+126');
    expect(params(buildCharSpriteUrl({ class: 12 }, VIEWS)).get('action')).toBe('0');
    expect(params(buildCharSpriteUrl({ class: 12 }, VIEWS)).get('headdir')).toBe('0');
  });

  it('resolves headgears to view ids, not item ids', () => {
    const p = params(buildCharSpriteUrl({ class: 12, headUpper: 2206, headMiddle: 5000, headLower: 5001 }, VIEWS));
    expect(p.get('headgear')).toBe('44,10,20');
  });

  it('skips ids the view map does not know', () => {
    const p = params(buildCharSpriteUrl({ class: 12, headUpper: 2206, headMiddle: 999999 }, VIEWS));
    expect(p.get('headgear')).toBe('44');
  });

  it('lets a costume win over the equipment in the same slot', () => {
    const p = params(buildCharSpriteUrl({ class: 12, costumeUpper: 2207, headUpper: 2206 }, VIEWS));
    expect(p.get('headgear')).toBe('4');
  });

  it('hides every slot a multi-slot costume covers', () => {
    // The 2264 costume masks top+mid+low, so none of the equipped pieces draw.
    const p = params(buildCharSpriteUrl({ class: 12, costumeUpper: 2264, headUpper: 2206, headMiddle: 5000, headLower: 5001 }, VIEWS));
    expect(p.get('headgear')).toBe('51');
  });

  it('prefers the costume garment over the equipped one', () => {
    expect(params(buildCharSpriteUrl({ class: 12, garment: 20502 }, VIEWS)).get('garment')).toBe('12');
    expect(params(buildCharSpriteUrl({ class: 12, garment: 20502, costumeGarment: 20504 }, VIEWS)).get('garment')).toBe('14');
  });

  it('forces the sex of a gender-locked job', () => {
    // Wanderer (job 4021) is female-only; Minstrel (4020) male-only. The build's own
    // `sex` must not override the sprite that exists.
    expect(params(buildCharSpriteUrl({ class: 4021, sex: 1 }, VIEWS)).get('gender')).toBe('female');
    expect(params(buildCharSpriteUrl({ class: 4020, sex: 0 }, VIEWS)).get('gender')).toBe('male');
  });

  it('honours the build sex elsewhere, defaulting to male', () => {
    expect(params(buildCharSpriteUrl({ class: 12 }, VIEWS)).get('gender')).toBe('male');
    expect(params(buildCharSpriteUrl({ class: 12, sex: 0 }, VIEWS)).get('gender')).toBe('female');
    expect(params(buildCharSpriteUrl({ class: 12 }, VIEWS, 0)).get('gender')).toBe('female');
  });

  it('omits the palettes when they are at the standard value', () => {
    const bare = params(buildCharSpriteUrl({ class: 12 }, VIEWS));
    expect(bare.get('head')).toBe('1');
    expect(bare.has('headPalette')).toBe(false);
    expect(bare.has('bodyPalette')).toBe(false);

    const dyed = params(buildCharSpriteUrl({ class: 12, hairStyle: 7, hairColor: 3, clothesColor: 5 }, VIEWS));
    expect(dyed.get('head')).toBe('7');
    expect(dyed.get('headPalette')).toBe('3');
    expect(dyed.get('bodyPalette')).toBe('5');
  });

  it('tolerates a missing view map', () => {
    const p = params(buildCharSpriteUrl({ class: 12, headUpper: 2206 }, null));
    expect(p.get('job')).toBe('4060');
    expect(p.has('headgear')).toBe(false);
  });
});

describe('bareJobSprite', () => {
  it('drops the gear and the canvas', () => {
    expect(bareJobSprite(12)).toContain('job=4060');
    expect(bareJobSprite(12)).not.toContain('canvas');
    expect(bareJobSprite(null)).toBe('');
  });
});
