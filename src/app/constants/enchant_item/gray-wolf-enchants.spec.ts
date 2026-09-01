import { describe, expect, it } from 'vitest';
import itemDb from '../../../assets/demo/data/item.json';
import latamDb from '../../../assets/demo/data/latam-items.json';
import { EnchantTable, getEnchants } from './_enchant_table';

/**
 * Enchant options for the whole Gray Wolf line — armour, garment, boots and accessories.
 *
 * Two things are pinned here. The pools, keyed by the pt-BR name the player sees, against
 * the published tables; and the guard that every orb a pool offers actually has a record in
 * item.json, because an aegisName with nothing behind it drops out of the dropdown silently.
 *
 * The code numbers the sockets the way the game does (4 down to 2), so the player-facing
 * "Slot 1" is `..._slot2` — this is why the gaps below were easy to miss.
 *
 * @see https://browiki.org/wiki/Equipamentos_Cinzentos
 */

const items = itemDb as Record<string, any>;
const latam = latamDb as Record<string, { name?: string }>;

/** aegisName -> the pt-BR name shown in the dropdown, so failures read like the table. */
const NAME_BY_AEGIS = new Map<string, string>(
  Object.entries(items)
    .filter(([, item]) => String(item.aegisName).startsWith('Wolf_Orb'))
    .map(([id, item]) => [item.aegisName as string, latam[id]?.name ?? item.name]),
);

/** The pt-BR names of a pool, with the shared "Orbe Lupino - " prefix trimmed off. */
function optionNames(aegisNames: string[]): string[] {
  return aegisNames.map((a) => (NAME_BY_AEGIS.get(a) ?? `<${a} missing from item.json>`).replace('Orbe Lupino - ', ''));
}

/** `Nome 1`, `Nome 2`, … — the tables are almost entirely levelled families. */
const levels = (count: number, ...names: string[]) =>
  names.flatMap((n) => Array.from({ length: count }, (_, i) => `${n} ${i + 1}`));

const STATS = ['FOR', 'DES', 'AGI', 'INT', 'VIT', 'SOR'];

// --- Armaduras: 450177 Traje do Lobo Cinzento and 450178 Veste do Lobo Cinzento ---------
// Reported twice on the same day, by Ted and anonymously: slots 1 and 2 offered no DEF and
// no DEFM. The six orbs were in item.json all along, commented out of both pools ever since
// the line was imported. Refletor 1-3 and Maré had no item.json record at all, so slot 1
// was four short as well.
const ARMOR_SLOT_1 = [
  ...levels(3, 'Refletor'),
  'Híbrido', 'Dragão', 'Rúnico', 'Lança', 'Guardião', 'Hoplita', 'Canhão', 'Domini',
  'Lenhador', 'Machado', 'Biologia', 'Física', 'Química', 'Lâminas', 'Loki', 'Duelista',
  'Ofensiva', 'Desejo', 'Triplo', 'Místico', 'Arcanista', 'Neutral', 'Tóxico', 'Psíquica',
  'Feitiço', 'Exorcismo', 'Judex', 'Gemini', 'Lutador', 'Espiritual', 'Pugilista', 'Bomba',
  'Atirador', 'Flecha', 'Ruído', 'Música', 'Temporal', 'Solar', 'Lunar', 'Estelar', 'Almas',
  'Espírito', 'Sombrio', 'Revólver', 'Granada', 'Espingarda', 'Ninpou', 'Togatana', 'Mahou',
  'Maré', 'Selva', 'Fauna',
];
const ARMOR_SLOT_2 = [...levels(3, ...STATS, 'DEF', 'DEFM', 'Artilheiro', 'Bárbaro', 'Mágico'), 'Pós'];
const ARMOR_SLOT_3 = levels(2, ...STATS, 'DEF', 'DEFM', 'Artilheiro', 'Bárbaro', 'Mágico');

// --- Capas: 480090 Sobrepeliz and 480091 Capa ------------------------------------------
// Luís reported slot 1 as incomplete: it offered only the three "Dano" orbs, while in game
// it also takes "Total" and "Espelho".
const GARMENT_SLOT_1 = levels(3, 'Total', 'Dano', 'Espelho');
const GARMENT_SLOT_2 = levels(3, 'Rapidez', 'Variável', 'Crítico', 'Precisão');
const GARMENT_SLOT_3 = levels(3, ...STATS);

// --- Calçados: 470087 Botas and 470088 Sapatos -----------------------------------------
const BOOT_SLOT_1 = ['Eternidade', 'Sortilégio', 'Astúcia', 'Superpoder', 'Lampejo', 'Fortuna'];
const BOOT_SLOT_2 = levels(3, 'Fixa', 'Estatura', 'Tamanho');
const BOOT_SLOT_3 = levels(3, 'Vital', 'Mental', 'Cura', 'Robusto');

// --- Acessórios: 490106 Pingente, 490107 Anel, 490108 Brincos, 490109 Colar -------------
// The two slots share the damage families and diverge after them: slot 1 takes the three
// leech orbs, slot 2 the regeneration ladder. They were wired as one list plus "Geral",
// which left HPR/SPR and Conversão/Vida reachable from nowhere.
const ACC_SHARED = [...levels(4, 'Mira', 'Fatal', 'Combate', 'Encanto'), 'Atraso 2', 'Atraso 3', 'Atraso 4'];
const ACC_SLOT_1 = [...ACC_SHARED, 'Conversão', 'Vida', 'Geral'];
const ACC_SLOT_2 = [...ACC_SHARED, ...levels(4, 'HPR', 'SPR')];
const ACC_SLOT_3 = levels(3, ...STATS);

