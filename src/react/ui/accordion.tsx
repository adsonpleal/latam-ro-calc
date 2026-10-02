import { CSSProperties, ReactNode, createElement, useId, useState } from 'react';
import { Icon } from './primitives';

export type AccordionIndex = number | number[] | null;
export interface AccordionTab { key: string; header: ReactNode; children: ReactNode; className?: string; style?: CSSProperties; }
export interface AccordionProps {
  tabs: AccordionTab[];
  multiple?: boolean;
  activeIndex?: AccordionIndex;
  onActiveIndexChange?: (index: AccordionIndex) => void;
  onTabOpened?: (event: { index: number }) => void;
  onTabClosed?: (event: { index: number }) => void;
}
export function Accordion({ tabs, multiple = false, activeIndex, onActiveIndexChange, onTabOpened, onTabClosed }: AccordionProps) {
  const id = useId();
  const [localIndex, setLocalIndex] = useState<AccordionIndex>([]);
  const current = activeIndex === undefined ? localIndex : activeIndex;
  return createElement('app-ui-accordion', null, <div className="ui-accordion ui-component">
    {tabs.map((tab, index) => {
      const open = Array.isArray(current) ? current.includes(index) : current === index;
      const panelId = `${id}-${index}`;
      const toggle = () => {
        const indexes = Array.isArray(current) ? current : current == null ? [] : [current];
        const next = multiple ? open ? indexes.filter(entry => entry !== index) : [...indexes, index] : open ? null : index;
        setLocalIndex(next); onActiveIndexChange?.(next);
        (open ? onTabClosed : onTabOpened)?.({ index });
      };
      return createElement('app-ui-accordion-tab', { key: tab.key, className: tab.className, style: tab.style }, <div className={`ui-accordion-tab ${open ? 'ui-accordion-tab-active' : ''}`}>
        <div className={`ui-accordion-header ${open ? 'ui-highlight' : ''}`}>
          <button type="button" className="ui-accordion-header-link" id={`${panelId}-header`} aria-expanded={open} aria-controls={panelId} onClick={toggle}>
            <Icon className="ui-accordion-toggle-icon" name={open ? 'chevron-down' : 'chevron-right'} />
            {typeof tab.header === 'string' ? <span className="ui-accordion-header-text">{tab.header}</span> : tab.header}
          </button>
        </div>
        <div className="ui-toggleable-content" hidden={!open} id={panelId} role="region" aria-labelledby={`${panelId}-header`}>
          <div className="ui-accordion-content">{tab.children}</div>
        </div>
      </div>);
    })}
  </div>);
}
