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
import type { CreateTeamInput } from '@features/organization/models';
import { HlmDialogImports } from '@shared/ui/dialog';
import { OrganizationTeamCreateForm } from '../../forms/organization-team-create-form';

/**
 * Component OrganizationTeamCreateDialog
 * @class OrganizationTeamCreateDialog
 *
 * @description
 * The spartan dialog hosting {@link OrganizationTeamCreateForm}, mirroring
 * `OrganizationRoleCreateDialog`'s shape — the record being created is small
 * enough that a full-width sheet would be excessive.
 *
 * Purely presentational: it owns the overlay and forwards
 * `visible`/`visibleChange`, re-emitting the form's `submitted`; the page
 * keeps the orchestration (`ARCHITECTURE.md` §10.5).
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-team-create-dialog',
  imports: [OrganizationTeamCreateForm, ...HlmDialogImports],
  templateUrl: './organization-team-create-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationTeamCreateDialog {
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
   * Property pending
   * @readonly
   * @description Whether the creation request is in flight.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property serverError
   * @readonly
   * @description Whatever the creation failed with, forwarded to the form.
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
   * @description The form's validated team, forwarded untouched.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<CreateTeamInput>}
   */
  public readonly submitted: OutputEmitterRef<CreateTeamInput> = output<CreateTeamInput>();
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
