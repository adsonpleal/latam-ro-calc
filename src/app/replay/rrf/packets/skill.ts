import { ByteReader } from "../reader";
import type { SkillCast, SkillUse } from "../types";

export type SkillInfoEntry = { skillId: number; level: number };

/**
 * 0x010f — ZC_SKILLINFO_LIST (the learned skill tree, sent once at login).
 * Variable-length: a u16 packet length at +2, then fixed 37-byte records:
 *   +0 id u16, +2 inf u32, +6 level u16, +8 sp u16, +10 range u16,
 *   +12 name 24B, +36 upgradable u8.
 * Verified against LATAM client recordings (AC_OWL=43, WH_NATUREFRIENDLY=5325).
 */
export function decodeSkillInfoList(raw: Uint8Array): SkillInfoEntry[] {
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  const REC = 37;
  const end = Math.min(view.getUint16(2, true), raw.byteLength);
  const entries: SkillInfoEntry[] = [];
  for (let p = 4; p + REC <= end; p += REC) {
    const skillId = view.getUint16(p, true);
    const level = view.getUint16(p + 6, true);
    if (skillId > 0 && level > 0) entries.push({ skillId, level });
  }
  return entries;
}

/** 0x011a — clif_skill_nodamage (older, 15 bytes incl. pkt id). */
export function decodeSkillNoDamage011a(reader: ByteReader, time: number): SkillUse {
  const skillId = reader.u16();
  const skillLevel = reader.u16();
  const target = reader.u32();
  const source = reader.u32();
  // result byte ignored
  return { time, source, target, skillId, skillLevel };
}

/** 0x09cb — clif_skill_nodamage (newer, 17 bytes — skillLevel is i32). */
export function decodeSkillNoDamage09cb(reader: ByteReader, time: number): SkillUse {
  const skillId = reader.u16();
  const skillLevel = reader.i32();
  const target = reader.u32();
  const source = reader.u32();
  // result byte ignored
  return { time, source, target, skillId, skillLevel };
}

/** 0x013e — ZC_USESKILL_ACK (cast started). */
export function decodeSkillCast(reader: ByteReader, time: number): SkillCast {
  const source = reader.u32();
  const target = reader.u32();
  reader.skip(2 + 2); // x, y
  const skillId = reader.u16();
  reader.skip(4); // element
  const castMs = reader.u32();
  return { time, source, target, skillId, castMs };
}

/**
 * 0x09ca — ZC_SKILL_ENTRY5 (ground-skill unit placed). Used by skills like
 * Onda Psíquica, Storm Gust, Comet, etc. that drop a "skill unit" entity on
 * the map; subsequent damage events list that unit's AID as the source
 * instead of the caster's. We track unit→caster so the orchestrator can
 * reattribute the damage back to the player.
 *
 * Layout after pkt id:
 *   pktLen u16, AID u32 (unit), creatorAID u32, x i16, y i16, ... (rest ignored)
 */
export type GroundSkillEntry = {
  time: number;
  unitAid: number;
  casterAid: number;
};

export function decodeSkillEntry09ca(
  reader: ByteReader,
  time: number,
): GroundSkillEntry {
  reader.u16(); // pktLen
  const unitAid = reader.u32();
  const casterAid = reader.u32();
  return { time, unitAid, casterAid };
}
