import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { BASIC_ATTACK_VALUE, MAX_ROTATION_LENGTH } from '../../../../../core/rotation';
import { buildRotationPickerOptions, elementTagClass as elementTagClassFn, RotationPickerOption } from '../battle-hud.logic';
import { RotationEntryView } from '../rotation-view';

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
  /** Whether a skill row's crit rate has equipment sources behind it worth opening. */
  @Input() isCritClickable = false;
  /** The same for an ataque básico row, whose rate also draws on CRIT à distância — a build
   *  can have that bonus and no plain `cri` source at all, and the row must still open. */
  @Input() isCritClickableBasic = false;

  @Output() rotationChange = new EventEmitter<string[]>();
  @Output() optimizeClick = new EventEmitter<void>();
  @Output() clearClick = new EventEmitter<void>();
  @Output() detailsClick = new EventEmitter<{ index: number; event: Event }>();
  /** The element tag was clicked — the parent opens the elemental table. */
  @Output() elementTableClick = new EventEmitter<void>();
  /** A crit rate was clicked — `compare` marks the simulated one, which drills into the
   *  compared build's own sources; `isBasic` says whether the row is ataque básico, whose
   *  rate is the only one carrying CRIT à distância. */
  @Output() critBreakdownClick = new EventEmitter<{ compare: boolean; isBasic: boolean }>();
  /** The damage figure was clicked — the parent opens that step's damage formula. */
  @Output() damageClick = new EventEmitter<{ index: number; event: Event }>();

  /** Same rule the HUD's own element tags use. */
  elementTagClass = elementTagClassFn;

  /** Index of the placeholder row while the picker is open; null when not adding. */
  addingAt: number | null = null;
  pendingValue: string | null = null;
  /** Announced to screen readers after a keyboard move. */
  moveAnnouncement = '';

  readonly basicAttackIcon = BASIC_ATTACK_ICON;
  readonly maxLength = MAX_ROTATION_LENGTH;

  /** Hover note for the "média" tag — see the template for why the tag exists at all. */
  readonly MEAN_TAG_TOOLTIP =
    'A taxa de crítico já está embutida neste número: ele é a média entre o dano sem crítico e o dano crítico, pesada por essa taxa. Não multiplique pelo crítico de novo.';

  /** A crit-weighted row's figure is explained by the average, not by the formula of one
   *  of the two outcomes — which is also where its click lands. */
  damageTooltip(entry: RotationEntryView): string {
    return entry.critWeighted ? 'Ver como a média por crítico é calculada' : 'Ver a fórmula do dano';
  }

  get isFull(): boolean {
    return this.rotation.length >= MAX_ROTATION_LENGTH;
  }

  get canOptimize(): boolean {
    return this.rotation.length > 1 && !this.isInProcessingPreset;
  }

  /** Flat options for the add picker — ataque básico first, then the class's own skills. */
  get skillOptions(): RotationPickerOption[] {
    return buildRotationPickerOptions(BASIC_ATTACK_VALUE, this.atkSkills);
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
    this.rotationChange.emit(next);
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
    this.moveAnnouncement = `${this.entries[index]?.name ?? 'Habilidade'} movida para a posição ${target + 1} de ${next.length}`;
    this.rotationChange.emit(next);
  }

  remove(index: number) {
    const next = this.rotation.slice();
    next.splice(index, 1);
    this.rotationChange.emit(next);
  }

  /**
   * PrimeNG's filter box is a bare `<input type="text">`, which password managers read as
   * a login field and offer saved passwords into. `autocomplete="off"` (which PrimeNG
   * already sets) is honoured by none of them.
   *
   * `type="search"` is the part that does the work: a search field is not a credential
   * candidate for any classifier, and it is what this input actually is. The `data-*`
   * attributes are each manager's own documented opt-out, kept as a belt-and-braces for
   * the ones that classify by context rather than by type. Apple's iCloud Passwords
   * extension publishes no opt-out at all, so `type` is the only lever it may respond to.
   *
   * Stamped on show because the overlay does not exist until then.
   */
  markFilterAsPlainText() {
    const input = document.querySelector<HTMLInputElement>('.rot-add-dd-panel .p-dropdown-filter');
    if (!input) return;

    input.setAttribute('type', 'search');
    input.setAttribute('name', 'rotation-skill-filter');
    input.setAttribute('data-lpignore', 'true'); // LastPass
    input.setAttribute('data-1p-ignore', ''); // 1Password
    input.setAttribute('data-bwignore', 'true'); // Bitwarden
    input.setAttribute('data-form-type', 'other'); // Dashlane
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
    this.rotationChange.emit([...this.rotation, value]);
    this.cancelAdding();
  }

  /** Swaps one entry's level in place, leaving its position alone. */
  changeLevel(index: number, value: string) {
    if (!value || this.rotation[index] === value) return;
    const next = this.rotation.slice();
    next[index] = value;
    this.rotationChange.emit(next);
  }

  /** The compared build's entry at the same position, when the two line up. */
  compareOf(index: number): RotationEntryView | null {
    return this.isComparing ? this.entries2?.[index] ?? null : null;
  }
}
