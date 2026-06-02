import type { PaginationOptions, RequestOptions } from '@core/models/api';
import type { InspectionResult, InspectionStatus } from './inspection-output.interface';

/**
 * Interface InspectionListFilter
 * @interface InspectionListFilter
 *
 * @description
 * Filtering options supported when listing inspections.
 */
export interface InspectionListFilter {
  //#region Properties
  /** @type {string} */
  readonly equipmentId?: string;
  /** @type {string} */
  readonly facilityId?: string;
  /** @type {InspectionResult} */
  readonly result?: InspectionResult;
  /** @type {InspectionStatus} */
  readonly status?: InspectionStatus;
  /** Additional API query parameters such as order[field]. */
  readonly params?: RequestOptions['params'];
  //#endregion
}

/**
 * Type InspectionListOptions
 *
 * @description
 * Complete query options supported by the inspections
 * listing endpoint.
 */
export type InspectionListOptions = InspectionListFilter & PaginationOptions;
