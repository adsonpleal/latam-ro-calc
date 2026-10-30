#!/usr/bin/env node
// Post the current version's "novidades" (changelog) to Discord after a deploy.
//
// Standard message = project name + version number + the newly-added items for
// that version, as a single embed. Source of truth is src/releases/history.json, also used by the app;
// the version is read from package.json.
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
// Exit codes: 0 = posted / dry-run. 1 = missing configuration, missing notes,
// or a rejected Discord request; the release remains pending for retry.

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const PROJECT_NAME = 'Simulador RO LATAM';
const SITE_URL = 'https://simulador.latam-tools.com.br';
const DEFAULT_CHANNEL_ID = '1524025278471471295';
const EMBED_COLOR = 0xf59e0b; // amber, matches the app's beta theme
const DISCORD_DESC_LIMIT = 4096;
// Discord enforces a second, separate limit: the embeds of ONE message may total 6000
// characters across their titles, descriptions and footers. Capping each description at
// 4096 is therefore not enough once a release carries three languages — v0.1.193-beta,
// which merged three deploys' worth of notes, was rejected with MAX_EMBED_SIZE_EXCEEDED
// after the deploy itself had succeeded. The languages are split across messages instead
// of being truncated to fit: notes nobody can read are not worth announcing.
const DISCORD_MESSAGE_LIMIT = 6000;

const dryRun = process.argv.includes('--dry-run');

function readVersion() {
  const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'));
  return pkg.version;
}

function readChangelogEntry(version) {
  const history = JSON.parse(readFileSync(resolve(ROOT, 'src/releases/history.json'), 'utf8'));
  const entry = history.find(entry => entry.v === version);
  return entry ? { version, date: entry.date, logs: entry.logs, logs_es: entry.logs_es, logs_en: entry.logs_en } : null;
}

// One embed per language, in the order the app lists them. A release published
// before the notes became trilingual carries only pt-BR and posts a single embed,
// so old announcements and reposts look exactly as they did.
const LANGUAGES = [
  { key: 'logs', label: null, published: 'Publicado em' },
  { key: 'logs_es', label: 'Español', published: 'Publicado el' },
  { key: 'logs_en', label: 'English', published: 'Published on' },
];

function buildEmbed({ version, date, logs, label, published }) {
  let description = logs.map((l) => `• ${l}`).join('\n\n');
  if (description.length > DISCORD_DESC_LIMIT) {
    description = description.slice(0, DISCORD_DESC_LIMIT - 1) + '…';
  }
  const host = SITE_URL.replace('https://', '');
  return {
    title: label ? `${PROJECT_NAME} — v${version} (${label})` : `${PROJECT_NAME} — v${version}`,
    url: SITE_URL,
    description,
    color: EMBED_COLOR,
    footer: { text: date ? `${published} ${date} • ${host}` : host },
    timestamp: new Date().toISOString(),
  };
}

export function buildEmbeds(entry) {
  return LANGUAGES
    .filter(language => Array.isArray(entry[language.key]) && entry[language.key].length)
    .map(language => buildEmbed({ ...entry, logs: entry[language.key], label: language.label, published: language.published }));
}

/** What Discord counts against DISCORD_MESSAGE_LIMIT for one embed. */
const embedLength = embed => embed.title.length + embed.description.length + (embed.footer?.text.length ?? 0);

/**
 * The language embeds packed into as few messages as the per-message budget allows.
 *
 * An ordinary release still posts as the single message it always did; only one that
 * cannot fit spills into a second. One embed never exceeds the budget on its own, since
 * its description is already capped well below it.
 */
export function groupIntoMessages(embeds) {
  const messages = [];
  let used = 0;
  for (const embed of embeds) {
    const length = embedLength(embed);
    if (messages.length && used + length <= DISCORD_MESSAGE_LIMIT) {
      messages[messages.length - 1].push(embed);
      used += length;
    } else {
      messages.push([embed]);
      used = length;
    }
  }
  return messages;
}

/** Unique per message, so Discord's `enforce_nonce` does not swallow the later ones. */
export const messageNonce = (version, index) => (index === 0 ? version : `${version}-${index + 1}`);

async function main() {
  const version = process.env.RELEASE_VERSION || readVersion();
  const entry = readChangelogEntry(version);
  if (!entry || entry.logs.length === 0) {
    console.warn(`No changelog entry with logs for v${version} in src/releases/history.json — nothing to post.`);
    throw new Error(`Missing release notes for ${version}`);
  }

  const messages = groupIntoMessages(buildEmbeds(entry))
    .map((embeds, index) => ({ embeds, nonce: messageNonce(version, index), enforce_nonce: true }));

  if (dryRun) {
    console.log(JSON.stringify(messages.length === 1 ? messages[0] : messages, null, 2));
    return;
  }

  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    throw new Error('DISCORD_BOT_TOKEN not set — announcement remains pending.');
  }
  const channelId = process.env.DISCORD_CHANNEL_ID || DEFAULT_CHANNEL_ID;

  // Sent in order, so the Portuguese notes lead. A failure half way leaves the release
  // pending and the retry reposts from the first message; `enforce_nonce` suppresses the
  // duplicate while Discord still remembers the nonce, and a channel that ends up with
  // one repeated announcement is a better outcome than a release nobody hears about.
  for (const [index, payload] of messages.entries()) {
    const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.error(`Discord API ${res.status} on message ${index + 1} of ${messages.length}: ${await res.text()}`);
      process.exit(1);
    }
  }
  const sent = messages.length === 1 ? 'one message' : `${messages.length} messages`;
  console.log(`Posted novidades for v${version} to channel ${channelId} in ${sent}.`);
}

// Only when run as a command: the helpers above are imported by the spec, which must not
// post anything.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
