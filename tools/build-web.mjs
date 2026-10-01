import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, relative, resolve, sep } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build, transformSync } from 'esbuild';
import { createCompilerHost, formatDiagnostics, performCompilation, readConfiguration } from '@angular/compiler-cli';
import linkerPlugin from '@angular/compiler-cli/linker/babel';
import { copyWebAssets } from './web-assets.mjs';

const root = resolve(import.meta.dirname, '..');
const compiled = resolve(root, 'out-tsc/web');
const defaultOutput = resolve(root, 'dist/sakai-ng');
const budgets = JSON.parse(readFileSync(resolve(root, 'tools/web-budgets.json'), 'utf8'));
// Babel is already part of Angular compiler-cli. Resolve it from that compiler,
// never through hoisting or an undeclared root package.
const compilerRequire = createRequire(import.meta.resolve('@angular/compiler-cli'));
const { transformAsync } = compilerRequire('@babel/core');
const linkerCache = new Map();

export function compileWeb({ production = true, checkOnly = false, emitDirectory = compiled } = {}) {
  const { rootNames, options, errors } = readConfiguration(resolve(root, 'tsconfig.app.json'), {
    rootDir: root, outDir: emitDirectory, noEmit: checkOnly, sourceMap: true,
  });
  if (errors.length) throw new Error(formatDiagnostics(errors));
  const host = createCompilerHost({ options });
  const read = host.readFile.bind(host);
  host.readResource = file => {
    if (!file.endsWith('.css')) return read(file);
    const css = transformSync(read(file), { loader: 'css', minify: production }).code;
    const bytes = Buffer.byteLength(css);
    const local = relative(root, file).replaceAll('\\', '/');
    // Angular's old esbuild builder ignored budgets. Freeze the three existing
    // oversized resources; all other/new component styles use the original limits.
    const limit = budgets.existingStyleLimits[local] ?? budgets.componentStyleError;
    if (production && !checkOnly && bytes > limit) throw new Error(`Component style exceeds ${limit} bytes: ${file} (${bytes})`);
    if (production && !checkOnly && bytes > budgets.componentStyleWarning) console.warn(`Component style warning: ${local} (${bytes} bytes; limit ${limit})`);
    return css;
  };
  host.readFile = file => production && resolve(file) === resolve(root, 'src/environments/environment.ts')
    ? read(resolve(root, 'src/environments/environment.prod.ts')) : read(file);
  const result = performCompilation({ rootNames, options, host });
  const failures = result.diagnostics.filter(diagnostic => diagnostic.category === 1);
  if (failures.length) throw new Error(formatDiagnostics(failures));
}

export async function buildWeb({ production = true, outputDirectory = defaultOutput } = {}) {
  const output = resolve(outputDirectory);
  if (output !== defaultOutput && !output.startsWith(resolve(root, '.tmp') + sep)) throw new Error('Custom web output must stay inside .tmp');
  const emitDirectory = output === defaultOutput ? compiled : resolve(root, 'out-tsc/web-dev');
  rmSync(emitDirectory, { recursive: true, force: true });
  compileWeb({ production, emitDirectory });
  rmSync(output, { recursive: true, force: true });
  mkdirSync(output, { recursive: true });
  const result = await build({
    absWorkingDir: root,
    entryPoints: { main: resolve(emitDirectory, 'src/main.js'), styles: resolve(root, 'src/styles.css') },
    outdir: output, bundle: true, splitting: true, format: 'esm', platform: 'browser',
    target: 'es2022', minify: production, sourcemap: 'linked', metafile: true,
    // Zone.js cannot intercept native async/await continuations. Angular CLI
    // lowered these too; preserve change detection after fetch and FileReader.
    supported: { 'async-await': false },
    define: production ? { ngDevMode: 'false', ngJitMode: 'false', ngI18nClosureMode: 'false' } : {},
    entryNames: production ? '[name].[hash]' : '[name]', chunkNames: 'chunk-[hash]', assetNames: 'media/[name].[hash]',
    legalComments: 'external',
    plugins: [{
      name: 'angular-aot',
      setup(builder) {
        builder.onResolve({ filter: /^src\// }, args => {
          const path = resolve(emitDirectory, args.path.replace(/\.ts$/, ''));
          return { path: existsSync(path + '.js') ? path + '.js' : resolve(path, 'index.js') };
        });
        builder.onLoad({ filter: /\.m?js$/ }, async args => {
          const code = readFileSync(args.path, 'utf8');
          if (!code.includes('ɵɵngDeclare')) return null;
          let linked = linkerCache.get(args.path);
          if (!linked || linked.source !== code) {
            const transformed = await transformAsync(code, {
              filename: args.path, configFile: false, babelrc: false, sourceMaps: true,
              plugins: [[linkerPlugin, { linkerJitMode: false }]],
            });
            linked = { source: code, code: transformed.code + '\n//# sourceMappingURL=data:application/json;base64,' + Buffer.from(JSON.stringify(transformed.map)).toString('base64') };
            linkerCache.set(args.path, linked);
          }
          return { contents: linked.code, loader: 'js' };
        });
      },
    }],
    logLevel: 'info',
  });
  copyWebAssets(root, output);
  const entries = Object.entries(result.metafile.outputs);
  if (Object.keys(result.metafile.inputs).some(name => /[\\/]@angular[\\/]compiler[\\/]fesm/.test(name))) throw new Error('JIT compiler must not enter the browser bundle');
  const main = entries.find(([, meta]) => meta.entryPoint?.endsWith('/src/main.js'));
  const styles = entries.find(([, meta]) => meta.entryPoint === 'src/styles.css');
  if (!main || !styles) throw new Error('Missing web entry output');
  // Follow only static imports for the initial budget; lazy routes remain separate.
  const initial = new Set();
  function collect(name) {
    if (initial.has(name)) return;
    initial.add(name);
    for (const entry of result.metafile.outputs[name]?.imports ?? []) if (!entry.external && entry.kind !== 'dynamic-import') collect(entry.path);
  }
  collect(main[0]); collect(styles[0]);
  const initialBytes = [...initial].reduce((sum, name) => sum + (result.metafile.outputs[name]?.bytes ?? 0), 0);
  if (production && initialBytes > budgets.initialError) throw new Error(`Initial bundle exceeds 5 MB: ${initialBytes}`);
  if (production && initialBytes > budgets.initialWarning) console.warn(`Initial bundle exceeds 3 MB warning: ${initialBytes}`);
  const html = readFileSync(resolve(root, 'src/index.html'), 'utf8')
    .replace('</head>', `<link rel="stylesheet" href="${basename(styles[0])}">\n</head>`)
    .replace('</body>', `<script type="module" src="${basename(main[0])}"></script>${production ? '' : '<script type="module">const events=new EventSource("/__reload");events.onmessage=()=>location.reload();</script>'}\n</body>`);
  writeFileSync(resolve(output, 'index.html'), html);
  writeFileSync(resolve(root, output === defaultOutput ? 'out-tsc/web-metafile.json' : 'out-tsc/web-dev-metafile.json'), JSON.stringify(result.metafile));
  console.log(`Web build complete; initial JS/CSS ${(initialBytes / 1024).toFixed(0)} KB`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.includes('--check')) compileWeb({ checkOnly: true });
    else {
      const at = process.argv.indexOf('--output');
      await buildWeb({ production: !process.argv.includes('--development'), outputDirectory: at < 0 ? defaultOutput : process.argv[at + 1] });
    }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
