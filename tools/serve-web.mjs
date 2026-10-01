import { createServer } from 'node:http';
import { createReadStream, existsSync, readFileSync, rmSync, statSync, watch } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import { spawn } from 'node:child_process';
import { createSourceTracker } from './web-watch.mjs';

const root = resolve(import.meta.dirname, '..');
let generation = 0;
let output = resolve(root, `.tmp/web-dev-${process.pid}-0`);
const option = (name, fallback) => { const index = process.argv.indexOf(name); return index < 0 ? fallback : process.argv[index + 1]; };
const host = option('--host', '0.0.0.0');
const port = Number(option('--port', '4200'));
const clients = new Set();
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2' };
const server = createServer((request, response) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); } catch { response.writeHead(400).end(); return; }
  if (pathname === '/__reload') {
    response.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    response.write(': connected\n\n'); clients.add(response);
    request.on('close', () => clients.delete(response)); return;
  }
  let file = resolve(output, '.' + pathname);
  if (file !== output && !file.startsWith(output + sep)) { response.writeHead(403).end(); return; }
  if (!existsSync(file) || !statSync(file).isFile()) {
    if (extname(pathname)) { response.writeHead(404).end(); return; }
    file = resolve(output, 'index.html');
  }
  response.writeHead(200, { 'Content-Type': mime[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
  if (request.method === 'HEAD') response.end();
  else createReadStream(file).on('error', () => response.destroy()).pipe(response);
});
function run(args) {
  return new Promise((done, reject) => {
    const child = spawn(process.execPath, args, { cwd: root, stdio: 'inherit', windowsHide: true });
    child.on('error', reject);
    child.on('exit', code => code === 0 ? done() : reject(new Error(`Build command failed (${code})`)));
  });
}
async function build(outputDirectory) {
  await run(['tools/build-web-data.mjs']);
  await run(['tools/build-web.mjs', '--development', '--output', outputDirectory]);
}
await build(output);
server.listen(port, host, () => console.log(`Development server: http://${host}:${port}`));
let rebuilding = false;
let pending = false;
let timer;
async function rebuild() {
  if (rebuilding) { pending = true; return; }
  rebuilding = true;
  try {
    const next = resolve(root, `.tmp/web-dev-${process.pid}-${++generation}`);
    await build(next);
    const previous = output; output = next;
    for (const response of clients) response.write('data: reload\n\n');
    // Keep the last successful generation available throughout compilation.
    // Allow in-flight responses to finish before deleting the old directory.
    setTimeout(() => rmSync(previous, { recursive: true, force: true }), 30_000).unref();
  } catch (error) { console.error(error.message); }
  finally { rebuilding = false; if (pending) { pending = false; void rebuild(); } }
}
const watchers = ['src', 'tools'].map(dir => {
  const directory = resolve(root, dir);
  const changed = createSourceTracker(directory);
  return watch(directory, { recursive: true }, (_event, name) => {
    if (!changed(name)) return;
    console.log(`Rebuild triggered by ${dir}/${name}`);
    clearTimeout(timer); timer = setTimeout(() => void rebuild(), 150);
  });
});
for (const config of ['tsconfig.json', 'tsconfig.app.json']) {
  const path = resolve(root, config);
  let previous = readFileSync(path, 'utf8');
  watchers.push(watch(path, () => {
    // Windows can report neighbouring directory events to a file watcher.
    // Rebuild only when the configuration contents actually change.
    try {
      const current = readFileSync(path, 'utf8');
      if (current === previous) return;
      previous = current;
      console.log(`Rebuild triggered by ${config}`);
      clearTimeout(timer); timer = setTimeout(() => void rebuild(), 150);
    } catch { /* An editor may briefly remove the file while saving it. */ }
  }));
}
const heartbeat = setInterval(() => { for (const response of clients) response.write(': heartbeat\n\n'); }, 20_000);
function close() { clearInterval(heartbeat); clearTimeout(timer); watchers.forEach(watcher => watcher.close()); for (const response of clients) response.end(); server.close(); }
process.on('SIGINT', close); process.on('SIGTERM', close);
