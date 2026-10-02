import { IconName } from '../../app/ui/icon-names';
import { Store } from '../state/store';

export interface Message {
  severity?: 'success' | 'info' | 'warn' | 'error'; summary?: string; detail?: string;
  life?: number; sticky?: boolean; key?: string; data?: unknown;
}
export class Messages extends Store<readonly Message[]> {
  private readonly timers = new Map<Message, ReturnType<typeof setTimeout>>();
  constructor() { super([]); }
  add(message: Message): void {
    this.update(previous => [...previous, message]);
    if (!message.sticky) {
      clearTimeout(this.timers.get(message));
      this.timers.set(message, setTimeout(() => this.remove(message), message.life ?? 3000));
    }
  }
  remove(message: Message): void {
    clearTimeout(this.timers.get(message)); this.timers.delete(message);
    this.update(previous => previous.filter(entry => entry !== message));
  }
  clear(key?: string): void { for (const message of this.getSnapshot()) if (!key || message.key === key) this.remove(message); }
  dispose(): void { this.clear(); }
}
export interface Confirmation { message: string; header?: string; icon?: IconName; accept: () => void; reject: () => void; }
export class Confirmations extends Store<Confirmation | null> {
  constructor() { super(null); }
  confirm(request: Confirmation): void { this.resolve(false); this.set(request); }
  resolve(accepted: boolean): void {
    const request = this.getSnapshot(); this.set(null);
    if (request) accepted ? request.accept() : request.reject();
  }
  dispose(): void { this.resolve(false); }
}
