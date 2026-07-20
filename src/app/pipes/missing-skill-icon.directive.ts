import { Directive, HostListener } from '@angular/core';

/**
 * Hides a skill icon whose image fails to load, instead of leaving the browser's
 * broken-image glyph in the layout.
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
 */
// eslint-disable-next-line @angular-eslint/directive-selector
@Directive({ selector: 'img.skill_icon', standalone: true })
export class MissingSkillIconDirective {
  @HostListener('error', ['$event'])
  onError(event: Event): void {
    (event.target as HTMLImageElement).style.visibility = 'hidden';
  }
}
