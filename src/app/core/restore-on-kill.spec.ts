import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PetLoyalty } from 'src/app/constants/pet-loyalty';
import { createMainModel } from 'src/app/utils';
import { equipStatusOf, makeCalculator } from './__tests__/make-calculator';
import { ACESSORIO_E, ARMADURA, CALCADO, CAPA, ELMO, ITEM_DB, wornBonus } from './__tests__/worn-bonus';

/**
 * The flat "Ao derrotar monstros: Regenera N de HP/SP" line — `hpRestoreOnKill` /
 * `spRestoreOnKill`, in HP (SP) per kill.
 *
 * The keys arrived with 490863 Moeda Lançável (accessory-side-bonus.spec.ts), and the 55
 * other records carrying the line were swept after it (tracker
 * simulador-recuperacao-de-hp-sp-ao-derrotar-monstros-em-outros-36-itens — the card counted
 * 36; a scan of the pt-BR descriptions found 55). Every number below is read off the
 * item's own pt-BR description.
 *
 * Both keys are DISPLAY ONLY, held to the sustain family's terms by healing-stats.spec.ts.
 * The clause's trigger ("com ataques físicos corpo a corpo", "da raça Peixe") is not a
 * magnitude and stays in the description, so none of it is asserted here.
 */

const HP = 'hpRestoreOnKill';
const SP = 'spRestoreOnKill';
const read = (bonus: Record<string, number>) => [bonus[HP] ?? 0, bonus[SP] ?? 0];

describe('plain lines', () => {
  const weapons: [number, string, number, number][] = [
    [1182, 'Comedor Sangrento', 100, 0],
    [1477, 'Lança Espectral', 50, 0],
    [1479, 'Lança Espectral (second record)', 50, 0],
    [1369, 'Guilhotina', 0, 20],
    [1528, 'Grande Cruz', 0, 3],
    [1540, 'Grande Cruz (second record)', 0, 3],
    [1559, 'Herança do Dragão', 0, 10],
    [1919, 'Contra-Baixo', 0, 3],
    [16029, 'Cruz Nobre', 0, 12],
  ];
  it.each(weapons)('weapon %i %s: %i HP, %i SP', (weapon, _name, hp, sp) => {
    expect(read(wornBonus({ weapon }))).toEqual([hp, sp]);
  });

  const headgear: [number, string, number, number][] = [
    [5341, 'Boneca de Sofia', 50, 0],
    [5671, 'Boneca da Vaidade', 0, 2],
    [5944, 'Disfarce Suspeito', 100, 5],
    [18848, 'Presilha de Rosas', 100, 0],
    [18849, 'Laço da Celine', 200, 0],
    [401250, 'Ferramentas Agrícolas', 150, 15],
  ];
  it.each(headgear)('headgear %i %s: %i HP, %i SP', (headUpper, _name, hp, sp) => {
    expect(read(wornBonus({ headUpper }))).toEqual([hp, sp]);
  });

  it('boot 1973 Botas da Bruxa do Mar: 5 SP', () => {
    expect(read(wornBonus({ boot: 1973 }))).toEqual([0, 5]);
  });

  it('accessory 2983 Broche Demoníaco: 2 SP, next to its natural-regen set lines', () => {
    expect(read(wornBonus({ accRight: 2983 }))).toEqual([0, 2]);
  });

  const cards: [number, string, number, number][] = [
    [4158, 'Carta Exterminador', 100, 0],
    [4279, 'Carta Deletério', 0, 10],
    [4435, 'Carta Massacre', 50, 0],
    [4637, 'Carta Legião Imortal', 50, 5],
    [4647, 'Carta Osíris Espacial', 300, 0],
    [4329, 'Carta Fendark', 0, 5],
    [4165, 'Carta Ferrão', 0, 5],
    [4167, 'Carta Nereida', 0, 5],
    [4180, 'Carta Furador', 0, 5],
    [4182, 'Carta Diabolik', 0, 5],
    [4274, 'Carta Zumbi Mestre', 0, 5],
    [4289, 'Carta Lagarta', 0, 5],
    [4307, 'Carta Encouraçado', 0, 5],
    [4308, 'Carta Trilobita', 0, 5],
    [4316, 'Carta Anjo Fajuto', 0, 5],
  ];
  it.each(cards)('card %i %s: %i HP, %i SP', (armorCard, _name, hp, sp) => {
    expect(read(wornBonus({ armor: ARMADURA, armorCard }))).toEqual([hp, sp]);
  });

  it('the existing natural-regen lines on those records are untouched', () => {
    expect(wornBonus({ armor: ARMADURA, armorCard: 4158 }).hpRecovRate).toBe(-100);
    expect(wornBonus({ armor: ARMADURA, armorCard: 4637 }).spRecovRate).toBe(-100);
  });
});

