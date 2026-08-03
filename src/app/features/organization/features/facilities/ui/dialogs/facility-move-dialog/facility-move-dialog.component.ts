import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  model,
  output,
  signal,
  type InputSignal,
  type ModelSignal,
  type OutputEmitterRef,
  type WritableSignal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { DIALOG_BREAKPOINTS, DIALOG_WIDTH_SM } from '@shared/overlay-size';

/**
 * Component FacilityMoveDialog
 * @class FacilityMoveDialog
 *
 * @description
 * Presentational dialog for re-parenting a facility: a parent picker seeded
 * from {@link initialParentId}, and a confirm/cancel footer. Owns only the
 * overlay shell and the picker's live value; the parent page resolves the
 * option list and performs the move.
 *
 * @example ```html
 * <app-facility-move-dialog
 *   [(visible)]="showMoveDialog"
 *   [parentOptions]="parentOptions()"
 *   [initialParentId]="facility()?.parentFacilityId ?? ''"
 *   [moving]="isMoving()"
 *   (confirmed)="onMoveConfirmed($event)"
 *   (cancelled)="onMoveCancel()"
 * />
 * ```
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-move-dialog',
  imports: [ButtonModule, DialogModule, FormsModule, SelectModule],
  templateUrl: './facility-move-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityMoveDialog {
  //#region Properties
  /**
   * Property visible
   * @readonly
   *
   * @description
   * Two-way dialog visibility.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {ModelSignal<boolean>}
   */
  public readonly visible: ModelSignal<boolean> = model<boolean>(false);

  /**
   * Property parentOptions
   * @readonly
   *
   * @description
   * Selectable parent facilities for the picker. `''` represents the root
   * level (no parent). Resolved by the parent page. Typed as a mutable array
   * to match `p-select`'s `options` input.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<{ label: string; value: string }[]>}
   */
  public readonly parentOptions: InputSignal<{ label: string; value: string }[]> = input<
    { label: string; value: string }[]
  >([]);

  /**
   * Property initialParentId
   * @readonly
   *
   * @description
   * Parent facility id the picker is seeded with whenever the dialog opens;
   * `''` means the root level.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly initialParentId: InputSignal<string> = input<string>('');

  /**
   * Property moving
   * @readonly
   *
   * @description
   * Whether a move request is currently in flight. Disables the picker and
   * footer actions and shows the Move button's loading state.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly moving: InputSignal<boolean> = input<boolean>(false);

  /** Live value of the parent picker. */
  protected readonly selectedParentId: WritableSignal<string> = signal<string>('');

  /** Canonical `p-dialog` width for this single-column confirmation prompt. */
  protected readonly dialogWidth: string = DIALOG_WIDTH_SM;

  /** Canonical `p-dialog` responsive breakpoints (DESIGN.md, "Overlays — sizes"). */
  protected readonly dialogBreakpoints: Record<string, string> = DIALOG_BREAKPOINTS;
  //#endregion

  //#region Outputs
  /**
   * Output confirmed
   * @readonly
   *
   * @description
   * Emits the selected parent id (`''` for the root level) when the user
   * confirms the move. The parent page performs the actual move and closes
   * the dialog once it succeeds.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly confirmed: OutputEmitterRef<string> = output<string>();

  /**
   * Output cancelled
   * @readonly
   *
   * @description
   * Emits when the user cancels without moving.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly cancelled: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Reseeds the picker from {@link initialParentId} every time the dialog
   * opens.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect(() => {
      if (this.visible()) this.selectedParentId.set(this.initialParentId());
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method confirm
   * @method confirm
   *
   * @description
   * Emits the confirmed move with the picker's current value.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected confirm(): void {
    this.confirmed.emit(this.selectedParentId());
  }

  /**
   * Method cancel
   * @method cancel
   *
   * @description
   * Closes the dialog without moving and emits {@link cancelled}.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected cancel(): void {
    this.visible.set(false);
    this.cancelled.emit();
  }
  //#endregion
}
