import { Component, EventEmitter, Input, OnDestroy, Output, ViewChild } from '@angular/core';
import { OverlayPanel } from 'primeng/overlaypanel';
import { ElementType } from '../../../../constants/element-type.const';
import { itemSlotLabelPtBr } from '../../../../constants/item-slot-i18n';
import { dmgTypeLabel as dmgTypeLabelUtil } from '../../../../utils';
import {
  buildDpsSteps,
  buildGraphClusters,
  buildOptimizeInfo,
  CastbarResult,
  computeCastbar,
  computeTimeToKill,
  deltaPercent,
  DpsSide,
  DpsSteps,
  FormulaGraphCluster,
  HeroDamage,
  OptimizeInfo,
  pickBiggerDpsSide,
  pickHeroDamage,
  pickHitsPerSec,
  TimeToKill,
} from './battle-hud.logic';

/** Hab./s is rendered to 2 decimals, so anything below this reads as "no change". */
const HITS_PER_SEC_EPSILON = 0.005;
import { DamageFormulaCalc, DamageFormulaNode } from '../../../../models/damage-summary.model';
import { formatNumber } from '../../../../utils/format-number';

@Component({
  selector: 'app-battle-hud',
  templateUrl: './battle-hud.component.html',
  styleUrls: ['./battle-hud.component.css', '../ro-calculator.component.css'],
})
export class BattleHudComponent implements OnDestroy {
  // #damageFormulaPanel/#damageFormulaNoCriPanel host clickable nodes that open the
  // bonus-breakdown p-dialog. PrimeNG portals that dialog (and its backdrop) to
  // document.body — outside the overlay panel's own container — so the panel's
  // built-in "click outside closes me" document listener (bound to `document`,
  // bubble phase) treats any click on the dialog (its close button, its backdrop)
  // as an outside click and closes the panel along with it.
  //
  // Fix: our own `document` **bubble-phase** listener, registered here in the
  // constructor — i.e. before any p-overlayPanel's own listener, which only binds
  // once the user opens it — runs first for same-node bubble listeners in
  // registration order. `stopImmediatePropagation()` (not `stopPropagation()`) stops
  // that later PrimeNG listener from running, without touching capture/target-phase
  // delivery — the dialog's own close button and backdrop-click handlers, which fire
  // before bubbling ever reaches `document`, are unaffected. A capture-phase listener
  // here would be wrong: it fires before the event reaches the target at all, so
  // stopping it there would silence the dialog's own click handlers too.
  private readonly dialogClickGuard = (event: MouseEvent) => {
    if ((event.target as HTMLElement)?.closest?.('.p-dialog, .p-dialog-mask')) {
      event.stopImmediatePropagation();
    }
  };

  // p-overlayPanel (this PrimeNG version) has no built-in Escape-to-close — unlike
  // p-dialog, it never binds a document keydown listener at all. Add that ourselves
  // for the two formula panels, closing whichever is currently open.
  //
  // Capture phase, deliberately: a real keypress originates at whatever element
  // currently has focus (a PrimeNG dropdown, an input, etc.) and bubbles up from
  // there — and several PrimeNG widgets bind their own "Escape closes me" keydown
  // handler that calls stopPropagation(), which would swallow the event before it
  // ever reaches a bubble-phase listener on `document`. Capture runs top-down,
  // before any of that, so it always sees the keypress regardless of focus. We
  // never call stopPropagation() ourselves here, so whatever else Escape is
  // supposed to do (e.g. p-dialog's own close-on-escape) still happens normally.
  @ViewChild('damageFormulaPanel') damageFormulaPanelRef: OverlayPanel;
  @ViewChild('damageFormulaNoCriPanel') damageFormulaNoCriPanelRef: OverlayPanel;

