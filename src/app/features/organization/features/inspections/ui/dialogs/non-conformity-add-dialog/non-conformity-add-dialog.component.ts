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
import type { StoreError } from '@core/request-state';
import type { AddNonConformityInput } from '@features/organization/features/inspections/models';
import { HlmDialogImports } from '@shared/ui/dialog';
import { NonConformityAddForm } from '../../forms/non-conformity-add-form';

/**
 * Component NonConformityAddDialog
 * @class NonConformityAddDialog
 *
 * @description
 * The spartan dialog hosting {@link NonConformityAddForm}, which records a
 * non-conformity on the current inspection. The page hides its trigger
 * entirely once the inspection is `closed` (the backend's only documented
 * 409 on this endpoint), so this dialog never needs to know the
 * inspection's own status.
 *
 * Purely presentational: it owns the overlay chrome, forwards every input
 * to the form, and re-emits {@link submitted} — the page keeps the store
 * call and the organization/inspection ids this dialog never needs to know
 * (`ARCHITECTURE.md` §10.5). Dismissal is blocked while a request is in
 * flight.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-non-conformity-add-dialog
 *   [visible]="addDialogOpen()"
 *   [pending]="store.isAddingNonConformity()"
 *   [serverError]="store.addNonConformityCallState().error"
 *   (visibleChange)="addDialogOpen.set($event)"
 *   (submitted)="onNonConformityAdded($event)"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-non-conformity-add-dialog',
  imports: [NonConformityAddForm, ...HlmDialogImports],
  templateUrl: './non-conformity-add-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NonConformityAddDialog {
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
   * @description Whether the add request is in flight, forwarded to the form and blocking dismissal.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property serverError
   * @readonly
   * @description Whatever the last add attempt failed with, forwarded to the form.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<StoreError | null>}
   */
  public readonly serverError: InputSignal<StoreError | null> = input<StoreError | null>(null);
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
   * @description The form's validated, API-shaped payload, forwarded untouched.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<AddNonConformityInput>}
   */
  public readonly submitted: OutputEmitterRef<AddNonConformityInput> =
    output<AddNonConformityInput>();
  //#endregion

  //#region Properties
  /** The dialog state, derived from {@link visible} so there is no second copy of the truth. */
  protected readonly dialogState: Signal<BrnDialogState> = computed<BrnDialogState>(() =>
    this.visible() ? 'open' : 'closed',
  );
  //#endregion

  //#region Methods
  /**
   * Method onStateChanged
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
