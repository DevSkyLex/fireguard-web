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
import { ButtonModule } from 'primeng/button';
import type { PaymentMethodOutput } from '@features/organization/models';

/**
 * Component BillingPaymentMethod
 * @class BillingPaymentMethod
 *
 * @description
 * The card on file, read-only.
 *
 * There is deliberately no edit form: card details are changed in the Stripe
 * billing portal, and entering them here would put card data through our own
 * inputs. The action opens the portal instead.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-billing-payment-method [method]="store.paymentMethod()" (manage)="openPortal()" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-billing-payment-method',
  imports: [ButtonModule],
  templateUrl: './billing-payment-method.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BillingPaymentMethod {
  //#region Inputs
  /**
   * Property method
   * @readonly
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<PaymentMethodOutput | null>}
   */
  public readonly method: InputSignal<PaymentMethodOutput | null> =
    input<PaymentMethodOutput | null>(null);

  /**
   * Property loading
   * @readonly
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property busy
   * @readonly
   *
   * @description
   * `true` while the Stripe portal session is being created.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly busy: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property manage
   * @readonly
   *
   * @description
   * Asks the parent to open the Stripe billing portal.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly manage: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /**
   * Property hasCard
   * @readonly
   *
   * @description
   * Branches on the backend's own flag rather than on `last4`, which is null
   * both when there is no card and when Stripe withholds the detail.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly hasCard: Signal<boolean> = computed(
    (): boolean => this.method()?.hasPaymentMethod === true,
  );

  /**
   * Property expiry
   * @readonly
   *
   * @description
   * `MM/YYYY`, or an empty string when Stripe did not report an expiry.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly expiry: Signal<string> = computed((): string => {
    const method: PaymentMethodOutput | null = this.method();
    if (method?.expMonth == null || method.expYear == null) return '';

    return `${String(method.expMonth).padStart(2, '0')}/${method.expYear}`;
  });
  //#endregion
}
