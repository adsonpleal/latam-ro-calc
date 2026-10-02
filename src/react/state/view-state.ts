import { Store } from './store';
import { Lifetime } from './lifetime';

/** State owned by one view; calculations remain in the application session. */
export class ViewState extends Store<number> {
  protected readonly lifetime = new Lifetime();
  constructor() { super(0); }
  publish(): void { if (this.lifetime.active) this.set(this.getSnapshot() + 1); }
  dispose(): void { this.lifetime.dispose(); }
  action<T>(action: () => T): T {
    const result = action(); this.publish();
    if (result instanceof Promise) void result.finally(() => this.publish()).catch(() => undefined);
    return result;
  }
}
