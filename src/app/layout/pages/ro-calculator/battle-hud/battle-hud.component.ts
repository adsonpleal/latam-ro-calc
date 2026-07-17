import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ElementType } from '../../../../constants/element-type.const';
import { itemSlotLabelPtBr } from '../../../../constants/item-slot-i18n';
import { dmgTypeLabel as dmgTypeLabelUtil } from '../../../../utils';
import {
  buildOptimizeInfo,
  CastbarResult,
  computeCastbar,
  deltaPercent,
  DpsSide,
  HeroDamage,
  OptimizeInfo,
  pickBiggerDpsSide,
  pickHeroDamage,
} from './battle-hud.logic';

@Component({
  selector: 'app-battle-hud',
  templateUrl: './battle-hud.component.html',
  styleUrls: ['./battle-hud.component.css', '../ro-calculator.component.css'],
})
export class BattleHudComponent {
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

  @Output() selectedChancesChange = new EventEmitter<string[]>();
  @Output() showElementTableClick = new EventEmitter<any>();

  // Display-only pt-BR for the skill damage type (same map as battle-dmg-summary;
  // the raw value still drives the [hidden] logic elsewhere, e.g. Magical-only chips).
  dmgTypeLabel(type: string): string {
    return dmgTypeLabelUtil(type);
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

  // "Hab./s" sub-line: same effected||base fallback as the hero DPS, gated the same way.
  get heroHitsPerSec(): number {
    const effected = this.hasSelectedChances ? this.dmg?.effectedSkillHitsPerSec : null;
    return effected || this.calcSkill?.totalHitPerSec || 0;
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
  get hero(): { current: HeroDamage; simulated: HeroDamage | null; biggerSide: DpsSide; delta: number | null; showsBaseFallback: boolean } {
    const current = pickHeroDamage(this.dmg, this.hasSelectedChances);
    const simulated = this.isComparing ? pickHeroDamage(this.dmg2, this.hasSelectedChances) : null;

    const primaryCurrent = this.isAutoSpell ? (current.min + current.max) / 2 : current.dps;
    const primarySimulated = simulated ? (this.isAutoSpell ? (simulated.min + simulated.max) / 2 : simulated.dps) : 0;

    return {
      current,
      simulated,
      biggerSide: this.isComparing ? pickBiggerDpsSide(primaryCurrent, primarySimulated) : 'current',
      delta: this.isComparing ? deltaPercent(primaryCurrent, primarySimulated) : null,
      // "sem efeitos: Nx base–range" only makes sense when the hero switched to the
      // effected (chance-triggered) figures, so the base range is a different number.
      showsBaseFallback: current.effected,
    };
  }

  // --- Castbar -----------------------------------------------------------

  // Single normalization of calcSkill's cast timings, shared by castbar and
  // optimizeInfo below (both used to repeat the identical `c.X || 0` fallback chain).
  private get normalizedCastTimings(): {
    reducedFct: number;
    reducedVct: number;
    reducedAcd: number;
    reducedCd: number;
    castPeriod: number;
    hitPeriod: number;
    totalHitPerSec: number;
  } {
    const c = this.calcSkill || {};
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

  get castbar(): CastbarResult {
    return computeCastbar(this.normalizedCastTimings);
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
