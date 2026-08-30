import type { Signal } from '@angular/core';
import type { CallState, StoreError } from '@core/request-state';
import type { OrganizationOutput } from '@features/organization/models';

/**
 * MyOrganizationsPort
 * @interface MyOrganizationsPort
 *
 * @description
 * Organization-owned contract publishing the authenticated member's own
 * organization memberships — and the ability to leave one — to approved
 * external consumers. Built for `/account/organizations`
 * (`features/account/FEATURE.md`): unlike {@link OrganizationStore} or
 * {@link OrganizationSettingsStore}, both scoped to surfaces already inside
 * one organization, this port must answer for a member holding no
 * organization permission at all.
 *
 * Concrete implementation: `MyOrganizationsStore` in
 * `features/organization/state/my-organizations/`.
 * Binding: `features/organization/organization.feature.ts`.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface MyOrganizationsPort {
  //#region Properties
  /**
   * Property organizations
   * @readonly
   * @description Every organization the caller is a member of.
   * @since 1.0.0
   * @type {Signal<ReadonlyArray<OrganizationOutput>>}
   */
  readonly organizations: Signal<ReadonlyArray<OrganizationOutput>>;

  /**
   * Property isLoadingOrganizations
   * @readonly
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  readonly isLoadingOrganizations: Signal<boolean>;

  /**
   * Property isLeaving
   * @readonly
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  readonly isLeaving: Signal<boolean>;

  /**
   * Property leaveError
   * @readonly
   * @description The last leave attempt's normalized error, e.g. the backend's owner/last-administrator 409.
   * @since 1.0.0
   * @type {Signal<StoreError | null>}
   */
  readonly leaveError: Signal<StoreError | null>;

  /**
   * Property leaveCallState
   * @readonly
   * @description The full leave call state, so a consumer can key off the transition into `'success'` rather than re-deriving it from {@link isLeaving} and {@link leaveError} alone.
   * @since 1.0.0
   * @type {Signal<CallState<void>>}
   */
  readonly leaveCallState: Signal<CallState<void>>;

  /**
   * Property activeOrganizationId
   * @readonly
   * @description The organization currently open in the workspace, or `null`. Used to mark the active row and to decide whether leaving it must navigate away.
   * @since 1.0.0
   * @type {Signal<string | null>}
   */
  readonly activeOrganizationId: Signal<string | null>;
  //#endregion

  //#region Methods
  /**
   * Method loadOrganizations
   * @method loadOrganizations
   * @description Loads the caller's organization list.
   * @since 1.0.0
   * @returns {void}
   */
  loadOrganizations(): void;

  /**
   * Method leave
   * @method leave
   * @description Removes the caller's own membership in the given organization.
   * @since 1.0.0
   * @param {string} organizationId - The organization to leave.
   * @returns {void}
   */
  leave(organizationId: string): void;

  /**
   * Method resetLeaveOperation
   * @method resetLeaveOperation
   * @description Resets the leave call state back to idle.
   * @since 1.0.0
   * @returns {void}
   */
  resetLeaveOperation(): void;
  //#endregion
}
