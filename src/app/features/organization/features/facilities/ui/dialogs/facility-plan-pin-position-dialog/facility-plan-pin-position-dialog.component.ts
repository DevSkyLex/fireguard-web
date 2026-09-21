import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { disabled, form, FormField, validate, type FieldTree } from '@angular/forms/signals';
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
import { HlmField, HlmFieldLabel, HlmFieldError } from '@shared/ui/field';
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
 * {@link x}/{@link y} on every open — 50%/50% when the pin is not on the
 * plan yet, making the dialog a keyboard placement path too. A field with an
 * out-of-range value gets `aria-invalid` plus a `role="alert"` message it is
 * described by. Submits the normalized position via {@link submitted};
 * {@link removed} is the "Remove from plan" action.
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
    HlmField,
    HlmFieldLabel,
    HlmFieldError,
    FormField,
    ...HlmSpinnerImports,
  ],
  templateUrl: './facility-plan-pin-position-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityPlanPinPositionDialog {
  //#region Inputs
  /**
   * Property visible
   * @readonly
   * @description Whether the dialog is open.
   * @access public
   * @since 1.4.0
   * @type {InputSignal<boolean>}
   */
  public readonly visible: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property equipmentName
   * @readonly
   * @description The equipment's display name, for the dialog title.
   * @access public
   * @since 1.4.0
   * @type {InputSignal<string>}
   */
  public readonly equipmentName: InputSignal<string> = input<string>('');

  /**
   * Property x
   * @readonly
   * @description The pin's current normalized horizontal position, seeding the draft on every open.
   * @access public
   * @since 1.4.0
   * @type {InputSignal<number>}
   */
  public readonly x: InputSignal<number> = input<number>(0.5);

  /**
   * Property y
   * @readonly
   * @description The pin's current normalized vertical position, seeding the draft on every open.
   * @access public
   * @since 1.4.0
   * @type {InputSignal<number>}
   */
  public readonly y: InputSignal<number> = input<number>(0.5);

  /**
   * Property pending
   * @readonly
   * @description Whether a save or remove this dialog triggered is still in flight.
   * @access public
   * @since 1.4.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property visibleChange
   * @readonly
   * @description The dialog wants to open or close.
   * @access public
   * @since 1.4.0
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly visibleChange: OutputEmitterRef<boolean> = output<boolean>();

  /**
   * Property submitted
   * @readonly
   * @description Emits the validated position, in normalized `[0, 1]` image coordinates.
   * @access public
   * @since 1.4.0
   * @type {OutputEmitterRef<readonly [number, number]>}
   */
  public readonly submitted: OutputEmitterRef<readonly [number, number]> =
    output<readonly [number, number]>();

  /**
   * Property removed
   * @readonly
   * @description The "Remove from plan" action.
   * @access public
   * @since 1.4.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly removed: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /**
   * Property xDraft
   * @readonly
   * @description The edited horizontal draft, as a percent string.
   * @access protected
   * @since 1.4.0
   * @type {WritableSignal<string>}
   */
  protected readonly xDraft: WritableSignal<string> = signal('50.0');

  /**
   * Property yDraft
   * @readonly
   * @description The edited vertical draft, as a percent string.
   * @access protected
   * @since 1.4.0
   * @type {WritableSignal<string>}
   */
  protected readonly yDraft: WritableSignal<string> = signal('50.0');

  /**
   * Property xForm
   * @readonly
   * @description Validates the percent coordinate and preserves the draft during a plan refresh.
   * @access protected
   * @since 1.0.0
   * @type {FieldTree<string>}
   */
  protected readonly xForm: FieldTree<string> = form(this.xDraft, (path): void => {
    disabled(path, { when: (): boolean => this.pending() });
    validate(path, ({ value }) => (isValidPercent(value()) ? null : { kind: 'percent' }));
  });

  /**
   * Property yForm
   * @readonly
   * @description Validates the percent coordinate and preserves the draft during a plan refresh.
   * @access protected
   * @since 1.0.0
   * @type {FieldTree<string>}
   */
  protected readonly yForm: FieldTree<string> = form(this.yDraft, (path): void => {
    disabled(path, { when: (): boolean => this.pending() });
    validate(path, ({ value }) => (isValidPercent(value()) ? null : { kind: 'percent' }));
  });

  /**
   * Property canSubmit
   * @readonly
   * @description Whether both drafts parse to a number in `[0, 100]`.
   * @access protected
   * @since 1.4.0
   * @type {Signal<boolean>}
   */
  protected readonly canSubmit: Signal<boolean> = computed<boolean>(
    () => this.xForm().valid() && this.yForm().valid(),
  );

  /**
   * Property dialogState
   * @readonly
   * @description The overlay's own open/closed state, derived from {@link visible}.
   * @access protected
   * @since 1.4.0
   * @type {Signal<BrnDialogState>}
   */
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

      this.xDraft.set(toPercentString(untracked(this.x)));
      this.yDraft.set(toPercentString(untracked(this.y)));
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
   * Method isInvalidValue
   * @description Whether an entered draft value is out of range — blank means "not yet entered", not invalid.
   * @access protected
   * @since 1.4.1
   * @param {string} value - The raw draft string.
   * @returns {boolean} `true` when `value` is non-blank and not a percent in `[0, 100]`.
   */
  protected isInvalidValue(value: string): boolean {
    return value.trim() !== '' && !isValidPercent(value);
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
 * @description Formats a normalized coordinate for the percent input.
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
 * @description Converts a percent coordinate to the server representation.
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
 * @description Validates a finite percent within the plan bounds.
 * @access private
 * @since 1.4.0
 * @param {string} value - The raw draft string.
 * @returns {boolean} `true` when `value` parses to a finite number in `[0, 100]`.
 */
function isValidPercent(value: string): boolean {
  const parsed: number = Number(value);

  return value.trim() !== '' && Number.isFinite(parsed) && parsed >= 0 && parsed <= 100;
}
