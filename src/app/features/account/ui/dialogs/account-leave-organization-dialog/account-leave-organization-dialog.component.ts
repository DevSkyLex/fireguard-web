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
 * Component AccountLeaveOrganizationDialog
 * @class AccountLeaveOrganizationDialog
 *
 * @description
 * The `/account/organizations` self-removal confirmation. Local to `account`
 * rather than reusing `features/organization`'s `OrganizationLeaveDialog`:
 * `account` may not import organization-owned UI across the feature boundary
 * (`AGENTS.md`), and a destructive confirmation is a per-case local component
 * by design (`DESIGN.md` Action Surfaces rule 5) — this one names the
 * organization being left exactly as the organization-owned dialog does, with
 * its own copy for the account context. `DELETE /organizations/{id}/members/me`
 * takes no confirmation body, so — like its organization-owned sibling — this
 * needs no typed-name gate, only a plain Cancel/Leave pair. A refusal (the
 * caller is the organization's owner or its last active administrator)
 * surfaces here as the backend's own RFC 7807 detail.
 *
 * Presentational: it emits {@link confirmed} and never calls the port itself
 * (`ARCHITECTURE.md` §10.3).
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-account-leave-organization-dialog
 *   [visible]="confirmingLeaveId() !== null"
 *   [organizationName]="leavingOrganizationName()"
 *   [pending]="myOrganizations.isLeaving()"
 *   [error]="myOrganizations.leaveError()?.message ?? null"
 *   (visibleChange)="onLeaveDialogVisibleChange($event)"
 *   (confirmed)="confirmLeave()"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-account-leave-organization-dialog',
  imports: [...HlmAlertDialogImports],
  templateUrl: './account-leave-organization-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountLeaveOrganizationDialog {
  //#region Inputs
  /** Whether the dialog is open. */
  public readonly visible: InputSignal<boolean> = input<boolean>(false);

  /** The organization named in the confirmation message. */
  public readonly organizationName: InputSignal<string> = input.required<string>();

  /** Whether leaving is in flight, which locks the confirm action. */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /** The last leave attempt's error message, or `null`. */
  public readonly error: InputSignal<string | null> = input<string | null>(null);
  //#endregion

  //#region Outputs
  /** Reports the dialog opening or closing, including a dismissal. */
  public readonly visibleChange: OutputEmitterRef<boolean> = output<boolean>();

  /** Emits once the reader activates the confirm action. */
  public readonly confirmed: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /** The overlay's own open/closed state, derived from {@link visible}. */
  protected readonly dialogState: Signal<BrnDialogState> = computed((): BrnDialogState =>
    this.visible() ? 'open' : 'closed',
  );

  /**
   * Names the organization being left. Built here so a named `$localize`
   * placeholder extracts as one translatable sentence.
   */
  protected readonly confirmText: Signal<string> = computed((): string => {
    const name: string = this.organizationName();

    return $localize`:@@account.organizations.leaveConfirmText:You will lose access to ${name}:organizationName: and everything in it. You can only rejoin if another member invites you back.`;
  });
  //#endregion

  //#region Methods
  /**
   * Method onStateChanged
   * @method onStateChanged
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
   * @method confirm
   * @description Emits the confirmed departure.
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
