import { DataKey, DataManifest, manifestPath } from '../../app/core/data-manifest';
import { Store } from '../state/store';
import { setSkillDescriptions } from '../../app/skills';

export class DescriptionStore extends Store<number> {
  private descriptions: Record<string, string> = {};
  constructor() { super(0); }
  get version(): number { return this.getSnapshot(); }
  get(id: number | string | undefined): string | undefined { return id == null ? undefined : this.descriptions[id]; }
  setDescriptions(descriptions: Record<string, string>): void {
    const custom = Object.fromEntries(Object.entries(this.descriptions).filter(([id]) => Number(id) >= 1_000_000_000_000));
    this.descriptions = { ...descriptions, ...custom };
    this.set(this.getSnapshot() + 1);
  }
  upsert(id: number, description: string): void {
    this.descriptions[id] = description;
    this.set(this.getSnapshot() + 1);
  }
}

interface BootData {
  manifest?: DataManifest;
  inFlight?: Partial<Record<DataKey, Promise<unknown>>>;
}

/** One promise per artifact, including promises started by the production HTML. */
export class DataClient {
  private manifest?: Promise<DataManifest>;
  private descriptionsLoad?: Promise<void>;
  private skillDescriptionsLoad?: Promise<void>;
  private readonly pending = new Map<DataKey, Promise<unknown>>();
  constructor(
    private readonly boot: BootData,
    readonly descriptions = new DescriptionStore(),
    private readonly fetcher: typeof fetch = fetch,
  ) {}
  private async json<T>(url: string): Promise<T> {
    const response = await this.fetcher.call(globalThis, url);
    if (!response.ok) throw new Error(`Failed to load ${url}: HTTP ${response.status}`);
    return response.json() as Promise<T>;
  }
  private getManifest(): Promise<DataManifest> {
    if (!this.manifest) {
      const pending = this.boot.manifest ? Promise.resolve(this.boot.manifest) : this.json<DataManifest>('assets/data-manifest.json');
      this.manifest = pending;
      void pending.catch(() => { if (this.manifest === pending) this.manifest = undefined; });
    }
    return this.manifest;
  }
  load<T>(key: DataKey): Promise<T> {
    if (!this.pending.has(key)) {
      const load = this.boot.inFlight?.[key] ?? this.getManifest().then(manifest => this.json(manifestPath(manifest, key)));
      this.pending.set(key, load);
      void load.catch(() => { if (this.pending.get(key) === load) this.pending.delete(key); });
    }
    return this.pending.get(key) as Promise<T>;
  }
  /** Descriptions wait for core items before consuming bandwidth. */
  loadDescriptions(): Promise<void> {
    if (!this.descriptionsLoad) {
      const pending = this.load('itemsCore').then(() => this.load<Record<string, string>>('itemsDesc'))
        .then(descriptions => { this.descriptions.setDescriptions(descriptions); });
      this.descriptionsLoad = pending;
      void pending.catch(() => { if (this.descriptionsLoad === pending) this.descriptionsLoad = undefined; });
    }
    return this.descriptionsLoad;
  }
  loadSkillDescriptions(): Promise<void> {
    if (!this.skillDescriptionsLoad) {
      const pending = this.load<Record<number, string>>('skillDescriptions').then(descriptions => {
        setSkillDescriptions(descriptions);
        // The existing description subscription also refreshes skill tooltips and details.
        this.descriptions.set(this.descriptions.getSnapshot() + 1);
      });
      this.skillDescriptionsLoad = pending;
      void pending.catch(() => { if (this.skillDescriptionsLoad === pending) this.skillDescriptionsLoad = undefined; });
    }
    return this.skillDescriptionsLoad;
  }
}
