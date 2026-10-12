import type { RequestOptions } from '@core/api';

/**
 * Interface InventoryConsumptionListOptions
 * @interface InventoryConsumptionListOptions
 *
 * @description
 * Adds exact receipt correlation by the original physical operation UUID to ordinary inventory
 * reads.
 */
export interface InventoryConsumptionListOptions extends RequestOptions {
  /**
   * Property clientOperationId
   * @readonly
   *
   * @description
   * Original immutable declaration UUID; the server resolves it inside the authenticated
   * organization.
   *
   * @type {string | undefined}
   */
  readonly clientOperationId?: string;
}
