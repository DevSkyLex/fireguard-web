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
 * Read-only by design: the context is derived from `:organizationId` in the
 * URL, so there is nothing for a consumer to set. A write method here would be
 * a second source of truth, free to drift from the address bar.
 *
 * Concrete implementation: `ActiveOrganizationStore` in
 * `features/organization/state/active-organization/`.
 * Binding: `features/organization/providers/`.
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface OrganizationContextPort {
  //#region Properties
  /**
   * Property selectedOrganizationId
   * @readonly
   *
   * @description
   * Identifier of the organization the URL currently designates, or `null`
   * outside an organization-scoped route.
   *
   * Prefer it over `selectedOrganization()?.id` for anything that only needs
   * to know *which* organization is open — building a link, keying a request:
   * it is available as soon as the URL changes, without waiting for the
   * resource to load.
   *
   * @since 2.0.0
   *
   * @type {Signal<string | null>}
   */
  readonly selectedOrganizationId: Signal<string | null>;

  /**
   * Property selectedOrganization
   * @readonly
   *
   * @description
   * Signal of the currently selected organization resource. Null when no
   * organization is routed, or while its resource is still loading.
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
}
