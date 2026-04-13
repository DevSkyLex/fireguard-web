import type { Signal } from '@angular/core';
import type { OrganizationOutput } from '@features/organization/models';

/**
 * OrganizationContextPort
 * @interface OrganizationContextPort
 *
 * @description
 * Feature-owned port publishing the active organization context to
 * external consumers such as layouts and approved sibling features.
 *
 * Concrete implementation: `ActiveOrganizationStore` in
 * `features/organization/state/active-organization/`.
 * Binding: `features/organization/providers/`.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface OrganizationContextPort {
  //#region Properties
  /**
   * Property selectedOrganization
   * @readonly
   *
   * @description
   * Signal of the currently selected organization.
   * Null if no organization is selected.
   *
   * @since 1.0.0
   *
   * @type {Signal<OrganizationOutput | null>}
   */
  readonly selectedOrganization: Signal<OrganizationOutput | null>;

  /**
   * Property isLoadingOrganization
   * @readonly
   *
   * @description
   * Signal indicating whether the organization
   * context is currently loading.
   *
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  readonly isLoadingOrganization: Signal<boolean>;
  //#endregion

  //#region Methods
  /**
   * Method setOrganization
   * @method setOrganization
   *
   * @description
   * Sets the active organization context. Should be called by the consumer
   * of the port when the organization context is loaded or changes, typically
   * in response to route changes in the main layout.
   *
   * @since 1.0.0
   *
   * @param {OrganizationOutput} organization - The organization to set as active context.
   *
   * @return {void} - This method does not return a value.
   */
  setOrganization(organization: OrganizationOutput): void;

  /**
   * Method clearSelectedOrganization
   * @method clearSelectedOrganization
   *
   * @description
   * Clears the active organization context, setting it to null.
   * Should be called by the consumer of the port when the
   * organization context needs to be reset, such as when navigating away from
   * organization-specific routes in the main layout.
   *
   * @since 1.0.0
   *
   * @return {void} - This method does not return a value.
   */
  clearSelectedOrganization(): void;
  //#endregion
}
