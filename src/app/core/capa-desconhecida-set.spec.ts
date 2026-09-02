import { SuperNovice } from 'src/app/jobs';
import { ITEM_DB, wornBonus } from './__tests__/worn-bonus';

/**
 * The six Capas Desconhecidas (480926-480931) and their Bota Desconhecida sets.
 *
 * Reported by BELLSJF (tracker DSwsiJM1Usa2NnQUXDjL) as "ITEM NOVO QUE CHEGOU NO OVAL
 * HOJE": the capes arrived with the 01/09/2026 client update and had no record, so the
 * boots — which were already in the DB — had a set with nothing to pair with.
 *
 * Shape is one generation of the Manto Temporal (20963-20968) family: a per-2-refine
 * stat, a per-4-refine size bonus, one +7 clause of its own, and the same
 * "Ignora 20% da DEF e DEFM das raças X e Y" at +9 with "+10% adicional" at +11 — which
 * those records encode as p_pene_race_* AND m_pene_race_*, additively. Followed here.
 *
 * Boot ids: FOR 470071 · DES 470072 · VIT 470073 · INT 470074 · AGI 470076 · SOR 470077.
 */

const CAPES = {
  FOR: { cape: 480926, boot: 470071 },
  AGI: { cape: 480927, boot: 470076 },
  VIT: { cape: 480928, boot: 470073 },
  INT: { cape: 480929, boot: 470074 },
  DES: { cape: 480930, boot: 470072 },
  SOR: { cape: 480931, boot: 470077 },
} as const;

const worn = (opts: { cape: number; garmentRefine?: number; boot?: number; bootRefine?: number }) =>
  wornBonus({
    garment: opts.cape,
    garmentRefine: opts.garmentRefine ?? 0,
    boot: opts.boot,
    bootRefine: opts.bootRefine,
    cls: new SuperNovice(),
  });

const stat = (t: Record<string, number>, key: string) => t[key] ?? 0;

describe('Capas Desconhecidas — structural fields', () => {
  it.each(Object.entries(CAPES))('%s is a level-100 garment with one card slot', (_stat, { cape }) => {
    const r = ITEM_DB[cape];
    expect(r, `${cape} missing from item.json`).toBeDefined();
    expect(r.itemTypeId).toBe(2);
    expect(r.itemSubTypeId).toBe(515); // Garment
    expect(r.location).toBe('Garment');
    expect(r.slots).toBe(1);
    expect(r.defense).toBe(40);
    expect(r.weight).toBe(50);
    expect(r.requiredLevel).toBe(100);
  });
});

describe('The race penetration shared by all six', () => {
  // "Refino +9 ou mais: Ignora 20% da DEF e DEFM das raças Amorfo e Humanoide."
  // "Refino +11 ou mais: Ignora 10% ... adicional."  -> the tiers add.
  const KEYS = ['p_pene_race_formless', 'p_pene_race_demihuman', 'm_pene_race_formless', 'm_pene_race_demihuman'];

  it.each(Object.entries(CAPES))('%s: 0 below +9, 20 at +9, 30 at +11', (_stat, { cape }) => {
    const at8 = worn({ cape, garmentRefine: 8 });
    const at9 = worn({ cape, garmentRefine: 9 });
    const at11 = worn({ cape, garmentRefine: 11 });

    for (const key of KEYS) {
      expect(stat(at8, key), `${key} at +8`).toBe(0);
      expect(stat(at9, key), `${key} at +9`).toBe(20);
      expect(stat(at11, key), `${key} at +11`).toBe(30);
    }
  });
});

describe('Capa Desconhecida FOR 480926', () => {
  it('scales ATQ every 2 refines and the size bonus every 4', () => {
    expect(stat(worn({ cape: 480926, garmentRefine: 9 }), 'atk')).toBe(40); // floor(9/2) * 10
    expect(stat(worn({ cape: 480926, garmentRefine: 9 }), 'atkPercent')).toBe(8); // floor(9/2) * 2
    expect(stat(worn({ cape: 480926, garmentRefine: 9 }), 'p_size_all')).toBe(10); // floor(9/4) * 5
  });

  it('gives Precisão perfeita +30 from +7 only', () => {
    // The total starts at DEFAULT_PERFECT_HIT (5), so the item's contribution is the delta.
    expect(stat(worn({ cape: 480926, garmentRefine: 6 }), 'perfectHit')).toBe(5);
    expect(stat(worn({ cape: 480926, garmentRefine: 7 }), 'perfectHit')).toBe(35);
  });
});

