import { keyActivate } from './key-activate';

/**
 * A key-activated element is a button made out of a non-button, so the contract under
 * test is a real `<button>`'s: Enter and Space press *it*, and a key press that belongs
 * to a control inside it belongs to that control alone.
 */
function press(key: string, { target, currentTarget }: { target: object; currentTarget: object }) {
  const event = { key, target, currentTarget, preventDefault: vi.fn() };
  keyActivate().onKeyDown!(event as never);
  return event;
}

describe('keyActivate', () => {
  it('presses the element on Enter and on Space', () => {
    for (const key of ['Enter', ' ']) {
      const element = { click: vi.fn() };
      const event = press(key, { target: element, currentTarget: element });
      expect(element.click).toHaveBeenCalledOnce();
      // The default would scroll the page on Space and submit a form on Enter.
      expect(event.preventDefault).toHaveBeenCalledOnce();
    }
  });

  it('leaves every other key alone', () => {
    const element = { click: vi.fn() };
    const event = press('a', { target: element, currentTarget: element });
    expect(element.click).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  // The saved-sim card is key-activated and holds three controls of its own. Before this,
  // Enter on its Excluir button cancelled the button's own native click and loaded the
  // sim instead — the card's action, from a key press that was never meant for it.
  it('ignores a key press that bubbled up from a control inside it', () => {
    const container = { click: vi.fn() };
    const inner = { click: vi.fn() };
    const event = press('Enter', { target: inner, currentTarget: container });
    expect(container.click).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it('attaches nothing at all when it is turned off', () => {
    expect(keyActivate(false)).toEqual({});
  });

  it('gives the element the role and the tab stop that make it reachable', () => {
    expect(keyActivate()).toMatchObject({ role: 'button', tabIndex: 0 });
  });
});
