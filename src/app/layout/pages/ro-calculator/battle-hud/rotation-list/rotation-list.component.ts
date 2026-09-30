import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { BASIC_ATTACK_VALUE, MAX_ROTATION_LENGTH } from '../../../../../core/rotation';
import { buildRotationPickerOptions, elementTagClass as elementTagClassFn, RotationPickerOption } from '../battle-hud.logic';
import { DamageRange, RotationEntryView } from '../rotation-view';

/** Which of a row's three damage readings was clicked: the crit-weighted mean, or one of
 *  the two outcomes it averages. */
export type DamageBranch = 'mean' | 'nocri' | 'cri' | 'flat';

/** The synthetic option for ataque básico. ragassets serves no `/icons/skill` entry for
 *  the in-game sword cursor, so the picker points straight at the map asset. */
export const BASIC_ATTACK_ICON = 'https://assets.latam-tools.com.br/maps/_u/4680d9e5597cb23d.png';

/**
 * The "ROTAÇÃO" column: the ordered skill list, its drag/keyboard reordering, the add
 * and remove affordances, and the per-row triggers (level chip, `(i)`).
 *
 * Owns no damage math — it renders {@link RotationEntryView}s and emits the new order.
 */
@Component({
  selector: 'app-rotation-list',
  templateUrl: './rotation-list.component.html',
  styleUrls: ['./rotation-list.component.css', '../../ro-calculator.component.css'],
})
export class RotationListComponent {
  @Input({ required: true }) entries: RotationEntryView[] = [];
  /** The compared build's entries, positionally aligned with `entries`. */
  @Input() entries2: RotationEntryView[] | null = null;
  @Input() isComparing = false;
  @Input() rotation: string[] = [];
  /** The class's offensive skills, for the add picker. */
  @Input() atkSkills: any[] = [];
  @Input() isShowSelectableSkillLevel = false;
  @Input() isInProcessingPreset = false;
  /** Total damage of one cycle, for the contribution tooltip. */
  @Input() damagePerCycle = 0;
  @Output() rotationChange = new EventEmitter<{ rotation: string[]; stacks: number[] }>();
  @Output() stackChange = new EventEmitter<{ index: number; stack: number }>();
  @Output() optimizeClick = new EventEmitter<void>();
  @Output() clearClick = new EventEmitter<void>();
  @Output() detailsClick = new EventEmitter<{ index: number; event: Event }>();
  /** The element tag was clicked — the parent opens the elemental table. */
  @Output() elementTableClick = new EventEmitter<void>();
  /** A crit rate was clicked — the parent opens that row's full derivation. `index` says
   *  which row, since the skill's own flat crit and its share of the character's crit are
   *  part of the answer and differ per skill. */
  @Output() critBreakdownClick = new EventEmitter<{ index: number; event: Event }>();
  /** A damage figure was clicked — the parent opens the explanation of *that* figure.
   *  `branch` says which of the row's three readings it was. */
  @Output() damageClick = new EventEmitter<{ index: number; event: Event; branch: DamageBranch }>();

  /** Same rule the HUD's own element tags use. */
  elementTagClass = elementTagClassFn;

  /** Index of the placeholder row while the picker is open; null when not adding. */
  addingAt: number | null = null;
  pendingValue: string | null = null;
  /** Announced to screen readers after a keyboard move. */
  moveAnnouncement = '';

  readonly basicAttackIcon = BASIC_ATTACK_ICON;
  readonly maxLength = MAX_ROTATION_LENGTH;

  /** Hover note for a roll's tag. Each says what the roll *is* and, where it matters, what
   *  it is not: "sem crít." is a roll the build takes most of the time, not a floor. */
  rangeTagTooltip(range: DamageRange): string {
    if (range.kind === 'nocri') return 'O golpe quando não sai crítico — varia entre o mínimo e o máximo.';
    if (range.kind === 'cri') return 'O golpe quando sai crítico — acontece na taxa de crítico mostrada ao lado.';

    return 'O golpe desta habilidade, que varia entre o mínimo e o máximo.';
  }

  /** Hover note for the "média" tag. A crit row needs the warning — the rate is on screen
   *  right beside the figure and reads as something still to apply; a plain min–max row only
   *  needs saying what the number is. */
  meanTagTooltip(entry: RotationEntryView): string {
    return entry.damageRanges.length > 1
      ? 'A taxa de crítico já está embutida neste número: ele é a média entre o dano sem crítico e o dano crítico, pesada por essa taxa. Não multiplique pelo crítico de novo.'
      : 'Média entre o dano mínimo e o máximo — é o valor usado na rotação e no DPS.';
  }

  /** A row's figure is explained by whatever it is: the average where there is a roll to
   *  average, the formula itself where the damage never varies. */
  damageTooltip(entry: RotationEntryView): string {
    return entry.hasDamageSpread ? 'Ver como o dano médio é calculado' : 'Ver a fórmula do dano';
  }

