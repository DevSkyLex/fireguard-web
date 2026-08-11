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
  CreateOrganizationRoleInput,
  OrganizationPermissionOutput,
} from '@features/organization/models';
import { HlmDialogImports } from '@shared/ui/dialog';
import { OrganizationRoleCreateForm } from '../../forms/organization-role-create-form';

/**
 * Component OrganizationRoleCreateDialog
 * @class OrganizationRoleCreateDialog
 *
 * @description
 * The spartan dialog hosting {@link OrganizationRoleCreateForm}, mirroring
 * how the feature's other create flows host their form inside a panel
 * (`intervention-create-sheet`) — a dialog here because the record being
 * created is small enough that a full-width sheet would be excessive.
 *
 * Purely presentational: it owns the overlay and forwards
 * `visible`/`visibleChange`, re-emitting the form's `submitted`; the page
 * keeps the orchestration (`ARCHITECTURE.md` §10.5). Its open state is
 * derived from `visible` rather than held locally, so the page stays the
 * single owner and the two cannot drift.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-role-create-dialog',
  imports: [OrganizationRoleCreateForm, ...HlmDialogImports],
  templateUrl: './organization-role-create-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationRoleCreateDialog {
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

  /**
   * Property catalog
   * @readonly
   * @description The organization's assignable permissions, forwarded to the form's checklist.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly OrganizationPermissionOutput[]>}
   */
  public readonly catalog: InputSignal<readonly OrganizationPermissionOutput[]> = input<
    readonly OrganizationPermissionOutput[]
  >([]);
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
   * @description The form's validated role, forwarded untouched.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<CreateOrganizationRoleInput>}
   */
  public readonly submitted: OutputEmitterRef<CreateOrganizationRoleInput> =
    output<CreateOrganizationRoleInput>();
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
   * @method onStateChanged
   *
   * @description
   * Relays a dismissal — escape, the backdrop, the close button — ignoring
   * the echo of a change the page already made.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {BrnDialogState} state - The overlay's new state.
   *
   * @returns {void}
   */
  protected onStateChanged(state: BrnDialogState): void {
    const isOpen: boolean = state === 'open';

    if (isOpen === this.visible()) return;

    this.visibleChange.emit(isOpen);
  }
  //#endregion
}
