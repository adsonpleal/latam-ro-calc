import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ItemMap, LatamItem, mergeLatamItems, mergeLatamMonsters } from './merge-items';

const DATA = 'src/assets/demo/data/';
const read = <T>(file: string): T => JSON.parse(readFileSync(DATA + file, 'utf8')) as T;

describe('mergeLatamItems', () => {
  const items = mergeLatamItems(read<ItemMap>('item.json'), read<Record<string, LatamItem>>('latam-items.json'));

  it('applies the pt-BR name while preserving the English one for set/combo scripts', () => {
    // Scripts match partner items by English display name (EQUIP[...], POS_SPECIFIC[...],
    // REFINE_NAME[...]), so losing enName would silently drop those bonuses.
    expect(items['700016'].name).toBe('Arco de Apoio Certeiro');
    expect(items['700016'].enName).toBe('Sharpbolt Booster Bow');
    expect(items['700016'].presentInLatam).toBe(true);
  });

  it('leaves non-LATAM items untranslated and unflagged', () => {
    expect(items['1341'].presentInLatam).toBe(false);
    expect(items['1341'].name).toBe('Destruction Axe [2]');
    expect(items['1341'].enName).toBeUndefined();
  });

  it('flags exactly the LATAM intersection', () => {
    // Regression guard on the overlay: 6462 of item.json's 9754 records exist in the
    // LATAM client. The rest are hidden from the app's pickers.
    const flagged = Object.values(items).filter((i: any) => i.presentInLatam).length;
    expect(flagged).toBe(6462);
    expect(Object.keys(items)).toHaveLength(9754);
  });

  it('re-lists item 4807 under three keys but one id', () => {
    // Deliberate: the same enchant has to appear in several costume-enchant dropdowns.
    // Anything indexing by key rather than by record id would double-count it.
    for (const key of ['4807', '48079999', '480799999']) expect(items[key].id).toBe(4807);
    const unique = new Set(Object.values(items).map((i: any) => i.id));
    expect(unique.size).toBe(9752);
  });
});

describe('mergeLatamMonsters', () => {
  const monsters = mergeLatamMonsters(read<ItemMap>('monster.json'), read<Record<string, string>>('latam-monsters.json'));

  it('applies pt-BR monster names', () => {
    expect(monsters['1038'].name).toBe('Osíris');
    expect(monsters['1039'].name).toBe('Bafomé');
  });

  it('keeps the stat block untouched', () => {
    expect(monsters['1038'].stats.health).toBe(1175840);
    // elementName stays English — Monster.setData splits it on the space, so the
    // logic keys must not be localized even though the display name is.
    expect(monsters['1038'].stats.elementName).toBe('Undead 4');
  });

  it('leaves the handful of monsters with no pt-BR name alone', () => {
    // The synthetic Miragem de Amdarais ids (205731+) clone a mob that has no
    // client string of its own, so they keep the English name rather than blanking.
    const untranslated = Object.values(monsters).filter((m: any) => !m.name);
    expect(untranslated).toHaveLength(0);
    expect(monsters['205731'].name).toBeTruthy();
  });
});
