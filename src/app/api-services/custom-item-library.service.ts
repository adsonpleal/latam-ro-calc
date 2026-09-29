import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CustomItemLibrary } from '../core/custom-item-library';
import { CustomItemDefinition } from '../core/custom-items';

@Injectable({ providedIn: 'root' })
export class CustomItemLibraryService {
  readonly store = new CustomItemLibrary(localStorage);
  private readonly runtime = new Map<number, CustomItemDefinition>();
  private readonly changed = new BehaviorSubject<CustomItemDefinition[]>(this.store.list());
  readonly items$ = this.changed.asObservable();
  get items(): CustomItemDefinition[] { return this.changed.value; }
  registerRuntime(item: CustomItemDefinition): void { this.runtime.set(item.id, item); }
  iconFor(id: number): number | undefined {
    return this.runtime.get(id)?.iconItemId ?? this.items.find((item) => item.id === id)?.iconItemId;
  }
  refresh(): void { this.changed.next(this.store.list()); }
  save(item: CustomItemDefinition): void { this.store.save(item); this.refresh(); }
  remove(id: number): void { this.store.remove(id); this.refresh(); }
}
