import { beforeAll, describe, expect, it } from 'vitest';
import { decodeReplay } from 'rrfparser';
import { importReplayBuffer } from '../replay-to-model';
import { Replay } from 'rrfparser';
import { loadReplayFixture } from './load-fixture';

// Ground truth: a Super Novice ("Reny.") recording whose pre-cast buffs — Bênção
// (EFST 10), Aumentar Agilidade (12) and Poção do Despertar (38) — live only in the
// EfstList container (18), never in the packet stream. Before the fix the parser
// ignored that container, so these buffs vanished on import.
describe('EfstList buffs & potions (sn-buffs-potion.rrf)', () => {
  let replay: Replay;
  beforeAll(() => {
    replay = decodeReplay(loadReplayFixture('sn-buffs-potion.rrf'));
  });

  it('reads persistent buffs from the EfstList container into status events', () => {
    const active = new Set(
      (replay.statusEvents ?? []).filter((e) => e.aid === replay.sessionInfo.aid && e.isOn).map((e) => e.statusId),
    );
    for (const efst of [10, 12, 38, 3]) expect(active.has(efst)).toBe(true); // Bênção, Aumentar Agi, Despertar, Concentrar
    // Telecinesia (717/1152) was NOT up in this recording — the client never wrote
    // its status, so it (correctly) can't be imported from this file.
    for (const efst of [717, 1152]) expect(active.has(efst)).toBe(false);
  });

  it('imports the ASPD potion and the party buffs onto the model', () => {
    const { model } = importReplayBuffer(loadReplayFixture('sn-buffs-potion.rrf'), {} as any);
    expect(model.aspdPotion).toBe(656); // Poção do Despertar
    expect(model.skillBuffMap['Clementia']).toBe(10); // Bênção
    expect(model.skillBuffMap['Cantocandidus']).toBe(10); // Aumentar Agilidade
  });
});
