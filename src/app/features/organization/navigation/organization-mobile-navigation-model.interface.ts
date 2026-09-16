import type { OrganizationMobileNavigationLink } from './organization-mobile-navigation-link.interface';
import type { OrganizationMobileNavigationSection } from './organization-mobile-navigation-section.interface';

/**
 * Interface OrganizationMobileNavigationModel
 * @interface OrganizationMobileNavigationModel
 *
 * @description
 * Permission-resolved destinations shared by the bottom navigation and More.
 * No collection results, copied organization state or device geometry enter this model.
 *
 * @since 1.0.0
 */
export interface OrganizationMobileNavigationModel {
  /**
   * Property organizationId
   * @readonly
   * @description Workspace owning organization routes, or null for the account fallback.
   * @access public
   * @since 1.0.0
   * @type {string | null}
   */
  readonly organizationId: string | null;
  /**
   * Property primary
   * @readonly
   * @description Allowed bottom destinations in their stable order.
   * @access public
   * @since 1.0.0
   * @type {readonly OrganizationMobileNavigationLink[]}
   */
  readonly primary: readonly OrganizationMobileNavigationLink[];
  /**
   * Property sections
   * @readonly
   * @description Non-empty groups of secondary destinations.
   * @access public
   * @since 1.0.0
   * @type {readonly OrganizationMobileNavigationSection[]}
   */
  readonly sections: readonly OrganizationMobileNavigationSection[];
}
