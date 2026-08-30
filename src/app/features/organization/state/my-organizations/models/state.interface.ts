import type { CallState } from '@core/request-state';

/**
 * Interface MyOrganizationsState
 * @interface MyOrganizationsState
 *
 * @description
 * Root-provided state for the authenticated member's own organization list —
 * consumed by `/account/organizations` through `MY_ORGANIZATIONS_PORT`
 * (`ports/my-organizations/`) rather than the memberships-management-focused
 * {@link OrganizationStore}, which is deliberately component-scoped.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface MyOrganizationsState {
  //#region Properties
  /**
   * Property listCallState
   * @readonly
   * @description Call state for loading the caller's organization list.
   * @since 1.0.0
   * @type {CallState}
   */
  readonly listCallState: CallState;

  /**
   * Property leaveCallState
   * @readonly
   * @description Call state for the in-flight `leave` mutation, keyed by nothing beyond "one at a time".
   * @since 1.0.0
   * @type {CallState}
   */
  readonly leaveCallState: CallState;
  //#endregion
}
