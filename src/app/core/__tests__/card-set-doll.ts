import { readFileSync } from 'node:fs';
import { CharacterBase } from 'src/app/jobs';
import { createMainModel } from 'src/app/utils';
import { equipStatusOf, makeCalculator } from './make-calculator';

/**
 * Wear a card together with the partners its set names, and read back what the card adds.
 *
 * Built for the `EQUIP[<nome>]` -> `EQUIP_ID[<id>]` migration of the card family: the only
 * way to know a rewrite kept a set paying is to fire it before and after, so this places a
 * card and an arbitrary partner list on one doll without the caller working out which
 * socket each piece needs.
 *
 * Placement rules, which are the game's:
 *   - a card goes into the socket of the slot its `compositionPos` names; a weapon has four
 *     of them, the head has three (upper/middle/lower) and an "Acessório" card fits either
 *     hand, so those spill in order;
 *   - ordinary gear goes into its own equipment slot, and is then its own host;
 *   - every slot holding a card needs an item to hold it — `loadItemFromModel` only reads
 *     `<slot>Card` when `<slot>` is filled — so an inert host is equipped for each.
 *
 * The result is always a DELTA: the same doll with and without the card under test. Hosts
 * and partners contribute to both runs and cancel, so what is left is the card's own lines
 * plus whatever its set paid.
 *
 * The doll is deliberately generous — every slot refined to +15 and graded A, every base
 * attribute at 120, level 200 — because a set clause is only visible in the numbers when its
 * OTHER conditions pass too. 72 of the card clauses are gated on
 * `GRADE[headUpper==A]REFINE[headUpper==N]`, more on a refine step or a `SUM[int==N]`, and at
 * refine 0 on a level-1 character every one of them measures zero whether it fires or not.
 * The class is the caller's, for the same reason: `USED[Sage]` pays nothing to a Rune Knight.
 */

const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));

/** CardPosition -> the slot a card compounded there sits in. */
const CARD_SLOT: Record<number, string> = {
  0: 'weapon', 769: 'headUpper', 32: 'shield', 16: 'armor',
  4: 'garment', 64: 'boot', 136: 'accRight', 128: 'accLeft', 8: 'accRight',
};

/** itemSubTypeId -> the slot ordinary gear sits in. */
const GEAR_SLOT: Record<number, string> = {
  512: 'headUpper', 513: 'armor', 514: 'shield', 515: 'garment',
  516: 'boot', 517: 'accRight', 510: 'accRight', 511: 'accLeft',
};

/**
 * Inert hosts, one per slot — every one has an empty script, so nothing they carry can be
 * mistaken for the card's. The three head gears are deliberately different ids:
 * `loadItemFromModel` collapses the same id repeated across head slots.
 */
const HOST: Record<string, number> = {
  weapon: 1201, // Faca [3]
  headUpper: 5171, // Elmo das Valquírias
  headMiddle: 2201, // Óculos Escuros
  headLower: 2218, // Máscara Cirúrgica
  armor: 2319, // Jaqueta Brilhante
  shield: 2123, // Travessa de Orleans
  garment: 2515, // Asa de Águia
  boot: 2421, // Sapatos das Valquírias
  accRight: 2983, // Broche Demoníaco
  accLeft: 2976, // Lampião das Trevas
};

/** The card sockets each slot offers, in the order they are filled. */
const SOCKETS: Record<string, string[]> = {
  weapon: ['weaponCard1', 'weaponCard2', 'weaponCard3', 'weaponCard4'],
  headUpper: ['headUpperCard', 'headMiddleCard', 'headLowerCard'],
  headMiddle: ['headMiddleCard'],
  headLower: ['headLowerCard'],
  shield: ['shieldCard'],
  armor: ['armorCard'],
  garment: ['garmentCard'],
  boot: ['bootCard'],
  accRight: ['accRightCard', 'accLeftCard'],
  accLeft: ['accLeftCard', 'accRightCard'],
};

