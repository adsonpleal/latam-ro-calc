#!/usr/bin/env node
// Post-build step: teach the built index.html where the hashed data artifacts
// are, and start downloading them during HTML parse.
//
// Why not just fetch a manifest from the app? Because RoService only exists
// inside the lazy route chunk (1,35 MB), so a fetch issued from there cannot
// start until that chunk has downloaded AND executed. Injecting the map into the
// HTML costs zero extra round trips and moves the start of the ~275 KB core
// download about 1,4 MB of JavaScript earlier. The app still falls back to
// fetching assets/data-manifest.json when the injection is absent (`ng serve`).
//
// A real fetch() rather than <link rel="preload" as="fetch">: preload only
// dedupes when the later request's CORS mode and credentials match exactly,
// otherwise the browser silently downloads the file twice. A promise parked on
// window has no matching semantics to get wrong, and it warms the JSON parse.
//
// Usage:
//   node tools/inject-data-manifest.mjs [--dist dist/sakai-ng]

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');

const MARKER = '__RO_DATA__';
// items-desc e item-views ficam de fora: disputariam banda com o núcleo, e o
// RoService só os pede depois que ele resolve.
const EAGER_KEYS = ['itemsCore', 'monsters', 'hpsp', 'classes'];

function parseArgs(argv) {
  let dist = join(ROOT, 'dist/sakai-ng');
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--dist') dist = argv[++i];
    else {
      console.error('usage: node tools/inject-data-manifest.mjs [--dist <dir>]');
      process.exit(1);
    }
  }
  return { dist: resolve(dist) };
}

function fail(message) {
  console.error(`inject-data-manifest: ${message}`);
  process.exit(1);
}

function buildSnippet(manifest, chunkPreloads) {
  const boot = `<script>window.${MARKER}=${JSON.stringify(manifest)};
(function(m){var b=m.base,f=m.files,o={};
${JSON.stringify(EAGER_KEYS)}.forEach(function(k){
var p=fetch(b+f[k]).then(function(r){if(!r.ok)throw new Error(k+" "+r.status);return r.json();});
p.catch(function(){});o[k]=p;});
window.__RO_BOOT__=o;})(window.${MARKER});</script>`;

  const preloads = chunkPreloads.map((f) => `<link rel="modulepreload" href="${f}">`).join('\n');
  return [boot, preloads].filter(Boolean).join('\n');
}

function main() {
  const { dist } = parseArgs(process.argv);

  const indexPath = join(dist, 'index.html');
  const manifestPath = join(dist, 'assets/data-manifest.json');

  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch {
    fail(`could not read ${manifestPath} — did \`node tools/build-web-data.mjs --hash\` run before \`ng build\`?`);
  }

  for (const key of EAGER_KEYS) {
    if (!manifest.files?.[key]) fail(`manifest is missing the "${key}" entry`);
  }

  let html;
  try {
    html = readFileSync(indexPath, 'utf8');
  } catch {
    fail(`could not read ${indexPath}`);
  }

  if (html.includes(MARKER)) fail('index.html already carries an injection — build output is stale, clean dist/ first');
  if (!html.includes('</head>')) fail('index.html has no </head> to inject before');

  // O builder já emite modulepreload para os chunks compartilhados, mas não para
  // o da rota lazy — que só é descoberto depois que o main.js executa. Há uma
  // única rota, então pré-carregar o que sobrou é o certo aqui.
  const chunks = readdirSync(dist).filter((f) => /^chunk-[\w]+\.js$/.test(f));
  const missing = chunks.filter((f) => !html.includes(f));
  if (missing.length > 2) {
    console.warn(`inject-data-manifest: ${missing.length} chunks sem preload — se a app ganhou rotas, revise se pré-carregar todas ainda faz sentido`);
  }

  writeFileSync(indexPath, html.replace('</head>', `${buildSnippet(manifest, missing)}\n</head>`));

  console.log(`inject-data-manifest: ${EAGER_KEYS.length} fetches + ${missing.length} modulepreload injetados em ${indexPath}`);
}

main();
