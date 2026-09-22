import { ChangeDetectorRef, Component, EventEmitter, Output, ViewChild } from '@angular/core';
import { OverlayPanel } from 'primeng/overlaypanel';
import { CritRateBreakdown, CritRateStep } from '../../../../../core/crit-rate';
import { skillDescHtml } from '../../../../../utils';
import { formatNumber } from '../../../../../utils/format-number';
import { CritRateRow, CritRateRowCache, elementTagClass as elementTagClassFn, isCritWeighted } from '../battle-hud.logic';
import { BattleDamagePopoversComponent, DamagePopoverContext } from '../damage-popovers/battle-damage-popovers.component';
import { BASIC_ATTACK_ICON, DamageBranch } from '../rotation-list/rotation-list.component';

export interface SkillDetailsEntry {
  name: string;
  levelLabel?: string;
  icon?: number;
  isBasic: boolean;
  dmgTypeLabel?: string;
  element?: string;
  propertyMultiplier?: number;
  hasDamageSpread?: boolean;
  critWeighted?: boolean;
}

export interface AutoCastDetails {
  sourceName: string;
  triggerLabel: string;
  chance: number;
  activationsPerSecond: number;
  expectedDamagePerActivation: number;
  dps: number;
  contribution: number;
}

@Component({
  selector: 'app-battle-skill-details',
  templateUrl: './battle-skill-details.component.html',
  styleUrls: ['../battle-hud.component.css', '../../ro-calculator.component.css', './battle-skill-details.component.css'],
})
export class BattleSkillDetailsComponent {
  private static activeInstance: BattleSkillDetailsComponent | null = null;
  readonly basicAttackIcon = BASIC_ATTACK_ICON;
  @ViewChild('detailsPanel') detailsPanel: OverlayPanel;
  @ViewChild('critRatePanel') critRatePanel: OverlayPanel;
  @ViewChild('damagePopovers') damagePopovers: BattleDamagePopoversComponent;

  @Output() breakdownClick = new EventEmitter<any>();
  @Output() elementTableClick = new EventEmitter<void>();

  entry: SkillDetailsEntry | null = null;
  summary: any = null;
  summary2: any = null;
  autoCast: AutoCastDetails | null = null;
  autoCast2: AutoCastDetails | null = null;
  optimizeInfo: any = null;
  isComparing = false;
  descriptionExpanded = false;
  private readonly critRows = new CritRateRowCache();
  readonly elementTagClass = elementTagClassFn;

  constructor(private readonly changeDetector: ChangeDetectorRef) {}

  get dmg(): any { return this.summary?.dmg ?? this.summary; }
  get dmg2(): any { return this.summary2?.dmg ?? this.summary2; }
  get calcSkill(): any { return this.summary?.calcSkill; }
  get description(): string { return this.entry?.isBasic ? '' : skillDescHtml(this.entry?.icon); }
  get critRate(): CritRateBreakdown | null {
    return (this.entry?.isBasic ? this.dmg?.criRateBreakdown : this.dmg?.skillCriRateBreakdown) ?? null;
  }
  get critRateRows(): CritRateRow[] {
    const compare = this.entry?.isBasic ? this.dmg2?.criRateBreakdown : this.dmg2?.skillCriRateBreakdown;
    return this.critRows.get(this.critRate, compare);
  }
  get skillIsCritWeighted(): boolean { return isCritWeighted(this.dmg?.skillCanCri, this.dmg?.skillCriRateToMonster); }
  get skillDamageMin(): number { return this.dmg?.skillMinDamage ?? 0; }
  get skillDamageMax(): number { return this.dmg?.skillMaxDamage ?? 0; }

  open(event: Event, context: {
    entry: SkillDetailsEntry;
    summary: any;
    summary2?: any;
    isComparing?: boolean;
    autoCast?: AutoCastDetails | null;
    autoCast2?: AutoCastDetails | null;
    optimizeInfo?: any;
  }, target?: EventTarget | null): void {
    if (BattleSkillDetailsComponent.activeInstance && BattleSkillDetailsComponent.activeInstance !== this) {
      BattleSkillDetailsComponent.activeInstance.detailsPanel?.hide();
    }
    BattleSkillDetailsComponent.activeInstance = this;
    this.entry = context.entry;
    this.summary = context.summary;
    this.summary2 = context.summary2;
    this.isComparing = !!context.isComparing && !!context.summary2;
    this.autoCast = context.autoCast ?? null;
    this.autoCast2 = context.autoCast2 ?? null;
    this.optimizeInfo = context.optimizeInfo ?? null;
    this.descriptionExpanded = false;
    this.changeDetector.detectChanges();

    const raw: any = target || event.currentTarget || event.target;
    const anchor = raw?.nativeElement ?? raw;
    const rect = anchor?.getBoundingClientRect?.();
    if (this.detailsPanel.overlayVisible && this.detailsPanel.target === anchor) {
      this.detailsPanel.hide();
      return;
    }
    if (this.detailsPanel.overlayVisible) this.detailsPanel.hide();
    this.detailsPanel.show(event, anchor);
    this.detailsPanel.target = anchor;
    if (this.detailsPanel.container) this.detailsPanel.container.style.visibility = 'hidden';
    requestAnimationFrame(() => this.align(rect));
  }

  private align(target: DOMRect): void {
    const container = this.detailsPanel?.container as HTMLElement;
    if (!container || !target) return;
    const overlay = container.getBoundingClientRect();
    const scrollLeft = window.scrollX;
    const scrollTop = window.scrollY;
    let left = target.left + target.width / 2 + scrollLeft - overlay.width / 2;
    left = Math.max(scrollLeft + 8, Math.min(left, scrollLeft + window.innerWidth - overlay.width - 8));
    const fitsBelow = target.bottom + overlay.height + 8 <= window.innerHeight;
    const top = fitsBelow ? target.bottom + scrollTop : target.top + scrollTop - overlay.height;
    container.style.left = `${left}px`;
    container.style.top = `${Math.max(scrollTop + 8, top)}px`;
    const targetCenter = target.left + target.width / 2 + scrollLeft;
    // PrimeNG's pseudo-elements center themselves on their `left` coordinate.
    // Supply the anchor's exact center relative to the positioned panel.
    const arrowLeft = Math.max(10, Math.min(overlay.width - 10, targetCenter - left));
    container.style.setProperty('--overlayArrowLeft', `${arrowLeft}px`);
    container.classList.toggle('p-overlaypanel-flipped', !fitsBelow);
    container.style.visibility = 'visible';
  }

  openDamage(branch: DamageBranch, event: Event): void {
    const context: DamagePopoverContext = {
      entry: {
        name: this.entry?.name ?? '',
        isBasic: !!this.entry?.isBasic,
        hasDamageSpread: !!this.entry?.hasDamageSpread,
        critWeighted: this.entry?.critWeighted,
      },
      summary: this.summary,
      summary2: this.summary2,
      isComparing: this.isComparing,
    };
    this.damagePopovers.open(event, branch, context, event.currentTarget);
  }

  openCrit(event: Event): void { this.critRatePanel.toggle(event); }
  trackByCritStep(_: number, row: CritRateRow): string { return row.step.key; }
  critStepText(step: CritRateStep, value: number): string {
    return step.kind === 'multiply' ? `${formatNumber(value * 100, 0, 1)}%` : formatNumber(Math.abs(value), 0, 1);
  }
  openCritBreakdown(step: CritRateStep): void {
    if (step.keys?.length) this.breakdownClick.emit({ label: step.label, keys: step.keys, valueClass: 'summary_stat_atk' });
  }
}
