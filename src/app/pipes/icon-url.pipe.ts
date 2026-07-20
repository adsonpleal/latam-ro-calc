import { Pipe, PipeTransform } from '@angular/core';
import { environment } from 'src/environments/environment';
// The Expanded 4th classes have no party-emblem icon on ragassets yet (all 404), so
// for a `job` icon we render the sprite head instead — same trick ../latamvisuais and
// ../ragcalc use. The id→sex map is shared with the visibility filter; see the module
// for the full rationale and the TODO(latam-grf) removal note.
import { EXPANDED_4TH_AHEAD_OF_GRF } from '../jobs/expanded-4th-ahead-of-grf';

/**
 * Builds an icon URL served by ragassets (https://github.com/adsonpleal/ragassets),
 * mirroring how ../latamvisuais sources its sprites/icons:
 *   item id 14854 -> {ragassetsUrl}/icons/item/14854.png
 *   job icon 4215 -> {ragassetsUrl}/icons/job/4215.png
 *   skill id 28  -> {ragassetsUrl}/icons/skill/28.png
 *
 * Non-numeric ids (e.g. the element-converter icons "I_Aspersio"/"I_EnchantPoison")
 * aren't served by ragassets, so they fall back to a local asset under assets/icons/.
 */
@Pipe({ name: 'iconUrl', standalone: true })
export class IconUrlPipe implements PipeTransform {
  transform(id: string | number | null | undefined, type: 'item' | 'job' | 'skill' = 'item'): string {
    if (id === null || id === undefined || id === '') return '';
    const key = String(id);
    if (!/^\d+$/.test(key)) return `assets/icons/${key}.png`;

    const fallbackGender = type === 'job' ? EXPANDED_4TH_AHEAD_OF_GRF[Number(key)] : undefined;
    if (fallbackGender) {
      const p = new URLSearchParams({
        job: key,
        gender: fallbackGender,
        head: '1',
        action: '0',
        frame: '0',
        headdir: '0',
        canvas: '44x40+22+86',
      });
      return `${environment.ragassetsUrl}/image?${p.toString()}`;
    }

    return `${environment.ragassetsUrl}/icons/${type}/${key}.png`;
  }
}
