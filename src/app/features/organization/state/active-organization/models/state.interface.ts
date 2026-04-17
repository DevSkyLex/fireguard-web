import type { CallState } from '@core/state/request-state';
import type { OrganizationOutput } from '@features/organization/models';

/**
 * Interface ActiveOrganizationState
 * @interface ActiveOrganizationState
 *
 * @description
 * Minimal root-level state for the currently selected / active organization.
 * Only tracks the routing context (which org is being viewed).
 * All list management and CRUD operations live in
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
  readonly getCallState: CallState<OrganizationOutput | null>;
  //#endregion
}
