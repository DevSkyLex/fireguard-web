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
import { HlmAlertDialogImports } from '@shared/ui/alert-dialog';

/**
 * Component OrganizationRoleDeleteDialog
 * @class OrganizationRoleDeleteDialog
 *
 * @description
 * The confirm gate for deleting a custom role — an alert dialog modeled on
 * `OrganizationDeleteDialog`, simpler because a role deletion needs no
 * type-to-confirm.
 *
 * Presentational: it emits {@link confirmed} and never calls the store
 * itself (`ARCHITECTURE.md` §10.3).
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-organization-role-delete-dialog
 *   [visible]="deleteDialogState() === 'open'"
 *   [pending]="store.isMutating()"
 *   [error]="deleteDialogError()?.message ?? null"
 *   (visibleChange)="onDeleteDialogVisibleChange($event)"
 *   (confirmed)="confirmDelete()"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-role-delete-dialog',
  imports: [...HlmAlertDialogImports],
  templateUrl: './organization-role-delete-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationRoleDeleteDialog {
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
   * Property pending
   * @readonly
   * @description Whether the deletion is in flight, which locks the confirm action and blocks dismissal.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property error
   * @readonly
   * @description The store's deletion failure message, or `null`.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string | null>}
   */
  public readonly error: InputSignal<string | null> = input<string | null>(null);
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
   * Property confirmed
   * @readonly
   * @description Emits once the reader activates the confirm action.
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
   * @description Reports a dismissal back to the page.
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

  /**
   * Method confirm
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
