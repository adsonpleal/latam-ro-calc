// Access to the ragassets `/raw` tables — this repo's single source for
// everything extracted from the Ragnarok LATAM client.
//
//   https://assets.latam-tools.com.br/raw/<name>.json
//
// ragassets reads the client GRF (iteminfo_new.lub, itemmoveinfov5.txt, the job
// icons, …) and republishes the result as compact JSON arrays sorted by id. This
// repo only ever *downloads* those files; it never opens a GRF and never calls
// an upstream API. See tools/sync-latam-db.mjs (items/views/classes) and
// tools/mob-source.mjs (monsters).
//
// Every table that carries text is published once per locale — `items.json` is
// pt-BR, `items_en.json` and `items_es.json` the client's own English and Spanish
// copies — for `items`, `jobs`, `skills`, `status`, `randomopt` and `classes`.
// Only the item ones are consumed here (sync-latam-db.mjs); the rest of the UI's
// translations are hand-written i18n files, not client text. The locales are
// indexable by the same ids as pt-BR except `items`, where the client's own
// tables disagree by a few rows, so never assume a locale row exists.
// `mobs_en.json` / `mobs_es.json` do not exist: monster names are not client
// data. These files are mutable at a stable URL (`max-age=300`), unlike the
// content-addressed assets, so a sync that finds nothing new costs one 304.

import { readFileSync } from "node:fs";
import { join } from "node:path";

// Also the runtime image gateway's host (src/environments/environment.ts) — the
// build tooling can't import the Angular env, so the two are kept in step by hand.
export const RAW_BASE = "https://assets.latam-tools.com.br/raw";

/**
 * Read one `/raw` table. `srcDir` makes it work offline: a directory holding the
 * tables, e.g. a ragassets checkout's `resources/raw`. It is a directory and not
 * a file path on purpose — a caller passing one table's path would otherwise get
 * that table back under every name it asked for. Without it the file is
 * downloaded.
 */
export async function loadRawJson(name, srcDir) {
  if (srcDir) return readRawFile(join(srcDir, name));

  const url = `${RAW_BASE}/${name}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`GET ${url} — HTTP ${r.status}`);
  return r.json();
}

export const readRawFile = (path) => JSON.parse(readFileSync(path, "utf8"));
