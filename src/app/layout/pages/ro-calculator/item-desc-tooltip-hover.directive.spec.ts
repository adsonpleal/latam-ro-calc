import { ElementRef, Renderer2 } from '@angular/core';
import { Tooltip } from 'primeng/tooltip';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ItemDescTooltipHoverDirective } from './item-desc-tooltip-hover.directive';

/**
 * O popover de descrição precisa sobreviver ao ponteiro saindo do gatilho, senão a
 * barra de rolagem de uma descrição longa é inalcançável — some antes de o ponteiro
 * chegar nela. Aqui se exercita a máquina de estados da diretiva com dublês do
 * Tooltip e do Renderer2; o que a `deactivate` original faz não interessa, só
 * *quando* ela é chamada.
 */

type Ouvinte = (evento: Event) => void;

/** Renderer2 mínimo: guarda os ouvintes por (alvo, evento) para disparo manual. */
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
 * Dublê do Tooltip com os métodos no PROTÓTIPO, como na classe real: a diretiva
 * remenda propriedades próprias por cima deles, e é isso que o teste de restauração
 * verifica. Um objeto literal esconderia esse detalhe.
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
    /* o real chama deactivate(); aqui só interessa que a diretiva o substitua */
  }
}

function montar() {
  const fake = new FakeTooltip();
  const tooltip = fake as unknown as Tooltip;

  const host = { nativeElement: { id: 'gatilho' } } as ElementRef<HTMLElement>;
  const r = fakeRenderer();
  const dir = new ItemDescTooltipHoverDirective(tooltip, host, r.renderer);
  dir.ngOnInit();

  /** Abre o popover como o PrimeNG faria: cria o container e chama show(). */
  const abrir = () => {
    fake.container = { id: 'popover' };
    tooltip.show();
  };

  return { dir, fake, tooltip, opcoes: fake.opcoes, chamadas: fake.chamadas, r, abrir };
}

describe('ItemDescTooltipHoverDirective', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('desliga o autoHide do PrimeNG, que fecharia ao sair do gatilho', () => {
    const { opcoes } = montar();
    expect(opcoes['autoHide']).toBe(false);
  });

  it('não fecha na hora ao sair do gatilho — dá folga para atravessar até o popover', () => {
    const { tooltip, chamadas, abrir } = montar();
    abrir();

    tooltip.deactivate();
    expect(chamadas.deactivate).toBe(0);

    vi.advanceTimersByTime(200);
    expect(chamadas.deactivate).toBe(1);
  });

  it('cancela o fechamento quando o ponteiro entra no popover', () => {
    const { tooltip, chamadas, r, abrir } = montar();
    abrir();

    tooltip.deactivate();
    r.disparar('popover', 'mouseenter');
    vi.advanceTimersByTime(1000);

    expect(chamadas.deactivate).toBe(0);
  });

  it('cancela o fechamento quando o ponteiro volta para o gatilho', () => {
    const { tooltip, chamadas, r, abrir } = montar();
    abrir();

    tooltip.deactivate();
    r.disparar('gatilho', 'mouseenter');
    vi.advanceTimersByTime(1000);

    expect(chamadas.deactivate).toBe(0);
  });

  it('fecha ao sair do popover para fora', () => {
    const { chamadas, r, abrir } = montar();
    abrir();

    r.disparar('popover', 'mouseleave');
    expect(chamadas.deactivate).toBe(0);

    vi.advanceTimersByTime(200);
    expect(chamadas.deactivate).toBe(1);
  });

  it('sem popover na tela, fecha na hora — para cancelar uma exibição agendada', () => {
    const { tooltip, chamadas } = montar();

    tooltip.deactivate();

    expect(chamadas.deactivate).toBe(1);
  });

  it('Esc fecha imediatamente, sem esperar a folga', () => {
    const { tooltip, chamadas, abrir } = montar();
    abrir();

    tooltip.onPressEscape();

    expect(chamadas.deactivate).toBe(1);
  });

  it('Esc não fecha quando hideOnEscape está desligado', () => {
    const { tooltip, chamadas, abrir } = montar();
    abrir();
    (tooltip as unknown as { hideOnEscape: boolean }).hideOnEscape = false;

    tooltip.onPressEscape();
    vi.advanceTimersByTime(1000);

    expect(chamadas.deactivate).toBe(0);
  });

  it('não deixa um fechamento agendado sobreviver ao popover que o originou', () => {
    const { tooltip, chamadas, abrir } = montar();
    abrir();

    tooltip.deactivate(); // agenda
    tooltip.hide(); // o popover foi embora por outro caminho (scroll, resize…)
    vi.advanceTimersByTime(1000);

    expect(chamadas.deactivate).toBe(0);
  });

  it('reamarra os ouvintes a cada exibição, sem acumular no container antigo', () => {
    const { r, abrir } = montar();

    abrir();
    abrir();

    expect(r.contar('popover', 'mouseenter')).toBe(1);
    expect(r.contar('popover', 'mouseleave')).toBe(1);
  });

  it('devolve os métodos originais ao destruir', () => {
    const { dir, tooltip } = montar();

    dir.ngOnDestroy();

    // Os métodos do protótipo de volta, não cópias `bind`adas por cima deles.
    for (const metodo of ['deactivate', 'show', 'hide', 'onPressEscape'] as const) {
      expect(Object.prototype.hasOwnProperty.call(tooltip, metodo)).toBe(false);
      expect(tooltip[metodo]).toBe(FakeTooltip.prototype[metodo]);
    }
  });
});
