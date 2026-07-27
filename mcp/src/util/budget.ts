/**
 * CPU guards.
 *
 * The engine is synchronous, so a solve blocks the event loop for the whole process —
 * and this box is a shared t3.small also serving two Go services. Queueing an
 * unbounded burst would just convert it into a timeout for everyone, so past the
 * limit we reject fast and say so.
 */
import { config } from '../config';

let inFlight = 0;

export class BusyError extends Error {
  constructor() {
    super('O servidor está processando outros cálculos no momento. Tente novamente em alguns segundos.');
    this.name = 'BusyError';
  }
}

/** Run a solve-bearing operation, or fail immediately if too many are already running. */
export async function withSolveSlot<T>(fn: () => T | Promise<T>): Promise<T> {
  if (inFlight >= config.limits.maxConcurrentSolves) throw new BusyError();
  inFlight++;
  try {
    return await fn();
  } finally {
    inFlight--;
  }
}

/**
 * A wall-clock budget for tools that iterate (many candidates, many targets). Callers
 * check it between iterations and return partial results rather than running long.
 */
export function createBudget(ms = config.limits.solveBudgetMs) {
  const deadline = Date.now() + ms;
  return {
    expired: () => Date.now() > deadline,
    remainingMs: () => Math.max(0, deadline - Date.now()),
  };
}
