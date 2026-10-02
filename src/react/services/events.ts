export interface Disposable { unsubscribe(): void; }
/** An explicit callback list; subscribers own their disposal. */
export class Events<T = unknown> {
  private readonly listeners = new Set<(value: T) => void>();
  next(value?: T): void { for (const listener of [...this.listeners]) listener(value as T); }
  emit(value?: T): void { this.next(value); }
  subscribe(listener: (value: T) => void): Disposable {
    this.listeners.add(listener);
    return { unsubscribe: () => { this.listeners.delete(listener); } };
  }
  clear(): void { this.listeners.clear(); }
}
export function listenDebounced<T>(events: Events<T>, milliseconds: number, action: (value: T) => void,
  immediate?: (value: T) => void): Disposable {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const subscription = events.subscribe(value => {
    immediate?.(value); clearTimeout(timer);
    timer = setTimeout(() => { timer = undefined; action(value); }, milliseconds);
  });
  return { unsubscribe: () => { clearTimeout(timer); subscription.unsubscribe(); } };
}
