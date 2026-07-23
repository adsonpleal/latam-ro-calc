import { Pipe, PipeTransform } from '@angular/core';
import { environment } from 'src/environments/environment';

/**
 * Builds an icon URL served by ragassets (https://github.com/adsonpleal/ragassets),
 * mirroring how ../latamvisuais sources its sprites/icons:
 *   item id 14854 -> {ragassetsUrl}/icons/item/14854.png
 *   job icon 4215 -> {ragassetsUrl}/icons/job/4215.png
 *   skill id 28  -> {ragassetsUrl}/icons/skill/28.png
 *
 * Non-numeric ids (e.g. the element-converter icons "I_Aspersio"/"I_EnchantPoison")
 * aren't served by ragassets, so they fall back to a local asset under assets/icons/.
 *
 * A `job` emblem that ragassets doesn't serve yet degrades to the bare job sprite via
 * the img (error) handler at the call site (see onCharSpriteError in the calculator).
 */
@Pipe({ name: 'iconUrl', standalone: true })
export class IconUrlPipe implements PipeTransform {
  transform(id: string | number | null | undefined, type: 'item' | 'job' | 'skill' = 'item'): string {
    if (id === null || id === undefined || id === '') return '';
    const key = String(id);
    if (!/^\d+$/.test(key)) return `assets/icons/${key}.png`;

    return `${environment.ragassetsUrl}/icons/${type}/${key}.png`;
  }
}
