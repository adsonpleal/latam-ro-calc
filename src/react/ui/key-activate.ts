import { HTMLAttributes } from 'react';

export function keyActivate(enabled = true): HTMLAttributes<HTMLElement> {
  return enabled ? { role: 'button', tabIndex: 0, onKeyDown: event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.currentTarget.click(); }
  } } : {};
}
