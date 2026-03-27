import type {
  OrganizationDashboardStatistics,
  OrganizationOutput,
  OrganizationStatisticsOutput,
} from '@core/models/organization';
import type { Operation } from '@core/stores/operations';

/**
 * Interface ActiveOrganizationState
 * @interface ActiveOrganizationState
 *
 * @description
 * Minimal root-level state for the currently selected / active organization.
 * Only tracks the routing context (which org is being viewed) and its
 * associated statistics. All list management and CRUD operations live in
 * the component-scoped {@link OrganizationStore}.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface ActiveOrganizationState {
  //#region Properties
  /**
   * Property selectedOrganization
   * @readonly
   *
   * @description
   * Currently selected / viewed organization (set by
   * resolver or DashboardLayout).
   *
   * @since 1.0.0
   *
   * @type {OrganizationOutput | null}
   */
  readonly selectedOrganization: OrganizationOutput | null;

  /**
   * Property getOperation
   * @readonly
   *
   * @description
   * Loading / error state for fetching the selected organization.
   *
   * This operation is managed by the resolver and DashboardLayout, not by
   * the store itself, but it's included here for convenience since it's
   * tightly coupled to the selected organization.
   *
   * @since 1.0.0
   *
   * @type {Operation<OrganizationOutput | null, unknown>}
   */
  readonly getOperation: Operation<OrganizationOutput | null, unknown>;

  /**
   * Property statistics
   * @readonly
   *
   * @description
   * Statistics for the currently selected organization.
   *
   * This is loaded on demand by the OrganizationDetailComponent when the user
   * navigates to the details page, and is not automatically fetched with the
   * organization itself.
   *
   * @since 1.0.0
   *
   * @type {OrganizationStatisticsOutput | null}
   */
  readonly statistics: OrganizationStatisticsOutput | null;

  /**
   * Property dashboardStatistics
   * @readonly
   *
   * @description
   * Detailed statistics payload used by the organization overview dashboard.
   *
   * @since 1.1.0
   *
   * @type {OrganizationDashboardStatistics | null}
   */
  readonly dashboardStatistics: OrganizationDashboardStatistics | null;

  /**
   * Property statisticsOperation
   * @readonly
   *
   * @description
   * Loading / error state for statistics.
   *
   * @since 1.0.0
   *
   * @type {Operation<OrganizationStatisticsOutput | null, unknown>}
   */
  readonly statisticsOperation: Operation<OrganizationStatisticsOutput | null, unknown>;
  //#endregion
}
