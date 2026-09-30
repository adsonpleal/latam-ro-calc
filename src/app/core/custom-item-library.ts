import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { StorageLike } from './calc-storage';
import {
  CUSTOM_ITEM_MAX_BYTES, CUSTOM_ITEM_STORAGE_KEY, CustomItemDefinition,
  customItemId, isCustomItem, validateCustomItems,
} from './custom-items';
import { ItemModel, itemBonusScriptEntries } from '../models/item.model';

export interface CustomItemBundle { version: 1; items: CustomItemDefinition[] }

const same = (a: CustomItemDefinition, b: CustomItemDefinition): boolean => {
  const clean = (item: CustomItemDefinition) => ({ ...item, revision: 0, importSourceId: undefined, importFingerprint: undefined });
  return JSON.stringify(clean(a)) === JSON.stringify(clean(b));
};

const fingerprint = (item: CustomItemDefinition): string => {
  let a = 2166136261; let b = 3074457345;
  for (const code of JSON.stringify(item)) {
    const n = code.charCodeAt(0);
    a = Math.imul(a ^ n, 16777619);
    b = Math.imul(b ^ n, 2246822519);
  }
  return `${a >>> 0}-${b >>> 0}`;
};

const remapScript = (script: CustomItemDefinition['script'], ids: Map<number, number>): CustomItemDefinition['script'] => {
  const copy = structuredClone(script);
  for (const [key, values] of itemBonusScriptEntries(copy)) {
    copy[key] = values.map((line) => line.replace(/EQUIP_ID\[([^\]]+)]/g, (_whole, members: string) =>
      `EQUIP_ID[${members.replace(/\d+/g, (token) => String(ids.get(Number(token)) ?? token))}]`));
  }
  for (const effect of (copy['autoCastEffect'] ?? []) as any[]) {
    if (Array.isArray(effect.requiredEquippedItemIds)) {
      effect.requiredEquippedItemIds = effect.requiredEquippedItemIds.map((id: number) => ids.get(id) ?? id);
    }
  }
  return copy;
};

export function encodeCustomBundle(items: CustomItemDefinition[]): string {
  const data = JSON.stringify({ version: 1, items });
  if (new TextEncoder().encode(data).length > CUSTOM_ITEM_MAX_BYTES) throw new Error('Conjunto de itens grande demais.');
  return compressToEncodedURIComponent(data).replace(/\+/g, '.');
}

export function decodeCustomBundle(token: string, catalog: Record<number, ItemModel> = {}): CustomItemDefinition[] {
  if (!token || token.length > CUSTOM_ITEM_MAX_BYTES) throw new Error('Link de item grande demais.');
  const data = decompressFromEncodedURIComponent(token.replace(/\./g, '+'));
  if (!data || new TextEncoder().encode(data).length > CUSTOM_ITEM_MAX_BYTES) throw new Error('Link de item inválido ou grande demais.');
  let bundle: CustomItemBundle;
  try { bundle = JSON.parse(data); } catch { throw new Error('JSON do item inválido.'); }
  if (bundle?.version !== 1) throw new Error('Versão do link de item não reconhecida.');
  const result = validateCustomItems(bundle.items, catalog);
  if (result.errors.length) throw new Error(result.errors.map((e) => `${e.path}: ${e.message}`).join('\n'));
  return result.items;
}

export class CustomItemLibrary {
  constructor(private readonly storage: StorageLike) {}

  list(): CustomItemDefinition[] {
    try {
      const value = JSON.parse(this.storage.getItem(CUSTOM_ITEM_STORAGE_KEY) ?? '{}');
      if (value?.version !== 1 || !Array.isArray(value.items)) return [];
      return value.items.filter(isCustomItem);
    } catch { return []; }
  }

  save(item: CustomItemDefinition): void {
    const previous = this.list();
    const index = previous.findIndex((entry) => entry.id === item.id);
    const next = index < 0 ? [...previous, item] : previous.map((entry, i) => i === index ? item : entry);
    this.storage.setItem(CUSTOM_ITEM_STORAGE_KEY, JSON.stringify({ version: 1, items: next }));
  }

  remove(id: number): void {
    this.storage.setItem(CUSTOM_ITEM_STORAGE_KEY, JSON.stringify({ version: 1, items: this.list().filter((item) => item.id !== id) }));
  }

  /** One storage write after the entire batch has been checked and remapped. */
  import(items: CustomItemDefinition[], catalog: Record<number, ItemModel>): CustomItemDefinition[] {
    const validated = validateCustomItems(items, catalog);
    if (validated.errors.length) throw new Error(validated.errors.map((e) => `${e.path}: ${e.message}`).join('\n'));
    const current = this.list();
    const byId = new Map(current.map((item) => [item.id, item]));
    const remap = new Map<number, number>();
    const reserved = new Set([...Object.keys(catalog).map(Number), ...current.map((item) => item.id)]);
    for (const incoming of items) {
      const previousImport = current.find((item) => item.importSourceId === incoming.id && item.importFingerprint === fingerprint(incoming));
      if (previousImport) { remap.set(incoming.id, previousImport.id); continue; }
      const conflict = byId.get(incoming.id);
      if (!conflict || same(conflict, incoming)) continue;
      let replacement: number;
      do { replacement = customItemId(); } while (reserved.has(replacement));
      remap.set(incoming.id, replacement);
      reserved.add(replacement);
    }
    const normalized = items.map((entry) => {
      const id = remap.get(entry.id) ?? entry.id;
      return { ...entry, id, aegisName: `custom_${id}`,
        ...(id !== entry.id ? { importSourceId: entry.id, importFingerprint: fingerprint(entry) } : {}),
        iconItemId: remap.get(entry.iconItemId) ?? entry.iconItemId,
        defaultCards: entry.defaultCards.map((ref) => remap.get(ref) ?? ref),
        defaultEnchants: entry.defaultEnchants.map((ref) => remap.get(ref) ?? ref),
        script: remapScript(entry.script, remap) };
    });
    const next = [...current];
    for (const item of normalized) if (!next.some((entry) => entry.id === item.id && same(entry, item))) next.push(item);
    this.storage.setItem(CUSTOM_ITEM_STORAGE_KEY, JSON.stringify({ version: 1, items: next }));
    return normalized;
  }
}
