import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createMainModel } from 'src/app/utils';
import { equipStatusOf, makeCalculator } from './make-calculator';

/**
 * Conjunto blocks whose skill line was never registered, found by
 * tools/audit-skill-bonuses.mjs. Unlike the flat bonuses in flat-skill-bonuses.spec,
 * each of these needs its partner equipped, so the test equips the whole set.
 *
 * The partner side was checked first: the audit reports a row as COVERED when another
 * item already registers the same skill keyed to this one, and those were left alone —
 * registering both sides would double the bonus.
 */

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));

interface Worn { id: number; slot: string; refine?: number }

function bonusOf(worn: Worn[]): Record<string, number> {
  const db: Record<number, any> = {};
  for (const p of worn) db[p.id] = { ...items[p.id] };

  const model: any = createMainModel();
  model.level = 200;
  for (const p of worn) {
    model[p.slot] = p.id;
    model[`${p.slot}Refine`] = p.refine ?? 0;
  }

  return equipStatusOf(makeCalculator(db), model);
}

/** [label, the piece under test, the rest of the set, skill -> value]. */
const SETS: [string, Worn, Worn[], Record<string, number>][] = [
  ['1990 Microfone Floral + Bracelete Floral',
    { id: 1990, slot: 'weapon' }, [{ id: 2989, slot: 'accLeft' }], { 394: 200 }],

  ['2129 Bíblia de Exorcismo + Vara Sagrada',
    { id: 2129, slot: 'shield' }, [{ id: 1631, slot: 'weapon' }], { 79: 20 }],

  ['2677 Anel Espiritual + Rosário',
    { id: 2677, slot: 'accLeft' }, [{ id: 2626, slot: 'accRight' }], { 28: 50, 79: 30 }],

  ['15036 Armadura de Ur + Selo/Grevas/Manteau',
    { id: 15036, slot: 'armor' },
    [{ id: 2883, slot: 'accLeft' }, { id: 2475, slot: 'boot' }, { id: 2574, slot: 'garment' }],
    { 2004: 50 }],

  ['15038 Vestimenta dos Manuks + Anel/Botas/Capuz',
    { id: 15038, slot: 'armor' },
    [{ id: 2886, slot: 'accLeft' }, { id: 2477, slot: 'boot' }, { id: 2577, slot: 'garment' }],
    { 2022: 20 }],

  ['15110 Peça de FOR Suplementar + Peça de DES',
    { id: 15110, slot: 'armor' }, [{ id: 2995, slot: 'accLeft' }], { 2278: 100, cd__2278: 2 }],

  ['15111 Autopeça - Carburador + Motor/Exaustor/Acelerador',
    { id: 15111, slot: 'armor' },
    [{ id: 20733, slot: 'garment' }, { id: 2996, slot: 'accLeft' }, { id: 22044, slot: 'boot' }],
    { 2261: 50 }],

  ['20732 Peça de VIT Suplementar + Peça de FOR',
    { id: 20732, slot: 'garment' }, [{ id: 15110, slot: 'armor' }], { 2280: 25 }],

  ['28416 Amuleto Folha I + Doram básico',
    { id: 28416, slot: 'accLeft' },
    [{ id: 15126, slot: 'armor' }, { id: 20788, slot: 'garment' }, { id: 22083, slot: 'boot' }, { id: 28382, slot: 'accRight' }],
    { 5028: 100 }],

  ['28421 Amuleto Lebre III + Doram luxuoso',
    { id: 28421, slot: 'accLeft' },
    [{ id: 15156, slot: 'armor' }, { id: 20790, slot: 'garment' }, { id: 22085, slot: 'boot' }, { id: 28380, slot: 'accRight' }],
    { 5036: 200 }],

  ['420821 Competidor Bebê Selvagem + Boné Atirador',
    { id: 420821, slot: 'headLower' }, [{ id: 19199, slot: 'headUpper' }], { vct__2233: 100 }],
];

describe.each(SETS)('%s', (_label, piece, rest, expected) => {
  it('grants the set bonus with the whole set on', () => {
    const bonus = bonusOf([piece, ...rest]);
    for (const [key, value] of Object.entries(expected)) {
      expect(bonus[key], key).toBe(value);
    }
  });

  it('grants nothing with the piece alone', () => {
    const bonus = bonusOf([piece]);
    for (const key of Object.keys(expected)) expect(bonus[key] || 0, key).toBe(0);
  });
});