const sorted = (names: string[]) => [...names].sort();

describe.each([
  ['Armaduras', ['Gray_W_Suits', 'Gray_W_Robe'], ARMOR_SLOT_1, ARMOR_SLOT_2, ARMOR_SLOT_3],
  ['Capas', ['Gray_W_Muffler', 'Gray_W_Manteau'], GARMENT_SLOT_1, GARMENT_SLOT_2, GARMENT_SLOT_3],
  ['Calçados', ['Gray_W_Boots', 'Gray_W_Shoes'], BOOT_SLOT_1, BOOT_SLOT_2, BOOT_SLOT_3],
  [
    'Acessórios',
    ['Gray_W_Pendant', 'Gray_W_Ring', 'Gray_W_Earing', 'Gray_W_Necklace'],
    ACC_SLOT_1,
    ACC_SLOT_2,
    ACC_SLOT_3,
  ],
])('%s do Lobo Cinzento', (_family, aegisNames, slot1, slot2, slot3) => {
  // getEnchants returns [_, slot1, slot2, slot3], in the player's numbering.
  it.each(aegisNames)('offers the published slot-1 pool on %s', (aegisName) => {
    expect(sorted(optionNames(getEnchants(aegisName)[1]))).toEqual(sorted(slot1));
  });

  it.each(aegisNames)('offers the published slot-2 pool on %s', (aegisName) => {
    expect(sorted(optionNames(getEnchants(aegisName)[2]))).toEqual(sorted(slot2));
  });

  it.each(aegisNames)('offers the published slot-3 pool on %s', (aegisName) => {
    expect(sorted(optionNames(getEnchants(aegisName)[3]))).toEqual(sorted(slot3));
  });
});

describe('every Wolf Orb a Gray Wolf pool offers', () => {
  const rows = EnchantTable.filter((row) => /^Gray_W_/.test(String(row.name)));
  const offered = [...new Set(rows.flatMap((row) => row.enchants ?? []).flatMap((slot) => slot ?? []))];

  // The failure this ratchets: an aegisName listed in a pool with no item.json record
  // behind it renders as nothing at all, so the socket silently comes up short.
  it.each(offered)('%s has a record in item.json', (aegisName) => {
    expect(NAME_BY_AEGIS.get(aegisName)).toBeDefined();
  });

  it('offers no orb twice within one slot', () => {
    for (const row of rows) {
      for (const slot of (row.enchants ?? []).filter(Boolean)) {
        expect(new Set(slot).size, `${row.name}: ${slot}`).toBe(slot.length);
      }
    }
  });
});

describe('resistance-only Wolf Orbs', () => {
  // These carried an empty script while reflected-damage resistance had no key at all.
  // `reduceDamageReturn` is display only — the engine models damage dealt, so there is
  // nothing here for it to reduce — but the orb is no longer worth nothing on the screen.
  it.each([
    ['310585', 'Wolf_Orb_M_Counter_1', ['2', '7===2', '9===3', '11===3']],
    ['310586', 'Wolf_Orb_M_Counter_2', ['3', '7===3', '9===4', '11===4']],
    ['310587', 'Wolf_Orb_M_Counter_3', ['4', '7===4', '9===5', '11===5']],
    // The armour's Refletor orbs, added alongside the DEF/DEFM fix: a flat 2/3/4% per step.
    ['310511', 'Wolf_Orb_R_Reject_1', ['2', '7===2', '9===2', '11===2']],
    ['310512', 'Wolf_Orb_R_Reject_2', ['3', '7===3', '9===3', '11===3']],
    ['310513', 'Wolf_Orb_R_Reject_3', ['4', '7===4', '9===4', '11===4']],
  ])('%s %s scores its reflected-damage resistance and nothing else', (id, aegis, entries) => {
    expect(items[id]?.aegisName).toBe(aegis);
    expect(items[id]?.script).toEqual({ reduceDamageReturn: entries });
  });

  // The "Total" orbs, on the other hand, land squarely on the defender-reduction keys the
  // PVP work added (docs/pvp.md §4) — class, element, size and race, each at its own refine
  // step. They were left empty back when nothing read those keys. See size-resistance.spec.
  it.each([
    ['310579', 'Wolf_Orb_Above_1', 3],
    ['310580', 'Wolf_Orb_Above_2', 5],
    ['310581', 'Wolf_Orb_Above_3', 7],
  ])('%s %s reduces damage taken by %i%% per step', (id, aegis, percent) => {
    expect(items[id]?.aegisName).toBe(aegis);
    expect(items[id]?.script).toEqual({
      subclass_all: [`${percent}`],
      subele_all: [`7===${percent}`],
      subsize_all: [`9===${percent}`],
      subrace_all: [`11===${percent}`],
    });
  });

  it('does not hand out AGI, which the Total orbs never mentioned', () => {
    // Regression: 310579-581 shipped `{"agi": ["3","7===3","9===3","11===3"]}`, the
    // resistance percentages pasted into the wrong key.
    for (const id of ['310579', '310580', '310581']) {
      expect(items[id].script.agi).toBeUndefined();
    }
  });
});
