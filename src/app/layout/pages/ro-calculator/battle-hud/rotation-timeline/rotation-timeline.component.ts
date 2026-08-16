import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RotationCycle } from '../../../../../core/rotation-schedule';
import { BASIC_ATTACK_ICON } from '../rotation-list/rotation-list.component';
import { RotationEntryView } from '../rotation-view';
import { buildTimelineCharts, TimelineChart } from './rotation-timeline.logic';

/**
 * The cycle flowchart: one lane per rotation entry on a shared time axis.
 *
 * Built from positioned divs rather than the hand-rolled SVG that aspd-curve uses. The
 * lanes are percentage-positioned blocks carrying in-block numeric labels, hover
 * tooltips, dashed borders and a 45° hatch — all of which CSS does for free and SVG
 * would need hand-laid text for. The file layout still follows aspd-curve: a dumb
 * component over a pure, tested `.logic.ts`.
 */
@Component({
  selector: 'app-rotation-timeline',
  templateUrl: './rotation-timeline.component.html',
  styleUrls: ['./rotation-timeline.component.css'],
})
export class RotationTimelineComponent {
  @Input({ required: true }) cycle!: RotationCycle;
  @Input({ required: true }) entries: RotationEntryView[] = [];
  @Input() cycle2: RotationCycle | null = null;
  @Input() entries2: RotationEntryView[] | null = null;

  /**
   * A lane icon was clicked. The index is the lane's position, which is the rotation
   * entry's own index — both charts are built from the same ordered entries, so a lane in
   * the comparison chart names the same step as the one above it.
   */
  @Output() iconClick = new EventEmitter<{ index: number; event: Event }>();

  readonly basicAttackIcon = BASIC_ATTACK_ICON;

  get charts(): TimelineChart[] {
    if (!this.cycle) return [];

    const shape = (cycle: RotationCycle, entries: RotationEntryView[]) => ({
      cycle,
      entries: entries.map((e) => ({
        name: e.name,
        icon: e.icon,
        isBasic: e.isBasic,
        cast: e.summary?.calcSkill?.castPeriod ?? 0,
        // The fixed half of the cast, so the lane can show fixa and variável apart.
        fixed: e.isBasic ? 0 : e.summary?.calcSkill?.reducedFct ?? 0,
      })),
    });

    return buildTimelineCharts({
      current: shape(this.cycle, this.entries),
      compare: this.cycle2 ? shape(this.cycle2, this.entries2 ?? []) : null,
    });
  }

  trackByIndex(index: number): number {
    return index;
  }
}
