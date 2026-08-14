import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createMainModel } from 'src/app/utils';
import { equipStatusOf, makeCalculator } from './make-calculator';

/**
 * The six "de Cinzas" helms and the three other headgears built the same way: a set whose
 * payload is "A cada N refinos da arma: Dano de [Perícia] +X%", plus a flat leg and
 * sometimes a cooldown cut.
 *
 * Every one of them had the flat leg registered and the per-weapon-refine steps missing,
 * so refining the partner weapon changed nothing. 401252 was the reported one; this spec
 * covers the whole family, since they were all written from the same template.
 *
 * The pt-BR description is the source of truth (CLAUDE.md).
 */

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));

/**
 * Equip `weapon` at `weaponRefine`, with the helm on or off, and hand back the summed
 * bonus. The helm sits at refine 0 so none of its own refine steps fire and whatever it
 * contributes is the set.
 */
function bonusOf(
  helm: number | null,
  weapon: number,
  weaponRefine: number,
  leftWeapon?: number,
): Record<string, number> {
  const db: Record<number, any> = {};
  for (const id of [helm, weapon, leftWeapon]) if (id !== undefined && id !== null) db[id] = { ...items[id] };

  const model: any = createMainModel();
  model.level = 200;
  if (helm !== null) {
    model.headUpper = helm;
    model.headUpperRefine = 0;
  }
  model.weapon = weapon;
  model.weaponRefine = weaponRefine;
  if (leftWeapon !== undefined) {
    model.leftWeapon = leftWeapon;
    model.leftWeaponRefine = weaponRefine;
  }

  return equipStatusOf(makeCalculator(db), model);
}

/**
 * What the set alone contributes to `key`: the same build with and without the helm.
 * Needed wherever the partner weapon feeds the same key (its own CRIT, ASPD, SP...),
 * which would otherwise be counted as if the set had granted it.
 */
function setDelta(helm: number, weapon: number, weaponRefine: number, key: string, leftWeapon?: number): number {
  const on = bonusOf(helm, weapon, weaponRefine, leftWeapon)[key] || 0;
  const off = bonusOf(null, weapon, weaponRefine, leftWeapon)[key] || 0;
  return on - off;
}

/**
 * [helm, weapon, "A cada 2 refinos da arma" skill ids, cooldown key -> seconds].
 * Each row is one Conjunto block of the helm's description.
 */
const SETS: [string, number, number, string[], [string, number] | null][] = [
  // 401251 Elmo Mortal de Cinzas — Gatunos
  ['401251 + Adaga de Cinzas', 401251, 13093, ['2284', '2054'], null],
  ['401251 + Arco de Cinzas', 401251, 18119, ['2288', '2418'], ['cd__2418', 2]],
  ['401251 + Katar de Cinzas', 401251, 28000, ['2036', '2029'], null],

  // 401252 Elmo Mágico de Cinzas — Magos (the reported one)
  ['401252 + Cajado de Cinzas', 401252, 1669, ['2449', '2447'], ['cd__2449', 1.5]],
  ['401252 + Cajado Duplo de Cinzas', 401252, 2023, ['2202', '2214'], null],

  // 401253 Elmo Divino de Cinzas — Noviços
  ['401253 + Cajado de Cinzas', 401253, 1669, ['2038', '2040'], null],
  ['401253 + Maça de Cinzas', 401253, 16028, ['2054', '2327'], null],
  ['401253 + Punho de Cinzas', 401253, 1836, ['2336', '2518'], null],

  // 401254 Elmo Cobiçado de Cinzas — Mercadores
  ['401254 + Machado de Cinzas', 401254, 28100, ['2258', '2280'], ['cd__2280', 1]],
  ['401254 + Maça de Cinzas', 401254, 16028, ['2481', '2477'], null],

  // 401255 Elmo Bravio de Cinzas — Espadachins
  ['401255 + Grande Espada de Cinzas', 401255, 21009, ['2006', '2002'], ['cd__2006', 1]],
  ['401255 + Lança de Cinzas', 401255, 1438, ['2323', '2310'], ['cd__2323', 2]],
  ['401255 + Lança Dupla de Cinzas', 401255, 1496, ['2308', '2004'], null],

  // 401256 Elmo Certeiro de Cinzas — Arqueiros
  ['401256 + Arco de Cinzas', 401256, 18119, ['2233', '2236'], ['cd__2233', 2.5]],
  ['401256 + Adaga de Cinzas', 401256, 13093, ['2239'], null],
  ['401256 + Chicote de Cinzas', 401256, 1988, ['2418', '2426'], ['cd__2418', 2]],
  ['401256 + Violino de Cinzas', 401256, 1933, ['2418', '2426'], ['cd__2418', 2]],
];

