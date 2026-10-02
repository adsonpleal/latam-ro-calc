import { SyntheticEvent } from 'react';
import { environment } from '../../environments/environment';

export function iconUrl(id: string | number | null | undefined, type = 'item', customIcon?: (id: number) => number | undefined): string {
  if (id == null || id === '') return '';
  const override = type === 'item' && typeof id === 'number' ? customIcon?.(id) : undefined;
  if (override) return `${environment.ragassetsUrl}/icons/item/${override}.png`;
  const key = String(id);
  return /^\d+$/.test(key) ? `${environment.ragassetsUrl}/icons/${type}/${key}.png` : `assets/icons/${key}.png`;
}
export function monsterSpriteUrl(id: string | number | null | undefined): string {
  return id == null || id === '' ? '' : `${environment.ragassetsUrl}/image?job=${id}&action=0`;
}
export const missingIcon = {
  onError: (event: SyntheticEvent<HTMLImageElement>) => { event.currentTarget.style.visibility = 'hidden'; },
  onLoad: (event: SyntheticEvent<HTMLImageElement>) => { event.currentTarget.style.visibility = ''; },
};