  /** The compared build's figure sits directly under the current one, and since the arrow
   *  between them went away only its colour says which is which. The tooltip says it too. */
  compareDamageTooltip(entry: RotationEntryView): string {
    const how = entry.hasDamageSpread ? 'ver como o dano médio é calculado' : 'ver a fórmula do dano';

    return `Dano da comparação — ${how}`;
  }

  /** A one-skill rotation is all of the damage by definition, so its "100,0%" states the
   *  obvious. The share only earns its place once there is something to share it with. */
  get showsContribution(): boolean {
    return this.entries.length > 1;
  }

  get isFull(): boolean {
    return this.rotation.length >= MAX_ROTATION_LENGTH;
  }

  get canOptimize(): boolean {
    return this.rotation.length > 1 && !this.isInProcessingPreset;
  }

  private skillOptionsFor: any[] | null = null;
  private skillOptionsCache: RotationPickerOption[] = [];

  /**
   * Flat options for the add picker — ataque básico first, then the class's own skills.
   * Rebuilt only when the skill list itself changes: a fresh array on every change
   * detection makes ui-dropdown re-render every option, and an icon that fails to load
   * then errors again on each pass.
   */
  get skillOptions(): RotationPickerOption[] {
    if (this.skillOptionsFor !== this.atkSkills) {
      this.skillOptionsFor = this.atkSkills;
      this.skillOptionsCache = buildRotationPickerOptions(BASIC_ATTACK_VALUE, this.atkSkills);
    }
    return this.skillOptionsCache;
  }

  contributionTooltip(entry: RotationEntryView): string {
    const pct = entry.contributionPercent.toFixed(1).replace('.', ',');
    const total = Math.round(this.damagePerCycle).toLocaleString('pt-BR');

    return `Contribuição desta habilidade no dano total da rotação — ${pct}% dos ${total} por ciclo`;
  }

  /** Marks options already in the rotation, so the picker can flag a repeat. */
  isInRotation(value: string): boolean {
    return this.rotation.includes(value);
  }

  trackByIndex(index: number): number {
    return index;
  }

  onDrop(event: CdkDragDrop<RotationEntryView[]>) {
    if (event.previousIndex === event.currentIndex) return;
    const next = this.rotation.slice();
    moveItemInArray(next, event.previousIndex, event.currentIndex);
    const stacks = this.entries.map((entry) => entry.stackCount);
    moveItemInArray(stacks, event.previousIndex, event.currentIndex);
    this.rotationChange.emit({ rotation: next, stacks });
  }

  /**
   * The keyboard path for reordering. CDK's drag-drop is pointer-only, and the handle is
   * the only thing a keyboard user could grab, so Arrow Up/Down on it moves the row and
   * announces where it landed.
   */
  moveBy(index: number, delta: number, event: Event) {
    const target = index + delta;
    if (target < 0 || target >= this.rotation.length) return;
    event.preventDefault();

    const next = this.rotation.slice();
    moveItemInArray(next, index, target);
    const stacks = this.entries.map((entry) => entry.stackCount);
    moveItemInArray(stacks, index, target);
    this.moveAnnouncement = `${this.entries[index]?.name ?? 'Habilidade'} movida para a posição ${target + 1} de ${next.length}`;
    this.rotationChange.emit({ rotation: next, stacks });
  }

  remove(index: number) {
    const next = this.rotation.slice();
    next.splice(index, 1);
    const stacks = this.entries.map((entry) => entry.stackCount);
    stacks.splice(index, 1);
    this.rotationChange.emit({ rotation: next, stacks });
  }

  /** Opens a placeholder row with the picker focused. */
  startAdding() {
    if (this.isFull) return;
    this.pendingValue = null;
    this.addingAt = this.rotation.length;
  }

  /** Dismissing the picker without choosing removes the placeholder row. */
  cancelAdding() {
    this.addingAt = null;
    this.pendingValue = null;
  }

  commitAdding(value: string) {
    if (!value) return this.cancelAdding();
    const skill = this.atkSkills.find((entry) => entry.value === value || entry.values?.includes(value) || entry.levelList?.some((level) => level.value === value));
    const defaultStack = skill?.defaultStack ?? skill?.maxStack ?? 0;
    this.rotationChange.emit({ rotation: [...this.rotation, value], stacks: [...this.entries.map((entry) => entry.stackCount), defaultStack] });
    this.cancelAdding();
  }

  /** Swaps one entry's level in place, leaving its position alone. */
  changeLevel(index: number, value: string) {
    if (!value || this.rotation[index] === value) return;
    const next = this.rotation.slice();
    next[index] = value;
    this.rotationChange.emit({ rotation: next, stacks: this.entries.map((entry) => entry.stackCount) });
  }

  /** The compared build's entry at the same position, when the two line up. */
  compareOf(index: number): RotationEntryView | null {
    return this.isComparing ? this.entries2?.[index] ?? null : null;
  }
}
