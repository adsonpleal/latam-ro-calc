import { CSSProperties, ReactNode, Ref, createElement, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { virtualRange } from './selection';

export interface VirtualListHandle { scrollToIndex(index: number): void; }
export interface VirtualListProps<T> {
  items: readonly T[];
  itemSize?: number;
  height: number;
  className?: string;
  id?: string;
  role?: string;
  multiselectable?: boolean;
  getKey?: (item: T, index: number) => string | number;
  renderItem: (item: T, index: number) => ReactNode;
  ref?: Ref<VirtualListHandle>;
}
export function VirtualList<T>({ items, itemSize = 28, height, className = '', id, role, multiselectable,
  getKey, renderItem, ref }: VirtualListProps<T>) {
  const host = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [measuredHeight, setMeasuredHeight] = useState(height);
  const size = Math.max(1, itemSize);
  useLayoutEffect(() => {
    const element = host.current!;
    const refresh = () => {
      element.scrollTop = Math.min(element.scrollTop, Math.max(0, items.length * size - element.clientHeight));
      setScrollTop(element.scrollTop);
      setMeasuredHeight(element.clientHeight || height);
    };
    const observer = new ResizeObserver(refresh);
    observer.observe(element);
    refresh();
    return () => observer.disconnect();
  }, [items.length, size, height]);
  useImperativeHandle(ref, () => ({ scrollToIndex(index) {
    const element = host.current!;
    const top = Math.max(0, Math.min(items.length - 1, index)) * size;
    if (top < element.scrollTop) element.scrollTop = top;
    else if (top + size > element.scrollTop + element.clientHeight) element.scrollTop = top + size - element.clientHeight;
    setScrollTop(element.scrollTop);
  } }), [items.length, size]);
  const { start, end } = virtualRange(items.length, size, measuredHeight, scrollTop);
  const style: CSSProperties = { height, display: 'block', position: 'relative', overflow: 'auto', contain: 'strict', overflowAnchor: 'none' };
  return createElement('app-virtual-list', { ref: host, className, id, role, 'aria-multiselectable': multiselectable,
    style, onScroll: (event: React.UIEvent<HTMLElement>) => setScrollTop(event.currentTarget.scrollTop) }, <>
    <div className="ui-virtual-spacer" style={{ height: items.length * size }} />
    <div className="ui-virtual-content" style={{ transform: `translateY(${start * size}px)` }}>
      {items.slice(start, end).map((item, offset) => <div key={getKey?.(item, start + offset) ?? start + offset} style={{ height: size }}>{renderItem(item, start + offset)}</div>)}
    </div>
  </>);
}
