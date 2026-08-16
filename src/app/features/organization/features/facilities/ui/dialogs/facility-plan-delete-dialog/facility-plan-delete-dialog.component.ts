import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import type { FacilityAttachmentOutput } from '@features/organization/features/facilities/models';
import { HlmAlertDialogImports } from '@shared/ui/alert-dialog';

/**
 * Component FacilityPlanDeleteDialog
 * @class FacilityPlanDeleteDialog
 *
 * @description
 * A floor plan's Delete confirmation (`DESIGN.md` § Action Surfaces, rule 5),
 * hosted by `FacilityDetailPage` — the owner of the store call — rather than
 * by the presentational `FacilityPlanList`, which only requests a delete from
 * its row menu (`ARCHITECTURE.md` §10.3). Purely presentational itself: it
 * emits {@link confirmed} and never calls the store.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-facility-plan-delete-dialog
 *   [plan]="planDeleteTarget()"
 *   [pending]="plans.deletingId() === planDeleteTarget()?.id"
 *   (dismissed)="onPlanDeleteDismissed()"
 *   (confirmed)="onPlanDeleteConfirmed()"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-plan-delete-dialog',
  imports: [...HlmAlertDialogImports],
  templateUrl: './facility-plan-delete-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityPlanDeleteDialog {
  //#region Inputs
  /**
   * Property plan
   * @readonly
   * @description The plan awaiting delete confirmation, or `null` to keep the dialog closed.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<FacilityAttachmentOutput | null>}
   */
  public readonly plan: InputSignal<FacilityAttachmentOutput | null> =
    input<FacilityAttachmentOutput | null>(null);

  /**
   * Property pending
   * @readonly
   * @description Whether this plan's delete write is in flight, which locks the confirm and cancel actions.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property dismissed
   * @readonly
   * @description The dialog was closed without confirming — Escape, the backdrop, or Cancel.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly dismissed: OutputEmitterRef<void> = output<void>();

  /**
   * Property confirmed
   * @readonly
   * @description Emits once the reader activates the destructive confirm action.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly confirmed: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /**
   * Property dialogState
   * @readonly
   * @description The overlay's own open/closed state, derived from {@link plan}.
   * @access protected
   * @since 1.0.0
   * @type {Signal<BrnDialogState>}
   */
  protected readonly dialogState: Signal<BrnDialogState> = computed((): BrnDialogState =>
    this.plan() === null ? 'closed' : 'open',
  );
  //#endregion

  //#region Methods
  /**
   * Method onStateChanged
   * @method onStateChanged
   * @description Relays a dismissal — Escape, the backdrop or Cancel — back to the host.
   * @access protected
   * @since 1.0.0
   * @param {BrnDialogState} state - The overlay's new state.
   * @returns {void}
   */
  protected onStateChanged(state: BrnDialogState): void {
    if (state === 'open') return;

    this.dismissed.emit();
  }

  /**
   * Method confirm
   * @method confirm
   * @description Emits the confirmed deletion.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected confirm(): void {
    if (this.pending()) return;

    this.confirmed.emit();
  }
  //#endregion
}
