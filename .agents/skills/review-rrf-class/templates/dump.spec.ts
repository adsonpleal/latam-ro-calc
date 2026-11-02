/*
 * Dump template for a .rrf recording — copy it to
 *   src/app/replay/__tests__/_tmp-dump.spec.ts       (that path is git-ignored)
 * swap FILE, and run:
 *   npx vitest run src/app/replay/__tests__/_tmp-dump.spec.ts
 *
 * Prints, in order: character, entities, weapon timeline, every damage packet
 * (with the weapon and the gauge count already resolved), the ZC_PAR_CHANGE
 * values and the EFSTs. Delete the file by name when you are done.
 */
import { readFileSync } from 'node:fs';
import { it } from 'vitest';
import { decodeReplay } from 'rrfparser';
import { importReplayBuffer } from '../replay-to-model';

const FILE = 'C:/Users/adson/Downloads/REPLACE-ME.rrf';
/** EFST of the stacking counter (Pontos de Foco = 1346). 0 turns the count off. */
const EFST_COUNTER = 0;

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const latam = JSON.parse(readFileSync('src/assets/demo/data/latam-items.json', 'utf8'));
/** JSON.stringify throws on BigInt — the packets carry a few. */
const j = (o: unknown) => JSON.stringify(o, (_k, v) => (typeof v === 'bigint' ? String(v) : v));

function buf(p: string) {
  const b = readFileSync(p);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
}

it('dump', () => {
  const r: any = decodeReplay(buf(FILE));
  const { model, learnedSkills, summary }: any = importReplayBuffer(buf(FILE), items);
  const out: string[] = [];

  out.push('### character');
  out.push(j(r.sessionInfo));
  out.push('import summary: ' + j(summary));
  out.push('learned skills: ' + j(learnedSkills));

  out.push('\n### entities (the pet shows up here, not in the inventory)');
  for (const e of r.entities?.values?.() ?? []) out.push(`aid=${e.aid} kind=${e.kind} view=${e.view} ${e.name}`);

  out.push('\n### imported equipment');
  for (const [k, v] of Object.entries(model)) {
    if (typeof v !== 'number' || v < 100 || /^(level|jobLevel|class|str|agi|vit|int|dex|luk|pow|sta|wis|spl|con|crt|job)/.test(k)) continue;
    const name = latam[String(v)]?.name ?? items[String(v)]?.name ?? '???';
    out.push(`${k} = ${v} ${items[String(v)] ? '' : '[NOT IN item.json] '}${name}`);
  }
  out.push('random options: ' + j(model.rawOptionTxts?.filter(Boolean)));

  out.push('\n### weapons over time');
  // EQP_HAND_R is bit 0x02: a two-handed weapon arrives as 34 (0x02|0x20, with the shield),
  // but a one-handed one arrives as 2. Testing `=== 34` misses the second and the section
  // comes out empty.
  const changes = (r.equipChanges ?? []).filter((e: any) => (e.location & 0x02) !== 0);
  for (const e of changes) out.push(`${e.time} ${e.equipped ? 'EQUIP  ' : 'UNEQUIP'} ${e.itemId} +${e.refine} cards=[${e.cards.join(',')}] ${latam[String(e.itemId)]?.name ?? ''}`);

  out.push('\n### damage');
  const ticks = EFST_COUNTER ? (r.statusEvents ?? []).filter((s: any) => s.statusId === EFST_COUNTER).map((s: any) => s.time) : [];
  let weapon = model.weapon;
  let previous = -1;
  for (const d of r.damage ?? []) {
    for (const t of changes) if (t.equipped && t.time <= d.time) weapon = t.itemId;
    // A recording usually starts with the gauge full; for the casts after it, count the ticks.
    const count = !EFST_COUNTER ? '' : ` counter=${previous < 0 ? 'full?' : ticks.filter((t: number) => t > previous && t <= d.time).length}`;
    previous = d.time;
    out.push(`${String(d.time).padStart(6)} weapon=${weapon} skill=${d.skillId} lv=${d.skillLevel} damage=${d.damage} count=${d.hits} type=${d.hitType}${count}`);
  }

  out.push('\n### ZC_PAR_CHANGE (41 ATQ · 42 ATQ equip · 52 Crítico · 53 amotion · 225 P.ATQ · 226 S.ATQM · 227 RES · 228 RESM · 229 C.Mais · 230 T.CRÍT)');
  for (const p of r.paramChanges ?? []) out.push(`${String(p.time).padStart(6)} sp=${p.type} value=${p.value}`);

  out.push('\n### EFSTs switched on/off (names: stateicon/efstids.lub in the GRF)');
  const seen = new Map<number, number>();
  for (const s of r.statusEvents ?? []) seen.set(s.statusId, (seen.get(s.statusId) ?? 0) + 1);
  for (const [id, n] of [...seen].sort((a, b) => b[1] - a[1])) out.push(`efst ${id}: ${n} event(s)`);

  console.log(out.join(String.fromCharCode(10)));
});
