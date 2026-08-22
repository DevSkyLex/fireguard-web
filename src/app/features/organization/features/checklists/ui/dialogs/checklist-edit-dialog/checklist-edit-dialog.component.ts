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
import type {
  ChecklistOutput,
  UpdateChecklistInput,
} from '@features/organization/features/checklists/models';
import {
  HlmDialog,
  HlmDialogContent,
  HlmDialogHeader,
  HlmDialogPortal,
  HlmDialogTitle,
} from '@shared/ui/dialog';
import { ChecklistEditForm } from '../../forms/checklist-edit-form';

/**
 * Component ChecklistEditDialog
 * @class ChecklistEditDialog
 *
 * @description
 * The spartan dialog hosting {@link ChecklistEditForm}, the same shape
 * `ChannelEditDialog` wraps `ChannelEditForm` in.
 *
 * Purely presentational: it owns the overlay chrome, forwards
 * `visible`/`checklist`/`pending` to the form, and re-emits
 * {@link submitted} — the page decides whether the update request succeeds
 * and, on success, closes the dialog (`ARCHITECTURE.md` §10.5). Dismissal is
 * blocked while a request is in flight.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-checklist-edit-dialog
 *   [visible]="editDialogVisible()"
 *   [checklist]="editingChecklist()"
 *   [pending]="store.isUpdating()"
 *   (visibleChange)="editDialogVisible.set($event)"
 *   (submitted)="submitEdit($event)"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-checklist-edit-dialog',
  imports: [
    ChecklistEditForm,
    HlmDialog,
    HlmDialogContent,
    HlmDialogHeader,
    HlmDialogPortal,
    HlmDialogTitle,
  ],
  templateUrl: './checklist-edit-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChecklistEditDialog {
  //#region Inputs
  /**
   * Property visible
   * @readonly
   * @description Whether the dialog is open.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly visible: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property checklist
   * @readonly
   * @description The checklist being edited, forwarded to the form.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<ChecklistOutput | null>}
   */
  public readonly checklist: InputSignal<ChecklistOutput | null> = input<ChecklistOutput | null>(
    null,
  );

  /**
   * Property pending
   * @readonly
   * @description Whether the update write is in flight, forwarded to the form and blocking dismissal.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property visibleChange
   * @readonly
   * @description Reports the dialog opening or closing, including a dismissal.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly visibleChange: OutputEmitterRef<boolean> = output<boolean>();

  /**
   * Property submitted
   * @readonly
   * @description The form's validated update payload, forwarded untouched.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<UpdateChecklistInput>}
   */
  public readonly submitted: OutputEmitterRef<UpdateChecklistInput> =
    output<UpdateChecklistInput>();
  //#endregion

  //#region Properties
  /**
   * Property dialogState
   * @readonly
   * @description The overlay's own open/closed state, derived from {@link visible}.
   * @access protected
   * @since 1.0.0
   * @type {Signal<BrnDialogState>}
   */
  protected readonly dialogState: Signal<BrnDialogState> = computed((): BrnDialogState =>
    this.visible() ? 'open' : 'closed',
  );
  //#endregion

  //#region Methods
  /**
   * Method onStateChanged
   * @method onStateChanged
   * @description Reports a dismissal back to the page. Ignored while a request is in flight, matching the bound `disableClose`.
   * @access protected
   * @since 1.0.0
   * @param {BrnDialogState} state - The overlay's new state.
   * @returns {void}
   */
  protected onStateChanged(state: BrnDialogState): void {
    if (this.pending()) return;

    const isOpen: boolean = state === 'open';

    if (isOpen === this.visible()) return;

    this.visibleChange.emit(isOpen);
  }
  //#endregion
}
