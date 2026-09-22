import { describe, expect, it } from 'vitest';
import {
  AbyssChaser,
  ElementalMaster,
  Ranger,
  RuneKnight,
  Scholar,
  ShadowChaser,
  Sniper,
  Sorcerer,
  Windhawk,
} from '../jobs';

const keysOf = (character: { autoCastDefinitions: ReadonlyArray<{ key: string }> }) =>
  character.autoCastDefinitions.map(({ key }) => key);

describe('class-owned auto-cast definitions', () => {
  it('inherits Scholar definitions through Sorcerer and Elemental Master', () => {
    expect(keysOf(new Scholar())).toEqual(['auto-spell']);
    expect(keysOf(new Sorcerer())).toEqual(['auto-spell']);
    expect(keysOf(new ElementalMaster())).toEqual(['auto-spell']);
  });

  it('inherits Shadow Chaser definitions through Abyss Chaser', () => {
    expect(keysOf(new ShadowChaser())).toEqual(['shadow-spell']);
    expect(keysOf(new AbyssChaser())).toEqual(['shadow-spell']);
  });

  it('accumulates Sniper and Ranger definitions on Windhawk', () => {
    expect(keysOf(new Sniper())).toEqual(['blitz-beat']);
    expect(keysOf(new Ranger())).toEqual(['blitz-beat', 'wug-strike', 'fear-breeze']);
    expect(keysOf(new Windhawk())).toEqual(['blitz-beat', 'wug-strike', 'fear-breeze', 'hawk-rush']);
  });

  it('does not leak definitions into unrelated class lines', () => {
    expect(keysOf(new RuneKnight())).toEqual([]);
  });
});
