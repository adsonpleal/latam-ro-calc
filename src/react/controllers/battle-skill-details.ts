import { ViewState } from '../state/view-state';
import { Events } from '../services/events';
import { PopoverHandle as UiPopoverComponent } from '../ui/popover-handle';
import { CritRateBreakdown, CritRateStep } from '../../app/core/crit-rate';
import { skillDescHtml } from '../../app/utils';
import { formatNumber } from '../../app/utils/format-number';
import { CritRateRow, CritRateRowCache, elementTagClass as elementTagClassFn, isCritWeighted } from '../../app/layout/pages/ro-calculator/battle-hud/battle-hud.logic';
import { BattleDamagePopoversComponent, DamagePopoverContext } from './battle-damage-popovers';
import { BASIC_ATTACK_ICON, DamageBranch } from './rotation-list';

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


export class BattleSkillDetailsComponent extends ViewState {
  private static activeInstance: BattleSkillDetailsComponent | null = null;
  readonly basicAttackIcon = BASIC_ATTACK_ICON;
   detailsPanel = new UiPopoverComponent();
   critRatePanel = new UiPopoverComponent();
   damagePopovers: BattleDamagePopoversComponent;

   breakdownClick = new Events<any>();
   elementTableClick = new Events<void>();

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

  constructor(
) { super();}

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
    this.publish();

    const raw: any = target || event.currentTarget || event.target;
    const anchor = raw?.nativeElement ?? raw;
    if (this.detailsPanel.overlayVisible && this.detailsPanel.target === anchor) {
      this.detailsPanel.hide();
      return;
    }
    this.detailsPanel.show(event, anchor);
    if (this.detailsPanel.container) this.detailsPanel.container.style.visibility = 'hidden';
    requestAnimationFrame(() => this.detailsPanel?.align(true));
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
