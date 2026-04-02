import type {
  OrganizationDashboardOutput,
  OrganizationDashboardTrendKey,
  OrganizationDashboardTrendOutput,
  OrganizationOutput,
} from '@core/models/organization';
import type { Operation } from '@core/stores/operations';

/**
 * Interface ActiveOrganizationState
 * @interface ActiveOrganizationState
 *
 * @description
 * Minimal root-level state for the currently selected / active organization.
 * Only tracks the routing context (which org is being viewed) and its
 * associated dashboard analytics. All list management and CRUD operations live in
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
   * Property dashboard
   * @readonly
   *
   * @description
   * Dashboard analytics for the currently selected organization.
   *
   * @since 1.0.0
   *
   * @type {OrganizationDashboardOutput | null}
   */
  readonly dashboard: OrganizationDashboardOutput | null;

  /**
   * Property dashboardOperation
   * @readonly
   *
   * @description
   * Loading / error state for the organization dashboard request.
   *
   * @since 1.1.0
   *
   * @type {Operation<OrganizationDashboardOutput | null, unknown>}
   */
  readonly dashboardOperation: Operation<OrganizationDashboardOutput | null, unknown>;

  /**
   * Property dashboardTrendMap
   * @readonly
   *
   * @description
   * Chart-level dashboard trend resources fetched from the dedicated
   * `/dashboard/trends/*` endpoints.
   *
   * @since 1.1.0
   *
   * @type {Readonly<Record<OrganizationDashboardTrendKey, OrganizationDashboardTrendOutput | null>>}
   */
  readonly dashboardTrendMap: Readonly<
    Record<OrganizationDashboardTrendKey, OrganizationDashboardTrendOutput | null>
  >;

  /**
   * Property dashboardTrendOperations
   * @readonly
   *
   * @description
   * Loading and error state for each dedicated dashboard trend endpoint.
   *
   * @since 1.1.0
   *
   * @type {Readonly<Record<OrganizationDashboardTrendKey, Operation<OrganizationDashboardTrendOutput | null, unknown>>>}
   */
  readonly dashboardTrendOperations: Readonly<
    Record<
      OrganizationDashboardTrendKey,
      Operation<OrganizationDashboardTrendOutput | null, unknown>
    >
  >;
  //#endregion
}
