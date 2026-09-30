import { NgZone } from '@angular/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DismissibleOverlay, OverlayEscapeService } from './overlay-escape.service';

describe('panel clicks behind dialogs', () => {
  afterEach(() => vi.unstubAllGlobals());

  function setup() {
    const document = new EventTarget();
    vi.stubGlobal('document', document);
    const service = new OverlayEscapeService({ runOutsideAngular: (fn: () => void) => fn() } as NgZone);
    const panel: DismissibleOverlay = {
      isOpen: vi.fn(() => true),
      dismiss: vi.fn(),
      preserveForDialogClick: vi.fn(),
    };
    const deregister = service.register(panel);
    const outsideClick = vi.fn();
    document.addEventListener('click', outsideClick);
    return { document, service, panel, outsideClick, deregister };
  }

  function click(insideDialog: boolean) {
    const event = new Event('click');
    Object.defineProperty(event, 'target', { value: { closest: () => insideDialog ? {} : null } });
    return event;
  }

  it('preserves registered panels across components without blocking dropdown dismissal', () => {
    const { document, service, panel, outsideClick } = setup();
    const childPanel = { ...panel, preserveForDialogClick: vi.fn() };
    service.register(childPanel);
    document.dispatchEvent(click(true));
    expect(panel.preserveForDialogClick).toHaveBeenCalledOnce();
    expect(childPanel.preserveForDialogClick).toHaveBeenCalledOnce();
    expect(outsideClick).toHaveBeenCalledOnce();
    service.ngOnDestroy();
  });

  it('leaves normal outside clicks and closed panels alone', () => {
    const { document, service, panel, outsideClick } = setup();
    document.dispatchEvent(click(false));
    expect(panel.preserveForDialogClick).not.toHaveBeenCalled();
    vi.mocked(panel.isOpen).mockReturnValue(false);
    document.dispatchEvent(click(true));
    expect(panel.preserveForDialogClick).not.toHaveBeenCalled();
    expect(outsideClick).toHaveBeenCalledTimes(2);
    service.ngOnDestroy();
  });

  it('releases deregistered panels and removes the document listener on destroy', () => {
    const { document, service, panel, deregister } = setup();
    deregister();
    document.dispatchEvent(click(true));
    expect(panel.preserveForDialogClick).not.toHaveBeenCalled();
    service.register(panel);
    service.ngOnDestroy();
    document.dispatchEvent(click(true));
    expect(panel.preserveForDialogClick).not.toHaveBeenCalled();
  });
});
