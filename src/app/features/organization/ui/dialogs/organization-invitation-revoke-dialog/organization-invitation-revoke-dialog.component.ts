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
import type { OrganizationInvitationOutput } from '@features/organization/models';
import { HlmAlertDialogImports } from '@shared/ui/alert-dialog';

/**
 * Component OrganizationInvitationRevokeDialog
 * @class OrganizationInvitationRevokeDialog
 *
 * @description
 * The confirm gate for revoking a pending invitation from the row menu's
 * Revoke entry — an alert dialog modeled on `OrganizationDeleteDialog`,
 * simpler because a revoke needs no type-to-confirm.
 *
 * Presentational: it emits {@link confirmed} and never calls the store
 * itself (`ARCHITECTURE.md` §10.3).
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-organization-invitation-revoke-dialog
 *   [visible]="pendingRevoke() !== null"
 *   [invitation]="pendingRevoke()"
 *   [pending]="revokeGate.isBusy()"
 *   [error]="revokeGate.error()?.message ?? null"
 *   (visibleChange)="onRevokeDialogVisibleChange($event)"
 *   (confirmed)="confirmRevoke()"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-invitation-revoke-dialog',
  imports: [...HlmAlertDialogImports],
  templateUrl: './organization-invitation-revoke-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationInvitationRevokeDialog {
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
   * Property invitation
   * @readonly
   * @description The invitation the row's Revoke entry targets, or `null` while closed.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<OrganizationInvitationOutput | null>}
   */
  public readonly invitation: InputSignal<OrganizationInvitationOutput | null> =
    input<OrganizationInvitationOutput | null>(null);

  /**
   * Property pending
   * @readonly
   * @description Whether the revoke is in flight, which locks the confirm action and blocks dismissal.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property error
   * @readonly
   * @description The store's revoke failure message, or `null`.
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

  /**
   * Property description
   * @readonly
   *
   * @description
   * The confirmation's body, naming the invited email. Built here rather
   * than interpolated in the template: a named `$localize` placeholder
   * extracts as one translatable sentence, where a template interpolation
   * would extract as a positional `INTERPOLATION` id a translator cannot
   * reorder.
   *
   * @access protected
   * @since 1.0.0
   * @type {Signal<string>}
   */
  protected readonly description: Signal<string> = computed((): string => {
    const email: string = this.invitation()?.email ?? '';

    return $localize`:@@org.invitations.revokeConfirmDescription:This revokes the invitation sent to ${email}:email:. It can no longer be accepted.`;
  });
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
   * @description Emits the confirmed revoke.
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
