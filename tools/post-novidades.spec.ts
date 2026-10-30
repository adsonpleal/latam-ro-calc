/**
 * The Discord announcement has two size limits, and only one of them was honoured.
 *
 * Each embed's description is capped at 4096 characters, but Discord separately rejects a
 * message whose embeds total more than 6000. Once the notes became trilingual, three
 * embeds could clear the first limit and still breach the second — which is what happened
 * to v0.1.193-beta, after the deploy that produced it had already succeeded.
 */
import { describe, expect, it } from 'vitest';
import { buildEmbeds, groupIntoMessages, messageNonce } from './post-novidades.mjs';

const DISCORD_MESSAGE_LIMIT = 6000;
const embedLength = (embed: any) => embed.title.length + embed.description.length + (embed.footer?.text.length ?? 0);
const messageLength = (embeds: any[]) => embeds.reduce((sum, embed) => sum + embedLength(embed), 0);

/** A release whose notes are `lines` paragraphs of `size` characters, in all three languages. */
function entry(lines: number, size: number) {
  const logs = Array.from({ length: lines }, (_, i) => `${i} `.padEnd(size, 'x'));
  return { version: '0.1.193-beta', date: '30-10-2026', logs, logs_es: [...logs], logs_en: [...logs] };
}

describe('the Discord announcement', () => {
  it('keeps an ordinary release in the single message it has always been', () => {
    const messages = groupIntoMessages(buildEmbeds(entry(3, 200)));
    expect(messages).toHaveLength(1);
    expect(messages[0]).toHaveLength(3);
    expect(messageNonce('0.1.193-beta', 0)).toBe('0.1.193-beta');
  });

  it('splits the languages rather than letting a message breach the 6000 limit', () => {
    // The shape that failed: three languages of a release that merged three deploys.
    const messages = groupIntoMessages(buildEmbeds(entry(12, 300)));
    expect(messages.length).toBeGreaterThan(1);
    for (const embeds of messages) expect(messageLength(embeds)).toBeLessThanOrEqual(DISCORD_MESSAGE_LIMIT);
  });

  it('loses no language when it splits', () => {
    const embeds = buildEmbeds(entry(12, 300));
    const split = groupIntoMessages(embeds).flat();
    expect(split).toEqual(embeds);
    expect(split.map(e => e.title)).toEqual([
      'Simulador RO LATAM — v0.1.193-beta',
      'Simulador RO LATAM — v0.1.193-beta (Español)',
      'Simulador RO LATAM — v0.1.193-beta (English)',
    ]);
  });

  it('gives each message its own nonce, so enforce_nonce drops none of them', () => {
    const nonces = groupIntoMessages(buildEmbeds(entry(12, 300))).map((_, i) => messageNonce('0.1.193-beta', i));
    expect(new Set(nonces).size).toBe(nonces.length);
  });

  it('still posts a release from before the notes were translated', () => {
    const messages = groupIntoMessages(buildEmbeds({ version: '0.1.100-beta', date: '01-01-2026', logs: ['Uma linha.'] } as any));
    expect(messages).toHaveLength(1);
    expect(messages[0]).toHaveLength(1);
    expect(messages[0][0].title).toBe('Simulador RO LATAM — v0.1.100-beta');
  });
});
