import { AfterViewInit, Component, EventEmitter, Input, OnChanges, OnDestroy, Output, TemplateRef, ViewChild, ViewContainerRef } from '@angular/core';
import { OverlayRef } from 'src/app/ui/overlay';
import { UiTemplated } from './template.directive';
import { UiOverlayService } from './overlay.service';

let dialogId = 0;
@Component({
  selector: 'app-ui-dialog',
  template: `<ng-template #panel>
    <section class="ui-dialog ui-component" [ngClass]="styleClass" [ngStyle]="style" role="dialog" [attr.aria-modal]="modal" [attr.aria-labelledby]="id" tabindex="-1" [appTrapFocus]="modal" [appTrapFocusAutoCapture]="modal">
      <div class="ui-dialog-header"><span class="ui-dialog-title" [class.ui-dialog-title-custom]="template('header')" [id]="id"><ng-container *ngIf="template('header') as content; else title" [ngTemplateOutlet]="content"></ng-container><ng-template #title>{{header}}</ng-template></span>
        <button *ngIf="closable" type="button" class="ui-dialog-header-icon ui-dialog-header-close ui-link" aria-label="Fechar" (click)="close()"><app-icon name="times"></app-icon></button>
      </div>
      <div class="ui-dialog-content" [ngStyle]="contentStyle"><ng-content></ng-content></div>
      <div *ngIf="template('footer') as footer" class="ui-dialog-footer"><ng-container [ngTemplateOutlet]="footer"></ng-container></div>
    </section>
  </ng-template>`,
})
export class UiDialogComponent extends UiTemplated implements AfterViewInit, OnChanges, OnDestroy {
  @Input() visible = false;
  @Input() header = '';
  @Input() modal = false;
  @Input() closable = true;
  @Input() closeOnEscape = true;
  @Input() dismissableMask = false;
  @Input() style: Record<string, any> = {};
  @Input() contentStyle: Record<string, any> = {};
  @Input() styleClass = '';
  @Input() position = 'center';
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() closed = new EventEmitter<void>();
  @ViewChild('panel', { static: true }) panel!: TemplateRef<any>;
  readonly id = `ui-dialog-title-${++dialogId}`;
  private ref?: OverlayRef;
  private ready = false;
  private destroyed = false;
  constructor(private readonly layers: UiOverlayService, private readonly view: ViewContainerRef) { super(); }
  ngAfterViewInit(): void { this.ready = true; this.sync(); }
  ngOnChanges(): void { this.sync(); }
  private sync(): void {
    if (!this.ready) return;
    if (!this.visible) { this.detach(); return; }
    queueMicrotask(() => {
      if (this.destroyed || !this.visible || this.ref) return;
      const position = this.layers.overlay.position().global().centerHorizontally();
      this.position === 'top' ? position.top('.75rem') : position.centerVertically();
      this.ref = this.layers.open(this.panel, this.view, {
        positionStrategy: position,
        hasBackdrop: this.modal,
        backdropClass: 'ui-dialog-mask',
        panelClass: 'ui-dialog-pane',
        minWidth: this.style['min-width'] ?? this.style['minWidth'],
      }, () => this.close(), true, document.activeElement as HTMLElement,
      () => { if (this.closable && this.closeOnEscape) this.close(); });
      this.ref.backdropClick().subscribe(() => { if (this.dismissableMask) this.close(); });
    });
  }
  close(): void {
    this.visible = false;
    this.visibleChange.emit(false);
    this.detach();
  }
  private detach(): void {
    if (!this.ref) return;
    const ref = this.ref;
    this.ref = undefined;
    this.layers.close(ref);
    this.closed.emit();
  }
  ngOnDestroy(): void { this.destroyed = true; this.detach(); }
}
