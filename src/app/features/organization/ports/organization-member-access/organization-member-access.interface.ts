import type { Signal } from '@angular/core';
import type { StoreError } from '@core/state/request-state';
import type { CurrentOrganizationMemberProfileOutput } from '@features/organization/models';

/**
 * OrganizationMemberAccessPort
 * @interface OrganizationMemberAccessPort
 *
 * @description
 * Feature-owned contract publishing the authenticated user's effective
 * roles and permissions inside the currently active organization.
 *
 * Concrete implementation: `OrganizationMemberAccessStore` in
 * `features/organization/state/organization-member-access/`.
 * Binding: `features/organization/providers/`.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface OrganizationMemberAccessPort {
  //#region Properties
  /**
   * Property profile
   * @readonly
   *
   * @description
   * Signal of the authenticated user's current member profile
   * in the active organization.
   *
   * @type {Signal<CurrentOrganizationMemberProfileOutput | null>}
   */
  readonly profile: Signal<CurrentOrganizationMemberProfileOutput | null>;

  /**
   * Property roles
   * @readonly
   *
   * @description
   * Resolved role names for the authenticated user in the
   * current active organization.
   *
   * @type {Signal<ReadonlyArray<string>>}
   */
  readonly roles: Signal<ReadonlyArray<string>>;

  /**
   * Property permissions
   * @readonly
   *
   * @description
   * Effective permission names for the authenticated user in the
   * current active organization.
   *
   * @type {Signal<ReadonlyArray<string>>}
   */
  readonly permissions: Signal<ReadonlyArray<string>>;

  /**
   * Property isLoadingAccess
   * @readonly
   *
   * @description
   * Indicates whether the organization member access payload
   * is currently loading.
   *
   * @type {Signal<boolean>}
   */
  readonly isLoadingAccess: Signal<boolean>;

  /**
   * Property accessError
   * @readonly
   *
   * @description
   * Last access loading error, if any.
   *
   * @type {Signal<StoreError | null>}
   */
  readonly accessError: Signal<StoreError | null>;
  //#endregion

  //#region Methods
  /**
   * Method reload
   *
   * @description
   * Forces a reload of the authenticated user's access payload
   * for the current active organization.
   *
   * @returns {void}
   */
  reload(): void;

  /**
   * Method clear
   *
   * @description
   * Clears the current organization member access state.
   *
   * @returns {void}
   */
  clear(): void;
  //#endregion
}