describe('Each cape\'s own +7 clause', () => {
  it('AGI: Dano físico +7%', () => {
    expect(stat(worn({ cape: 480927, garmentRefine: 6 }), 'atkPercent')).toBe(0);
    expect(stat(worn({ cape: 480927, garmentRefine: 7 }), 'atkPercent')).toBe(7);
  });

  it('INT: Conjuração variável -10%', () => {
    expect(stat(worn({ cape: 480929, garmentRefine: 6 }), 'vct')).toBe(0);
    expect(stat(worn({ cape: 480929, garmentRefine: 7 }), 'vct')).toBe(10);
  });

  it('SOR: Velocidade de ataque +10%', () => {
    expect(stat(worn({ cape: 480931, garmentRefine: 6 }), 'aspdPercent')).toBe(0);
    expect(stat(worn({ cape: 480931, garmentRefine: 7 }), 'aspdPercent')).toBe(10);
  });

  it('VIT scales ATQ and ATQM together, and both size bonuses', () => {
    const at8 = worn({ cape: 480928, garmentRefine: 8 });
    expect(stat(at8, 'atk')).toBe(40);
    expect(stat(at8, 'matk')).toBe(40);
    expect(stat(at8, 'p_size_all')).toBe(10);
    expect(stat(at8, 'm_size_all')).toBe(10);
  });
});

describe('Conjunto [Bota Desconhecida]', () => {
  it('FOR: ATQ +50 and POD +7 with the boot, nothing without it', () => {
    const alone = worn({ cape: 480926 });
    const set = worn({ cape: 480926, boot: 470071 });

    expect(stat(alone, 'pow')).toBe(0);
    expect(stat(set, 'pow')).toBe(7);
    expect(stat(set, 'atk') - stat(alone, 'atk')).toBe(50);
  });

  it('does not fire with the wrong stat\'s boot', () => {
    expect(stat(worn({ cape: 480926, boot: 470073 }), 'pow')).toBe(0);
  });

  it('AGI: STA +7 and Vel.Atq +1', () => {
    const set = worn({ cape: 480927, boot: 470076 });
    expect(stat(set, 'sta')).toBe(7);
    expect(stat(set, 'aspd')).toBe(1);
  });

  it('VIT: SAB +7', () => expect(stat(worn({ cape: 480928, boot: 470073 }), 'wis')).toBe(7));

  it('INT: ATQM +50 and FEI +7', () => {
    const alone = worn({ cape: 480929 });
    const set = worn({ cape: 480929, boot: 470074 });
    expect(stat(set, 'spl')).toBe(7);
    expect(stat(set, 'matk') - stat(alone, 'matk')).toBe(50);
  });

  it('DES: ATQ +50 and CON +7', () => {
    const alone = worn({ cape: 480930 });
    const set = worn({ cape: 480930, boot: 470072 });
    expect(stat(set, 'con')).toBe(7);
    expect(stat(set, 'atk') - stat(alone, 'atk')).toBe(50);
  });

  it('SOR: T.CRÍT +5 and CRV +7', () => {
    const set = worn({ cape: 480931, boot: 470077 });
    expect(stat(set, 'cRate')).toBe(5);
    expect(stat(set, 'crt')).toBe(7);
  });

  it.each(Object.entries(CAPES))('%s: the boot\'s own +10 refine gives Conj. Fixa -0,5s', (_stat, { cape, boot }) => {
    expect(stat(worn({ cape, boot, bootRefine: 9 }), 'fct')).toBe(0);
    expect(stat(worn({ cape, boot, bootRefine: 10 }), 'fct')).toBe(0.5);
  });

  it('needs the boot for the fixed-cast cut, not just the refine', () => {
    expect(stat(worn({ cape: 480926, boot: 470073, bootRefine: 12 }), 'fct')).toBe(0);
  });
});
