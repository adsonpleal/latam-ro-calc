import { Component, EventEmitter, Input, Output } from '@angular/core';
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
  private readonly dmgTypePtBr: Record<string, string> = {
    Melee: 'Corpo a corpo',
    Range: 'À distância',
    Magical: 'Mágico',
  };

  dmgTypeLabel(type: string): string {
    return this.dmgTypePtBr[type] ?? type;
  }

  onShowElementalTableClick(): void {
    this.showElementTableClick.emit(1);
  }

  isChanceSelected(name: string): boolean {
    return this.selectedChances?.includes(name);
  }

  onToggleChance(name: string): void {
    const current = this.selectedChances || [];
    const next = current.includes(name) ? current.filter((n) => n !== name) : [...current, name];
    this.selectedChancesChange.emit(next);
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

  // --- Hero (DPS / dano por uso) ---------------------------------------------

  get heroCurrent(): HeroDamage {
    return pickHeroDamage(this.dmg);
  }

  get heroSimulated(): HeroDamage | null {
    return this.isComparing ? pickHeroDamage(this.dmg2) : null;
  }

  private get heroPrimaryCurrent(): number {
    const h = this.heroCurrent;
    return this.isAutoSpell ? (h.min + h.max) / 2 : h.dps;
  }

  private get heroPrimarySimulated(): number {
    const h = this.heroSimulated;
    if (!h) return 0;
    return this.isAutoSpell ? (h.min + h.max) / 2 : h.dps;
  }

  get heroDelta(): number | null {
    if (!this.isComparing) return null;
    return deltaPercent(this.heroPrimaryCurrent, this.heroPrimarySimulated);
  }

  get heroBiggerSide(): DpsSide {
    if (!this.isComparing) return 'current';
    return pickBiggerDpsSide(this.heroPrimaryCurrent, this.heroPrimarySimulated);
  }

  // "sem efeitos: Nx base–range" only makes sense when the hero switched to the
  // effected (chance-triggered) figures, so the base range is a different number.
  get heroShowsBaseFallback(): boolean {
    return this.heroCurrent.effected;
  }

  // --- Castbar -----------------------------------------------------------

  get castbar(): CastbarResult {
    const c = this.calcSkill || {};
    return computeCastbar({
      reducedFct: c.reducedFct || 0,
      reducedVct: c.reducedVct || 0,
      reducedAcd: c.reducedAcd || 0,
      reducedCd: c.reducedCd || 0,
      castPeriod: c.castPeriod || 0,
      hitPeriod: c.hitPeriod || 0,
      totalHitPerSec: c.totalHitPerSec || 0,
    });
  }

  get optimizeInfo(): OptimizeInfo {
    const c = this.calcSkill || {};
    return buildOptimizeInfo({
      reducedFct: c.reducedFct || 0,
      reducedVct: c.reducedVct || 0,
      reducedAcd: c.reducedAcd || 0,
      reducedCd: c.reducedCd || 0,
      castPeriod: c.castPeriod || 0,
      hitPeriod: c.hitPeriod || 0,
      dps: this.heroPrimaryCurrent || 0,
      sumDex2Int1: c.sumDex2Int1 || 0,
    });
  }

  optimizeComponentLabel(key: string): string {
    switch (key) {
      case 'fixa':
        return 'Fixa';
      case 'variavel':
        return 'Variável';
      case 'pos':
        return 'Pós';
      case 'recarga':
        return 'Recarga';
      default:
        return key;
    }
  }
}
