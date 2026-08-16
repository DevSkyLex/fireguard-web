import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import { HlmButton } from '@shared/ui/button';
import {
  HlmDialog,
  HlmDialogContent,
  HlmDialogDescription,
  HlmDialogFooter,
  HlmDialogHeader,
  HlmDialogPortal,
  HlmDialogTitle,
} from '@shared/ui/dialog';
import { HlmInput } from '@shared/ui/input';
import { HlmSpinnerImports } from '@shared/ui/spinner';

/**
 * Component FacilityPlanPinPositionDialog
 * @class FacilityPlanPinPositionDialog
 *
 * @description
 * The non-pointer "Edit position" path for one equipment pin — two percent
 * x/y fields (0–100%, one decimal step, matching
 * `FacilityPlanZoneGeometryDialog`'s coordinate unit), prefilled from
 * {@link x}/{@link y} on every open. Submits the normalized position via
 * {@link submitted}; {@link removed} is the "Remove from plan" action.
 *
 * Presentational: it owns only its own draft, not the write — the page owns
 * `FacilityPlansStore` (`ARCHITECTURE.md` §10.5).
 *
 * @since 1.4.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-plan-pin-position-dialog',
  imports: [
    HlmButton,
    HlmDialog,
    HlmDialogContent,
    HlmDialogDescription,
    HlmDialogFooter,
    HlmDialogHeader,
    HlmDialogPortal,
    HlmDialogTitle,
    HlmInput,
    ...HlmSpinnerImports,
  ],
  templateUrl: './facility-plan-pin-position-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityPlanPinPositionDialog {
  //#region Inputs
  /** Whether the dialog is open. */
  public readonly visible: InputSignal<boolean> = input<boolean>(false);

  /** The equipment's display name, for the dialog title. */
  public readonly equipmentName: InputSignal<string> = input<string>('');

  /** The pin's current normalized horizontal position, seeding the draft on every open. */
  public readonly x: InputSignal<number> = input<number>(0.5);

  /** The pin's current normalized vertical position, seeding the draft on every open. */
  public readonly y: InputSignal<number> = input<number>(0.5);

  /** Whether a save or remove this dialog triggered is still in flight. */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /** The dialog wants to open or close. */
  public readonly visibleChange: OutputEmitterRef<boolean> = output<boolean>();

  /** Emits the validated position, in normalized `[0, 1]` image coordinates. */
  public readonly submitted: OutputEmitterRef<readonly [number, number]> =
    output<readonly [number, number]>();

  /** The "Remove from plan" action. */
  public readonly removed: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /** The edited horizontal draft, as a percent string. */
  protected readonly xDraft: WritableSignal<string> = signal('50.0');

  /** The edited vertical draft, as a percent string. */
  protected readonly yDraft: WritableSignal<string> = signal('50.0');

  /** Whether both drafts parse to a number in `[0, 100]`. */
  protected readonly canSubmit: Signal<boolean> = computed<boolean>(
    () => isValidPercent(this.xDraft()) && isValidPercent(this.yDraft()),
  );

  /** The overlay's own open/closed state, derived from {@link visible}. */
  protected readonly dialogState: Signal<BrnDialogState> = computed<BrnDialogState>(() =>
    this.visible() ? 'open' : 'closed',
  );
  //#endregion

  //#region Lifecycle
  /**
   * Method constructor
   * @constructor
   * @description Reseeds the draft from {@link x}/{@link y} every time the dialog opens.
   * @access public
   * @since 1.4.0
   */
  public constructor() {
    effect((): void => {
      if (!this.visible()) return;

      this.xDraft.set(toPercentString(this.x()));
      this.yDraft.set(toPercentString(this.y()));
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method onStateChanged
   * @description Reports a dismissal back to the page.
   * @access protected
   * @since 1.4.0
   * @param {BrnDialogState} state - The overlay's new state.
   * @returns {void}
   */
  protected onStateChanged(state: BrnDialogState): void {
    if (this.pending()) return;

    const isOpen: boolean = state === 'open';
    if (isOpen === this.visible()) return;

    this.visibleChange.emit(isOpen);
  }

  /**
   * Method submit
   * @description Emits the validated position, converted from percent to normalized `[0, 1]` coordinates.
   * @access protected
   * @since 1.4.0
   * @returns {void}
   */
  protected submit(): void {
    if (this.pending() || !this.canSubmit()) return;

    this.submitted.emit([toNormalized(this.xDraft()), toNormalized(this.yDraft())]);
  }

  /**
   * Method requestRemove
   * @description Emits {@link removed}.
   * @access protected
   * @since 1.4.0
   * @returns {void}
   */
  protected requestRemove(): void {
    if (this.pending()) return;

    this.removed.emit();
  }
  //#endregion
}

/**
 * Function toPercentString
 * @access private
 * @since 1.4.0
 * @param {number} normalized - A normalized `[0, 1]` coordinate.
 * @returns {string} The coordinate as a percent string, one decimal.
 */
function toPercentString(normalized: number): string {
  return (normalized * 100).toFixed(1);
}

/**
 * Function toNormalized
 * @access private
 * @since 1.4.0
 * @param {string} percent - A percent string in `[0, 100]`.
 * @returns {number} The value converted to normalized `[0, 1]`.
 */
function toNormalized(percent: string): number {
  return Number(percent) / 100;
}

/**
 * Function isValidPercent
 * @access private
 * @since 1.4.0
 * @param {string} value - The raw draft string.
 * @returns {boolean} `true` when `value` parses to a finite number in `[0, 100]`.
 */
function isValidPercent(value: string): boolean {
  const parsed: number = Number(value);

  return value.trim() !== '' && Number.isFinite(parsed) && parsed >= 0 && parsed <= 100;
}
