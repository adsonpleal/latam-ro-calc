import { CustomItemLibrary } from '../../app/core/custom-item-library';
import { CustomItemDefinition } from '../../app/core/custom-items';
import { Store } from '../state/store';
import { StorageLike } from '../../app/core/calc-storage';

export class CustomItems extends Store<CustomItemDefinition[]> {
  readonly library: CustomItemLibrary;
  private readonly runtime = new Map<number, CustomItemDefinition>();
  constructor(storage: StorageLike) {
    const library = new CustomItemLibrary(storage);
    super(library.list()); this.library = library;
  }
  registerRuntime(item: CustomItemDefinition): void { this.runtime.set(item.id, item); }
  get items(): CustomItemDefinition[] { return this.getSnapshot(); }
  get store(): CustomItemLibrary { return this.library; }
  iconFor(id: number): number | undefined {
    return this.runtime.get(id)?.iconItemId ?? this.getSnapshot().find(item => item.id === id)?.iconItemId;
  }
  refresh(): void { this.set(this.library.list()); }
  save(item: CustomItemDefinition): void { this.library.save(item); this.refresh(); }
  remove(id: number): void { this.library.remove(id); this.refresh(); }
}
