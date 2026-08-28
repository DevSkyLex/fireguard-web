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
import type { TeamOutput, UpdateTeamInput } from '@features/organization/models';
import { HlmDialogImports } from '@shared/ui/dialog';
import { OrganizationTeamEditForm } from '../../forms/organization-team-edit-form';

/**
 * Component OrganizationTeamEditDialog
 * @class OrganizationTeamEditDialog
 *
 * @description
 * The spartan dialog hosting {@link OrganizationTeamEditForm}. Chosen as a
 * dialog rather than a sheet — unlike `OrganizationRolePermissionsSheet`
 * (a full permission checklist), a rename/redescribe is the same two-field
 * shape as `OrganizationTeamCreateDialog`, so it keeps the same surface.
 *
 * Purely presentational: it owns the overlay and forwards
 * `visible`/`visibleChange`, re-emitting the form's `submitted`; the page
 * keeps the orchestration and only mounts this dialog once a team is
 * selected (`ARCHITECTURE.md` §10.5).
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-team-edit-dialog',
  imports: [OrganizationTeamEditForm, ...HlmDialogImports],
  templateUrl: './organization-team-edit-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationTeamEditDialog {
  //#region Inputs
  /**
   * Property visible
   * @readonly
   * @description Whether the dialog is open. Owned by the page.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly visible: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property team
   * @readonly
   * @description The team being edited, or `null` while nothing is selected.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<TeamOutput | null>}
   */
  public readonly team: InputSignal<TeamOutput | null> = input<TeamOutput | null>(null);

  /**
   * Property pending
   * @readonly
   * @description Whether the update request is in flight.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property serverError
   * @readonly
   * @description Whatever the update failed with, forwarded to the form.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<unknown>}
   */
  public readonly serverError: InputSignal<unknown> = input<unknown>(null);
  //#endregion

  //#region Outputs
  /**
   * Property visibleChange
   * @readonly
   * @description The dialog wants to open or close.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly visibleChange: OutputEmitterRef<boolean> = output<boolean>();

  /**
   * Property submitted
   * @readonly
   * @description The form's validated partial payload, forwarded untouched.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<UpdateTeamInput>}
   */
  public readonly submitted: OutputEmitterRef<UpdateTeamInput> = output<UpdateTeamInput>();
  //#endregion

  //#region Properties
  /**
   * Property dialogState
   * @readonly
   * @description The overlay state, derived from {@link visible} so there is no second copy of the truth.
   * @access protected
   * @since 1.0.0
   * @type {Signal<BrnDialogState>}
   */
  protected readonly dialogState: Signal<BrnDialogState> = computed<BrnDialogState>(() =>
    this.visible() ? 'open' : 'closed',
  );
  //#endregion

  //#region Methods
  /**
   * Method onStateChanged
   * @description Relays a dismissal — escape, the backdrop, the close button — ignoring the echo of a change the page already made.
   * @access protected
   * @since 1.0.0
   * @param {BrnDialogState} state - The overlay's new state.
   * @returns {void}
   */
  protected onStateChanged(state: BrnDialogState): void {
    const isOpen: boolean = state === 'open';

    if (isOpen === this.visible()) return;

    this.visibleChange.emit(isOpen);
  }
  //#endregion
}
