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
 * Component OrganizationCancelSubscriptionDialog
 * @class OrganizationCancelSubscriptionDialog
 *
 * @description
 * The subscription tab's cancel confirmation. `POST
 * /organizations/{id}/billing/cancel` only **schedules** cancellation at the
 * end of the current billing period (`OrganizationBillingStore.cancelSubscription`),
 * so the dialog states that explicitly — access and every paid feature keep
 * working until {@link renewalDate} — rather than implying an immediate cutoff.
 *
 * Presentational: it emits {@link confirmed} and never calls the store itself
 * (`ARCHITECTURE.md` §10.3).
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-organization-cancel-subscription-dialog
 *   [visible]="confirmingCancelSubscription()"
 *   [renewalDate]="renewalDate()"
 *   [pending]="billingStore.isCanceling()"
 *   [error]="billingStore.billingError()?.message ?? null"
 *   (visibleChange)="confirmingCancelSubscription.set($event)"
 *   (confirmed)="cancelSubscription()"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-cancel-subscription-dialog',
  imports: [...HlmAlertDialogImports],
  templateUrl: './organization-cancel-subscription-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationCancelSubscriptionDialog {
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
   * Property renewalDate
   * @readonly
   * @description The formatted end of the current billing period, or `null` when it is unknown.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string | null>}
   */
  public readonly renewalDate: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property pending
   * @readonly
   * @description Whether the cancellation is in flight, which locks the confirm action.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property error
   * @readonly
   * @description The store's cancellation failure message, or `null`.
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
   * States the period-end behavior, naming the date when it is known. Built
   * here rather than interpolated in the template so a named `$localize`
   * placeholder extracts as one translatable sentence.
   *
   * @access protected
   * @since 1.0.0
   * @type {Signal<string>}
   */
  protected readonly confirmText: Signal<string> = computed((): string => {
    const date: string | null = this.renewalDate();

    return date === null
      ? $localize`:@@org.settings.subscription.cancelConfirmTextUnknownDate:The subscription keeps working until the end of the current billing period, then it will not renew. You can resume it at any time before then.`
      : $localize`:@@org.settings.subscription.cancelConfirmText:The subscription keeps working until ${date}:date:, then it will not renew. You can resume it at any time before then.`;
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
   * Emits the confirmed cancellation.
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
