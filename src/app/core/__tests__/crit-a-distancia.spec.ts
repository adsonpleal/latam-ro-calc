import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CardPosition } from 'src/app/constants/card-position.enum';
import { createMainModel } from 'src/app/utils';
import { equipStatusOf, makeCalculator } from './make-calculator';

/**
 * "CRIT à distância" — the crit rate the game grants to the ranged basic attack alone.
 *
 * Two items in the whole LATAM client print that line, and they are the only two that may
 * carry the `criRange` key: 4421 Carta Drosera (+15, its entire description) and the
 * 420748 Cachecol Físico de Schmidt + Brasão AGI set (+25, covered by
 * cachecol-schmidt-sets.spec.ts). The card was unregisterable until the key existed, so it
 * sat in the missing-cards queue with a one-line description the engine could not express.
 *
 * The key exists apart from `cri` because the skill crit rate reads `cri` too — see
 * DamageCalculator.getRangedCriRate, which is also what gates it on a ranged weapon.
 */

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const latam = JSON.parse(readFileSync('src/assets/demo/data/latam-items.json', 'utf8'));

const CARTA_DROSERA = 4421;
const BOW = 1718; // Arco Composto [4] — a ranged weapon with card slots
const KNIFE = 1201; // Knife [3] — melee, so the bonus must not count

/** Equip `weapon` with the card in its first socket and read the equipment bonus back. */
function bonusOf(weapon: number, cardId?: number): Record<string, number> {
  const db: Record<number, any> = { [weapon]: { ...items[weapon] } };
  if (cardId) db[cardId] = { ...items[cardId] };

  const model = createMainModel();
  model.level = 200;
  model.weapon = weapon;
  if (cardId) model.weaponCard1 = cardId;

  return equipStatusOf(makeCalculator(db), model);
}

describe('4421 Carta Drosera', () => {
  it('is registered as a weapon card', () => {
    expect(items[CARTA_DROSERA].itemTypeId).toBe(6);
    expect(items[CARTA_DROSERA].itemSubTypeId).toBe(0);
    // The description says "Classes: Arma" rather than the usual "Equipa em:" line.
    expect(items[CARTA_DROSERA].compositionPos).toBe(CardPosition.Weapon);
  });

  it('grants CRIT à distância +15, and nothing else', () => {
    expect(items[CARTA_DROSERA].script).toEqual({ criRange: ['15'] });
  });

  it('reaches the engine through the weapon socket', () => {
    const without = bonusOf(BOW);
    const withCard = bonusOf(BOW, CARTA_DROSERA);

    expect((withCard['criRange'] || 0) - (without['criRange'] || 0)).toBe(15);
  });

  it('never lands on `cri`, which the skill crit rate reads', () => {
    const withCard = bonusOf(BOW, CARTA_DROSERA);

    expect(withCard['cri'] ?? 0).toBe(0);
  });

  it('carries the magnitude its own pt-BR line prints', () => {
    const description = (latam[CARTA_DROSERA].description as string).replace(/\^[0-9a-fA-F]{6}/g, '');

    expect(description).toContain('CRIT a distância +15');
  });
});

describe('the criRange key is only ever these two items', () => {
  it('no other item.json record claims it', () => {
    // A third one would mean either a new client line or a mis-mapped phrase: the key means
    // "ranged basic attack only", and reading it onto anything else overstates that build.
    const owners = Object.values(items)
      .filter((item: any) => item?.script?.criRange)
      .map((item: any) => item.id)
      .sort((a, b) => a - b);

    expect(owners).toEqual([4421, 420748]);
  });

  it('is the line the client actually prints on both', () => {
    const plain = (id: number) => (latam[id].description as string).replace(/\^[0-9a-fA-F]{6}/g, '');

    // The client spells it with and without the accent on "a"; both are the same bonus.
    expect(plain(4421)).toMatch(/CRIT a distância/);
    expect(plain(420748)).toMatch(/CRIT à distância/);
  });
});

describe('the melee/ranged gate on the bonus', () => {
  it('is the weapon, not the card — the card grants the key either way', () => {
    // getRangedCriRate() decides whether the key counts, so the equipment total carries it
    // even on a knife. The rate itself is asserted below.
    expect(bonusOf(KNIFE, CARTA_DROSERA)['criRange']).toBe(15);
  });
});
