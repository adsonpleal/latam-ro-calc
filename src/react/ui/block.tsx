import { createElement, useLayoutEffect, useRef } from 'react';
import { useLayers } from './portal';

export function Block({ blocked }: { blocked: boolean }) {
  const host = useRef<HTMLElement>(null);
  const { scrollLocks } = useLayers();
  useLayoutEffect(() => {
    if (!blocked || !host.current) return undefined;
    const owner = host.current;
    scrollLocks.lock(owner);
    return () => scrollLocks.unlock(owner);
  }, [blocked, scrollLocks]);
  return createElement('app-ui-block', { ref: host }, blocked ? <div className="ui-blockui ui-component-overlay"
    role="status" aria-live="polite" aria-label="Carregando" aria-busy="true" /> : null);
}
