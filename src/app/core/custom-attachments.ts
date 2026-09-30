import { isCustomItem } from './custom-items';
import { ItemModel } from '../models/item.model';

export interface CustomAttachmentState {
  itemId: number;
  cards: (number | null)[];
  enchants: (number | null)[];
  bas: (string | null)[];
  refine?: number;
  grade?: string;
}

export type CustomAttachments = Record<string, CustomAttachmentState>;

export function ensureCustomAttachment(model: Record<string, any>, slot: string, item: ItemModel | undefined): CustomAttachmentState | undefined {
  model['customAttachments'] ??= {};
  if (!isCustomItem(item)) { delete model['customAttachments'][slot]; return undefined; }
  const previous = model['customAttachments'][slot] as CustomAttachmentState | undefined;
  if (previous?.itemId === item.id) {
    previous.cards = previous.cards.slice(0, item.cardCapacity);
    previous.enchants = previous.enchants.slice(0, item.enchantCapacity);
    previous.bas = previous.bas.slice(0, item.baCapacity);
    return previous;
  }
  const next: CustomAttachmentState = {
    itemId: item.id,
    cards: item.defaultCards.slice(0, item.cardCapacity),
    enchants: item.defaultEnchants.slice(0, item.enchantCapacity),
    bas: item.defaultBas.slice(0, item.baCapacity),
    refine: Number(model[`${slot}Refine`]) || 0,
    grade: model[`${slot}Grade`] || '',
  };
  model['customAttachments'][slot] = next;
  return next;
}

export function customAttachmentItems(model: Record<string, any>, items: Record<number, ItemModel>): number[] {
  return Object.entries(model['customAttachments'] ?? {}).flatMap(([slot, raw]) => {
    const state = raw as CustomAttachmentState;
    if (!isCustomItem(items[model[slot]]) || model[slot] !== state.itemId) return [];
    return [...state.cards, ...state.enchants].filter((id): id is number => Number.isSafeInteger(id));
  });
}

export function customOptionScripts(model: Record<string, any>): string[] {
  return Object.entries(model['customAttachments'] ?? {}).flatMap(([slot, state]: [string, any]) => {
    if (model[slot] !== state.itemId) return [];
    return (state.bas ?? []).filter((line: unknown): line is string => typeof line === 'string');
  });
}
