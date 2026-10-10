import { createHash } from 'node:crypto';
// Browser-side fetches, byte hashes only: do not inspect implementation contents.
export async function verifyBuild(page, url, expected) {
  if (!expected?.files?.['/index.html'] || !/^[a-f0-9]{64}$/.test(expected.resource_digest)) throw new Error('Missing/invalid expected build contract');
  const origin = new URL(url).origin;
  const observed = await page.evaluate(async origin => {
    const response = await fetch(`${origin}/__responsive-build.json`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Build manifest HTTP ${response.status}`);
    return response.json();
  }, origin);
  if (observed.build_id !== expected.build_id || observed.resource_digest !== expected.resource_digest) throw new Error('Served build manifest differs from expected frozen contract');
  const files = {};
  for (const path of Object.keys(expected.files).sort((a,b) => a.localeCompare(b))) {
    if (!path.startsWith('/') || path.startsWith('//') || path.split('/').includes('..')) throw new Error('Invalid build resource path');
    const hash = await page.evaluate(async ({ origin, path }) => {
      const response = await fetch(origin + path, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Build resource HTTP ${response.status}: ${path}`);
      if (!crypto.subtle) throw new Error('Browser byte hashing needs HTTPS or trustworthy localhost');
      const digest = await crypto.subtle.digest('SHA-256', await response.arrayBuffer());
      return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
    }, { origin, path });
    files[path] = hash;
    if (files[path] !== expected.files[path]) throw new Error(`Served resource differs from frozen contract: ${path}`);
  }
  const digest = createHash('sha256').update(JSON.stringify(files)).digest('hex');
  if (digest !== expected.resource_digest) throw new Error('Resource digest does not match expected build');
  return { build_id: observed.build_id, resource_digest: digest, matched: true, resources_verified: Object.keys(files).length };
}
