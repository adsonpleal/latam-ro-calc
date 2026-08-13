import { delay, of, take } from 'rxjs';

/**
 * Yields the main thread between heavy synchronous steps, so the blocking overlay can
 * repaint. `delay(0)` already schedules a macrotask, which is all the repaint needs — the
 * previous 100 ms default was an arbitrary margin and, summed across the `loadItemSet`
 * and `onClassChange` chains, cost nearly 2 s per boot. The hops themselves are
 * necessary: without them the model mutation and the PrimeNG dropdown re-render happen
 * on the same tick.
 */
export const waitRxjs = <T>(second: number = 0, res = null as T) => {
  return of(res).pipe(delay(1000 * second), take(1));
};
