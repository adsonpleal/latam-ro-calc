import { ChangeDetectorRef, Component, EventEmitter, Output, ViewChild } from '@angular/core';
import { OverlayPanel } from 'primeng/overlaypanel';
import { DamageFormulaCalc, DamageFormulaNode } from '../../../../../models/damage-summary.model';
import { buildDpsSteps, buildGraphClusters, DpsSteps, FormulaGraphCluster, isCritWeighted, pickHeroDamage } from '../battle-hud.logic';
import { DamageBranch } from '../rotation-list/rotation-list.component';
import { calcDmgDpsDetailed } from '../../../../../utils/calc-dmg-dps';

export interface DamagePopoverEntry {
  name: string;
  isBasic: boolean;
  hasDamageSpread: boolean;
  critWeighted?: boolean;
}

export interface DamagePopoverContext {
  entry: DamagePopoverEntry;
  summary: any;
  summary2?: any;
  isComparing?: boolean;
  hasSelectedChances?: boolean;
  hasSelectedChances2?: boolean;
}

@Component({
  selector: 'app-battle-damage-popovers',
  templateUrl: './battle-damage-popovers.component.html',
  styleUrls: ['./battle-damage-popovers.component.css', '../battle-hud.component.css', '../../ro-calculator.component.css'],
})
export class BattleDamagePopoversComponent {
  constructor(private readonly changeDetector: ChangeDetectorRef) {}

  @ViewChild('formulaPanel') formulaPanel: OverlayPanel;
  @ViewChild('noCriPanel') noCriPanel: OverlayPanel;
  @ViewChild('meanPanel') meanPanel: OverlayPanel;
  @ViewChild('basicPanel') basicPanel: OverlayPanel;

  @Output() breakdownClick = new EventEmitter<{
    label: string; keys: string[]; valueClass: string; total?: number; calc?: DamageFormulaCalc; compare?: boolean;
  }>();

  context: DamagePopoverContext | null = null;
  basicBranch: 'normal' | 'critical' = 'normal';

  private alignPanel(panel: OverlayPanel, target: DOMRect, reveal = false): void {
    const container = panel.container as HTMLElement;
    if (!container || !target) return;
    const overlay = container.getBoundingClientRect();
    const scrollLeft = window.scrollX;
    const scrollTop = window.scrollY;
    let left = target.left + scrollLeft;
    if (target.left + overlay.width > window.innerWidth) left = Math.max(scrollLeft, target.right + scrollLeft - overlay.width);
    const flip = target.bottom + overlay.height > window.innerHeight;
    const top = flip ? target.top + scrollTop - overlay.height : target.bottom + scrollTop;
    container.style.left = `${left}px`;
    container.style.top = `${Math.max(scrollTop, top)}px`;
    container.style.setProperty('--overlayArrowLeft', `${Math.max(10, target.left + target.width / 2 + scrollLeft - left - 10)}px`);
    container.classList.toggle('p-overlaypanel-flipped', flip);
    if (reveal) container.style.visibility = 'visible';
  }

  open(event: Event, branch: DamageBranch, context: DamagePopoverContext, target?: EventTarget | null): void {
    this.context = context;
    this.basicBranch = branch === 'cri' ? 'critical' : 'normal';
    // Render the new formula before PrimeNG measures the overlay. Without this, a reused
    // panel is first painted at the previous content's coordinates and visibly jumps.
    this.changeDetector.detectChanges();
    const pathElement = event.composedPath?.().find((node: any) => node?.nodeType === 1);
    const rawAnchor: any = target || pathElement || event.currentTarget || event.target;
    const candidate = rawAnchor?.nativeElement ?? rawAnchor;
    const anchor = candidate?.nodeType === 3 ? candidate.parentElement : candidate;
    const targetRect = (anchor as HTMLElement)?.getBoundingClientRect?.();
    const panel = context.entry.isBasic && branch === 'mean'
      ? this.meanPanel
      : context.entry.isBasic
        ? this.basicPanel
      : branch === 'nocri'
        ? this.noCriPanel
        : branch === 'mean' && context.entry.hasDamageSpread
          ? this.meanPanel
          : this.formulaPanel;
    if (panel?.overlayVisible && panel.target === anchor) {
      panel.hide();
      return;
    }
    if (panel?.overlayVisible) panel.hide();
    panel?.show(event, anchor);
    if (panel) panel.target = anchor;
    if (panel?.container) panel.container.style.visibility = 'hidden';
    requestAnimationFrame(() => this.alignPanel(panel, targetRect, true));
  }

  get entry(): DamagePopoverEntry | null { return this.context?.entry ?? null; }
  get dmg(): any { return this.context?.summary?.dmg ?? this.context?.summary; }
  get dmg2(): any { return this.context?.summary2?.dmg ?? this.context?.summary2; }
  get isComparing(): boolean { return !!this.context?.isComparing; }

