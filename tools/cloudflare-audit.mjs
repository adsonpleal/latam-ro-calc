#!/usr/bin/env node
// Read-only audit of the latam-tools.com.br zone. Reports findings and exits non-zero if
// it has any, so it can be used as a check after a DNS change.
//
// It writes NOTHING, by design. The two zone settings it inspects (SSL mode, Always Use
// HTTPS) are one-time dashboard toggles, and the DNS records are managed by Cloudflare
// once a Workers Custom Domain is attached — a script that could rewrite them would be
// one more thing to keep correct for no benefit. What is worth automating is noticing
// when the zone drifts from what the hosting setup needs.
//
//   node tools/cloudflare-audit.mjs --token-file ~/.cf-token
//
// The token needs only READ scopes on the latam-tools.com.br zone:
//   Zone:Read, DNS:Read
//
// Cache policy is NOT audited here — it lives in src/_headers and is checked by
// tools/cache-headers.spec.ts against a real build. With static assets served by
// Cloudflare itself there is no origin to shield, so there are deliberately no cache
// rules or tiered-cache settings on this zone.

import { readFileSync } from 'node:fs';

const API = 'https://api.cloudflare.com/client/v4';
const ZONE_NAME = 'latam-tools.com.br';

function parseArgs(argv) {
  let tokenFile = null;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--token-file') tokenFile = argv[++i];
    else {
      console.error('usage: node tools/cloudflare-audit.mjs [--token-file <path>]');
      process.exit(2);
    }
  }
  return { tokenFile };
}

function readToken(tokenFile) {
  if (tokenFile) {
    const home = process.env.HOME ?? process.env.USERPROFILE ?? '';
    return readFileSync(tokenFile.replace(/^~/, home), 'utf8').trim();
  }
  const env = process.env.CLOUDFLARE_API_TOKEN ?? process.env.CF_API_TOKEN;
  if (env) return env.trim();
  console.error('no token: pass --token-file <path> or set CLOUDFLARE_API_TOKEN');
  process.exit(2);
}

let TOKEN;

async function cf(path) {
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
  const json = await res.json().catch(() => ({}));
  if (!json.success) {
    const msg = (json.errors ?? []).map((e) => `${e.code} ${e.message}`).join('; ');
    throw new Error(`GET ${path} -> ${res.status} ${msg || 'unknown error'}`);
  }
  return json.result;
}

// A subdomain is "deep" when it sits more than one label below the zone. Universal SSL
// issues for the apex and *.zone only, so Cloudflare has no certificate for these and
// proxying one breaks TLS outright — a handshake failure, not a warning.
// mcp.simulador.latam-tools.com.br is the live example: the EC2 MCP server, health-checked
// by .github/workflows/mcp-deploy.yml on every deploy.
function isDeep(name) {
  return name.endsWith(`.${ZONE_NAME}`) && name.slice(0, -(ZONE_NAME.length + 1)).includes('.');
}

async function main() {
  TOKEN = readToken(parseArgs(process.argv).tokenFile);
  const findings = [];

  console.log(`Cloudflare audit — ${ZONE_NAME}\n`);

  const [zone] = await cf(`/zones?name=${ZONE_NAME}`);
  if (!zone) throw new Error(`zone ${ZONE_NAME} not found — is the token scoped to it?`);

  console.log(`zone ${zone.id}  plan=${zone.plan?.name}  status=${zone.status}`);
  console.log(`  nameservers: ${(zone.name_servers ?? []).join(', ') || '(none reported)'}`);
  if (zone.status !== 'active') {
    findings.push(`zone is "${zone.status}" — Cloudflare is not authoritative for this domain yet`);
  }

  console.log('\nSSL');
  const ssl = await cf(`/zones/${zone.id}/settings/ssl`);
  console.log(`  ssl: ${ssl.value}${ssl.value === 'strict' ? '' : '  (want: strict)'}`);
  if (ssl.value !== 'strict') findings.push(`SSL mode is "${ssl.value}", want "strict"`);

  const https = await cf(`/zones/${zone.id}/settings/always_use_https`);
  console.log(`  always_use_https: ${https.value}${https.value === 'on' ? '' : '  (want: on)'}`);
  if (https.value !== 'on') findings.push('always_use_https is off, want on');

  const records = (await cf(`/zones/${zone.id}/dns_records?per_page=100`)).filter((r) =>
    ['A', 'AAAA', 'CNAME'].includes(r.type),
  );

  console.log('\nDNS');
  for (const r of records) {
    console.log(`  ${r.proxied ? 'proxied ' : 'dns-only'}  ${r.type.padEnd(5)} ${r.name} -> ${r.content}`);
  }

  console.log('\nDeep subdomains (Universal SSL covers *.zone, not *.*.zone)');
  const deep = records.filter((r) => isDeep(r.name));
  if (!deep.length) console.log('  none');
  for (const r of deep) {
    console.log(r.proxied ? `  !! ${r.name} is PROXIED` : `  ok ${r.name} is DNS-only`);
    if (r.proxied) {
      findings.push(`${r.name} is proxied but no certificate covers it — grey-cloud it or TLS fails`);
    }
  }

  if (!findings.length) {
    console.log('\nNo findings.');
    return;
  }
  console.log(`\n${findings.length} finding(s):`);
  findings.forEach((f) => console.log(`  - ${f}`));
  process.exitCode = 1;
}

main().catch((err) => {
  console.error(`\ncloudflare-audit: ${err.message}`);
  process.exit(2);
});
