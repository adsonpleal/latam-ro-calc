import { Directive, ElementRef, NgZone, OnDestroy } from '@angular/core';

/**
 * Blanks an icon or sprite whose image fails to load, instead of leaving the browser's
 * broken-image glyph in the layout. `visibility` rather than `display`, so the slot keeps
 * its size: the labels beside it stay aligned with the rows that do have an icon, and a
 * monster card keeps the room its sprite would take.
 *
 * ragassets renders from the LATAM client, so anything the client does not ship yet has
 * nothing behind its URL:
 * - the pre-release items (`preRelease` in item.json), which exist only on kRO/iRO;
 * - the monsters of maps LATAM has not opened, such as Varmundt's Biosphere;
 * - Dragonic Breath (6001), a preview skill.
 *
 * TODO(latam-grf): the Expanded 4th classes (Sky Emperor, Soul Ascetic, Shinkiro,
 * Shiranui, Night Watch, Hyper Novice) aren't in the LATAM client GRF yet, so
 * ragassets serves no icons/skill/<id>.png for any of their ~50 skills. Unlike job
 * icons there is no sprite to render in their place (see the sprite-head fallback in
 * icon-url.pipe.ts), so we degrade to label-only until the icons land.
 *
 * Deliberately generic rather than keyed on a hardcoded id list: it needs no cleanup
 * and self-heals the moment ragassets starts serving the real image. The image is shown
 * again on the next successful load, because the same element is reused when its `src`
 * changes — the target sprite, an equipment chip.
 */
/*
 * Intentionally class selectors rather than the house-standard [appX] attribute: they
 * attach to every existing img.skill_icon, img.item_img and img.img_monster without
 * touching each one, and any new one gets the behaviour free. Other images opt in with a
 * bare `missingIcon` attribute.
 */
// eslint-disable-next-line @angular-eslint/directive-selector
@Directive({ selector: 'img.skill_icon, img.item_img, img.img_monster, img[missingIcon]', standalone: true })
export class MissingIconDirective implements OnDestroy {
  private readonly img: HTMLImageElement;
  private readonly hide = () => (this.img.style.visibility = 'hidden');
  private readonly show = () => (this.img.style.visibility = '');

  // Listened to outside the Angular zone: hiding the image changes nothing Angular renders,
  // and a @HostListener would run change detection on every failed load — inside a
  // p-dropdown panel that re-renders its options, that became a load/error/render loop.
  constructor(el: ElementRef<HTMLImageElement>, zone: NgZone) {
    this.img = el.nativeElement;
    zone.runOutsideAngular(() => {
      this.img.addEventListener('error', this.hide);
      this.img.addEventListener('load', this.show);
    });
  }

  ngOnDestroy(): void {
    this.img.removeEventListener('error', this.hide);
    this.img.removeEventListener('load', this.show);
  }
}
