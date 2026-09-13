import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SLOTS_BY_KEY } from '../app-config/equipment-slots';
import { ExtraOptionTable } from '../constants/extra-option-table';
import { ItemOptionNumber as N } from '../constants/item-option-number.enum';
import { ItemTypeEnum } from '../constants/item-type.enum';
import { Warlock } from '../jobs';
import { ItemModel } from '../models/item.model';
import { canUsedByClass, createExtraOptionList } from '../utils';
import { toRawOptionTxtList } from '../utils/to-raw-option-txt-list';
import { deriveSlot } from './equipment-slot-derivation';

/**
 * Bônus Aleatórios on the Botas Desconhecidas (470071-470077) and the Capas Desconhecidas
 * (480926-480931).
 *
 * Tracker cards RzHzO2YHLtTBkLdmnVz1 ("Falta a Bota Desconhecida FOR [1]") and
 * DZoYBUUSezjBIpDeIA7F ("Falta os encantamentos das capas desconhecidas"). The boot was never
 * missing: its record held `usableClass: ["4th"]` where the client says "Classes: Todas", so
 * a 3rd class never saw it. What was missing on both families is the random options — the
 * client names no enchant for either, only these two items:
 *
 *   Contas de Ymir (100476):          "Adiciona até 2 bônus aleatórios nas Botas Desconhecidas."
 *   Alfaiataria Desconhecida (108007): "Adiciona 1 bônus aleatório nas Capas Desconhecidas."
 *
 * Boots had no option slots at all (no Boot_* index in ItemOptionNumber). The pools come
 * from bROWiki — Queda do Aeroplano for the boots (HP/SP máx. %, HP/SP máx., natural regen,
 * ASPD %, VCT) and Bônus Aleatórios#Capas for the capes (the Manto Temporal pool, heal
 * effectiveness among it) — and the regen/heal rolls enter as the display-only sustain keys.
 */

const items: Record<number, ItemModel> = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));

const BOOTS = [470071, 470072, 470073, 470074, 470076, 470077];
const CAPES = [480926, 480927, 480928, 480929, 480930, 480931];
const MANUK_BOOTS = 2477;

const optionSlots = (key: ItemTypeEnum, id: number) =>
  deriveSlot({ descriptor: SLOTS_BY_KEY.get(key)!, item: items[id], mapEnchant: new Map(), refineList: [], shadowRefineList: [] }).optionSlots;

const optionValues = (() => {
  const values = new Set<string>();
  const walk = (nodes: any[]) => nodes.forEach((n) => (n.children ? walk(n.children) : values.add(n.value)));
  walk(createExtraOptionList());
  return values;
})();

describe('Botas Desconhecidas', () => {
  it.each(BOOTS)('%i offers two random options', (id) => {
    expect(ExtraOptionTable[items[id].aegisName]).toBe(2);
    expect(optionSlots(ItemTypeEnum.boot, id)).toBe(2);
  });

  it('leaves every other boot without a random option', () => {
    expect(optionSlots(ItemTypeEnum.boot, MANUK_BOOTS)).toBe(0);
  });

  it('keeps both boot options in the build while the boot is worn, and drops them off any other boot', () => {
    const rawOptionTxts: string[] = [];
    rawOptionTxts[N.Boot_1] = 'hpPercent:10';
    rawOptionTxts[N.Boot_2] = 'aspdPercent:7';

    const worn = toRawOptionTxtList({ rawOptionTxts, boot: BOOTS[0] } as any, items);
    expect([worn[N.Boot_1], worn[N.Boot_2]]).toEqual(['hpPercent:10', 'aspdPercent:7']);

    const other = toRawOptionTxtList({ rawOptionTxts, boot: MANUK_BOOTS } as any, items);
    expect([other[N.Boot_1], other[N.Boot_2]]).toEqual([null, null]);
  });

  it.each(BOOTS)('%i is wearable by any class, as "Classes: Todas" says', (id) => {
    expect(items[id].usableClass).toEqual(['all']);
    expect(canUsedByClass(new Warlock())(items[id] as any)).toBe(true);
  });
});

describe('Capas Desconhecidas', () => {
  it.each(CAPES)('%i offers one random option', (id) => {
    expect(ExtraOptionTable[items[id].aegisName]).toBe(1);
    expect(optionSlots(ItemTypeEnum.garment, id)).toBe(1);
  });
});

describe('the option picker reaches every roll of both pools', () => {
  it.each([
    // Boots: 2º bônus "SP máx. +10 ~ 300", "Regen. natural de HP/SP +25% ~ 50%".
    'sp:10', 'sp:300', 'hpRecovRate:25', 'hpRecovRate:50', 'spRecovRate:50', 'hp:1000', 'hpPercent:10', 'aspdPercent:7', 'vct:10',
    // Capes: "SP máx. +50~1.000", "Efetividade de cura +3~10%", "Pós-conjuração -3~15%", "Esquiva +10~50".
    'sp:1000', 'healPower:10', 'acd:15', 'flee:50', 'hp:2000', 'criDmg:10',
  ])('%s', (value) => {
    expect(optionValues.has(value)).toBe(true);
  });
});
