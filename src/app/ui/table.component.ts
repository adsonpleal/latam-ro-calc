import { Component, Directive, EventEmitter, HostBinding, HostListener, Input, Output } from '@angular/core';
import { UiTemplated } from './template.directive';

@Component({
  selector: 'app-ui-table',
  template: `<div class="ui-datatable ui-component" [ngClass]="styleClass" [attr.aria-busy]="loading">
    <div class="ui-datatable-wrapper"><table class="ui-datatable-table" [ngStyle]="tableStyle">
      <thead class="ui-datatable-thead"><ng-container [ngTemplateOutlet]="template('header')"></ng-container></thead>
      <tbody class="ui-datatable-tbody"><ng-container *ngFor="let item of displayed; let index = index" [ngTemplateOutlet]="template('body')" [ngTemplateOutletContext]="{ $implicit: item, rowIndex: start + index }"></ng-container>
        <ng-container *ngIf="!displayed.length" [ngTemplateOutlet]="template('emptymessage')"></ng-container>
      </tbody>
    </table></div>
    <div *ngIf="loading" class="ui-datatable-loading-overlay"><app-icon name="spinner" label="Carregando"></app-icon></div>
    <nav *ngIf="paginator" class="ui-paginator ui-component" aria-label="Paginação">
      <span *ngIf="showCurrentPageReport" class="ui-paginator-current">{{report}}</span>
      <button type="button" class="ui-paginator-first ui-paginator-element ui-link" [disabled]="page === 0" aria-label="Primeira página" (click)="go(0)"><app-icon name="angle-double-left"></app-icon></button>
      <button type="button" class="ui-paginator-prev ui-paginator-element ui-link" [disabled]="page === 0" aria-label="Página anterior" (click)="go(page - 1)"><app-icon name="chevron-left"></app-icon></button>
      <span class="ui-paginator-pages"><button *ngFor="let number of pages" type="button" class="ui-paginator-page ui-paginator-element ui-link" [class.ui-highlight]="page === number" [attr.aria-current]="page === number ? 'page' : null" [attr.aria-label]="'Página ' + (number + 1)" (click)="go(number)">{{number + 1}}</button></span>
      <button type="button" class="ui-paginator-next ui-paginator-element ui-link" [disabled]="page >= pageCount - 1" aria-label="Próxima página" (click)="go(page + 1)"><app-icon name="chevron-right"></app-icon></button>
      <button type="button" class="ui-paginator-last ui-paginator-element ui-link" [disabled]="page >= pageCount - 1" aria-label="Última página" (click)="go(pageCount - 1)"><app-icon name="angle-double-right"></app-icon></button>
    </nav>
  </div>`,
})
export class UiTableComponent extends UiTemplated {
  @Input() value: any[] = [];
  @Input() loading = false;
  @Input() styleClass = '';
  @Input() tableStyle: Record<string, any> = {};
  @Input() paginator = false;
  @Input() rows = 10;
  @Input() first = 0;
  @Input() totalRecords?: number;
  @Input() pageLinks = 5;
  @Input() showCurrentPageReport = false;
  @Input() currentPageReportTemplate = '{currentPage} de {totalPages}';
  @Input() selectionMode = '';
  @Input() selection: any;
  @Input() dataKey = '';
  @Output() firstChange = new EventEmitter<number>();
  @Output() selectionChange = new EventEmitter<any>();
  @Output() rowSelected = new EventEmitter<{ data: any }>();
  @Output() rowUnselected = new EventEmitter<{ data: any }>();
  get total(): number { return this.totalRecords ?? this.value?.length ?? 0; }
  get pageCount(): number { return Math.max(1, Math.ceil(this.total / this.rows)); }
  get page(): number { return Math.max(0, Math.min(this.pageCount - 1, Math.floor(this.first / this.rows))); }
  get start(): number { return this.paginator ? this.page * this.rows : 0; }
  get displayed(): any[] { return this.paginator ? (this.value ?? []).slice(this.start, this.start + this.rows) : this.value ?? []; }
  get pages(): number[] { const start = Math.max(0, Math.min(this.page - Math.floor(this.pageLinks / 2), this.pageCount - this.pageLinks)); return Array.from({ length: Math.min(this.pageLinks, this.pageCount) }, (_, i) => start + i); }
  get report(): string {
    const fields = { totalRecords: this.total, currentPage: this.page + 1, totalPages: this.pageCount, first: this.total ? this.start + 1 : 0, last: Math.min(this.total, this.start + this.rows), rows: this.rows };
    return this.currentPageReportTemplate.replace(/\{(\w+)\}/g, (match, key) => fields[key] == null ? match : String(fields[key]));
  }
  go(page: number): void { this.first = Math.max(0, Math.min(this.pageCount - 1, page)) * this.rows; this.firstChange.emit(this.first); }
  selected(row: any): boolean { return this.selection === row || !!this.dataKey && this.selection != null && this.selection[this.dataKey] === row?.[this.dataKey]; }
  choose(row: any): void {
    const selected = this.selected(row);
    this.selection = selected ? null : row;
    this.selectionChange.emit(this.selection);
    (selected ? this.rowUnselected : this.rowSelected).emit({ data: row });
  }
}

@Directive({ selector: '[appSelectableRow]' })
export class UiSelectableRowDirective {
  @HostBinding('class.ui-selectable-row') readonly rowClass = true;
  @HostBinding('attr.tabindex') readonly tabindex = 0;
  @Input('appSelectableRow') row: any;
  constructor(private readonly table: UiTableComponent) {}
  @HostBinding('class.ui-highlight') get selected(): boolean { return this.table.selected(this.row); }
  @HostBinding('attr.aria-selected') get ariaSelected(): boolean { return this.selected; }
  @HostListener('click') click(): void { this.table.choose(this.row); }
  @HostListener('keydown', ['$event']) key(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); this.click(); }
    else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault(); const row = event.currentTarget as HTMLElement;
      (event.key === 'ArrowDown' ? row.nextElementSibling as HTMLElement : row.previousElementSibling as HTMLElement)?.focus();
    }
  }
}
