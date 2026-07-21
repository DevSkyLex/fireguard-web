import type { PaginationOptions } from '@core/api/models';
import type { NonConformitySeverity, NonConformityStatus } from './non-conformity-output.interface';

/**
 * Type OrganizationNonConformitySortField
 *
 * @description
 * Fields the organization-wide non-conformity collection accepts in
 * `order[field]`.
 */
export type OrganizationNonConformitySortField = 'severity' | 'status' | 'dueAt' | 'createdAt';

/**
 * Interface OrganizationNonConformityListFilter
 * @interface OrganizationNonConformityListFilter
 *
 * @description
 * Filtering, search, and sort options supported when listing non-conformities
 * across every inspection of an organization (the Compliance register's flat
 * view), as opposed to {@link NonConformityListFilter} which scopes to one
 * inspection.
 */
export interface OrganizationNonConformityListFilter {
  //#region Properties
  /** @type {NonConformitySeverity} */
  readonly severity?: NonConformitySeverity;
  /** @type {NonConformityStatus} */
  readonly status?: NonConformityStatus;
  /** Free-text search forwarded as `?search=`. */
  readonly search?: string;
  /**
   * Column sort direction, forwarded as `order[field]`. Only one field is
   * honoured by the backend; the first entry wins.
   *
   * @type {Readonly<Partial<Record<OrganizationNonConformitySortField, 'asc' | 'desc'>>>}
   */
  readonly order?: Readonly<Partial<Record<OrganizationNonConformitySortField, 'asc' | 'desc'>>>;
  //#endregion
}

/**
 * Type OrganizationNonConformityListOptions
 *
 * @description
 * Complete query options supported by the organization-wide non-conformity
 * listing endpoint (`GET /organizations/{organizationId}/non-conformities`).
 */
export type OrganizationNonConformityListOptions = OrganizationNonConformityListFilter &
  PaginationOptions;
