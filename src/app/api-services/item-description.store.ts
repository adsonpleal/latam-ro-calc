import { Injectable } from '@angular/core';

/**
 * Descrições pt-BR dos itens, mantidas fora dos objetos de item.
 *
 * Elas chegam depois do resto (items-desc é quase metade do peso e só é usada em
 * tooltip de hover e na prévia da busca, ambos disparados pelo usuário), então
 * quem renderiza precisa de duas coisas: ler a descrição de um id e saber que a
 * carga chegou, para descartar o que memoizou enquanto o mapa ainda estava
 * vazio — sem isso um item passado com o mouse cedo demais ficaria com o popover
 * vazio para sempre.
 *
 * Um mapa à parte, e não um campo em cada item: mexer em 6.630 objetos que o
 * `Calculator.getItem()` lê em laço quente força transição de hidden class, e um
 * pipe puro não reexecuta quando só o conteúdo do objeto muda.
 */
@Injectable({ providedIn: 'root' })
export class ItemDescriptionStore {
  private map: Record<string, string> = {};

  /** Incrementa a cada carga. Caches memoizados comparam contra isto. */
  version = 0;

  set(descriptions: Record<string, string> | null | undefined) {
    this.map = descriptions ?? {};
    this.version++;
  }

  get(id: number | string | undefined): string | undefined {
    return id == null ? undefined : this.map[id];
  }
}
