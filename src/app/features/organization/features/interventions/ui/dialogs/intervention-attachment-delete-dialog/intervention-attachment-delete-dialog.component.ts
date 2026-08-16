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
import type { InterventionAttachmentOutput } from '@features/organization/features/interventions/models';
import { HlmAlertDialogImports } from '@shared/ui/alert-dialog';

/**
 * Component InterventionAttachmentDeleteDialog
 * @class InterventionAttachmentDeleteDialog
 *
 * @description
 * The per-row delete confirmation for the intervention's attachments
 * (`DESIGN.md` "Action Surfaces" rule 5 — a destructive action confirms).
 * Hosted by the detail page rather than `InterventionAttachments`: the row's
 * delete button now emits a request event straight away, and the page decides
 * whether to confirm and when to call `store.removeAttachment`.
 *
 * Purely presentational (`ARCHITECTURE.md` §10.5): it owns no store and takes
 * its open state from {@link request} being non-null.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-attachment-delete-dialog',
  imports: [...HlmAlertDialogImports],
  templateUrl: './intervention-attachment-delete-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionAttachmentDeleteDialog {
  //#region Inputs
  /**
   * Property request
   * @readonly
   * @description The attachment pending deletion, or `null` to keep the dialog closed.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<InterventionAttachmentOutput | null>}
   */
  public readonly request: InputSignal<InterventionAttachmentOutput | null> =
    input<InterventionAttachmentOutput | null>(null);
  //#endregion

  //#region Outputs
  /**
   * Property confirmed
   * @readonly
   * @description The confirmed attachment, for the page to delete.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<InterventionAttachmentOutput>}
   */
  public readonly confirmed: OutputEmitterRef<InterventionAttachmentOutput> =
    output<InterventionAttachmentOutput>();

  /**
   * Property dismissed
   * @readonly
   * @description The dialog was closed without deleting — Escape, the backdrop, or Cancel.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly dismissed: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /** The dialog state, derived from {@link request} so there is no second copy of the truth. */
  protected readonly dialogState: Signal<BrnDialogState> = computed<BrnDialogState>(() =>
    this.request() === null ? 'closed' : 'open',
  );
  //#endregion

  //#region Methods
  /**
   * Method onStateChanged
   *
   * @description
   * Relays a dismissal — Escape or the backdrop — as {@link dismissed}. The
   * `open` transition is only ever the caller setting {@link request}, so it
   * is ignored here.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {BrnDialogState} state - The dialog's new state.
   *
   * @returns {void}
   */
  protected onStateChanged(state: BrnDialogState): void {
    if (state === 'open') return;

    this.dismissed.emit();
  }

  /**
   * Method confirm
   * @description Emits {@link confirmed} for the pending attachment. A no-op without one.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected confirm(): void {
    const target: InterventionAttachmentOutput | null = this.request();
    if (target === null) return;

    this.confirmed.emit(target);
  }
  //#endregion
}
