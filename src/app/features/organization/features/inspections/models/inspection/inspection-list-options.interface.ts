import type { PaginationOptions, RequestOptions } from '@core/api/models';
import type { InspectionResult, InspectionStatus } from './inspection-output.interface';

/**
 * Interface InspectionListFilter
 * @interface InspectionListFilter
 *
 * @description
 * Filtering options supported when listing inspections.
 */
/**
 * Type InspectionSortField
 *
 * @description
 * Fields the inspection listing endpoint accepts in `order[field]`.
 */
export type InspectionSortField = 'result' | 'status' | 'performedAt' | 'createdAt';

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
  /** Free-text search forwarded as `?search=`. */
  readonly search?: string;
  /**
   * Column sort direction, forwarded as `order[field]`. Only one field is
   * honoured by the backend; the first entry wins.
   *
   * @type {Readonly<Partial<Record<InspectionSortField, 'asc' | 'desc'>>>}
   */
  readonly order?: Readonly<Partial<Record<InspectionSortField, 'asc' | 'desc'>>>;
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
