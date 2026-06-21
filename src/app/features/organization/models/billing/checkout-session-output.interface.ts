import type { HydraItem } from '@core/models/api';

/**
 * Interface CheckoutSessionOutput
 * @interface CheckoutSessionOutput
 *
 * @description
 * Hosted Checkout URL the client must redirect the user to.
 */
export interface CheckoutSessionOutput extends HydraItem {
  //#region Properties
  /** @type {string} */
  readonly organizationId: string;
  /** @type {string} */
  readonly url: string;
  //#endregion
}
