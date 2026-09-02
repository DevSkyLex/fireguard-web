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
import { sheetSide } from '@shared/sheet-side';
import { HlmSheetImports } from '@shared/ui/sheet';
import { OrganizationTeamCreateForm } from '../../forms/organization-team-create-form';

/**
 * Component OrganizationTeamCreateSheet
 * @class OrganizationTeamCreateSheet
 *
 * @description
 * The spartan sheet hosting {@link OrganizationTeamCreateForm}, mirroring
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
  selector: 'app-organization-team-create-sheet',
  imports: [OrganizationTeamCreateForm, ...HlmSheetImports],
  templateUrl: './organization-team-create-sheet.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationTeamCreateSheet {
  //#region Inputs
  /**
   * Property visible
   * @readonly
   * @description Whether the panel is open. Owned by the page.
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
   * @description The panel wants to open or close.
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
   * Property sheetState
   * @readonly
   * @description The overlay state, derived from {@link visible} so there is no second copy of the truth.
   * @access protected
   * @since 1.0.0
   * @type {Signal<BrnDialogState>}
   */
  protected readonly sheetState: Signal<BrnDialogState> = computed<BrnDialogState>(() =>
    this.visible() ? 'open' : 'closed',
  );

  /**
   * Property side
   * @readonly
   * @description The panel's side — `'bottom'` below `sm`, `'right'` at and above it (`DESIGN.md` "Action Surfaces" rule 2).
   * @access protected
   * @since 2.0.0
   * @type {Signal<'right' | 'bottom'>}
   */
  protected readonly side: Signal<'right' | 'bottom'> = sheetSide();
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
