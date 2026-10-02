/** Stable snapshots for React; mutable calculator instances stay outside rendering. */
export class Store<T> {
  private readonly listeners = new Set<() => void>();
  constructor(private snapshot: T) {}
  readonly getSnapshot = (): T => this.snapshot;
  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  set(next: T): void {
    if (Object.is(next, this.snapshot)) return;
    this.snapshot = next;
    for (const listener of [...this.listeners]) listener();
  }
  update(update: (previous: T) => T): void { this.set(update(this.snapshot)); }
}

/** A superseded or disposed request must never publish its result to the UI. */
export class LatestRequest {
  private generation = 0;
  private abort?: AbortController;
  private disposed = false;
  async run<T>(load: (signal: AbortSignal) => Promise<T>, commit: (value: T) => void): Promise<void> {
    if (this.disposed) return;
    this.abort?.abort();
    const abort = new AbortController();
    this.abort = abort;
    const generation = ++this.generation;
    try {
      const value = await load(abort.signal);
      if (!this.disposed && generation === this.generation) commit(value);
    } catch (error) {
      if (!abort.signal.aborted && !this.disposed && generation === this.generation) throw error;
    } finally {
      if (this.abort === abort) this.abort = undefined;
    }
  }
  dispose(): void { this.disposed = true; ++this.generation; this.abort?.abort(); this.abort = undefined; }
}
