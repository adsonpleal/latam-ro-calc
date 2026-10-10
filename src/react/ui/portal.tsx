import { ReactNode, createContext, useContext, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ConnectedPosition, LayerManager, positionConnected, trapFocus } from './layers';
import { needsCompactOverlay, useTouchInput } from './input-capabilities';

const LayersContext = createContext<LayerManager | null>(null);
export function useLayers(): LayerManager {
  const manager = useContext(LayersContext);
  if (!manager) throw new Error('Overlay controls require a LayersProvider');
  return manager;
}
export function LayersProvider({ manager, children }: { manager: LayerManager; children: ReactNode }) {
  return <LayersContext.Provider value={manager}>{children}</LayersContext.Provider>;
}
export interface PortalProps {
  children: ReactNode;
  origin?: HTMLElement | null;
  anchor?: HTMLElement | null;
  positions?: ConnectedPosition[];
  panelClass?: string;
  modal?: boolean;
  backdropClassName?: string;
  lock?: boolean;
  trap?: boolean;
  position?: 'center' | 'top';
  minWidth?: number;
  width?: number;
  role?: string;
  id?: string;
  onDismiss: () => void;
  onEscape?: () => void;
  onBackdrop?: () => void;
  onOutside?: () => void;
  onOutsideScroll?: () => void;
  onPosition?: (position: ConnectedPosition, panel: HTMLElement) => void;
}
export function Portal({ children, origin = null, anchor, positions, panelClass = '', modal = false, backdropClassName = 'ui-dialog-mask', lock = true,
  trap = false, position = 'center', minWidth, width, role, id, onDismiss, onEscape, onBackdrop, onOutside,
  onOutsideScroll, onPosition }: PortalProps) {
  const manager = useLayers();
  const touch = useTouchInput();
  const callbacks = useRef({ onDismiss, onEscape, onBackdrop, onOutside, onOutsideScroll, onPosition });
  callbacks.current = { onDismiss, onEscape, onBackdrop, onOutside, onOutsideScroll, onPosition };
  const [container, setContainer] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    const host = document.createElement('div');
    host.className = 'ui-overlay-host';
    const pane = document.createElement('div');
    pane.className = `ui-overlay-pane ${panelClass}`;
    if (role) pane.setAttribute('role', role);
    if (id) pane.id = id;
    if (minWidth != null) pane.style.minWidth = `${minWidth}px`;
    if (width != null) pane.style.width = `${width}px`;
    if (!anchor) {
      host.style.display = 'flex'; host.style.justifyContent = 'center';
      host.style.alignItems = position === 'top' ? 'flex-start' : 'center';
      pane.style.position = 'relative';
      if (position === 'top') pane.style.marginTop = '.75rem';
    }
    if (modal) {
      const backdrop = document.createElement('div');
      backdrop.className = `ui-overlay-backdrop ${backdropClassName}`;
      backdrop.addEventListener('click', () => callbacks.current.onBackdrop?.());
      host.append(backdrop);
    }
    host.append(pane); document.body.append(host);
    const release = manager.register(pane, origin ?? document.activeElement as HTMLElement, () => callbacks.current.onDismiss(), lock,
      () => (callbacks.current.onEscape ?? callbacks.current.onDismiss)());
    const outside = (event: MouseEvent) => {
      const path = event.composedPath();
      const onOrigin = origin && (path.includes(origin) || origin.contains(event.target as Node));
      if (manager.isOutside(pane, event.target as Node, path) && !onOrigin) callbacks.current.onOutside?.();
    };
    // Touch dialogs stop bubbling to underlying actions. Observe their outside
    // taps before that boundary so nested selectors can still dismiss.
    document.addEventListener('click', outside, touch);
    const outsideScroll = (event: Event) => {
      if (manager.isOutside(pane, event.target as Node, event.composedPath())) callbacks.current.onOutsideScroll?.();
    };
    document.addEventListener('scroll', outsideScroll, true);
    setContainer(pane);
    return () => {
      release(); document.removeEventListener('click', outside, touch); document.removeEventListener('scroll', outsideScroll, true); host.remove();
    };
  }, [manager, origin, anchor, panelClass, modal, lock, position, minWidth, width, role, id, touch]);
  useLayoutEffect(() => {
    if (!container) return undefined;
    const reposition = () => {
      const host = container.parentElement!;
      if (needsCompactOverlay()) {
        const visible = window.visualViewport;
        const visibleWidth = visible?.width ?? window.innerWidth;
        const visibleHeight = visible?.height ?? window.innerHeight;
        Object.assign(host.style, { left: `${visible?.offsetLeft ?? 0}px`, top: `${visible?.offsetTop ?? 0}px`, right: 'auto', bottom: 'auto', width: `${visibleWidth}px`, height: `${visibleHeight}px` });
        host.style.setProperty('--ui-viewport-width', `${visibleWidth}px`);
        host.style.setProperty('--ui-viewport-height', `${visibleHeight}px`);
        if (minWidth != null) container.style.minWidth = `${Math.min(minWidth, visibleWidth - 16)}px`;
        if (width != null) container.style.width = `${Math.min(width, visibleWidth - 16)}px`;
      } else {
        for (const name of ['left', 'top', 'right', 'bottom', 'width', 'height', '--ui-viewport-width', '--ui-viewport-height']) host.style.removeProperty(name);
        if (minWidth != null) container.style.minWidth = `${minWidth}px`;
        if (width != null) container.style.width = `${width}px`;
      }
      if (!anchor?.isConnected) return;
      const connection = positionConnected(container, anchor, positions);
      if (connection) callbacks.current.onPosition?.(connection, container);
    };
    reposition();
    const observer = new ResizeObserver(reposition); observer.observe(container);
    if (anchor && needsCompactOverlay()) observer.observe(anchor);
    window.addEventListener('resize', reposition);
    window.visualViewport?.addEventListener('resize', reposition);
    window.visualViewport?.addEventListener('scroll', reposition);
    document.addEventListener('scroll', reposition, true);
    const frame = requestAnimationFrame(reposition);
    const restore = trap ? trapFocus(container.querySelector<HTMLElement>('[role="dialog"]') ?? container) : undefined;
    return () => {
      cancelAnimationFrame(frame); observer.disconnect();
      window.removeEventListener('resize', reposition); document.removeEventListener('scroll', reposition, true); restore?.();
      window.visualViewport?.removeEventListener('resize', reposition);
      window.visualViewport?.removeEventListener('scroll', reposition);
    };
  }, [container, anchor, positions, trap, minWidth, width, touch]);
  return container ? createPortal(children, container) : null;
}
