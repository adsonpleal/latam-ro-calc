import { ElementRef, Renderer2 } from '@angular/core';
import { Tooltip } from 'primeng/tooltip';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ItemDescTooltipHoverDirective } from './item-desc-tooltip-hover.directive';

/**
 * The description popover has to survive the pointer leaving the trigger, otherwise a
 * long description's scrollbar is unreachable — it disappears before the pointer gets
 * there. This exercises the directive's state machine with stand-ins for Tooltip and
 * Renderer2; what the original `deactivate` does is irrelevant, only *when* it is called.
 */

type Ouvinte = (evento: Event) => void;

/** Minimal Renderer2: keeps listeners by (target, event) so they can be fired by hand. */
function fakeRenderer() {
  const ouvintes = new Map<string, Set<Ouvinte>>();
  const chave = (alvo: unknown, evento: string) => `${(alvo as { id?: string })?.id ?? 'anon'}:${evento}`;

  const renderer = {
    listen(alvo: unknown, evento: string, fn: Ouvinte) {
      const k = chave(alvo, evento);
      if (!ouvintes.has(k)) ouvintes.set(k, new Set());
      ouvintes.get(k)!.add(fn);
      return () => ouvintes.get(k)!.delete(fn);
    },
  } as unknown as Renderer2;

  return {
    renderer,
    disparar(alvoId: string, evento: string) {
      for (const fn of ouvintes.get(`${alvoId}:${evento}`) ?? []) fn(new Event(evento));
    },
    contar(alvoId: string, evento: string) {
      return ouvintes.get(`${alvoId}:${evento}`)?.size ?? 0;
    },
  };
}

/**
 * A Tooltip stand-in with its methods on the PROTOTYPE, as in the real class: the
 * directive patches own properties on top of them, and that is what the restore test
 * checks. An object literal would hide that detail.
 */
class FakeTooltip {
  container: unknown = undefined;
  hideOnEscape = true;
  readonly opcoes: Record<string, unknown> = {};
  readonly chamadas = { deactivate: 0, show: 0, hide: 0 };

  setOption(o: Record<string, unknown>) {
    Object.assign(this.opcoes, o);
  }
  deactivate() {
    this.chamadas.deactivate++;
  }
  show() {
    this.chamadas.show++;
  }
  hide() {
    this.chamadas.hide++;
  }
  onPressEscape() {
    /* the real one calls deactivate(); here all that matters is the directive replaces it */
  }
}

function montar() {
  const fake = new FakeTooltip();
  const tooltip = fake as unknown as Tooltip;

  const host = { nativeElement: { id: 'gatilho' } } as ElementRef<HTMLElement>;
  const r = fakeRenderer();
  const dir = new ItemDescTooltipHoverDirective(tooltip, host, r.renderer);
  dir.ngOnInit();

  /** Opens the popover the way PrimeNG would: creates the container and calls show(). */
  const abrir = () => {
    fake.container = { id: 'popover' };
    tooltip.show();
  };

  return { dir, fake, tooltip, opcoes: fake.opcoes, chamadas: fake.chamadas, r, abrir };
}

describe('ItemDescTooltipHoverDirective', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('turns off PrimeNG autoHide, which would close on leaving the trigger', () => {
    const { opcoes } = montar();
    expect(opcoes['autoHide']).toBe(false);
  });

  it('does not close immediately on leaving the trigger — it allows time to cross over', () => {
    const { tooltip, chamadas, abrir } = montar();
    abrir();

    tooltip.deactivate();
    expect(chamadas.deactivate).toBe(0);

    vi.advanceTimersByTime(200);
    expect(chamadas.deactivate).toBe(1);
  });

  it('cancels the close when the pointer enters the popover', () => {
    const { tooltip, chamadas, r, abrir } = montar();
    abrir();

    tooltip.deactivate();
    r.disparar('popover', 'mouseenter');
    vi.advanceTimersByTime(1000);

    expect(chamadas.deactivate).toBe(0);
  });

  it('cancels the close when the pointer returns to the trigger', () => {
    const { tooltip, chamadas, r, abrir } = montar();
    abrir();

    tooltip.deactivate();
    r.disparar('gatilho', 'mouseenter');
    vi.advanceTimersByTime(1000);

    expect(chamadas.deactivate).toBe(0);
  });

  it('closes when the pointer leaves the popover outwards', () => {
    const { chamadas, r, abrir } = montar();
    abrir();

    r.disparar('popover', 'mouseleave');
    expect(chamadas.deactivate).toBe(0);

    vi.advanceTimersByTime(200);
    expect(chamadas.deactivate).toBe(1);
  });

  it('closes immediately with no popover on screen — to cancel a scheduled show', () => {
    const { tooltip, chamadas } = montar();

    tooltip.deactivate();

    expect(chamadas.deactivate).toBe(1);
  });

  it('closes immediately on Esc, without waiting for the grace period', () => {
    const { tooltip, chamadas, abrir } = montar();
    abrir();

    tooltip.onPressEscape();

    expect(chamadas.deactivate).toBe(1);
  });

  it('does not close on Esc when hideOnEscape is off', () => {
    const { tooltip, chamadas, abrir } = montar();
    abrir();
    (tooltip as unknown as { hideOnEscape: boolean }).hideOnEscape = false;

    tooltip.onPressEscape();
    vi.advanceTimersByTime(1000);

    expect(chamadas.deactivate).toBe(0);
  });

  it('does not let a scheduled close outlive the popover that scheduled it', () => {
    const { tooltip, chamadas, abrir } = montar();
    abrir();

    tooltip.deactivate(); // schedules
    tooltip.hide(); // the popover went away by another route (scroll, resize…)
    vi.advanceTimersByTime(1000);

    expect(chamadas.deactivate).toBe(0);
  });

  it('rebinds the listeners on every show, without piling up on the old container', () => {
    const { r, abrir } = montar();

    abrir();
    abrir();

    expect(r.contar('popover', 'mouseenter')).toBe(1);
    expect(r.contar('popover', 'mouseleave')).toBe(1);
  });

  it('restores the original methods on destroy', () => {
    const { dir, tooltip } = montar();

    dir.ngOnDestroy();

    // The prototype methods back, not `bind`ed copies sitting on top of them.
    for (const metodo of ['deactivate', 'show', 'hide', 'onPressEscape'] as const) {
      expect(Object.prototype.hasOwnProperty.call(tooltip, metodo)).toBe(false);
      expect(tooltip[metodo]).toBe(FakeTooltip.prototype[metodo]);
    }
  });
});
