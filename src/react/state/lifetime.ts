import { Disposable } from '../services/events';

export class Cancelled extends Error {}
/** Owns asynchronous actions so a disposed session never commits a late result. */
export class Lifetime {
  private stopped = false;
  private readonly waits = new Map<ReturnType<typeof setTimeout>, () => void>();
  get active(): boolean { return !this.stopped; }
  check(): void { if (this.stopped) throw new Cancelled(); }
  wait(seconds = 0): Promise<void> {
    this.check();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.waits.delete(timer); resolve(); }, seconds * 1000);
      this.waits.set(timer, () => reject(new Cancelled()));
    });
  }
  watch<T>(task: Promise<T>, callbacks: ((value: T) => void) | {
    next?: (value: T) => void; complete?: () => void; error?: (error: unknown) => void;
  }, publish: () => void): Disposable {
    let listening = true;
    void task.then(value => {
      if (!this.active || !listening) return;
      if (typeof callbacks === 'function') callbacks(value);
      else { callbacks.next?.(value); callbacks.complete?.(); }
      publish();
    }).catch(error => {
      if (!this.active || !listening || error instanceof Cancelled) return;
      if (typeof callbacks !== 'function' && callbacks.error) callbacks.error(error);
      else console.error(error);
      publish();
    });
    return { unsubscribe: () => { listening = false; } };
  }
  dispose(): void {
    this.stopped = true;
    for (const [timer, reject] of this.waits) { clearTimeout(timer); reject(); }
    this.waits.clear();
  }
}
