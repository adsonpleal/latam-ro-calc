import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Monster } from '../domain/monster';
import { MonsterModel } from '../models/monster.model';
import { monsterDamageReductionPercent, monsterDamageReductionTooltip } from './monster-damage-reduction';

/**
 * "Taking only N% of the damage dealt to it" — the attribute divine-pride publishes per
 * monster and `monster.json` carries as bits 512 (10%) and 1024 (1%) of `stats.attr`.
 *
 * Two things are pinned here. The **values**, which are data and want a list; and the
 * **purple tag** the shared battle monster card renders from it, which is the half no
 * other test can see. The template reads the property off `totalSummary.monster`, and
 * that object is a spread of `Monster.data` — so renaming the field on the model silently
 * empties the tag, which is exactly what happened when `mapDamageReduction` became
 * `damageReduction` on 18/09/2026. The binding check below is the ratchet against a repeat.
 *
 * The finding behind the Betelgeuse entries is in ShadowCross.betelgeuse-replay.spec.ts.
 */

const monsters = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));

const MONSTER_CARD_TEMPLATE =
  'src/app/layout/pages/ro-calculator/battle-hud/monster-card/battle-monster-card.component.html';

const dataOf = (id: number) => new Monster().setData(monsters[id] as MonsterModel).data;

describe('monsterDamageReductionPercent', () => {
  it('leaves an ordinary monster alone', () => {
    expect(monsterDamageReductionPercent(1002)).toBe(0); // Poring
    expect(monsterDamageReductionPercent(20996)).toBe(0); // Naght Sieger — Aliviar, nothing else
  });

  it('Varmundt\'s Biosphere: 90% on the field monsters, 99% on its four MVPs', () => {
    expect(monsterDamageReductionPercent(21548)).toBe(90); // Cornus of Prairie
    expect(monsterDamageReductionPercent(21578)).toBe(90); // Knight of Abyss in Death
    for (const mvp of [21555, 21563, 21571, 21579]) expect(monsterDamageReductionPercent(mvp)).toBe(99);
  });

  it('the EP19 instance MVPs: 99%, Aliviar on top', () => {
    expect(monsterDamageReductionPercent(20994)).toBe(99); // Betelgeuse
    expect(monsterDamageReductionPercent(21361)).toBe(99); // Twisted God Freyja
    expect(monsterDamageReductionPercent(21360)).toBe(99); // Schulang
  });

  it('reaches the target through Monster.data, which is what the UI reads', () => {
    expect(dataOf(20994).damageReduction).toBe(99);
    expect(dataOf(21548).damageReduction).toBe(90);
    expect(dataOf(21077).damageReduction).toBe(0); // a training dummy, which reduces nothing
    // Betelgeuse also casts Aliviar, so the card shows the picker as well as the tag.
    expect(dataOf(20994).hasRelieve).toBe(true);
  });
});

describe('the "Redução N%" tag', () => {
  it('says what fraction of the damage lands', () => {
    expect(monsterDamageReductionTooltip(99)).toContain('apenas 1%');
    expect(monsterDamageReductionTooltip(90)).toContain('apenas 10%');
  });

  /*
   * A string check, deliberately: the templates are typed `any` all the way down, so nothing
   * else fails when the property name behind the tag stops existing.
   */
  it('is bound to a property the model really has', () => {
    const data = dataOf(20994) as Record<string, unknown>;
    for (const template of [MONSTER_CARD_TEMPLATE]) {
      const html = readFileSync(template, 'utf8');
      const bindings = [...html.matchAll(/totalSummary[?.]*\.monster[?.]*\.(\w*[Rr]eduction\w*)/g)].map((m) => m[1]);
      expect(bindings.length, template).toBeGreaterThan(0);
      for (const property of new Set(bindings)) expect(data, `${template} binds ${property}`).toHaveProperty(property);
      expect(html, template).toContain('damageReductionTooltip');
    }
  });
});
