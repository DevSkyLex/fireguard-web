import type { PaginationOptions, RequestOptions, SortingOptions } from '@core/api/models';
import type { FacilityStatus } from './facility-output.interface';

/**
 * Interface FacilityListFilter
 * @interface FacilityListFilter
 *
 * @description
 * Filtering options supported when listing **root** facilities for the
 * hierarchical TreeTable. Mirrors the backend contract:
 * `GET /api/organizations/{organizationId}/facilities?rootsOnly=true`.
 *
 * Child facilities are fetched through the dedicated `/children` endpoint
 * (see {@link FacilityChildrenOptions}) and are not scoped through this
 * filter.
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface FacilityListFilter {
  //#region Properties
  /**
   * Property rootsOnly
   * @readonly
   *
   * @description
   * When `true`, restricts the result to root facilities (no parent).
   * Must not be combined with any parent-scoping parameter.
   *
   * @type {boolean}
   */
  readonly rootsOnly?: boolean;

  /**
   * Property includeArchived
   * @readonly
   *
   * @description
   * When `true`, archived facilities are included in the result. Defaults
   * to `false` on the backend.
   *
   * @type {boolean}
   */
  readonly includeArchived?: boolean;

  /**
   * Property status
   * @readonly
   *
   * @description
   * Restricts results to a single lifecycle status.
   *
   * @type {FacilityStatus}
   */
  readonly status?: FacilityStatus;

  /**
   * Property hasCoordinates
   * @readonly
   *
   * @description
   * Tri-state filter on whether a facility has been located: `true` returns
   * only facilities with both `latitude`/`longitude` set, `false` only those
   * missing either. Omit to leave the collection unfiltered on location.
   *
   * @type {boolean}
   */
  readonly hasCoordinates?: boolean;

  /**
   * Property search
   * @readonly
   *
   * @description
   * Free-text search applied to facility name / code.
   *
   * @type {string}
   */
  readonly search?: string;

  /**
   * Property params
   * @readonly
   *
   * @description
   * Additional API query parameters forwarded as-is, the way the sibling
   * inspection contract does. The facility table emits its search, column
   * filters and sort through this bag; without it they never reach the wire.
   *
   * @type {RequestOptions['params']}
   */
  readonly params?: RequestOptions['params'];
  //#endregion
}

/**
 * Type FacilityListOptions
 *
 * @description
 * Complete query options supported by the facilities listing endpoint,
 * combining root filters with pagination and the typed `sort` option
 * (`SortingOptions`, `@core/api`), serialized by `HydraApiService.buildParams`
 * as `order[<field>]=<direction>`.
 */
export type FacilityListOptions = FacilityListFilter & PaginationOptions & SortingOptions;

/**
 * Type FacilityChildrenOptions
 *
 * @description
 * Query options supported by the direct-children endpoint
 * `GET /api/organizations/{organizationId}/facilities/{facilityId}/children`.
 * Pagination-only for the standard lazy-expansion flow.
 */
export type FacilityChildrenOptions = PaginationOptions;

/**
 * Interface FacilityDescendantsOptions
 *
 * @description
 * Query options supported by the descendants endpoint
 * `GET /api/organizations/{organizationId}/facilities/{facilityId}/descendants`.
 */
export interface FacilityDescendantsOptions {
  /**
   * When `true`, archived descendants are included in the result.
   */
  readonly includeArchived?: boolean;

  /**
   * Free-text search applied across descendant facilities.
   */
  readonly search?: string;
}
