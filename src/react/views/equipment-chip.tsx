import { createElement, useSyncExternalStore } from 'react';
import { ChipView } from '../../app/layout/pages/ro-calculator/equipment-grid/chip-view.model';
import { ItemModel } from '../../app/models/item.model';
import { itemDescPopoverHtml } from '../../app/utils/pretty-item-desc';
import { DescriptionStore } from '../services/data-client';
import { iconUrl, missingIcon } from '../services/assets';
import { useTooltip } from '../ui/tooltip';
import { useText } from '../state/use-text';
import './equipment-chip.css';

export interface EquipmentChipProps {
  view: ChipView; items?: Record<number, ItemModel>; descriptions: DescriptionStore; compare?: boolean;
  customIcon?: (id: number) => number | undefined;
  onPick: (anchor: HTMLElement) => void; onEdit?: (id: number) => void; onClear?: () => void;
}
export function EquipmentChip({ view, items, descriptions, compare = false, customIcon, onPick, onEdit, onClear }: EquipmentChipProps) {
  const t = useText();
  useSyncExternalStore(descriptions.subscribe, descriptions.getSnapshot);
  const description = view.descId && items ? itemDescPopoverHtml(items[view.descId], descriptions.get(view.descId)) : '';
  const rich = useTooltip({ text: description, escape: false, className: 'item_desc_tooltip', position: 'top', showDelay: 350 });
  const plain = useTooltip({ text: view.descId ? '' : view.text, position: 'top', showDelay: 350 });
  const preview = useTooltip({ text: t('eq.preReleaseTooltip'), position: 'top', showDelay: 300 });
  const clear = useTooltip({ text: t('eq.remove'), position: 'top', showDelay: 300 });
  const edit = useTooltip({ text: t('eq.customTooltip'), position: 'top', showDelay: 300 });
  return createElement('app-equipment-chip', null, <>
    <span className="eq-chip__picker"><button {...rich.triggerProps} type="button"
      className={`eq-chip ${view.filled ? 'eq-chip--filled' : ''} ${view.primary ? 'eq-chip--primary' : ''} ${compare ? 'eq-chip--compare' : ''} ${view.elementClass ? 'eq-chip--element' : ''} ${view.elementClass ?? ''}`}
      onClick={event => onPick(event.currentTarget)}>
      {view.icon && <img className="eq-chip__icon" src={iconUrl(view.icon, 'item', customIcon)} alt="" loading="lazy" {...missingIcon} />}
      <span {...plain.triggerProps} className="eq-chip__text">{view.text}</span>
      {view.preRelease && <span {...preview.triggerProps} className="pre_release_tag">{t('eq.preReleaseTag')}</span>}
    </button>
      {view.filled && view.chip.clearable !== false && <button {...clear.triggerProps} type="button" className="eq-chip__clear" aria-label={t('eq.removeNamed', { name: view.text })} onClick={onClear}>✕</button>}
    </span>
    {view.descId && items?.[view.descId]?.custom && <button {...edit.triggerProps} type="button" className={`eq-chip__custom ui-tag ${view.primary ? 'eq-chip__custom--primary' : ''}`}
      aria-label={t('eq.customEdit', { name: view.text })} onClick={() => onEdit?.(view.descId!)}>{t('eq.custom')}</button>}
    {rich.tooltip}{plain.tooltip}{view.preRelease && preview.tooltip}{clear.tooltip}{edit.tooltip}
  </>);
}
