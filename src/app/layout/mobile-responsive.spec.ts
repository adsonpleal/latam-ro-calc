import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { isCoarsePointer, trapFocus } from '../../react/ui/layers';
import { handleTooltipTouchClick } from '../../react/ui/tooltip';
import { ItemPickerOverlayComponent } from '../../react/controllers/item-picker-overlay';
import { DescriptionStore } from '../../react/services/data-client';

const topbarTsx = readFileSync('src/react/views/content/app.topbar.tsx', 'utf8');
const calcTsx = readFileSync('src/react/views/content/ro-calculator.tsx', 'utf8');
const notificationsTsx = readFileSync('src/react/ui/notifications.tsx', 'utf8');
const equipGridCss = readFileSync('src/react/views/equipment-grid.css', 'utf8');
const mobileCss = readFileSync('src/react/views/mobile-responsive.css', 'utf8');

describe('mobile responsiveness & touch UX contracts', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('removes hardcoded min-width: 1500px from topbar and calculator root grid', () => {
    expect(topbarTsx).not.toContain('min-width: 1500px');
    expect(calcTsx).not.toContain('min-width: 1500px');
  });

  it('bounds dialog widths with maxWidth in vw rather than raw 25vw/50vw', () => {
    expect(topbarTsx).not.toContain('"width": "50vw"');
    expect(calcTsx).not.toContain('"width": "25vw"');
    expect(notificationsTsx).not.toContain("width: '25vw'");
    expect(notificationsTsx).toContain("maxWidth: '92vw'");
  });

  it('uses a responsive minmax(min(100%, 480px), 1fr) track on equipment-grid columns', () => {
    expect(equipGridCss).toContain('minmax(min(100%, 480px), 1fr)');
  });

  it('includes Sticky Mini-HUD and Bottom Sheet rules in mobile-responsive.css', () => {
    expect(calcTsx).toContain('className="ro-mobile-hud"');
    expect(mobileCss).toContain('.ro-mobile-hud');
    expect(mobileCss).toContain('.ui-item-picker-pane--sheet');
    expect(mobileCss).toContain('touch-action: none');
  });

  it('skips auto-focusing text inputs inside trapFocus on coarse pointers to prevent virtual keyboard popups', async () => {
    const inputFocus = vi.fn();
    const buttonFocus = vi.fn();
    const panelFocus = vi.fn();
    const input = {
      tagName: 'INPUT',
      tabIndex: 0,
      matches: (sel: string) => sel.includes('input'),
      closest: () => null,
      getClientRects: () => [{}],
      focus: inputFocus,
    } as unknown as HTMLElement;
    const closeBtn = {
      tagName: 'BUTTON',
      tabIndex: 0,
      matches: () => false,
      closest: () => null,
      getClientRects: () => [{}],
      focus: buttonFocus,
    } as unknown as HTMLElement;
    const panel = {
      querySelector: (sel: string) => (sel === '[data-focus-initial]' ? input : null),
      querySelectorAll: () => [input, closeBtn],
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      focus: panelFocus,
    } as unknown as HTMLElement;

    vi.stubGlobal('document', { activeElement: null });
    vi.stubGlobal('getComputedStyle', () => ({ visibility: 'visible' }));
    vi.stubGlobal('window', {
      matchMedia: (query: string) => ({ matches: query === '(pointer: coarse)' }),
    });

    expect(isCoarsePointer()).toBe(true);
    const cleanup = trapFocus(panel);
    await new Promise<void>(resolve => queueMicrotask(resolve));
    expect(inputFocus).not.toHaveBeenCalled();
    expect(buttonFocus).toHaveBeenCalledWith({ preventScroll: true });
    cleanup();
  });

  it('handles touch tooltip clicks: opens on first tap, guards links, and ignores interactive controls', () => {
    vi.stubGlobal('window', {
      matchMedia: (query: string) => ({ matches: query === '(pointer: coarse)' }),
    });
    const open = vi.fn();
    const hide = vi.fn();
    const preventDefault = vi.fn();
    const linkEl = {} as HTMLElement;
    const skillLabel = {
      closest: () => null,
      contains: (node: unknown) => node === linkEl,
    } as unknown as HTMLElement;
    const targetInLink = {
      closest: (sel: string) => (sel === 'a[href]' ? linkEl : null),
    } as unknown as EventTarget;

    // 1st tap on skill link: prevents navigation and opens tooltip
    handleTooltipTouchClick({ currentTarget: skillLabel, target: targetInLink, preventDefault }, null, false, 'Desc', open, hide);
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(open).toHaveBeenCalledWith(skillLabel);

    // 2nd tap on skill link while tooltip is open: lets link navigate without hiding
    preventDefault.mockClear();
    open.mockClear();
    handleTooltipTouchClick({ currentTarget: skillLabel, target: targetInLink, preventDefault }, skillLabel, false, 'Desc', open, hide);
    expect(preventDefault).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
    expect(hide).not.toHaveBeenCalled();

    // 2nd tap on plain trigger (not a link): hides tooltip
    const plainTarget = { closest: () => null } as unknown as EventTarget;
    handleTooltipTouchClick({ currentTarget: skillLabel, target: plainTarget, preventDefault }, skillLabel, false, 'Desc', open, hide);
    expect(hide).toHaveBeenCalledOnce();

    // Tapping clickable stats, listbox options, or buttons does not open tooltip
    const clickableEl = {
      closest: (sel: string) => (sel.includes('.bonus_clickable') ? ({} as HTMLElement) : null),
      contains: () => false,
    } as unknown as HTMLElement;
    handleTooltipTouchClick({ currentTarget: clickableEl, target: plainTarget, preventDefault }, null, false, 'Desc', open, hide);
    expect(open).not.toHaveBeenCalled();
  });

  it('toggles item description preview, pins panel width, and clears preview on filter or breadcrumb navigation', () => {
    const host = {
      nativeElement: {
        querySelector: (sel: string) => (sel === '.picker' ? { offsetWidth: 245 } : null),
      } as unknown as HTMLElement,
    };
    const descriptions = { get: vi.fn(), version: 1, subscribe: vi.fn(), getSnapshot: () => 1 } as unknown as DescriptionStore;
    const vm = new ItemPickerOverlayComponent(host, descriptions);
    vm.init({
      mode: 'flat',
      title: 'Topo',
      anchor: {} as HTMLElement,
      value: null,
      options: [{ label: 'Chapéu', value: 1001 }],
      filterKeys: ['label'],
    });
    const stopPropagation = vi.fn();
    expect(vm.previewValue).toBeNull();
    expect(vm.pinnedWidth).toBeNull();
    vm.togglePreview(1001, { stopPropagation });
    expect(stopPropagation).toHaveBeenCalledOnce();
    expect(vm.previewValue).toBe(1001);
    expect(vm.pinnedWidth).toBe(245);

    // Filtering resets previewValue so the list stays visible with virtual keyboard open
    vm.onQuery('cha');
    expect(vm.previewValue).toBeNull();

    // Breadcrumb navigation also resets previewValue
    vm.togglePreview(1001);
    expect(vm.previewValue).toBe(1001);
    vm.goToLevel(-1);
    expect(vm.previewValue).toBeNull();
  });
});
