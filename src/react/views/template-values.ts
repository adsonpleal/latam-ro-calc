import { CSSProperties } from 'react';
import { racePtBr, sizePtBr, elementPtBr, monsterTypePtBr } from '../../app/constants/monster-i18n';
import { bareJobSprite } from '../../app/domain/char-sprite-url';
import { itemDescPopoverHtml } from '../../app/utils/pretty-item-desc';
import { iconUrl, monsterSpriteUrl } from '../services/assets';
import { ApplicationServices } from '../services/application';
import { PrettyJsonFormatter } from '../../app/utils/pretty-json';

const identities = new WeakMap<object, number>();
let nextIdentity = 0;
export function identityKey(value: any): string | number {
  if (value != null && (typeof value === 'object' || typeof value === 'function')) {
    if (!identities.has(value)) identities.set(value, ++nextIdentity);
    return identities.get(value)!;
  }
  return `${typeof value}:${String(value)}`;
}
export function interpolate(strings: string[], values: unknown[]): string {
  return strings.map((part, index) => part + (index < values.length ? values[index] == null ? '' : String(values[index]) : '')).join('');
}
export function classNames(value: unknown): string {
  if (!value) return '';
  if (Array.isArray(value)) return value.map(classNames).filter(Boolean).join(' ');
  if (typeof value === 'object') return Object.entries(value).filter(([, enabled]) => enabled).map(([key]) => key).join(' ');
  return String(value);
}
export function normalizeStyle(value: Record<string, any> | null | undefined): CSSProperties {
  return Object.fromEntries(Object.entries(value ?? {}).map(([key, item]) => [key.startsWith('--') ? key : key.replace(/^-ms-/, 'ms-').replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase()), item]));
}
export function parseStyle(value: string): CSSProperties {
  return normalizeStyle(Object.fromEntries(value.split(';').filter(part => part.includes(':')).map(part => {
    const colon = part.indexOf(':'); return [part.slice(0, colon).trim(), part.slice(colon + 1).trim()];
  })));
}
const numbers = new Map<string, Intl.NumberFormat>();
const jsonFormatter = new PrettyJsonFormatter();
export function displayPipe(name: string, value: any, args: any[], services: ApplicationServices): any {
  switch (name) {
    case 'number': {
      if (value == null || value === '') return '';
      const digits = args[0] ?? '1.0-3';
      let formatter = numbers.get(digits);
      if (!formatter) {
        const match = /^(\d+)\.(\d+)-(\d+)$/.exec(digits);
        if (!match) throw new Error(`Invalid number format: ${digits}`);
        formatter = new Intl.NumberFormat('pt-BR', { minimumIntegerDigits: +match[1], minimumFractionDigits: +match[2], maximumFractionDigits: +match[3] });
        numbers.set(digits, formatter);
      }
      return formatter.format(Number(value));
    }
    case 'iconUrl': return iconUrl(value, args[0], id => services.customItems.iconFor(id));
    case 'monsterSprite': return monsterSpriteUrl(value);
    case 'charSprite': return bareJobSprite(value?.class);
    case 'monsterTerm': return value == null ? '' : ({ race: racePtBr, size: sizePtBr, element: elementPtBr, type: monsterTypePtBr }[args[0]]?.(value) ?? value);
    case 'itemDescTooltip': return value && args[0] ? itemDescPopoverHtml(args[0][value], services.data.descriptions.get(value)) : '';
    case 'prettyjson': return jsonFormatter.transform(value, args[0]);
    case 'json': return JSON.stringify(value, null, 2);
    default: throw new Error(`Unsupported display formatter: ${name}`);
  }
}
