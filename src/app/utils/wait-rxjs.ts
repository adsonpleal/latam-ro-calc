import { delay, of, take } from 'rxjs';

/**
 * Cede a main thread entre etapas síncronas pesadas, para o overlay de bloqueio
 * conseguir repintar. `delay(0)` já agenda um macrotask, que é tudo o que o
 * repaint precisa — o padrão anterior de 100 ms era margem arbitrária e, somado
 * pelas cadeias de `loadItemSet` e `onClassChange`, custava quase 2 s por
 * abertura. Os hops em si são necessários: sem eles a mutação do modelo e o
 * re-render dos dropdowns do PrimeNG acontecem no mesmo tick.
 */
export const waitRxjs = <T>(second: number = 0, res = null as T) => {
  return of(res).pipe(delay(1000 * second), take(1));
};
