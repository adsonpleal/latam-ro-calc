#!/usr/bin/env node
// Post the current version's "novidades" (changelog) to Discord after a deploy.
//
// Standard message = project name + version number + the newly-added items for
// that version, as a single embed. Source of truth for the changelog is the
// `updates` array in src/app/layout/app.topbar.component.ts (same list the app
// shows in "Novidades"); the version is read from package.json.
//
// Usage:
//   DISCORD_BOT_TOKEN=xxx node tools/post-novidades.mjs            # posts
//   node tools/post-novidades.mjs --dry-run                        # prints payload, no network
//
// Env:
//   DISCORD_BOT_TOKEN   (required to post) — a bot token; keep it in a GitHub
//                       Actions secret, never in the repo.
//   DISCORD_CHANNEL_ID  (optional) — defaults to the #novidades channel below.
//
// Exit codes: 0 = posted / dry-run / not-configured (no token). 1 = a token was
// given but the Discord API rejected the request (surface real misconfig).

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const PROJECT_NAME = 'Simulador RO LATAM';
const SITE_URL = 'https://simulador.latam-tools.com.br';
const DEFAULT_CHANNEL_ID = '1524025278471471295';
const EMBED_COLOR = 0xf59e0b; // amber, matches the app's beta theme
const DISCORD_DESC_LIMIT = 4096;

const dryRun = process.argv.includes('--dry-run');

function readVersion() {
  const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'));
  return pkg.version;
}

// Pull the { v, date, logs } entry for `version` out of the component's
// `updates` array. We parse the single-quoted string literals directly so the
// changelog stays a plain TS array (no separate data file to keep in sync).
function readChangelogEntry(version) {
  const src = readFileSync(resolve(ROOT, 'src/app/layout/app.topbar.component.ts'), 'utf8');
  const anchor = src.indexOf(`v: '${version}'`);
  if (anchor < 0) return null;

  const grabString = (from) => {
    let i = src.indexOf("'", from);
    if (i < 0) return null;
    i++;
    let s = '';
    while (i < src.length && src[i] !== "'") {
      if (src[i] === '\\') {
        const n = src[i + 1];
        s += n === 'n' ? '\n' : n === 't' ? '\t' : n;
        i += 2;
      } else {
        s += src[i++];
      }
    }
    return { value: s, end: i + 1 };
  };

  const date = grabString(src.indexOf('date:', anchor))?.value ?? '';

  const logsOpen = src.indexOf('[', src.indexOf('logs:', anchor));
  const logs = [];
  let i = logsOpen + 1;
  while (i < src.length) {
    while (i < src.length && /[\s,]/.test(src[i])) i++;
    if (src[i] !== "'") break; // hit the closing ] (or anything non-string)
    const got = grabString(i);
    if (!got) break;
    logs.push(got.value);
    i = got.end;
  }
  return { version, date, logs };
}

function buildEmbed({ version, date, logs }) {
  let description = logs.map((l) => `• ${l}`).join('\n\n');
  if (description.length > DISCORD_DESC_LIMIT) {
    description = description.slice(0, DISCORD_DESC_LIMIT - 1) + '…';
  }
  return {
    title: `${PROJECT_NAME} — v${version}`,
    url: SITE_URL,
    description,
    color: EMBED_COLOR,
    footer: { text: date ? `Publicado em ${date} • ${SITE_URL.replace('https://', '')}` : SITE_URL.replace('https://', '') },
    timestamp: new Date().toISOString(),
  };
}

async function main() {
  const version = readVersion();
  const entry = readChangelogEntry(version);
  if (!entry || entry.logs.length === 0) {
    console.warn(`No changelog entry with logs for v${version} in app.topbar.component.ts — nothing to post.`);
    return;
  }

  const embed = buildEmbed(entry);
  const payload = { embeds: [embed] };

  if (dryRun) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    console.warn('DISCORD_BOT_TOKEN not set — skipping Discord post (not configured).');
    return;
  }
  const channelId = process.env.DISCORD_CHANNEL_ID || DEFAULT_CHANNEL_ID;

  const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    console.error(`Discord API ${res.status}: ${await res.text()}`);
    process.exit(1);
  }
  console.log(`Posted novidades for v${version} to channel ${channelId}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
