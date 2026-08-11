import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, from, of, shareReplay, switchMap, tap } from 'rxjs';
import { ItemDescriptionStore } from './item-description.store';

/**
 * Data keys emitted by tools/build-web-data.mjs. See data-manifest.json.
 */
type DataKey = 'itemsCore' | 'itemsDesc' | 'monsters' | 'hpsp' | 'classes' | 'itemViews';

interface DataManifest {
  v: number;
  base: string;
  files: Record<DataKey, string>;
}

/**
 * Fetches of the artifacts the production index.html already kicked off during
 * HTML parse (see tools/inject-data-manifest.mjs). Absent under `ng serve`.
 */
declare global {
  interface Window {
    __RO_DATA__?: DataManifest;
    __RO_BOOT__?: Partial<Record<DataKey, Promise<unknown>>>;
  }
}

@Injectable()
export class RoService {
  private readonly manifest$: Observable<DataManifest>;
  private readonly cachedItems$: Observable<any>;
  private readonly cachedMonster$: Observable<any>;
  private readonly cachedHpSpTable$: Observable<any>;
  private readonly cachedLatamClasses$: Observable<number[]>;
  private readonly cachedItemViews$: Observable<Record<string, [number, number]>>;
  private readonly cachedItemDescriptions$: Observable<Record<string, string>>;

  constructor(private http: HttpClient, private itemDescriptions: ItemDescriptionStore) {
    // The injected manifest is authoritative when present; otherwise fetch it.
    // It is tiny and served `no-cache`, while everything it points at is
    // content-hashed and immutable.
    this.manifest$ = (window.__RO_DATA__ ? of(window.__RO_DATA__) : this.http.get<DataManifest>('assets/data-manifest.json')).pipe(
      shareReplay(1),
    );

    // item.json + latam-items.json used to be merged here, on every page load:
    // presentInLatam, canGrade, enName and the pt-BR name/description swap. That
    // all happens at build time now (tools/build-web-data.mjs), so this is a
    // plain fetch. The dev-only script/class validation moved to
    // item-script-keys.spec.ts, where it runs once in CI instead of on every
    // reload.
    this.cachedItems$ = this.boot<any>('itemsCore');
    this.cachedMonster$ = this.boot<any>('monsters');
    this.cachedHpSpTable$ = this.boot<any>('hpsp');
    // Job-icon ids present in the LATAM client (from tools/sync-latam-db.mjs);
    // classes whose icon isn't here are unreleased on LATAM and hidden in the UI.
    this.cachedLatamClasses$ = this.boot<number[]>('classes');
    // item id -> sprite "view" id (client ClassNum) for rendering equipped gear
    // (headgear/garment) on the character paper-doll (from tools/sync-latam-db.mjs).
    this.cachedItemViews$ = this.boot<Record<string, [number, number]>>('itemViews');

    // Descriptions are ~half the payload and are only read on hover and in the
    // item-search preview, so they wait for the core to land before competing
    // for bandwidth. Everything renders fine without them (the popover shows the
    // item name alone until they arrive).
    this.cachedItemDescriptions$ = this.cachedItems$.pipe(
      switchMap(() => this.boot<Record<string, string>>('itemsDesc')),
      tap((descriptions) => this.itemDescriptions.set(descriptions)),
      shareReplay(1),
    );
  }

  /**
   * In production index.html already started this fetch during HTML parse —
   * roughly 1,4 MB of JS earlier than the lazy route chunk could have. Adopt
   * that in-flight promise instead of issuing a second request. Under
   * `ng serve` there is no injection, so fall back to the manifest.
   */
  private boot<T>(key: DataKey): Observable<T> {
    const inFlight = window.__RO_BOOT__?.[key] as Promise<T> | undefined;
    if (inFlight) return from(inFlight).pipe(shareReplay(1));

    return this.manifest$.pipe(
      switchMap((manifest) => this.http.get<T>(manifest.base + manifest.files[key])),
      shareReplay(1),
    );
  }

  getItems<T>(): Observable<T> {
    return this.cachedItems$;
  }

  /** pt-BR item descriptions, loaded after the core item map. */
  getItemDescriptions(): Observable<Record<string, string>> {
    return this.cachedItemDescriptions$;
  }

  /** item id -> [sprite view id (ClassNum), visual-slot mask], for the paper-doll. */
  getItemViews(): Observable<Record<string, [number, number]>> {
    return this.cachedItemViews$;
  }

  getMonsters<T>(): Observable<T> {
    return this.cachedMonster$;
  }

  getHpSpTable<T>(): Observable<T> {
    return this.cachedHpSpTable$;
  }

  getLatamClasses(): Observable<number[]> {
    return this.cachedLatamClasses$;
  }
}