/** Which slot a head socket belongs to, so its host gets equipped. */
const SLOT_OF_SOCKET: Record<string, string> = {
  headUpperCard: 'headUpper', headMiddleCard: 'headMiddle', headLowerCard: 'headLower',
  weaponCard1: 'weapon', weaponCard2: 'weapon', weaponCard3: 'weapon', weaponCard4: 'weapon',
  shieldCard: 'shield', armorCard: 'armor', garmentCard: 'garment', bootCard: 'boot',
  accRightCard: 'accRight', accLeftCard: 'accLeft',
};

export const isCardRecord = (id: number) => db[id]?.itemTypeId === 6 && db[id]?.itemSubTypeId === 0;

/** A doll under construction: the model, the item db it reads, and the sockets taken. */
interface Doll {
  model: any;
  items: Record<number, any>;
  taken: Set<string>;
}

/** Refine and grade every slot can be asked for, so a gated clause is not invisibly zero. */
const REFINE = 15;
const GRADE = 'A';

function newDoll(): Doll {
  const model = createMainModel();
  model.level = 200;
  model.jobLevel = 70;
  for (const stat of ['str', 'agi', 'vit', 'int', 'dex', 'luk']) model[stat] = 120;

  return { model, items: {}, taken: new Set() };
}

/** Fill a slot, whatever goes in it, with the refine and grade a condition might read. */
function equip(doll: Doll, slot: string, id: number) {
  doll.items[id] = { ...db[id] };
  doll.model[slot] = id;
  doll.model[`${slot}Refine`] = REFINE;
  doll.model[`${slot}Grade`] = GRADE;
}

/** Equip an inert host in `slot`, unless something already occupies it. */
function host(doll: Doll, slot: string) {
  if (doll.model[slot]) return;
  equip(doll, slot, HOST[slot]);
}

/**
 * Put `id` on the doll — into a card socket if it is a card, into its own equipment slot if
 * it is not. Returns the model field it took, or null when every place it could go is full.
 */
function place(doll: Doll, id: number): string | null {
  const item = db[id];
  if (!item) return null;

  if (isCardRecord(id)) {
    const slot = CARD_SLOT[item.compositionPos];
    if (!slot) return null;
    const socket = (SOCKETS[slot] ?? []).find((s) => !doll.taken.has(s));
    if (!socket) return null;

    host(doll, SLOT_OF_SOCKET[socket]);
    doll.items[id] = { ...db[id] };
    doll.model[socket] = id;
    doll.taken.add(socket);
    return socket;
  }

  const slot = item.itemTypeId === 1 ? 'weapon' : GEAR_SLOT[item.itemSubTypeId];
  if (!slot || doll.model[slot]) return null;

  equip(doll, slot, id);
  return slot;
}

const bonusOf = (doll: Doll, cls?: CharacterBase) => equipStatusOf(makeCalculator(doll.items, cls), doll.model);

/**
 * What `card` adds to a doll already wearing `partners` — its own lines plus any set the
 * partners switch on. Null when the pieces cannot be worn together.
 *
 * ONE doll is built and run twice, with the card's socket filled and then emptied, so the
 * hosts and the partners are placed identically in both halves and cancel exactly. Building
 * the "without" half from scratch would not: without the card taking a socket, a partner
 * that shares its slot lands somewhere else and drags a different host along with it.
 *
 * The card is placed first for the same reason — so it never loses its own socket to a
 * partner, and a set whose partner shares the slot is reported as unwearable rather than
 * quietly measured with the card missing.
 */
export function cardDelta(card: number, partners: number[], makeClass?: () => CharacterBase): Record<string, number> | null {
  const doll = newDoll();
  const socket = place(doll, card);
  if (!socket) return null;
  for (const id of partners) if (!place(doll, id)) return null;

  // A fresh instance per run: makeCalculator calls setLearnSkills().getSkillBonusAndName()
  // on the class, so the two halves must not share one.
  const withCard = bonusOf(doll, makeClass?.());
  doll.model[socket] = undefined;
  const without = bonusOf(doll, makeClass?.());

  const delta: Record<string, number> = {};
  for (const key of new Set([...Object.keys(withCard), ...Object.keys(without)])) {
    const value = (withCard[key] || 0) - (without[key] || 0);
    if (value !== 0) delta[key] = value;
  }
  return delta;
}

export const ITEMS = db;
