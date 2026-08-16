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
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePlus, lucideTrash2 } from '@ng-icons/lucide';
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

/** A draft coordinate row, kept as percent strings so a mid-edit blank field does not force a value. */
interface ZoneGeometryDraftRow {
  readonly x: string;
  readonly y: string;
}

/** Minimum vertex count the backend accepts for a polygon. */
const MIN_POLYGON_VERTICES = 3;

/**
 * Component FacilityPlanZoneGeometryDialog
 * @class FacilityPlanZoneGeometryDialog
 *
 * @description
 * The non-pointer "Edit coordinates" path for a zone's outline — a small
 * table of percent x/y rows (0–100%, one decimal step; normalized `[0, 1]`
 * is one division away and less legible for a member checking a vertex by
 * eye) with add/remove, prefilled from {@link points} on every open. Submits
 * the normalized polygon via {@link submitted}; {@link cleared} is the
 * dialog's "Clear geometry" action, wiping the outline entirely.
 *
 * Presentational: it owns only its own draft rows and their validity, not
 * the write — the page decides whether that means drawing/saving or
 * clearing, and owns `FacilityPlansStore` (`ARCHITECTURE.md` §10.5).
 *
 * @since 1.4.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-plan-zone-geometry-dialog',
  imports: [
    NgIcon,
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
  providers: [provideIcons({ lucidePlus, lucideTrash2 })],
  templateUrl: './facility-plan-zone-geometry-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityPlanZoneGeometryDialog {
  //#region Inputs
  /** Whether the dialog is open. */
  public readonly visible: InputSignal<boolean> = input<boolean>(false);

  /** The zone's display name, for the dialog title. */
  public readonly zoneName: InputSignal<string> = input<string>('');

  /** The zone's current outline, seeding the draft on every open. */
  public readonly points: InputSignal<ReadonlyArray<readonly [number, number]>> = input<
    ReadonlyArray<readonly [number, number]>
  >([]);

  /** Whether a save or clear this dialog triggered is still in flight. */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /** The dialog wants to open or close. */
  public readonly visibleChange: OutputEmitterRef<boolean> = output<boolean>();

  /** Emits the validated outline, in normalized `[0, 1]` image coordinates. */
  public readonly submitted: OutputEmitterRef<ReadonlyArray<readonly [number, number]>> =
    output<ReadonlyArray<readonly [number, number]>>();

  /** The "Clear geometry" action. */
  public readonly cleared: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /** The edited draft rows, as percent strings. */
  protected readonly rows: WritableSignal<ReadonlyArray<ZoneGeometryDraftRow>> = signal([]);

  /**
   * Property canSubmit
   * @readonly
   * @description Whether every row parses to a number in `[0, 100]` and at least three rows remain.
   * @access protected
   * @since 1.4.0
   * @type {Signal<boolean>}
   */
  protected readonly canSubmit: Signal<boolean> = computed<boolean>(() => {
    const rows: ReadonlyArray<ZoneGeometryDraftRow> = this.rows();

    return (
      rows.length >= MIN_POLYGON_VERTICES &&
      rows.every((row) => isValidPercent(row.x) && isValidPercent(row.y))
    );
  });

  /** The overlay's own open/closed state, derived from {@link visible}. */
  protected readonly dialogState: Signal<BrnDialogState> = computed<BrnDialogState>(() =>
    this.visible() ? 'open' : 'closed',
  );
  //#endregion

  //#region Lifecycle
  /**
   * Method constructor
   * @constructor
   * @description Reseeds the draft rows from {@link points} every time the dialog opens.
   * @access public
   * @since 1.4.0
   */
  public constructor() {
    effect((): void => {
      if (!this.visible()) return;

      const seeded: ReadonlyArray<readonly [number, number]> = this.points();
      this.rows.set(seeded.map(([x, y]) => ({ x: toPercentString(x), y: toPercentString(y) })));
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
   * Method updateRow
   * @description Patches one row's x or y draft value.
   * @access protected
   * @since 1.4.0
   * @param {number} index - The row's position.
   * @param {'x' | 'y'} axis - Which coordinate changed.
   * @param {string} value - The input's raw string value.
   * @returns {void}
   */
  protected updateRow(index: number, axis: 'x' | 'y', value: string): void {
    this.rows.set(
      this.rows().map((row, i) => (i === index ? Object.assign({}, row, { [axis]: value }) : row)),
    );
  }

  /**
   * Method addRow
   * @description Appends a blank row.
   * @access protected
   * @since 1.4.0
   * @returns {void}
   */
  protected addRow(): void {
    this.rows.set([...this.rows(), { x: '', y: '' }]);
  }

  /**
   * Method removeRow
   * @description Removes one row.
   * @access protected
   * @since 1.4.0
   * @param {number} index - The row's position.
   * @returns {void}
   */
  protected removeRow(index: number): void {
    this.rows.set(this.rows().filter((_, i) => i !== index));
  }

  /**
   * Method submit
   * @description Emits the validated outline, converted from percent to normalized `[0, 1]` coordinates.
   * @access protected
   * @since 1.4.0
   * @returns {void}
   */
  protected submit(): void {
    if (this.pending() || !this.canSubmit()) return;

    this.submitted.emit(
      this.rows().map((row) => [toNormalized(row.x), toNormalized(row.y)] as const),
    );
  }

  /**
   * Method requestClear
   * @description Emits {@link cleared}.
   * @access protected
   * @since 1.4.0
   * @returns {void}
   */
  protected requestClear(): void {
    if (this.pending()) return;

    this.cleared.emit();
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
