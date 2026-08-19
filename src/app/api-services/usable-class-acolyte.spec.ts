/**
 * Guards the pt-BR -> ClassName mapping of the Acolyte lineage in item.json.
 *
 * "Noviço" is the Acolyte in pt-BR; "Aprendiz" is the Novice. A batch of records had
 * "Noviços" translated as `Novice`, so 56 items — the Siege set among them — vanished
 * from every Acolyte-line picker (Priest/Monk and their evolutions) while showing up on
 * a class that cannot wear them. Reported by Luís: "Sapatos de Cerco e Manto de Cerco
 * sumiram".
 *
 * The sweep below is the ratchet: whenever the client's own class line names "Noviços",
 * the record has to carry `Acolyte`.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Cardinal, HyperNovice, Inquisitor } from 'src/app/jobs';
import { canUsedByClass } from 'src/app/utils/can-used-by-class';

const read = (file: string) => JSON.parse(readFileSync(join(process.cwd(), 'src/assets/demo/data', file), 'utf8'));

const items: Record<string, any> = read('item.json');
const latam: Record<string, any> = read('latam-items.json');

/** The client's "Classes: ..." line, stripped of its colour codes. */
const classLine = (id: string): string => {
  const match = /Classes: \^777777([^^]*)/.exec(latam[id]?.description ?? '');
  return match ? match[1] : '';
};

describe('usableClass and the Acolyte lineage', () => {
  it('gives Acolyte to every item whose class line names "Noviços"', () => {
    const missing = Object.keys(items).filter((id) => {
      const { usableClass } = items[id];
      if (!Array.isArray(usableClass) || usableClass.includes('all')) return false;
      const line = classLine(id);
      // "Todas, exceto ..." is a block-list; it never names the classes that can equip.
      if (!line || line.includes('exceto')) return false;
      return line.includes('Noviços') && !usableClass.includes('Acolyte');
    });

    expect(missing).toEqual([]);
  });

  it('keeps Novice only where the class line also names "Aprendizes"', () => {
    // 16014 "Maça do Éden III" is the one hand-widened record: its list enumerates the
    // 4th classes one by one and adds Novice/HyperNovice on top of a class line that
    // only names "Espadachins, Noviços, Mercadores". Left as found, not as a precedent.
    const handWidened = ['16014'];

    const wrong = Object.keys(items).filter((id) => {
      if (handWidened.includes(id)) return false;
      const { usableClass } = items[id];
      if (!Array.isArray(usableClass) || !usableClass.includes('Novice')) return false;
      const line = classLine(id);
      if (!line || line.includes('exceto')) return false;
      return line.includes('Noviços') && !line.includes('Aprendizes');
    });

    expect(wrong).toEqual([]);
  });

  it('lets the Acolyte line wear the Siege set', () => {
    // 2485 Sapatos de Cerco, 15048 Manto de Cerco: "Aprendizes, Magos, Noviços,
    // Espiritualistas e evoluções" — all four lineages, not three.
    for (const id of ['2485', '15048']) {
      expect(items[id].usableClass).toEqual(['Mage', 'Novice', 'Acolyte', 'SoulLinker']);
    }
  });

  it('offers the Siege set to the Acolyte line and the Batina to nobody else', () => {
    const siege = ['2485', '15048'].map((id) => items[id]);
    // 2327 Batina: "Noviços e evoluções", so the Novice line must not see it.
    const batina = items['2327'];

    for (const cls of [new Cardinal(), new Inquisitor()]) {
      const allowed = canUsedByClass(cls as any);
      expect(siege.every(allowed)).toBe(true);
      expect(allowed(batina)).toBe(true);
    }

    const hyperNovice = canUsedByClass(new HyperNovice() as any);
    expect(hyperNovice(batina)).toBe(false);
    // The Siege set does name "Aprendizes", so the Novice line keeps it.
    expect(siege.every(hyperNovice)).toBe(true);
  });
});

describe('Boina Alada', () => {
  it('carries both the slotless and the 1-slot re-issue', () => {
    expect(items['5170'].slots).toBe(0);
    expect(items['18755'].slots).toBe(1);
    // Same headgear, same effect: +10% resistance vs Demihuman and vs players.
    for (const id of ['5170', '18755']) {
      expect(items[id].script).toEqual({ subrace_demihuman: ['10'], subrace_player_human: ['10'] });
      expect(items[id].itemSubTypeId).toBe(512);
      expect(items[id].location).toBe('Upper');
    }
  });
});