/**
 * Sets whose block also carries a penalty. Registering only the skill line would have
 * left the set pure upside, so the whole block went in and the penalty is asserted here
 * alongside the bonus.
 */
describe('sets registered with their penalties', () => {
  it('2377 Armadura de Elite: Mammonita +20% and -200% vs every other race', () => {
    const bonus = bonusOf([
      { id: 2377, slot: 'armor' }, { id: 2435, slot: 'boot' }, { id: 2538, slot: 'garment' },
    ]);
    expect(bonus['42']).toBe(20);
    expect(bonus['str']).toBe(3);
    expect(bonus['subrace_demon']).toBe(-200);
    expect(bonus['subrace_dragon']).toBe(-200);
    // Humano and Humanoide are the two the armor resists, and the set spares them — they
    // stay positive (the exact figure includes what the two partners grant themselves).
    expect(bonus['subrace_player_human']).toBeGreaterThan(0);
    expect(bonus['subrace_demihuman']).toBeGreaterThan(0);
  });

  it('2380 Manto do Médico: -50% Luz Divina cast and the same race penalty', () => {
    const bonus = bonusOf([
      { id: 2380, slot: 'armor' }, { id: 2437, slot: 'boot' }, { id: 2539, slot: 'garment' },
    ]);
    expect(bonus['vct__156']).toBe(50);
    expect(bonus['subrace_undead']).toBe(-200);
  });

  it('15043 Malha das Asas das Sombras: Bomba Relógio +20%, ASPD -7, ranged -30%', () => {
    const bonus = bonusOf([
      { id: 15043, slot: 'armor' }, { id: 2891, slot: 'accLeft' },
      { id: 2480, slot: 'boot' }, { id: 2581, slot: 'garment' },
    ]);
    expect(bonus['2239']).toBe(20);
    expect(bonus['aspd']).toBe(-7);
    expect(bonus['range']).toBe(-30);
    // The Sobrepeliz grants perfect dodge of its own, so only the set's share is checked.
    const without = bonusOf([
      { id: 2891, slot: 'accLeft' }, { id: 2480, slot: 'boot' }, { id: 2581, slot: 'garment' },
    ]);
    expect(bonus['perfectDodge'] - (without['perfectDodge'] || 0)).toBe(20);
  });
});

describe('470411 Botas de Cowboy', () => {
  const base = ['46', '524', '324', '316'];

  it('grants its four base skills 15% plus 2% per refine', () => {
    expect(base.map((s) => bonusOf([{ id: 470411, slot: 'boot' }])[s])).toEqual(base.map(() => 15));
    expect(base.map((s) => bonusOf([{ id: 470411, slot: 'boot', refine: 10 }])[s])).toEqual(base.map(() => 35));
  });

  it('[Arco Vigilante]: Tiro Preciso +15% once the refines sum to 18', () => {
    const at = (r: number) => bonusOf([
      { id: 470411, slot: 'boot', refine: r }, { id: 18145, slot: 'weapon', refine: r },
    ])['382'] || 0;

    expect(at(8)).toBe(0); // 16
    expect(at(9)).toBe(15); // 18
  });

  it('[Monokage]: cooldown at 12 summed refines, damage at 18', () => {
    const at = (r: number) => bonusOf([
      { id: 470411, slot: 'boot', refine: r }, { id: 28721, slot: 'weapon', refine: r },
    ]);

    expect(at(5)['cd__3006'] || 0).toBe(0);
    expect(at(6)['cd__3006']).toBe(1);
    expect(at(6)['3006'] || 0).toBe(0);
    expect(at(9)['3006']).toBe(15);
  });
});

describe('24592 Manopla Sombria de Apoio Químico', () => {
  // The set line "Dano de [Canhão de Prótons] +15%" was keyed to 2476, Tornado de
  // Carrinho — the skill of the *cooldown* line right below it. Only the damage key moved.
  it('keys the damage to Canhão de Prótons and the cooldown to Tornado de Carrinho', () => {
    const script = items[24592].script;
    expect(script['2477']).toBeDefined();
    expect(script['2476']).toBeUndefined();
    expect(script['cd__2476']).toBeDefined();
  });
});

