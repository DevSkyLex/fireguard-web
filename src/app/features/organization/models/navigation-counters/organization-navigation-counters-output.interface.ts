import type { HydraItem } from '@core/api/models';

/**
 * Interface OrganizationNavigationCountersOutput
 * @interface OrganizationNavigationCountersOutput
 * @extends {HydraItem}
 *
 * @description
 * Sidebar badge counters returned by
 * `GET /api/organizations/{organizationId}/navigation-counters`. Counters the
 * caller lacks the read permission for degrade to `0` server-side.
 *
 * @since 1.0.0
 */
export interface OrganizationNavigationCountersOutput extends HydraItem {
  /**
   * Property openInterventions
   * @readonly
   *
   * @description
   * Interventions neither published nor abandoned.
   *
   * @type {number}
   */
  readonly openInterventions: number;

  /**
   * Property openNonConformities
   * @readonly
   *
   * @description
   * Non-conformities in the open or in-progress status.
   *
   * @type {number}
   */
  readonly openNonConformities: number;
}
