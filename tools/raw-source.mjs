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