describe('29671 Invocador (Capa)', () => {
  // Asserted on the data, not through the engine: the "Pedra" family carries
  // compositionPos null (153 of the 246 of them), so no card picker offers it and there
  // is no slot to equip it into. The entry still has to mirror its sibling for the day
  // that is fixed.
  it('keys [Lança Gateira] the same way as the [Cometas Lunáticos] beside it', () => {
    const script = items[29671].script;
    // Both clauses gate on Invocador (Topo), and both name its two generations: 29668 and
    // 25859, the client's re-issue of it. They used to be written differently — one by id,
    // one by name — and the name form only worked because a re-issue shares its
    // counterpart's English name. See costume-enchant-combo-migration.spec.ts.
    expect(script['5026']).toEqual(['EQUIP_ID[25859||29668]20']);
    expect(script['5036']).toEqual(['EQUIP_ID[25859||29668]20']);
  });
});

describe('16018 Maça do Julgamento Fortalecida', () => {
  // "Conjuração variável de [Magnus Exorcismus] [Esconjurar] [Adoramus] [Judex] e
  //  [Luz Divina] -50%." — the whole line was missing; only the Adoramus damage was there.
  const SET: Worn[] = [
    { id: 16018, slot: 'weapon' },
    { id: 2570, slot: 'garment' },
    { id: 15030, slot: 'armor' },
    { id: 2472, slot: 'boot' },
  ];

  it('cuts 50% variable cast on all five holy spells', () => {
    const bonus = bonusOf(SET);
    for (const key of ['vct__79', 'vct__77', 'vct__2040', 'vct__2038', 'vct__156']) {
      expect(bonus[key], key).toBe(50);
    }
  });

  it('grants none of it with the mace alone', () => {
    const bonus = bonusOf([{ id: 16018, slot: 'weapon' }]);
    for (const key of ['vct__79', 'vct__77', 'vct__2040', 'vct__2038', 'vct__156']) {
      expect(bonus[key] || 0, key).toBe(0);
    }
  });
});

describe('2039 Esfíngico Ilusional + Sobrevivente Ilusional', () => {
  const at = (weaponRefine: number, garmentRefine: number) =>
    bonusOf([
      { id: 2039, slot: 'weapon', refine: weaponRefine },
      { id: 20847, slot: 'garment', refine: garmentRefine },
    ]);

  it('grants Meteoro Escarlate +10% at any refine', () => {
    expect(at(0, 0)['2211']).toBe(10);
  });

  it('grants Chamas de Hela +40% only with both pieces at +7', () => {
    expect(at(7, 6)['2212'] || 0).toBe(0);
    expect(at(6, 7)['2212'] || 0).toBe(0);
    expect(at(7, 7)['2212']).toBe(40);
  });
});

describe('shadow sets that named two skills but registered one', () => {
  it('24622 Manopla Sombria de Kunai: Kunai Explosiva matches Turbilhão de Kunais', () => {
    const worn: Worn[] = [
      { id: 24622, slot: 'shadowWeapon', refine: 10 },
      { id: 24623, slot: 'shadowArmor', refine: 10 },
      { id: 24624, slot: 'shadowShield', refine: 10 },
    ];
    const withGlove = bonusOf(worn);
    const withoutGlove = bonusOf(worn.slice(1));

    // 24624 Malha Sombria de Kunai grants 3006 on its own, so compare the glove's own
    // contribution rather than the totals: the set must move both skills equally.
    expect(withGlove['3006'] - (withoutGlove['3006'] || 0)).toBe(withGlove['3007']);
    expect(withGlove['3007']).toBeGreaterThan(0);
  });

  it('24655 Manopla Sombria de Es: Espa matches Eswhoo', () => {
    const bonus = bonusOf([
      { id: 24655, slot: 'shadowWeapon', refine: 10 },
      { id: 24656, slot: 'shadowArmor', refine: 10 },
      { id: 24657, slot: 'shadowShield', refine: 10 },
    ]);
    expect(bonus['2602']).toBe(bonus['2604']);
    expect(bonus['2602']).toBeGreaterThan(0);
  });

  it('24631 Brinco Sombrio Kunoichi: the Kunoichi set grants its three spells', () => {
    const bonus = bonusOf([
      { id: 24631, slot: 'shadowEarring', refine: 10 },
      { id: 24632, slot: 'shadowPendant', refine: 10 },
      { id: 24633, slot: 'shadowBoot', refine: 10 },
    ]);
    for (const key of ['536', '542', '539']) expect(bonus[key], key).toBeGreaterThan(0);
  });
});