describe('refine steps: "A cada 2 refinos"', () => {
  it('4605 Carta Cavaleiro Desmorto: 200 HP, +10 per 2 refines of the armor', () => {
    const at = (armorRefine: number) => read(wornBonus({ armor: ARMADURA, armorRefine, armorCard: 4605 }));
    expect(at(0)).toEqual([200, 0]);
    expect(at(1)).toEqual([200, 0]);
    expect(at(2)).toEqual([210, 0]);
    expect(at(9)).toEqual([240, 0]);
  });

  it('4606 Carta Cavaleira Desmorta: 20 SP, +1 per 2 refines of the garment', () => {
    const at = (garmentRefine: number) => read(wornBonus({ garment: CAPA, garmentRefine, garmentCard: 4606 }));
    expect(at(0)).toEqual([0, 20]);
    expect(at(10)).toEqual([0, 25]);
  });

  it('26007 Lança Espectral Ilusional: 50 HP flat, 1 SP per 2 refines', () => {
    expect(read(wornBonus({ weapon: 26007, weaponRefine: 1 }))).toEqual([50, 0]);
    expect(read(wornBonus({ weapon: 26007, weaponRefine: 10 }))).toEqual([50, 5]);
  });
});

describe('refine thresholds', () => {
  it('27015 Carta Robô Reparador Turbo: 30 HP / 3 SP, plus 10 / 1 from +7', () => {
    const at = (headUpperRefine: number) => read(wornBonus({ headUpper: ELMO, headUpperRefine, headUpperCard: 27015 }));
    expect(at(6)).toEqual([30, 3]);
    expect(at(7)).toEqual([40, 4]);
  });

  it('550200 Cetro Xamânico: nothing below +7, 150 SP from +7', () => {
    expect(read(wornBonus({ weapon: 550200, weaponRefine: 6 }))).toEqual([0, 0]);
    expect(read(wornBonus({ weapon: 550200, weaponRefine: 7 }))).toEqual([0, 150]);
  });

  it.each([20802, 20803, 20804, 20805, 20806, 20807, 20808, 20809, 20811])(
    'Mochila de Amistr %i: nothing at +8, 3 SP from +9',
    (garment) => {
      expect(read(wornBonus({ garment, garmentRefine: 8 }))).toEqual([0, 0]);
      expect(read(wornBonus({ garment, garmentRefine: 9 }))).toEqual([0, 3]);
    },
  );
});

describe('base level: "Nv. base 100 ou mais"', () => {
  it.each([401205, 401206])('%i Chapéu / Tiara Carnavalesca: nothing at 99, 100 HP / 10 SP at 100', (headUpper) => {
    expect(read(wornBonus({ headUpper, level: 99 }))).toEqual([0, 0]);
    expect(read(wornBonus({ headUpper, level: 100 }))).toEqual([100, 10]);
  });
});

describe('pet: 9068 Ovo de Unicórnio, "Na Lealdade Alta"', () => {
  const egg = (petLoyalty: PetLoyalty) =>
    read(
      equipStatusOf(makeCalculator({ 9068: { ...ITEM_DB[9068] } }), {
        ...createMainModel(),
        level: 200,
        pet: 9068,
        petLoyalty,
      }),
    );

  it('pays 150 HP / 15 SP at Alta', () => {
    expect(egg(PetLoyalty.Alta)).toEqual([150, 15]);
  });

  it('pays nothing at Normal', () => {
    expect(egg(PetLoyalty.Normal)).toEqual([0, 0]);
  });
});

describe('enchant stone: 6745 Pedra de Melhora de SP 1 (Baixo)', () => {
  it('pays 1 SP from the costume lower enchant', () => {
    const bonus = equipStatusOf(makeCalculator({ 6745: { ...ITEM_DB[6745] } }), {
      ...createMainModel(),
      level: 200,
      costumeEnchantLower: 6745,
    });
    expect(read(bonus)).toEqual([0, 1]);
  });
});

