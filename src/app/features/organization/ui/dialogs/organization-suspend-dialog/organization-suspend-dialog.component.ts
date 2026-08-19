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
 * Component OrganizationSuspendDialog
 * @class OrganizationSuspendDialog
 *
 * @description
 * The danger zone's suspend confirmation: unlike {@link OrganizationDeleteDialog}
 * this action needs no typed-name gate — the backend takes no confirmation
 * body for `POST /organizations/{id}/suspend` — so the dialog states the
 * consequences (members lose access immediately, data is preserved, the
 * organization can be restored at any time) and confirms with a plain
 * Cancel/Suspend pair.
 *
 * Presentational: it emits {@link confirmed} and never calls the store itself
 * (`ARCHITECTURE.md` §10.3).
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-organization-suspend-dialog
 *   [visible]="confirmingSuspend()"
 *   [organizationName]="organization().name"
 *   [pending]="settingsStore.isChangingStatus()"
 *   [error]="settingsStore.statusError()?.message ?? null"
 *   (visibleChange)="confirmingSuspend.set($event)"
 *   (confirmed)="suspendOrganization()"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-suspend-dialog',
  imports: [...HlmAlertDialogImports],
  templateUrl: './organization-suspend-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationSuspendDialog {
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
   * @description Whether the suspension is in flight, which locks the confirm action.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property error
   * @readonly
   * @description The store's suspension failure message, or `null`.
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
   *
   * @description
   * States the consequences of suspending, naming the organization. Built
   * here rather than interpolated in the template so a named `$localize`
   * placeholder extracts as one translatable sentence.
   *
   * @access protected
   * @since 1.0.0
   * @type {Signal<string>}
   */
  protected readonly confirmText: Signal<string> = computed((): string => {
    const name: string = this.organizationName();

    return $localize`:@@org.settings.danger.suspendConfirmText:Members of ${name}:organizationName: immediately lose access. Every facility, piece of equipment, inspection and intervention is preserved, and you can restore the organization at any time.`;
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
   * Emits the confirmed suspension.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected confirm(): void {
    this.confirmed.emit();
  }
  //#endregion
}
