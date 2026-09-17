import { ITEM_DB, wornBonus } from './__tests__/worn-bonus';

/**
 * The seven "-LT" headgears built to pair with the upgraded OSAD weapons, checked against
 * the pt-BR client text that arrived with the 0.1.129 ragassets sync (before it the client
 * shipped only a flavour line, and the records were built from the Thai description).
 *
 * All seven share a body: ATQ or ATQM +20 a cada 2 refinos, conjuração variável -15% at +7,
 * a +20% damage line at +9, and conjuração fixa -0,2s plus +20% against Pequeno e Médio at
 * a last tier. That last tier is +10 on Tiara Oracular-LT and +11 on the other six — the
 * records had +10 on all seven, copied from the Thai text.
 *
 * Each also names three OSAD weapons as set partners. Those clauses used to match the
 * partner by English name; they now use EQUIP_ID, and every set line below was asserted
 * against the name-matched records first. Two lines were wrong and are fixed here: Boina
 * Listrada-LT's AC-B44-OSAD set scaled ranged damage where the text scales [Disparo Triplo].
 */

const WEAPON_REFINE = 10; // five "a cada 2 refinos da arma" steps

const stat = (t: Record<string, number>, key: string) => t[key] ?? 0;

/** What the set adds: hat and weapon together, minus each worn alone. */
const setDelta = (hat: number, weapon: number, key: string, hatRefine = 0) => {
  const both = wornBonus({ headUpper: hat, headUpperRefine: hatRefine, weapon, weaponRefine: WEAPON_REFINE });
  const hatOnly = wornBonus({ headUpper: hat, headUpperRefine: hatRefine });
  const weaponOnly = wornBonus({ weapon, weaponRefine: WEAPON_REFINE });
  const none = wornBonus({});
  return stat(both, key) - stat(hatOnly, key) - stat(weaponOnly, key) + stat(none, key);
};

const hat = (id: number, refine: number) => wornBonus({ headUpper: id, headUpperRefine: refine });

type SetLine = [partner: number, partnerName: string, key: string, value: number];

interface Tiara {
  id: number;
  name: string;
  physical: boolean;
  /** The +9 damage lines. */
  nine: string[];
  /** Refine of the fixed-cast / size tier. */
  lastTier: number;
  sets: SetLine[];
}

const TIARAS: Tiara[] = [
  {
    id: 400261, name: 'Tiara Oracular-LT', physical: true, nine: ['range'], lastTier: 10,
    sets: [
      [560034, 'Incendiária-OSAD', 'cd__2332', 1], // Recarga de [Explosão Espiritual] -1s
      [560034, 'Incendiária-OSAD', 'range', 20], // +4% a cada 2 refinos da arma
      [810013, 'HR-S55-OSAD', 'range', 10],
      [810013, 'HR-S55-OSAD', '2571', 25], // [Execução] +5% a cada 2
      [590043, 'Safira-OSAD', 'vct', 10],
      [590043, 'Safira-OSAD', '490', 25], // [Bomba Ácida] +5% a cada 2
    ],
  },
  {
    id: 400262, name: 'Tiara Venenosa-LT', physical: false, nine: ['m_my_element_all'], lastTier: 11,
    sets: [
      [500051, 'Rapieira-OSAD', 'cd__2321', 1], // [Luz da Criação]
      [500051, 'Rapieira-OSAD', '2321', 35],
      [550075, 'Rutilus-OSAD', 'cd__2449', 1], // [Onda Psíquica]
      [550075, 'Rutilus-OSAD', '2449', 35],
      [590044, 'Ultio-OSAD', 'm_my_element_holy', 7],
      [590044, 'Ultio-OSAD', '2038', 25], // [Judex]
    ],
  },
  {
    id: 400263, name: 'Coroa Oriental-LT', physical: false, nine: ['m_my_element_all'], lastTier: 11,
    sets: [
      [510066, 'Kuroiro-OSAD', 'm_my_element_water', 7],
      [510066, 'Kuroiro-OSAD', 'm_my_element_wind', 7],
      [510066, 'Kuroiro-OSAD', 'm_my_element_fire', 7],
      [510066, 'Kuroiro-OSAD', '534', 25], // [Pétalas Flamejantes]
      [510066, 'Kuroiro-OSAD', '537', 25], // [Lança Congelante]
      [510066, 'Kuroiro-OSAD', '540', 25], // [Lâmina de Vento]
      [500051, 'Rapieira-OSAD', 'matk', 70],
      [500051, 'Rapieira-OSAD', '2212', 35], // [Chamas de Hela]
      [550075, 'Rutilus-OSAD', 'matk', 70],
      [550075, 'Rutilus-OSAD', '2213', 25], // [Cometa]
      [550075, 'Rutilus-OSAD', '2211', 35], // [Meteoro Escarlate]
    ],
  },
  {
    id: 400264, name: 'Boina Listrada-LT', physical: true, nine: ['range'], lastTier: 11,
    sets: [
      [530031, 'Propulsora-OSAD', 'cd__2307', 0.5], // [Disparo Perfurante]
      [530031, 'Propulsora-OSAD', '2307', 25],
      [700055, 'MH-P89-OSAD', 'cd__2418', 0.5], // [Temporal de Flechas]
      [700055, 'MH-P89-OSAD', '2418', 25],
      [700056, 'AC-B44-OSAD', 'acd', 15],
      [700056, 'AC-B44-OSAD', '2288', 25], // [Disparo Triplo]
      [700056, 'AC-B44-OSAD', 'range', 0], // was wrongly registered here
    ],
  },
  {
    id: 400265, name: 'Cartola Mascarada-LT', physical: false, nine: ['m_my_element_all'], lastTier: 11,
    sets: [
      [590044, 'Ultio-OSAD', 'm_my_element_holy', 7],
      [590044, 'Ultio-OSAD', '2040', 25], // [Adoramus]
      [550076, 'Eletricauda-OSAD', 'cd__5028', 1], // [Meteoros de Nepeta]
      [550076, 'Eletricauda-OSAD', '5028', 25],
      [550075, 'Rutilus-OSAD', 'matk', 70],
      [550075, 'Rutilus-OSAD', '2602', 25], // [Espa]
      [550075, 'Rutilus-OSAD', '2604', 25], // [Eswhoo]
    ],
  },
  {
    id: 400266, name: 'Ignis-LT', physical: true, nine: ['range'], lastTier: 11,
    sets: [
      [620018, 'Blasti-OSAD', 'atk', 70],
      [620018, 'Blasti-OSAD', '2261', 25], // [Canhão]
      [590043, 'Safira-OSAD', 'atk', 70],
      [590043, 'Safira-OSAD', '2477', 25], // [Canhão de Prótons]
      [700054, 'Virtual-OSAD', 'cd__2233', 2.5], // [Tempestade de Flechas]
      [700054, 'Virtual-OSAD', '382', 25], // [Tiro Preciso]
    ],
  },
  {
    id: 400267, name: 'Quepe Chaveiro-LT', physical: true, nine: ['melee', 'range'], lastTier: 11,
    sets: [
      [610039, 'Meuchler-OSAD', 'atk', 70],
      [610039, 'Meuchler-OSAD', '2036', 35], // [Lâminas de Loki]
      [600028, 'Claymore-OSAD', 'cd__2006', 1], // [Impacto Flamejante]
      [600028, 'Claymore-OSAD', '2006', 35],
      [540051, 'Placa-Mãe-OSAD', 'atk', 70],
      [540051, 'Placa-Mãe-OSAD', '2592', 35], // [Explosão Solar]
    ],
  },
];

