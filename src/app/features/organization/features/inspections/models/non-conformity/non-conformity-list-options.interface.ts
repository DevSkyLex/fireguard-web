import type { PaginationOptions } from '@core/models/api';
import type { NonConformitySeverity, NonConformityStatus } from './non-conformity-output.interface';

/**
 * Interface NonConformityListFilter
 * @interface NonConformityListFilter
 *
 * @description
 * Filtering options supported when listing
 * non-conformities.
 */
export interface NonConformityListFilter {
  //#region Properties
  /** @type {NonConformitySeverity} */
  readonly severity?: NonConformitySeverity;
  /** @type {NonConformityStatus} */
  readonly status?: NonConformityStatus;
  //#endregion
}

/**
 * Type NonConformityListOptions
 *
 * @description
 * Complete query options supported by the
 * non-conformities listing endpoint.
 */
export type NonConformityListOptions = NonConformityListFilter & PaginationOptions;
