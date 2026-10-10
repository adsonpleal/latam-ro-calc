import { HTMLAttributes, ReactNode, createContext, createElement, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react';
import { ConnectedPosition } from './layers';
import { Portal } from './portal';
import { sanitizeHtml } from './sanitize-html';
import { HoverLifetime } from './hover-lifetime';
import { Dialog } from './dialog';
import { Icon } from './primitives';
import { useTouchInput } from './input-capabilities';

interface Information { id: string; text: string; escape: boolean; className: string; }
const InformationContext = createContext<((information: Information) => () => void) | null>(null);
function TouchInformation({ text, escape, className }: Information) {
  const [open, setOpen] = useState(false);
  const summary = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100);
  return <><button type="button" className="ui-touch-info ui-link" aria-label={`Informações: ${summary}`} aria-haspopup="dialog"
    onClick={event => { event.stopPropagation(); setOpen(true); }}><Icon name="info-circle" /></button>
    <Dialog visible={open} onVisibleChange={setOpen} modal dismissableMask header="Informações" className={`ui-touch-details ${className}`} style={{ width: '32rem' }}>
      {escape ? <div className="ui-tooltip-text">{text}</div> : <div className="ui-tooltip-text" dangerouslySetInnerHTML={{ __html: sanitizeHtml(text) }} />}
    </Dialog></>;
}
/** Hoist child information controls beside an action, avoiding nested buttons. */
export function TouchInformationGroup({ children }: { children: ReactNode }) {
  const touch = useTouchInput();
  const [information, setInformation] = useState<Record<string, Information>>({});
  const register = useCallback((entry: Information) => {
    setInformation(previous => ({ ...previous, [entry.id]: entry }));
    return () => setInformation(previous => { const next = { ...previous }; delete next[entry.id]; return next; });
  }, []);
  if (!touch) return children;
  return <span className="ui-touch-information-group"><InformationContext.Provider value={register}>{children}</InformationContext.Provider>
    {Object.values(information).map(entry => <TouchInformation key={entry.id} {...entry} />)}</span>;
}

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
  const touch = useTouchInput();
  const register = useContext(InformationContext);
  useEffect(() => {
    if (touch && text && !disabled && register) return register({ id, text, escape, className });
    return undefined;
  }, [touch, text, disabled, register, id, escape, className]);
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
  const triggerProps: HTMLAttributes<HTMLElement> = touch ? {} : {
    onMouseEnter: event => activate(event.currentTarget), onMouseLeave: deactivate,
    onFocus: event => activate(event.currentTarget), onBlur: deactivate,
    'aria-describedby': [describedBy, anchor ? id : null].filter(Boolean).join(' ') || undefined,
  };
  const tooltip = !touch && anchor && text && !disabled ? <Portal anchor={anchor} origin={anchor} positions={positions}
    panelClass={`ui-tooltip ui-tooltip-${position} ${className}`} role="tooltip" id={id} lock={false}
    onDismiss={hide} onOutsideScroll={hide} onPosition={align}>
    {createElement('app-ui-tooltip-content', { onMouseEnter: cancelHide, onMouseLeave: deactivate }, <>
      {escape ? <div className="ui-tooltip-text">{text}</div> : <div className="ui-tooltip-text" dangerouslySetInnerHTML={{ __html: sanitizeHtml(text) }} />}
    </>)}
  </Portal> : null;
  const touchInfo = touch && text && !disabled && !register ? <TouchInformation id={id} text={text} escape={escape} className={className} /> : null;
  return { triggerProps, tooltip, touchInfo };
}
