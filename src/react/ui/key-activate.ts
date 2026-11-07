import { HTMLAttributes } from 'react';

export function keyActivate(enabled = true): HTMLAttributes<HTMLElement> {
  return enabled ? { role: 'button', tabIndex: 0, onKeyDown: event => {
    // Only this element's own key press. A keydown bubbles, so without this an Enter on
    // a control *inside* a key-activated container (the buttons on a saved-sim card, the
    // one in the replay dropzone) also fired the container — and the `preventDefault`
    // below cancelled the native click the focused control was about to make, so the
    // container's action replaced it. A real <button> never activates from a descendant.
    if (event.target !== event.currentTarget) return;
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.currentTarget.click(); }
  } } : {};
}
