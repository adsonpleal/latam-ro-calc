import { Directive, ElementRef, OnDestroy, OnInit, Renderer2 } from '@angular/core';
import { Tooltip } from 'primeng/tooltip';

/**
 * Janela em que o popover continua aberto depois que o ponteiro deixa o gatilho.
 *
 * O popover não encosta no gatilho: o `.p-tooltip` tem padding e ainda existe a
 * seta, então atravessar de um para o outro passa por alguns pixels que não são
 * de ninguém. Sem essa folga o popover fecharia no meio do caminho.
 */
const FOLGA_MS = 150;

/**
 * Faz o popover de descrição sobreviver ao ponteiro — é o que permite rolar uma
 * descrição longa, que agora rola na vertical em vez de virar duas colunas.
 *
 * O `pTooltip` padrão fecha no `mouseleave` do gatilho, o que torna a barra de
 * rolagem do popover inalcançável: o ponteiro some com ele antes de chegar lá.
 * Aqui:
 *
 *  - `autoHide: false` faz o PrimeNG ignorar a saída do gatilho quando o destino é
 *    o próprio popover, e amarrar um `mouseleave` no container;
 *  - o fechamento vira um agendamento com {@link FOLGA_MS} de folga, cancelado se o
 *    ponteiro entrar no popover (ou voltar para o gatilho) nesse meio tempo;
 *  - Esc fecha na hora, sem folga.
 *
 * Resultado: só fecha ao sair para fora dos dois, ou no Esc.
 */
// Sem prefixo "app" de propósito: casando com o atributo que os tooltips de item já
// têm, o comportamento vale para todos eles — inclusive os que forem criados depois.
// Mesmo critério da ItemDescTooltipFitDirective, que compartilha este seletor.
// eslint-disable-next-line @angular-eslint/directive-selector
@Directive({ selector: '[pTooltip][tooltipStyleClass="item_desc_tooltip"]' })
export class ItemDescTooltipHoverDirective implements OnInit, OnDestroy {
  private saidaPendente?: ReturnType<typeof setTimeout>;
  private deactivateOriginal?: () => void;
  private showOriginal?: () => void;
  private hideOriginal?: () => void;
  private pressEscapeOriginal?: () => void;
  private readonly desinscrever: (() => void)[] = [];
  private desinscreverContainer: (() => void)[] = [];

  constructor(
    private readonly tooltip: Tooltip,
    private readonly host: ElementRef<HTMLElement>,
    private readonly renderer: Renderer2,
  ) {}

  ngOnInit(): void {
    // `setOption` em vez de `tooltip.autoHide = false`: o Tooltip lê tudo pelo
    // `getOption`, e o input só chega às opções passando pelo ngOnChanges.
    this.tooltip.setOption({ autoHide: false });

    this.deactivateOriginal = this.tooltip.deactivate.bind(this.tooltip);
    this.showOriginal = this.tooltip.show.bind(this.tooltip);
    this.hideOriginal = this.tooltip.hide.bind(this.tooltip);

    this.tooltip.deactivate = () => {
      // Sem popover na tela não há travessia a proteger, e o original ainda
      // precisa rodar na hora para cancelar uma exibição agendada (o showDelay de
      // 400ms) — adiar isso faria o popover piscar depois de o ponteiro já ter ido
      // embora.
      if (!this.tooltip.container) {
        this.deactivateOriginal?.();
        return;
      }
      this.agendarSaida();
    };

    this.tooltip.show = () => {
      this.cancelarSaida();
      this.showOriginal?.();
      this.ouvirContainer();
    };

    this.tooltip.hide = () => {
      this.cancelarSaida();
      this.soltarContainer();
      this.hideOriginal?.();
    };

    // Esc fecha na hora. O `onPressEscape` do PrimeNG chama `deactivate()`, que aqui
    // é adiado — sem isto o popover só sumiria uma folga depois, e a tecla pareceria
    // não ter funcionado.
    this.pressEscapeOriginal = this.tooltip.onPressEscape.bind(this.tooltip);
    this.tooltip.onPressEscape = () => {
      if (!this.tooltip.hideOnEscape) return;
      this.cancelarSaida();
      this.deactivateOriginal?.();
    };

    // O `onMouseEnter` do PrimeNG só reage quando não há container, então voltar do
    // popover para o gatilho durante a folga não cancelaria nada por conta própria.
    this.desinscrever.push(this.renderer.listen(this.host.nativeElement, 'mouseenter', () => this.cancelarSaida()));
  }

  ngOnDestroy(): void {
    this.cancelarSaida();
    this.soltarContainer();
    for (const fn of this.desinscrever.splice(0)) fn();
    // Os patches são propriedades próprias por cima dos métodos do protótipo;
    // apagá-las devolve os originais de verdade. Reatribuir a versão `bind`ada
    // deixaria uma cópia no lugar, que parece igual mas não é o mesmo método.
    const instancia = this.tooltip as unknown as Record<string, unknown>;
    for (const metodo of ['deactivate', 'show', 'hide', 'onPressEscape']) delete instancia[metodo];
  }

  private ouvirContainer(): void {
    const container = this.tooltip.container as HTMLElement | undefined;
    if (!container) return;

    this.soltarContainer();
    // `mouseenter` dispara também nos ancestrais que estão sendo entrados, então
    // cair direto no `.p-tooltip-text` (sem passar pela borda do container) também
    // cancela a saída.
    this.desinscreverContainer = [
      this.renderer.listen(container, 'mouseenter', () => this.cancelarSaida()),
      this.renderer.listen(container, 'mouseleave', () => this.agendarSaida()),
    ];
  }

  private soltarContainer(): void {
    for (const fn of this.desinscreverContainer.splice(0)) fn();
  }

  private agendarSaida(): void {
    this.cancelarSaida();
    this.saidaPendente = setTimeout(() => {
      this.saidaPendente = undefined;
      this.deactivateOriginal?.();
    }, FOLGA_MS);
  }

  private cancelarSaida(): void {
    if (this.saidaPendente === undefined) return;
    clearTimeout(this.saidaPendente);
    this.saidaPendente = undefined;
  }
}