  private effectedGraph(dmg: any, noCri = false): any {
    const selected = noCri ? this.context?.hasSelectedChances : this.context?.hasSelectedChances;
    if (noCri) return (selected && dmg?.effectedSkillFormulaGraphNoCri) || dmg?.skillFormulaGraphNoCri;
    return (selected && dmg?.effectedSkillFormulaGraph) || dmg?.skillFormulaGraph;
  }

  private graphPair(dmg: any, noCri = false, compare = false): { min: FormulaGraphCluster[]; max: FormulaGraphCluster[] } | null {
    const selected = compare ? this.context?.hasSelectedChances2 : this.context?.hasSelectedChances;
    const graph = noCri
      ? (selected && dmg?.effectedSkillFormulaGraphNoCri) || dmg?.skillFormulaGraphNoCri
      : (selected && dmg?.effectedSkillFormulaGraph) || dmg?.skillFormulaGraph;
    return graph ? { min: buildGraphClusters(graph.min), max: buildGraphClusters(graph.max) } : null;
  }

  get formulaGraph() { return this.graphPair(this.dmg); }
  get formulaGraph2() { return this.isComparing ? this.graphPair(this.dmg2, false, true) : null; }
  get noCriGraph() { return this.graphPair(this.dmg, true); }
  get noCriGraph2() { return this.isComparing ? this.graphPair(this.dmg2, true, true) : null; }
  private basicGraphPair(dmg: any, critical: boolean): { min: FormulaGraphCluster[]; max: FormulaGraphCluster[] } | null {
    const graph = critical ? dmg?.basicFormulaGraphCri : dmg?.basicFormulaGraph;
    return graph ? { min: buildGraphClusters(graph.min), max: buildGraphClusters(graph.max) } : null;
  }
  get basicGraph() { return this.basicGraphPair(this.dmg, this.basicBranch === 'critical'); }
  get basicGraph2() { return this.isComparing ? this.basicGraphPair(this.dmg2, this.basicBranch === 'critical') : null; }
  get basicGraphIsFlat(): boolean {
    return this.basicBranch === 'critical'
      ? this.dmg?.criMinDamage === this.dmg?.criMaxDamage
      : this.dmg?.basicMinDamage === this.dmg?.basicMaxDamage;
  }
  get basicTitle(): string { return this.basicBranch === 'critical' ? 'Como o dano crítico é calculado' : 'Como o ataque básico é calculado'; }
  get damageIsFlat(): boolean {
    const hero = pickHeroDamage(this.dmg, !!this.context?.hasSelectedChances);
    return hero.min === hero.max;
  }
  get noCriIsFlat(): boolean { return this.dmg?.skillMinDamageNoCri === this.dmg?.skillMaxDamageNoCri; }
  private basicMean(dmg: any, summary: any): DpsSteps | null {
    if (!dmg) return null;
    const hitsPerSec = summary?.calc?.hitPerSecs || 0;
    const detailed = calcDmgDpsDetailed({
      min: dmg.basicMinDamage || 0,
      max: dmg.basicMaxDamage || 0,
      cri: dmg.criRateToMonster || 0,
      criDmg: dmg.criMinDamage || dmg.criMaxDamage || 0,
      hitsPerSec,
      accRate: dmg.accuracy || 0,
    });
    return {
      avgBasicDamage: detailed.avgBasicDamage,
      criRate: detailed.limitedCriRate,
      accuracy: detailed.limitedAccuracy,
      criDmg: dmg.criMinDamage || dmg.criMaxDamage || 0,
      criPart: detailed.criHit / 100,
      noCriPart: detailed.nonCriHit / 100,
      avgDamagePerHit: detailed.totalDamage,
      hitsPerSec,
      oneHitDps: detailed.oneHitDps,
      totalHit: 1,
      damagePerUse: detailed.totalDamage,
      totalDps: detailed.oneHitDps,
    };
  }
  get mean(): DpsSteps | null {
    return this.entry?.isBasic ? this.basicMean(this.dmg, this.context?.summary) : this.entry?.hasDamageSpread ? buildDpsSteps(this.dmg) : null;
  }
  get mean2(): DpsSteps | null {
    if (!this.isComparing || !this.mean) return null;
    return this.entry?.isBasic ? this.basicMean(this.dmg2, this.context?.summary2) : buildDpsSteps(this.dmg2);
  }
  get weightedCrit(): boolean {
    return this.entry?.isBasic
      ? isCritWeighted((this.dmg?.criRateToMonster ?? 0) > 0, this.dmg?.criRateToMonster)
      : isCritWeighted(this.dmg?.skillCanCri, this.dmg?.skillCriRateToMonster);
  }
  get meanTitle(): string { return this.weightedCrit ? 'Como a média por crítico é calculada' : 'Como o dano médio é calculado'; }

  isNodeClickable(node: DamageFormulaNode): boolean { return !!node.calc || !!node.keys?.length; }
  openBreakdown(node: DamageFormulaNode, compare = false): void {
    if (!this.isNodeClickable(node)) return;
    this.breakdownClick.emit({
      label: node.label, keys: node.keys ?? [], valueClass: 'summary_stat_matk', total: node.value, calc: node.calc, compare,
    });
  }
}