describe.each(SETS)('%s', (_label, helm, weapon, skillIds, cooldown) => {
  it('adds 5% per 2 weapon refines to each skill in the set', () => {
    const at = (refine: number) => skillIds.map((id) => bonusOf(helm, weapon, refine)[id] || 0);

    expect(at(0)).toEqual(skillIds.map(() => 0));
    expect(at(1)).toEqual(skillIds.map(() => 0));
    expect(at(2)).toEqual(skillIds.map(() => 5));
    expect(at(9)).toEqual(skillIds.map(() => 20));
    expect(at(10)).toEqual(skillIds.map(() => 25));
  });

  it('grants nothing without the partner weapon', () => {
    // Carta Cavaleiro Branco's staff/dagger are never the partner of every helm at once;
    // a bare Katar Rubi stands in for "some other weapon".
    const bonus = bonusOf(helm, 28007, 10);
    for (const id of skillIds) expect(bonus[id] || 0).toBe(0);
  });

  if (cooldown) {
    const [key, seconds] = cooldown;
    it(`cuts ${seconds}s off ${key} regardless of refine`, () => {
      expect(bonusOf(helm, weapon, 0)[key]).toBe(seconds);
    });
  }
});

describe('19249 Chapéu Símbolo da Magia — [Mikatsuki] + [Adaga Raksasa]', () => {
  // "A cada refino de cada arma: Conjuração variável -1%.
  //  A cada 2 refinos das armas: Dano de [Pétalas Flamejantes] [Lança Congelante] e
  //  [Lâmina de Vento] +5%." — the only one of the helm's three sets that was missing.
  const NINPOU = ['534', '537', '540'];
  const dualAt = (refine: number) => bonusOf(19249, 13078, refine, 13076);

  it('adds 5% per 2 refines summed across both weapons', () => {
    expect(NINPOU.map((id) => dualAt(0)[id] || 0)).toEqual([0, 0, 0]);
    // 5 + 5 = 10 summed refine -> floor(10/2) x 5
    expect(NINPOU.map((id) => dualAt(5)[id] || 0)).toEqual([25, 25, 25]);
  });

  it('cuts 1% variable cast per refine of each weapon', () => {
    expect(setDelta(19249, 13078, 0, 'vct', 13076)).toBe(0);
    expect(setDelta(19249, 13078, 5, 'vct', 13076)).toBe(10); // 5 + 5 summed
  });

  it('leaves the two sets that already worked alone', () => {
    expect(setDelta(19249, 1654, 10, '2449')).toBe(25); // [Cajado Mental] -> Onda Psíquica
    expect(setDelta(19249, 2004, 10, '2212')).toBe(50); // [Kronos] -> Chamas de Hela
  });
});

describe('400528 Boina Escarlate-OS', () => {
  it('[Rutilus-OS]: 3% Fire magic per 2 weapon refines', () => {
    expect(bonusOf(400528, 26151, 0)['m_my_element_fire'] || 0).toBe(0);
    expect(bonusOf(400528, 26151, 10)['m_my_element_fire']).toBe(15);
  });

  it('[Rapieira-OS]: 4% Chamas de Hela per 2 weapon refines', () => {
    expect(bonusOf(400528, 13493, 0)['2212'] || 0).toBe(0);
    expect(bonusOf(400528, 13493, 10)['2212']).toBe(20);
  });

  it('adds the +11 magic damage vs Small and Medium that was also missing', () => {
    const at = (refine: number) => {
      const model: any = createMainModel();
      model.level = 200;
      model.headUpper = 400528;
      model.headUpperRefine = refine;
      return equipStatusOf(makeCalculator({ 400528: { ...items[400528] } }), model);
    };

    expect([at(10)['m_size_s'] || 0, at(10)['m_size_m'] || 0]).toEqual([0, 0]);
    expect([at(11)['m_size_s'], at(11)['m_size_m']]).toEqual([15, 15]);
  });
});

describe('401147 Chapéu de Kiwawa — the five [Olho de ...] sets', () => {
  // Each snake eye is a different weapon; none of the five sets was registered.
  it('[Olho de Anaconda] 28242: SP +2%, and -1.5s Tiro Neutralizante with the weapon at +10', () => {
    expect(setDelta(401147, 28242, 0, 'spPercent')).toBe(2);
    expect(setDelta(401147, 28242, 9, 'cd__2554')).toBe(0);
    expect(setDelta(401147, 28242, 10, 'cd__2554')).toBe(1.5);
  });

  it('[Olho de Cobra-Real] 28240: CRIT +4 and crit damage +3% per 2 weapon refines', () => {
    expect(setDelta(401147, 28240, 10, 'cri')).toBe(20);
    expect(setDelta(401147, 28240, 10, 'criDmg')).toBe(15);
  });

  it('[Olho de Píton] 28243: ASPD +3% per 2 refines, -3s Lançar Míssil at +10', () => {
    expect(setDelta(401147, 28243, 10, 'aspdPercent')).toBe(15);
    expect(setDelta(401147, 28243, 10, 'cd__2566')).toBe(3);
  });

  it('[Olho de Mamba Negra] 28241: perfect dodge +3 per 2 refines, 15% vs Normal at +10', () => {
    expect(setDelta(401147, 28241, 10, 'perfectDodge')).toBe(15);
    expect(setDelta(401147, 28241, 10, 'subclass_normal')).toBe(15);
  });

  it('[Olho de Víbora] 13146: +3% vs bosses per 2 refines, 15% resistance at +10', () => {
    expect(setDelta(401147, 13146, 10, 'p_class_boss')).toBe(15);
    expect(setDelta(401147, 13146, 10, 'subclass_boss')).toBe(15);
  });
});
