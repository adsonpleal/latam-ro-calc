/**
 * The URL the document was opened with, captured before Angular boots.
 *
 * This exists because of `<base href="/">`. `history.replaceState()` resolves its URL
 * argument against the document's **base** URL, not the current one — so the very first
 * thing the router does, replacing the URL with `#/`, resolves to `<origin>/#/` and
 * throws away the path a share link arrived on. By the time `ngOnInit` reads
 * `window.location.href` there is no `/s/<token>/` left to read.
 *
 * The legacy `#/?b=…` form was immune to this (the router preserves the hash, since it
 * is what it routes on), which is exactly why the problem only appears now.
 *
 * `main.ts` calls `captureShareEntry` before `bootstrapModule` — an explicit call, not
 * a module side effect, so no bundler can drop it.
 *
 * Framework-free (src/app/core): no Angular/RxJS/PrimeNG, and no DOM read of its own —
 * the caller supplies the href.
 */
let entryHref: string | null = null;

/** Record the opening URL. Call once, before anything can rewrite it. */
export const captureShareEntry = (href: string): void => {
  entryHref = href;
};

/**
 * The opening URL, or the live one if nothing was captured (a test, or a bootstrap
 * path that never called `captureShareEntry`).
 */
export const shareEntryHref = (): string => entryHref ?? (typeof window === 'undefined' ? '' : window.location.href);

/** Test seam: forget the captured URL. */
export const resetShareEntry = (): void => {
  entryHref = null;
};
