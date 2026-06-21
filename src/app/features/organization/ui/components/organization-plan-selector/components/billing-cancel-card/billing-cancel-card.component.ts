import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';

/**
 * Component BillingCancelCard
 * @class BillingCancelCard
 *
 * @description
 * Presentational cancellation surface for an active subscription. When no
 * cancellation is scheduled it offers to cancel at period end; when one is
 * scheduled it shows the end date and offers to resume. Owns no orchestration:
 * the parent confirms and performs the action in response to the {@link cancel}
 * and {@link resume} events.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-billing-cancel-card',
  imports: [ButtonModule],
  templateUrl: './billing-cancel-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BillingCancelCard {
  //#region Inputs
  /**
   * Input cancelScheduled
   * @readonly
   *
   * @description
   * Whether the subscription is already set to cancel at period end.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly cancelScheduled: InputSignal<boolean> = input<boolean>(false);

  /**
   * Input periodEndLabel
   * @readonly
   *
   * @description
   * Localized end-of-period date shown when a cancellation is scheduled.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly periodEndLabel: InputSignal<string | null> = input<string | null>(null);

  /**
   * Input canceling
   * @readonly
   *
   * @description
   * Whether a cancellation request is in flight.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canceling: InputSignal<boolean> = input<boolean>(false);

  /**
   * Input resuming
   * @readonly
   *
   * @description
   * Whether a resume request is in flight.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly resuming: InputSignal<boolean> = input<boolean>(false);

  /**
   * Input disabled
   * @readonly
   *
   * @description
   * Whether the actions are disabled because another billing action is running.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly disabled: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Output cancel
   * @readonly
   *
   * @description
   * Emitted when the user requests to cancel the subscription at period end.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly cancel: OutputEmitterRef<void> = output<void>();

  /**
   * Output resume
   * @readonly
   *
   * @description
   * Emitted when the user requests to resume a scheduled cancellation.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly resume: OutputEmitterRef<void> = output<void>();
  //#endregion
}
