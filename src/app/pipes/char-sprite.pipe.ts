import { Pipe, PipeTransform } from '@angular/core';
import { environment } from 'src/environments/environment';
import { ClassIcon } from '../jobs/_class-name';

/**
 * Character paper-doll URL built for the ragassets (zrenderer) gateway, the same
 * way ragreplaystats' CharacterViewer does it: the job body + hair, plus the
 * equipped headgears / garment composited on top by their sprite *view* ids
 * (the client's `ClassNum`, from tools/build-item-views.mjs -> item-views.json).
 *
 *   /image?job=4257&gender=male&head=1&headgear=1085,856,1041&garment=51&action=0&canvas=...
 *
 * Notes from probing the live gateway:
 *  - gear params take VIEW ids, not item ids; `headgear` is a comma-joined list.
 *  - `gender` is "male"/"female" (not 0/1).
 *  - the gateway currently does NOT draw weapons/shields (no job renders one), so
 *    those params are sent for forward-compat but are no-ops today.
 *  - action = animationType*8 + bodyDirection; 0 = idle facing the viewer.
 */

const RAGASSETS = environment.ragassetsUrl;
const DEFAULT_HEAD = 1; // hairstyle id
const IDLE_ACTION = 0; // animationType 0, bodyDir 0 (south, toward the viewer)
const HEAD_DIR = 0; // head facing straight ahead

// The calc models classes by an INTERNAL id (e.g. RoyalGuard=11, RuneKnight=12,
// Ranger=2); the zrenderer gateway needs the real sprite/job id. ClassIcon maps
// internal -> real job id (4th jobs map to themselves) — same source the job
// icons use, so sprites and icons stay in sync.
const spriteJobId = (classId: number): number => (ClassIcon as Record<number, number>)[classId] ?? classId;
// Fixed render canvas (WxH+anchorX+anchorY) so the figure is centred and the
// feet stay put. URLSearchParams encodes the '+' as %2B, which the gateway wants.
// Cropped tighter than ragreplaystats' 200x169+100+124 (less empty space above
// the head and below the feet) so the figure fills the saved-sim card.
const CANVAS = '150x140+75+126';

// Gender-locked classes by real sprite/job id; the calc has no character sex, so
// force the only valid one (everything else defaults to male). Covers the
// Bard/Minstrel/Troubadour (male) and Dancer/Wanderer/Trouvere (female) lines and
// Kagerou/Shinkiro (male) / Oboro/Shiranui (female).
const GENDER_LOCKED_FEMALE = new Set([20, 4021, 4043, 4069, 4076, 4105, 4212, 4264, 4305]);
const GENDER_LOCKED_MALE = new Set([19, 4020, 4042, 4068, 4075, 4104, 4211, 4263, 4304]);

const resolveSex = (jobView: number, reported?: number): 0 | 1 => {
  if (GENDER_LOCKED_FEMALE.has(jobView)) return 0;
  if (GENDER_LOCKED_MALE.has(jobView)) return 1;
  return reported === 0 ? 0 : 1;
};

// Visual-slot bits emitted by tools/build-item-views.mjs (the item's view + the
// slots it covers); a multi-slot costume (e.g. a "Topo, Meio e Baixo" hood) hides
// the equipped headgears underneath it.
const SLOT_BIT = [1, 2, 4]; // [top, mid, low]
const HEAD_SLOTS: ReadonlyArray<[string, string, number]> = [
  ['costumeUpper', 'headUpper', 0],
  ['costumeMiddle', 'headMiddle', 1],
  ['costumeLower', 'headLower', 2],
];

/** Full paper-doll URL for a saved build, resolving each visual slot's view id. */
export const buildCharSpriteUrl = (
  preset: Record<string, any> | null | undefined,
  viewMap: Record<string, [number, number]> | null | undefined,
  reportedSex?: number,
): string => {
  const classId = Number(preset?.['class']);
  if (!classId) return '';
  const job = spriteJobId(classId);
  const sex = resolveSex(job, reportedSex);
  const entry = (id: any): [number, number] | null => {
    const e = viewMap?.[String(id)];
    return Array.isArray(e) && e[0] > 0 ? e : null;
  };
  const view = (id: any): number | null => entry(id)?.[0] ?? null;

  // Headgears: costumes take precedence and a multi-slot costume covers (and so
  // hides the gear in) every slot in its mask; equipment then fills what's left.
  const headViews: number[] = [];
  const seen = new Set<number>();
  let covered = 0;
  const add = (id: any, slotIdx: number) => {
    if (covered & SLOT_BIT[slotIdx]) return; // a higher-precedence piece owns this slot
    const e = entry(id);
    if (!e) return;
    const [v, mask] = e;
    covered |= (mask & 7) || SLOT_BIT[slotIdx]; // fall back to the field's own slot
    if (!seen.has(v)) { seen.add(v); headViews.push(v); }
  };
  for (const [costumeField, , slotIdx] of HEAD_SLOTS) add(preset?.[costumeField], slotIdx);
  for (const [, equipField, slotIdx] of HEAD_SLOTS) add(preset?.[equipField], slotIdx);
  const headgear = headViews.slice(0, 3);

  const garment = view(preset?.['costumeGarment']) ?? view(preset?.['garment']);
  const weapon = view(preset?.['weapon']);
  const shieldId = preset?.['shield'];
  const shield = shieldId && shieldId !== preset?.['weapon'] ? view(shieldId) : null;

  const p = new URLSearchParams();
  p.set('job', String(job));
  p.set('gender', sex === 0 ? 'female' : 'male');
  p.set('head', String(DEFAULT_HEAD));
  if (headgear.length) p.set('headgear', headgear.join(','));
  if (garment != null) p.set('garment', String(garment));
  if (weapon != null) p.set('weapon', String(weapon));
  if (shield != null) p.set('shield', String(shield));
  p.set('action', String(IDLE_ACTION));
  p.set('headdir', String(HEAD_DIR));
  p.set('canvas', CANVAS);
  return `${RAGASSETS}/image?${p.toString()}`;
};

/** Bare job-body sprite (no gear/canvas) — the (error) fallback for the paper-doll. */
export const bareJobSprite = (classId: number | string | null | undefined): string => {
  if (!classId) return '';
  return `${RAGASSETS}/image?job=${spriteJobId(Number(classId))}&action=0&headdir=0`;
};

/** Standalone fallback pipe: bare job sprite from a preset's class id. */
@Pipe({ name: 'charSprite', standalone: true })
export class CharSpritePipe implements PipeTransform {
  transform(preset: Record<string, any> | null | undefined): string {
    return bareJobSprite(preset?.['class']);
  }
}