describe.each(TIARAS)('$id $name', ({ id, physical, nine, lastTier, sets }) => {
  const flat = physical ? 'atk' : 'matk';
  const sizePrefix = physical ? 'p_size' : 'm_size';

  it('is a level-170 Topo headgear of item level 2 with one slot', () => {
    const r = ITEM_DB[id];
    expect([r.location, r.itemLevel, r.slots, r.requiredLevel, r.defense, r.weight]).toEqual(['Upper', 2, 1, 170, 0, 10]);
  });

  it(`${flat} +20 a cada 2 refinos`, () => {
    expect(stat(hat(id, 1), flat)).toBe(0);
    expect(stat(hat(id, 7), flat)).toBe(60);
  });

  it('refino +7: conjuração variável -15%', () => {
    expect(stat(hat(id, 6), 'vct')).toBe(0);
    expect(stat(hat(id, 7), 'vct')).toBe(15);
  });

  it('refino +9: +20% damage', () => {
    for (const key of nine) {
      expect(stat(hat(id, 8), key), key).toBe(0);
      expect(stat(hat(id, 9), key), key).toBe(20);
    }
  });

  it(`refino +${lastTier}: conjuração fixa -0,2s, +20% against Pequeno e Médio`, () => {
    for (const key of ['fct', `${sizePrefix}_s`, `${sizePrefix}_m`]) {
      const expected = key === 'fct' ? 0.2 : 20;
      expect(stat(hat(id, lastTier - 1), key), `${key} at +${lastTier - 1}`).toBe(0);
      expect(stat(hat(id, lastTier), key), `${key} at +${lastTier}`).toBe(expected);
    }
  });

  it.each(sets)('set with %i %s: %s = %d', (partner, _name, key, value) => {
    expect(setDelta(id, partner, key)).toBeCloseTo(value);
  });

  it('pays no set line to a weapon it does not name', () => {
    const named = new Set(sets.map(([partner]) => partner));
    const stranger = TIARAS.flatMap((t) => t.sets.map(([p]) => p)).find((p) => !named.has(p));
    for (const [, , key] of sets) expect(setDelta(id, stranger, key), key).toBe(0);
  });

  it('names every partner by id', () => {
    const script = JSON.stringify(ITEM_DB[id].script);
    expect(script).not.toContain('EQUIP[');
    for (const [partner] of sets) expect(script).toContain(String(partner));
  });
});
