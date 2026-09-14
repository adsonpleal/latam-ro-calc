import { Directive, ElementRef, NgZone, OnDestroy } from '@angular/core';

/**
 * Hides a skill icon whose image fails to load, instead of leaving the browser's
 * broken-image glyph in the layout. `visibility` rather than `display`, so the slot keeps
 * its width and the labels beside it stay aligned with the rows that do have an icon.
 * Dragonic Breath (6001), a preview skill ragassets has no icon for, is the standing case.
 *
 * TODO(latam-grf): the Expanded 4th classes (Sky Emperor, Soul Ascetic, Shinkiro,
 * Shiranui, Night Watch, Hyper Novice) aren't in the LATAM client GRF yet, so
 * ragassets serves no icons/skill/<id>.png for any of their ~50 skills. Unlike job
 * icons there is no sprite to render in their place (see the sprite-head fallback in
 * icon-url.pipe.ts), so we degrade to label-only until the icons land.
 *
 * Deliberately generic rather than keyed on a hardcoded id list: it needs no cleanup
 * and self-heals the moment ragassets starts serving the real icons. Mirrors how
 * onCharSpriteError in ro-calculator.component.ts handles an unrenderable sprite.
 */
/*
 * Intentionally a class selector rather than the house-standard [appX] attribute:
 * it has to attach to all ~20 existing img.skill_icon tags across ro-calculator and
 * misc-detail without touching each one, and any new one gets the behaviour free.
 * The battle HUD, rotation list and timeline tag their icons with a bare
 * `missingSkillIcon` attribute instead, which the class selector alone never matched —
 * so a missing icon there showed the broken-image glyph.
 */
// eslint-disable-next-line @angular-eslint/directive-selector
@Directive({ selector: 'img.skill_icon, img[missingSkillIcon]', standalone: true })
export class MissingSkillIconDirective implements OnDestroy {
  private readonly img: HTMLImageElement;
  private readonly hide = () => (this.img.style.visibility = 'hidden');

  // Listened to outside the Angular zone: hiding the image changes nothing Angular renders,
  // and a @HostListener would run change detection on every failed load — inside a
  // p-dropdown panel that re-renders its options, that became a load/error/render loop.
  constructor(el: ElementRef<HTMLImageElement>, zone: NgZone) {
    this.img = el.nativeElement;
    zone.runOutsideAngular(() => this.img.addEventListener('error', this.hide));
  }

  ngOnDestroy(): void {
    this.img.removeEventListener('error', this.hide);
  }
}