describe('sets', () => {
  describe('Competidores with the Boné Maratonista', () => {
    it('420821 Competidor Bebê Selvagem: nothing alone, 500 HP / 50 SP with Rebelde 19202', () => {
      expect(read(wornBonus({ headLower: 420821 }))).toEqual([0, 0]);
      expect(read(wornBonus({ headLower: 420821, headUpper: 19202 }))).toEqual([500, 50]);
    });

    it('420821 with Musical 19200 pays the damage-conversion set instead, not the regen', () => {
      const bonus = wornBonus({ headLower: 420821, headUpper: 19200 });
      expect(read(bonus)).toEqual([0, 0]);
      expect(bonus.hpDrain).toBe(8);
      expect(bonus.spDrain).toBe(4);
    });

    it('420822 Competidor Lunático: nothing alone, 500 HP / 50 SP with Estelar 19396', () => {
      expect(read(wornBonus({ headLower: 420822 }))).toEqual([0, 0]);
      expect(read(wornBonus({ headLower: 420822, headUpper: 19396 }))).toEqual([500, 50]);
      expect(read(wornBonus({ headLower: 420822, headUpper: 19202 }))).toEqual([0, 0]);
    });

    it('420820 Competidor Poring: nothing alone, 100 SP with Arcano 19193', () => {
      expect(read(wornBonus({ headLower: 420820 }))).toEqual([0, 0]);
      expect(read(wornBonus({ headLower: 420820, headUpper: 19193 }))).toEqual([0, 100]);
    });
  });

  it('4436 Carta Zumbi Dilacerado: nothing alone, 2 SP with Carta Massacre 4435', () => {
    const alone = wornBonus({ accLeft: ACESSORIO_E, accLeftCard: 4436 });
    const withMassacre = wornBonus({ accLeft: ACESSORIO_E, accLeftCard: 4436, boot: CALCADO, bootCard: 4435 });
    expect(read(alone)).toEqual([0, 0]);
    // Massacre's own 50 HP rides along; the set adds only the SP.
    expect(read(withMassacre)).toEqual([50, 2]);
  });

  it('20756 Sobrepeliz de Preamar: nothing alone, 10 SP with Protetor de Preamar 19026', () => {
    expect(read(wornBonus({ garment: 20756 }))).toEqual([0, 0]);
    expect(read(wornBonus({ garment: 20756, headUpper: 19026 }))).toEqual([0, 10]);
  });
});

describe('every record with the line carries the key', () => {
  const latam = JSON.parse(readFileSync('src/assets/demo/data/latam-items.json', 'utf8'));
  const strip = (s: string) => s.replace(/\^[0-9a-fA-F]{6}/g, '').trim();
  const RECOVERY = /\b(regenera|recupera)\b.*\bde (HP|SP)\b/i;

  /** Ids whose description carries the line but which have no record to carry the key. */
  const NOT_IN_DB = [4932]; // Melhora de SP 1

  const withLine = Object.entries<any>(latam)
    .filter(([, v]) => {
      const lines = String(v.description ?? '').split('\n').map(strip);
      return lines.some(
        (line, i) =>
          /derrotar/i.test(line) &&
          (RECOVERY.test(line) || (line.endsWith(':') && RECOVERY.test(lines[i + 1] ?? ''))),
      );
    })
    .map(([id]) => Number(id));

  it('finds the whole family, so the sweep below is not vacuous', () => {
    expect(withLine.length).toBe(57);
  });

  it('none of them is left without hpRestoreOnKill or spRestoreOnKill', () => {
    const missing = withLine.filter((id) => {
      if (NOT_IN_DB.includes(id)) return false;
      const script = ITEM_DB[id]?.script ?? {};
      return !(HP in script) && !(SP in script);
    });
    expect(missing).toEqual([]);
  });

  it('4585 Carta Mangkukulam is not in the family: its kill line drains the wearer', () => {
    // "Drena 666 de HP do usuário" is a cost, not a recovery — a negative store would
    // make the "Recupera HP ao derrotar" total read backwards.
    expect(withLine).not.toContain(4585);
    expect(ITEM_DB[4585]?.script?.[HP]).toBeUndefined();
  });
});
