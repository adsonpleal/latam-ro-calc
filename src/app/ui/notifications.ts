import { Component, ElementRef, Injectable, Input, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { IconName } from './icon-names';
import { PageScrollLockService } from '../page-scroll-lock.service';

export interface UiMessage {
  severity?: 'success' | 'info' | 'warn' | 'error';
  summary?: string;
  detail?: string;
  life?: number;
  sticky?: boolean;
  key?: string;
  data?: unknown;
}
@Injectable({ providedIn: 'root' })
export class UiMessageService implements OnDestroy {
  readonly messages = new BehaviorSubject<UiMessage[]>([]);
  private timers = new Map<UiMessage, ReturnType<typeof setTimeout>>();
  add(message: UiMessage): void {
    this.messages.next([...this.messages.value, message]);
    if (!message.sticky) this.timers.set(message, setTimeout(() => this.remove(message), message.life ?? 3000));
  }
  remove(message: UiMessage): void {
    clearTimeout(this.timers.get(message)); this.timers.delete(message);
    this.messages.next(this.messages.value.filter(entry => entry !== message));
  }
  clear(key?: string): void { for (const message of this.messages.value) if (!key || message.key === key) this.remove(message); }
  ngOnDestroy(): void { this.clear(); this.messages.complete(); }
}

@Component({
  selector: 'app-ui-toast',
  template: `<div class="ui-toast ui-component" aria-live="polite"><div *ngFor="let message of service.messages | async" class="ui-toast-message" [ngClass]="'ui-toast-message-' + (message.severity || 'info')" role="status">
    <div class="ui-toast-message-content"><app-icon class="ui-toast-message-icon" [name]="icons[message.severity || 'info']"></app-icon><div class="ui-toast-message-text"><div class="ui-toast-summary">{{message.summary}}</div><div class="ui-toast-detail">{{message.detail}}</div></div><button type="button" class="ui-toast-icon-close ui-link" aria-label="Fechar notificação" (click)="service.remove(message)"><app-icon name="times"></app-icon></button></div>
  </div></div>`,
})
export class UiToastComponent {
  readonly icons: Record<string, IconName> = { success: 'check', info: 'info-circle', warn: 'exclamation-triangle', error: 'times-circle' };
  constructor(public readonly service: UiMessageService) {}
}

export interface UiConfirmation { message: string; header?: string; icon?: IconName; accept: () => void; reject: () => void; }
@Injectable({ providedIn: 'root' })
export class UiConfirmationService {
  readonly request = new BehaviorSubject<UiConfirmation | null>(null);
  confirm(request: UiConfirmation): void { this.resolve(false); this.request.next(request); }
  resolve(accepted: boolean): void {
    const request = this.request.value;
    this.request.next(null);
    if (request) accepted ? request.accept() : request.reject();
  }
}

@Component({
  selector: 'app-ui-confirm-dialog',
  template: `<app-ui-dialog [visible]="!!request" [header]="request?.header || 'Confirmação'" [style]="style" [position]="position" [modal]="true" styleClass="ui-confirm-dialog" (visibleChange)="!$event && service.resolve(false)">
    <div class="ui-confirm-dialog-message"><app-icon *ngIf="request?.icon" class="ui-confirm-dialog-icon" [name]="request.icon"></app-icon><span>{{request?.message}}</span></div>
    <ng-template appTemplate="footer"><button type="button" appButton class="ui-confirm-dialog-reject" icon="times" label="Não" (click)="service.resolve(false)"></button><button type="button" appButton cdkFocusInitial class="ui-confirm-dialog-accept" icon="check" label="Sim" (click)="service.resolve(true)"></button></ng-template>
  </app-ui-dialog>`,
})
export class UiConfirmDialogComponent implements OnDestroy {
  @Input() position = 'center';
  @Input() style: Record<string, any> = {};
  request: UiConfirmation | null = null;
  private subscription: Subscription;
  constructor(public readonly service: UiConfirmationService) { this.subscription = service.request.subscribe(request => this.request = request); }
  ngOnDestroy(): void { this.subscription.unsubscribe(); this.service.resolve(false); }
}

@Component({ selector: 'app-ui-block', template: `<div *ngIf="blocked" class="ui-blockui ui-component-overlay" role="status" aria-live="polite" aria-label="Carregando" aria-busy="true"></div>` })
export class UiBlockComponent implements OnDestroy {
  private active = false;
  constructor(private readonly host: ElementRef<HTMLElement>, private readonly scroll: PageScrollLockService) {}
  @Input() set blocked(blocked: boolean) {
    if (blocked === this.active) return;
    this.active = blocked;
    blocked ? this.scroll.lock(this.host.nativeElement) : this.scroll.unlock(this.host.nativeElement);
  }
  get blocked(): boolean { return this.active; }
  ngOnDestroy(): void { this.blocked = false; }
}
