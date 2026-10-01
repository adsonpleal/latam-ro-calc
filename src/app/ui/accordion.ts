import { Component, ContentChildren, EventEmitter, Input, Output, QueryList, forwardRef, Inject } from '@angular/core';
import { UiTemplated } from './template.directive';

let accordionId = 0;
@Component({ selector: 'app-ui-accordion', template: '<div class="ui-accordion ui-component"><ng-content></ng-content></div>' })
export class UiAccordionComponent {
  @Input() multiple = false;
  @Input() activeIndex: number | number[] = [];
  @Output() tabOpened = new EventEmitter<{ index: number }>();
  @Output() tabClosed = new EventEmitter<{ index: number }>();
  @ContentChildren(forwardRef(() => UiAccordionTabComponent)) tabs!: QueryList<UiAccordionTabComponent>;
  isOpen(tab: UiAccordionTabComponent): boolean {
    const index = this.tabs?.toArray().indexOf(tab);
    return Array.isArray(this.activeIndex) ? this.activeIndex.includes(index) : this.activeIndex === index;
  }
  toggle(tab: UiAccordionTabComponent): void {
    const index = this.tabs.toArray().indexOf(tab);
    const open = this.isOpen(tab);
    const current = Array.isArray(this.activeIndex) ? this.activeIndex : [this.activeIndex];
    this.activeIndex = this.multiple ? (open ? current.filter(i => i !== index) : [...current, index]) : open ? null : index;
    (open ? this.tabClosed : this.tabOpened).emit({ index });
  }
}

@Component({
  selector: 'app-ui-accordion-tab',
  template: `<div class="ui-accordion-tab" [class.ui-accordion-tab-active]="open">
    <div class="ui-accordion-header" [class.ui-highlight]="open">
      <button type="button" class="ui-accordion-header-link" [id]="id + '-header'" [attr.aria-expanded]="open" [attr.aria-controls]="id" (click)="accordion.toggle(this)">
        <app-icon class="ui-accordion-toggle-icon" [name]="open ? 'chevron-down' : 'chevron-right'"></app-icon>
        <ng-container *ngIf="template('header') as content; else text" [ngTemplateOutlet]="content"></ng-container><ng-template #text><span class="ui-accordion-header-text">{{header}}</span></ng-template>
      </button>
    </div>
    <div class="ui-toggleable-content" [hidden]="!open" [id]="id" role="region" [attr.aria-labelledby]="id + '-header'"><div class="ui-accordion-content"><ng-content></ng-content></div></div>
  </div>`,
})
export class UiAccordionTabComponent extends UiTemplated {
  @Input() header = '';
  readonly id = `ui-accordion-${++accordionId}`;
  constructor(@Inject(forwardRef(() => UiAccordionComponent)) public readonly accordion: UiAccordionComponent) { super(); }
  get open(): boolean { return this.accordion.isOpen(this); }
}
