import { ContentChildren, Directive, Input, QueryList, TemplateRef } from '@angular/core';

@Directive({ selector: '[appTemplate]' })
export class UiTemplateDirective {
  @Input('appTemplate') name = '';
  constructor(public readonly template: TemplateRef<any>) {}
}

@Directive()
export abstract class UiTemplated {
  @ContentChildren(UiTemplateDirective) templates?: QueryList<UiTemplateDirective>;
  template(name: string): TemplateRef<any> | null {
    return this.templates?.find(entry => entry.name === name)?.template ?? null;
  }
}
