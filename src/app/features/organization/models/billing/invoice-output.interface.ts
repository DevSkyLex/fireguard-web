import type { HydraItem } from '@core/models/api';

/**
 * Interface InvoiceOutput
 * @interface InvoiceOutput
 *
 * @description
 * A single billing invoice of an organization, returned by the billing API and
 * used to render the in-app billing history. `amount` is an integer in the
 * currency's smallest unit (e.g. cents).
 */
export interface InvoiceOutput extends HydraItem {
  //#region Properties
  /** @type {string} */
  readonly id: string;
  /** @type {(string | null | undefined)} */
  readonly number?: string | null;
  /** @type {string} */
  readonly status: string;
  /** @type {number} */
  readonly amount: number;
  /** @type {string} */
  readonly currency: string;
  /** @type {(string | null | undefined)} */
  readonly createdAt?: string | null;
  /** @type {(string | null | undefined)} */
  readonly hostedInvoiceUrl?: string | null;
  /** @type {(string | null | undefined)} */
  readonly invoicePdf?: string | null;
  //#endregion
}