  private readonly escapeGuard = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    // Escape closes the topmost layer only. When a breakdown dialog is open over the
    // graph, p-dialog's own close-on-escape handles it and the panel underneath stays
    // put — otherwise one keypress would tear down the graph the user is mid-way
    // through exploring, and every node click would cost them a re-open.
    //
    // Read from the parent's state rather than probing the DOM for `.p-dialog`: that
    // element lingers while its exit animation runs, so a DOM check would still report
    // "dialog open" on the very next keypress and swallow it.
    if (this.isBreakdownOpen) return;
    if ((this.damageFormulaPanelRef as any)?.overlayVisible) this.damageFormulaPanelRef.hide();
    if ((this.damageFormulaNoCriPanelRef as any)?.overlayVisible) this.damageFormulaNoCriPanelRef.hide();
  };

  constructor() {
    document.addEventListener('click', this.dialogClickGuard);
    document.addEventListener('keydown', this.escapeGuard, true);
  }

  ngOnDestroy(): void {
    document.removeEventListener('click', this.dialogClickGuard);
    document.removeEventListener('keydown', this.escapeGuard, true);
  }

  /** Whether the parent's bonus-breakdown dialog is currently open — see escapeGuard. */
  @Input() isBreakdownOpen = false;

  @Input({ required: true }) totalSummary = {} as any;
  @Input({ required: true }) totalSummary2 = {} as any;
  @Input({ required: true }) isEnableCompare: boolean;
  @Input({ required: true }) isCalculating: boolean;
  @Input({ required: true }) isInProcessingPreset: boolean;
  @Input({ required: true }) selectedChances: string[];
  @Input({ required: true }) chanceList: any[];
  @Input({ required: true }) model = {} as any;
  @Input({ required: true }) hideBasicAtk: boolean;
  @Input({ required: true }) showLeftWeapon: boolean;
  @Input({ required: true }) selectedMonster: number;
  @Input({ required: true }) selectedMonsterName: string;
  @Input({ required: true }) compareItemNames: any[];
  // PVP: when the target is a player, override the monster sprite with the
  // target's paper-doll (and a bare-job fallback if that image fails to load).
  @Input() spriteUrlOverride: string | null = null;
  @Input() spriteFallbackUrl: string | null = null;
  // Bound arrow property on the parent (ro-calculator.component.ts), same pattern as
  // skillTooltip — a plain method reference would lose its `this` once
  // called from here.
  @Input() canBreakdownFn: (keys: string[]) => boolean;

  @Output() selectedChancesChange = new EventEmitter<string[]>();
  @Output() showElementTableClick = new EventEmitter<any>();
  @Output() showBonusBreakdownClick = new EventEmitter<{ label: string; keys: string[]; valueClass: string; total?: number; calc?: DamageFormulaCalc }>();

  // Display-only pt-BR for the skill damage type (same map as battle-dmg-summary;
  // the raw value still drives the [hidden] logic elsewhere, e.g. Magical-only chips).
  dmgTypeLabel(type: string): string {
    return dmgTypeLabelUtil(type);
  }

  /** PVP paper-doll: swap to the bare-job fallback if the composed sprite 404s. */
  onSpriteOverrideError(event: Event): void {
    if (this.spriteFallbackUrl) (event.target as HTMLImageElement).src = this.spriteFallbackUrl;
  }

  // Elements without a `property_*` rule in styles.scss (Neutral is the only one —
  // it never had a color, by design) must not fall through to p-tag's own default
  // background. 'el-tag-neutral' (battle-hud.component.css) reproduces the old
  // outlined/neutral badge look instead of an arbitrary PrimeNG color.
  private static readonly ELEMENT_COLOR_CLASSES: Set<string> = new Set(Object.values(ElementType).filter((e) => e !== ElementType.Neutral));

  elementTagClass(elementUpper: string | undefined): string {
    return elementUpper && BattleHudComponent.ELEMENT_COLOR_CLASSES.has(elementUpper) ? 'property_' + elementUpper : 'el-tag-neutral';
  }

  onShowElementalTableClick(): void {
    this.showElementTableClick.emit(1);
  }

  // "Which equipment affects this field" popover, same mechanism as the top
  // stat summary's ATQ/DEF/etc. rows (ro-calculator.component.ts canBreakdown/showBonusBreakdown).
  isBreakdownClickable(keys: string[]): boolean {
    return !!this.canBreakdownFn && this.canBreakdownFn(keys);
  }

  // `total`, when passed, is the actual clicked value (e.g. a formula-trace step's
  // running total) — showBonusBreakdown uses it to show what's left over after
  // summing equipment sources, for keys whose full value is never a pure equip sum
  // (e.g. "ATQ" also carries character stats, weapon base, refine...).
  //
  // `calc` is the node's own derivation (ATQ Status, ATQ da Arma, the synthesized
  // "Adicional" chips...). Those values come from a formula rather than a sum of
  // equipment bonuses, so they open the dialog on the strength of the calc alone —
  // isBreakdownClickable would (correctly) reject them, since no equipped source
  // contributes to their keys.
  openBreakdown(label: string, keys: string[] = [], valueClass = 'summary_stat_matk', total?: number, calc?: DamageFormulaCalc): void {
    if (!calc && !this.isBreakdownClickable(keys)) return;
    this.showBonusBreakdownClick.emit({ label, keys, valueClass, total, calc });
  }

  /** A graph node is clickable when it has a derivation to show or equipment behind it. */
  isNodeClickable(node: DamageFormulaNode): boolean {
    return !!node.calc || (!!node.keys && this.isBreakdownClickable(node.keys));
  }

  // ChanceModel.label2 is built (calculator.ts) as "[ DES +200 ]" for the legacy
  // "label → label2" line, where the brackets read as a list delimiter. Here it's
  // shown alone in a tooltip, so the brackets are just noise — strip them for
  // display only; the underlying label2 (shared with the legacy tab) is untouched.
  effectTooltip(label2: string): string {
    return (label2 || '').replace(/^\s*\[\s*/, '').replace(/\s*\]\s*$/, '');
  }

  get dmg(): any {
    return this.totalSummary?.dmg;
  }

  // "Dano Crít." tooltip: some skills only apply a fraction of the character's
  // crit-damage bonus (skillCriDmgPercentage, e.g. 0.5 for Sonic Blow, 0.25 for
  // Windhawk's Chain Crash). Undefined (no tooltip) when the skill gets the full
  // bonus (percentage === 1).
  criDmgPercentageTooltip(dmg: any): string | undefined {
    const pct = dmg?.skillCriDmgPercentage;
    if (pct == null || pct === 1) return undefined;
    return `Esta habilidade aplica apenas ${Math.round(pct * 100)}% do dano crítico total do personagem`;
  }

  get dmg2(): any {
    return this.totalSummary2?.dmg;
  }

  get calcSkill(): any {
    return this.totalSummary?.calcSkill;
  }

  get isComparing(): boolean {
    return !!(this.isEnableCompare && this.dmg2);
  }

  get isAutoSpell(): boolean {
    return !!this.dmg?.isAutoSpell;
  }

  // pt-BR item-slot labels for the compare ribbon, e.g. ['boot'] -> 'Bota' — same
  // util the compare-slot picker uses (ro-calculator.component.ts line ~341).
  get compareRibbonText(): string {
    return (this.compareItemNames || []).map((v) => itemSlotLabelPtBr(v)).join(', ');
  }

  // --- Hero (DPS / dano por uso) ---------------------------------------------

  // Fix 10: when the last Efeito is unselected, the parent pipeline never refreshes
  // totalSummary, so dmg.effectedSkillDamageMin/effectedSkillHitsPerSec can stay
  // stale. Every effected-value read in this component must gate on this flag,
  // mirroring the legacy template's `selectedChances?.length` guards.
  private get hasSelectedChances(): boolean {
    return (this.selectedChances?.length ?? 0) > 0;
  }

  // "Hab./s" sub-line — see pickHitsPerSec for the effected||base fallback and the
  // VelAtq cap it applies.
  get heroHitsPerSec(): number {
    return pickHitsPerSec(this.totalSummary, this.hasSelectedChances);
  }

  // Compare build's "Hab./s", shown as `6 → 7,2` next to the current one. Null unless
  // we're comparing AND the rate actually moved: unlike DPS/"Morre em" (which shift on
  // any damage change), swapping most items leaves the cast/ASPD rate untouched, and
  // rendering `6 → 6` on every comparison is noise rather than information.
  // Null is the only "hide me" signal — 0 is a real answer (a compare build that cannot
  // attack at all), so the template tests `!== null` rather than truthiness.
  get heroHitsPerSecSim(): number | null {
    if (!this.isComparing) return null;
    const sim = pickHitsPerSec(this.totalSummary2, this.hasSelectedChances);

    return Math.abs(sim - this.heroHitsPerSec) < HITS_PER_SEC_EPSILON ? null : sim;
  }

  // heroPrimaryCurrent/heroPrimarySimulated stay standalone (not folded into the
  // `hero` getter below) because optimizeInfo needs `dps` on its own, outside any
  // template-driven amplification — no *ngIf="hero as h" scope to piggyback on there.
  private get heroPrimaryCurrent(): number {
    const h = pickHeroDamage(this.dmg, this.hasSelectedChances);
    return this.isAutoSpell ? (h.min + h.max) / 2 : h.dps;
  }

  private get heroPrimarySimulated(): number {
    if (!this.isComparing) return 0;
    const h = pickHeroDamage(this.dmg2, this.hasSelectedChances);
    return this.isAutoSpell ? (h.min + h.max) / 2 : h.dps;
  }

  // Single consolidated read of the hero (DPS / dano por uso) section — the template
  // binds this once via `*ngIf="hero as h"` instead of re-invoking five separate
  // getters (which themselves used to re-derive heroCurrent/heroSimulated multiple
  // times each) on every CD pass.
  get hero(): {
    current: HeroDamage;
    simulated: HeroDamage | null;
    biggerSide: DpsSide;
    delta: number | null;
    showsBaseFallback: boolean;
    ttk: TimeToKill | null;
    ttkSim: TimeToKill | null;
  } {
    const current = pickHeroDamage(this.dmg, this.hasSelectedChances);
    const simulated = this.isComparing ? pickHeroDamage(this.dmg2, this.hasSelectedChances) : null;

    const primaryCurrent = this.isAutoSpell ? (current.min + current.max) / 2 : current.dps;
    const primarySimulated = simulated ? (this.isAutoSpell ? (simulated.min + simulated.max) / 2 : simulated.dps) : 0;

    // Same monster on both sides of a comparison, so only the DPS differs.
    const monsterHp = this.totalSummary?.monster?.hp || 0;

    return {
      current,
      simulated,
      biggerSide: this.isComparing ? pickBiggerDpsSide(primaryCurrent, primarySimulated) : 'current',
      delta: this.isComparing ? deltaPercent(primaryCurrent, primarySimulated) : null,
      ttk: computeTimeToKill(monsterHp, current.dps),
      ttkSim: simulated ? computeTimeToKill(monsterHp, simulated.dps) : null,
      // "sem efeitos: Nx base–range" only makes sense when the hero switched to the
      // effected (chance-triggered) figures, so the base range is a different number.
      showsBaseFallback: current.effected,
    };
  }

  /** Explains the "Morre em" figure: the division behind it, plus the engine's own
   *  hits-to-kill (dmg.skillHitKill = ceil(HP / dano mínimo), so it's the pessimistic
   *  count — worth showing next to a DPS-averaged time). */
  get ttkTooltip(): string {
    const hp = this.totalSummary?.monster?.hp || 0;
    const hits = this.dmg?.skillHitKill || 0;
    const base = `HP do alvo (${formatNumber(hp)}) ÷ DPS — considera precisão, crítico e a cadência real da habilidade.`;
    return hits > 0 ? `${base}\nGolpes p/ matar: ${formatNumber(hits)} (pelo dano mínimo).` : base;
  }

  // Step-by-step DPS derivation, shown in a popover when the DPS/Dano numbers
  // are clicked. Built from the engine's own calcDmgDps inputs (see
  // dmg.skillDpsInput*), so it always reconciles with dmg.skillDps.
  get dpsSteps(): DpsSteps | null {
    return buildDpsSteps(this.dmg);
  }

  get dpsStepsSim(): DpsSteps | null {
    return this.isComparing ? buildDpsSteps(this.dmg2) : null;
  }

  // True when VelAtq (ASPD) caps the achieved Hab./s below what the cast timings
  // alone would allow — same condition buildOptimizeInfo uses for its "ASPD limita
  // a conjuração" callout, surfaced here too since this popover is where the capped
  // rate actually feeds into the DPS total.
  private isAspdLimiting(castRatePerSec: number, aspdHitsPerSec: number): boolean {
    return aspdHitsPerSec > 0 && aspdHitsPerSec < castRatePerSec - 1e-5;
  }

  get isAspdLimited(): boolean {
    return this.isAspdLimiting(this.calcSkill?.totalHitPerSec || 0, this.totalSummary?.calc?.hitPerSecs || 0);
  }

  get isAspdLimitedSim(): boolean {
    return this.isAspdLimiting(this.totalSummary2?.calcSkill?.totalHitPerSec || 0, this.totalSummary2?.calc?.hitPerSecs || 0);
  }

  // Node-graph view of the real per-hit damage formula (see damage-calculator.ts
  // calcPhysicalSkillDamage/calcMagicalSkillDamage), shown when "Dano atual" is
  // clicked. buildGraphClusters groups the engine's flat node list into left-to-right
  // clusters — one per formula stage, with any contributing "input" values (statusAtk,
  // extraAtk's sub-parts, etc.) attached as chips. undefined for the handful of skills
  // with a fully custom formula that skip the traced code path.
  //
  // Memoized (keyed by the source `graph` object identity, which is stable across
  // change-detection cycles — it only changes when totalSummary is recalculated):
  // this getter is invoked by Angular on every CD pass, and *ngFor diffs its `clusters`
  // input by reference. Rebuilding fresh arrays/objects each call made every node
  // "new" on every pass, so *ngFor tore down and recreated the whole DOM subtree
  // constantly — including on the `mousedown` that precedes a click, detaching the
  // very node the user was about to click before the `click` event could reach it.
  private readonly graphClusterCache = new WeakMap<object, { min: FormulaGraphCluster[]; max: FormulaGraphCluster[] }>();

  private toClusterPair(graph: { min: any; max: any } | undefined | null): { min: FormulaGraphCluster[]; max: FormulaGraphCluster[] } | null {
    if (!graph) return null;
    const cached = this.graphClusterCache.get(graph);
    if (cached) return cached;
    const built = { min: buildGraphClusters(graph.min), max: buildGraphClusters(graph.max) };
    this.graphClusterCache.set(graph, built);
    return built;
  }

  get formulaGraph(): { min: FormulaGraphCluster[]; max: FormulaGraphCluster[] } | null {
    return this.toClusterPair(this.dmg?.skillFormulaGraph);
  }

  get formulaGraphSim(): { min: FormulaGraphCluster[]; max: FormulaGraphCluster[] } | null {
    return this.isComparing ? this.toClusterPair(this.dmg2?.skillFormulaGraph) : null;
  }

  // When the skill's min/max damage are the same (e.g. no weapon ATK variance),
  // the formula popover collapses "Dano mínimo"/"Dano máximo" into one "Dano"
  // section instead of showing the identical chain twice.
  get damageIsFlat(): boolean {
    return this.dmg?.skillMinDamage === this.dmg?.skillMaxDamage;
  }

  // Same as formulaGraph/formulaGraphSim/damageIsFlat above, but for "Dano sem crít."
  // (skillMinDamageNoCri/skillMaxDamageNoCri) — only populated when skillCanCri is true.
  get formulaGraphNoCri(): { min: FormulaGraphCluster[]; max: FormulaGraphCluster[] } | null {
    return this.toClusterPair(this.dmg?.skillFormulaGraphNoCri);
  }

  get formulaGraphNoCriSim(): { min: FormulaGraphCluster[]; max: FormulaGraphCluster[] } | null {
    return this.isComparing ? this.toClusterPair(this.dmg2?.skillFormulaGraphNoCri) : null;
  }

  get damageNoCriIsFlat(): boolean {
    return this.dmg?.skillMinDamageNoCri === this.dmg?.skillMaxDamageNoCri;
  }

  // --- Castbar -----------------------------------------------------------

  // Single normalization of a calcSkill-shaped object's cast timings, shared by
  // castbar/castbar2 and optimizeInfo below (both used to repeat the identical
  // `c.X || 0` fallback chain). Takes the source object explicitly so it can
  // normalize either side (current totalSummary.calcSkill or the comparison
  // totalSummary2.calcSkill) with the same logic.
  private normalizeCastTimings(c: any): {
    reducedFct: number;
    reducedVct: number;
    reducedAcd: number;
    reducedCd: number;
    castPeriod: number;
    hitPeriod: number;
    totalHitPerSec: number;
  } {
    c = c || {};
    return {
      reducedFct: c.reducedFct || 0,
      reducedVct: c.reducedVct || 0,
      reducedAcd: c.reducedAcd || 0,
      reducedCd: c.reducedCd || 0,
      castPeriod: c.castPeriod || 0,
      hitPeriod: c.hitPeriod || 0,
      totalHitPerSec: c.totalHitPerSec || 0,
    };
  }

  private get normalizedCastTimings() {
    return this.normalizeCastTimings(this.calcSkill);
  }

  private get normalizedCastTimings2() {
    return this.normalizeCastTimings(this.totalSummary2?.calcSkill);
  }

  get castbar(): CastbarResult {
    return computeCastbar(this.normalizedCastTimings);
  }

  get castbar2(): CastbarResult | null {
    return this.isComparing ? computeCastbar(this.normalizedCastTimings2) : null;
  }

  // The comparison castbar only earns its keep when the compared set actually
  // changes a cast-time component — otherwise it'd just be a redundant copy
  // of the current bar.
  get castTimingsDiffer(): boolean {
    if (!this.isComparing) return false;
    const a = this.normalizedCastTimings;
    const b = this.normalizedCastTimings2;
    const EPS = 1e-3;
    return (
      Math.abs(a.reducedFct - b.reducedFct) > EPS ||
      Math.abs(a.reducedVct - b.reducedVct) > EPS ||
      Math.abs(a.reducedAcd - b.reducedAcd) > EPS ||
      Math.abs(a.reducedCd - b.reducedCd) > EPS
    );
  }

  // When both bars are shown (comparing + differing timings), they share one scale:
  // the slower (bigger hitPeriod) side renders at full width, the faster one shrinks
  // proportionally — instead of each bar independently normalizing to its own 100%,
  // which would hide how much faster/slower one side's whole cycle actually is.
  castBarWidthPercent(hitPeriod: number): number {
    if (!this.isComparing || !this.castTimingsDiffer) return 100;
    const maxHitPeriod = Math.max(this.castbar?.hitPeriod || 0, this.castbar2?.hitPeriod || 0);
    return maxHitPeriod > 0 ? (hitPeriod / maxHitPeriod) * 100 : 100;
  }

  get optimizeInfo(): OptimizeInfo {
    const { reducedFct, reducedVct, reducedAcd, reducedCd, castPeriod, hitPeriod } = this.normalizedCastTimings;
    return buildOptimizeInfo({
      reducedFct,
      reducedVct,
      reducedAcd,
      reducedCd,
      castPeriod,
      hitPeriod,
      dps: this.heroPrimaryCurrent || 0,
      sumDex2Int1: this.calcSkill?.sumDex2Int1 || 0,
      aspdHitsPerSec: this.totalSummary?.calc?.hitPerSecs || 0,
    });
  }
}
