import { HTMLAttributes, createElement, useEffect, useId, useMemo, useRef, useState } from 'react';
import { ConnectedPosition } from './layers';
import { Portal } from './portal';
import { sanitizeHtml } from './sanitize-html';
import { HoverLifetime } from './hover-lifetime';

const POSITIONS: Record<string, ConnectedPosition> = {
  right: { originX: 'end', originY: 'center', overlayX: 'start', overlayY: 'center' },
  left: { originX: 'start', originY: 'center', overlayX: 'end', overlayY: 'center' },
  top: { originX: 'center', originY: 'top', overlayX: 'center', overlayY: 'bottom' },
  bottom: { originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top' },
};
export interface TooltipOptions {
  text: string | null | undefined;
  position?: 'right' | 'left' | 'top' | 'bottom';
  className?: string;
  showDelay?: number;
  hideDelay?: number;
  escape?: boolean;
  disabled?: boolean;
  describedBy?: string;
}
/** Adds no DOM wrapper, preserving the feature's native element and CSS geometry. */
export function useTooltip({ text, position = 'right', className = '', showDelay = 0, hideDelay = 0,
  escape = true, disabled = false, describedBy }: TooltipOptions) {
  const id = `ui-tooltip-${useId()}`;
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const target = useRef<HTMLElement | null>(null);
  const latest = useRef({ text, disabled, showDelay, hideDelay, className }); latest.current = { text, disabled, showDelay, hideDelay, className };
  const [hover] = useState(() => new HoverLifetime(() => setAnchor(target.current), () => setAnchor(null),
    () => !!target.current?.isConnected && !!latest.current.text && !latest.current.disabled,
    () => latest.current.showDelay, () => latest.current.className.includes('item_desc_tooltip') ? 150 : latest.current.hideDelay));
  const cancelHide = () => hover.cancelHide();
  const hide = () => hover.hide();
  const activate = (element: HTMLElement) => {
    target.current = element; hover.activate();
  };
  const deactivate = () => {
    hover.deactivate();
  };
  useEffect(() => {
    if (!text || disabled) hide();
  }, [text, disabled]);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      hover.hide();
      queueMicrotask(() => { if (!mounted.current) hover.dispose(); });
    };
  }, [hover]);
  const positions = useMemo(() => [POSITIONS[position], ...Object.entries(POSITIONS).filter(([key]) => key !== position).map(([, value]) => value)], [position]);
  const align = (connection: ConnectedPosition, panel: HTMLElement) => {
    const chosen = Object.entries(POSITIONS).find(([, value]) => value.originX === connection.originX && value.originY === connection.originY)?.[0] ?? position;
    for (const key of Object.keys(POSITIONS)) panel.classList.remove(`ui-tooltip-${key}`);
    panel.classList.add(`ui-tooltip-${chosen}`);
    const correction = (panel.getBoundingClientRect().height - panel.offsetHeight) / 2;
    panel.style.marginTop = chosen === 'right' || chosen === 'left' ? `${correction}px` : '0';
  };
  const triggerProps: HTMLAttributes<HTMLElement> = {
    onMouseEnter: event => activate(event.currentTarget), onMouseLeave: deactivate,
    onFocus: event => activate(event.currentTarget), onBlur: deactivate,
    'aria-describedby': [describedBy, anchor ? id : null].filter(Boolean).join(' ') || undefined,
  };
  const tooltip = anchor && text && !disabled ? <Portal anchor={anchor} origin={anchor} positions={positions}
    panelClass={`ui-tooltip ui-tooltip-${position} ${className}`} role="tooltip" id={id} lock={false}
    onDismiss={hide} onOutsideScroll={hide} onPosition={align}>
    {createElement('app-ui-tooltip-content', { onMouseEnter: cancelHide, onMouseLeave: deactivate }, <>
      {escape ? <div className="ui-tooltip-text">{text}</div> : <div className="ui-tooltip-text" dangerouslySetInnerHTML={{ __html: sanitizeHtml(text) }} />}
    </>)}
  </Portal> : null;
  return { triggerProps, tooltip };
}
