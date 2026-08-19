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
 * Component OrganizationLeaveDialog
 * @class OrganizationLeaveDialog
 *
 * @description
 * The danger zone's self-removal confirmation. `DELETE
 * /organizations/{id}/members/me` takes no confirmation body, so — like
 * {@link OrganizationSuspendDialog} — this needs no typed-name gate, only a
 * plain Cancel/Leave pair naming the organization being left. A refusal
 * (the caller is the last active administrator) is a workflow answer the
 * backend already phrases, surfaced here rather than replaced with generic
 * copy.
 *
 * Presentational: it emits {@link confirmed} and never calls the store itself
 * (`ARCHITECTURE.md` §10.3).
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-organization-leave-dialog
 *   [visible]="confirmingLeave()"
 *   [organizationName]="organization().name"
 *   [pending]="settingsStore.isLeaving()"
 *   [error]="settingsStore.leaveError()?.message ?? null"
 *   (visibleChange)="confirmingLeave.set($event)"
 *   (confirmed)="leaveOrganization()"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-leave-dialog',
  imports: [...HlmAlertDialogImports],
  templateUrl: './organization-leave-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationLeaveDialog {
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
   * Property organizationName
   * @readonly
   * @description The organization named in the confirmation message.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly organizationName: InputSignal<string> = input.required<string>();

  /**
   * Property pending
   * @readonly
   * @description Whether leaving is in flight, which locks the confirm action.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property error
   * @readonly
   * @description The store's leave failure message, or `null`.
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
   * Property confirmText
   * @readonly
   * @description Names the organization being left. Built here so a named `$localize` placeholder extracts as one translatable sentence.
   * @access protected
   * @since 1.0.0
   * @type {Signal<string>}
   */
  protected readonly confirmText: Signal<string> = computed((): string => {
    const name: string = this.organizationName();

    return $localize`:@@org.settings.danger.leaveConfirmText:You will lose access to ${name}:organizationName: and everything in it. You can only rejoin if another member invites you back.`;
  });
  //#endregion

  //#region Methods
  /**
   * Method onStateChanged
   * @method onStateChanged
   *
   * @description
   * Reports a dismissal back to the page.
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

  /**
   * Method confirm
   * @method confirm
   *
   * @description
   * Emits the confirmed departure.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected confirm(): void {
    if (this.pending()) return;

    this.confirmed.emit();
  }
  //#endregion
}
