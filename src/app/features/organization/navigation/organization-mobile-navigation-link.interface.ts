import type { OrganizationNavigationLink } from './organization-navigation.config';

/**
 * Interface OrganizationMobileNavigationLink
 * @interface OrganizationMobileNavigationLink
 *
 * @description
 * A resolved mobile destination with its canonical query parameters.
 *
 * @since 1.0.0
 */
export interface OrganizationMobileNavigationLink extends OrganizationNavigationLink {
  /**
   * Property queryParams
   * @readonly
   * @description Canonical destination query parameters, when needed.
   * @access public
   * @since 1.0.0
   * @type {Readonly<Record<string, string>> | null}
   */
  readonly queryParams?: Readonly<Record<string, string>> | null;
}
