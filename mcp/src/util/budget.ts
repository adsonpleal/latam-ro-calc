/**
 * The iteration guard for tools that loop over many candidates or many targets.
 *
 * This used to be a wall-clock deadline, and on Workers that would silently never fire:
 * `Date.now()` does not advance during CPU-bound work there — the clock only moves on I/O
 * — so a budget checked between synchronous solves would read the same millisecond every
 * time and `truncated` would become dead code. Counting iterations is both correct on
 * Workers and a more honest bound anyway, since every unit is one full solve.
 *
 * There is no concurrency limiter any more. The old one existed because the engine is
 * synchronous and the box was a shared t3.small, so a burst turned into a timeout for
 * everyone; on Workers each request gets its own isolate and its own CPU budget, and a
 * module-global counter would only ever throttle requests that happened to land on the
 * same isolate while doing nothing about the burst.
 */
import { config } from '../config';

export function createBudget(units = config.limits.maxSolveUnits) {
  let used = 0;
  return { expired: () => ++used > units };
}
