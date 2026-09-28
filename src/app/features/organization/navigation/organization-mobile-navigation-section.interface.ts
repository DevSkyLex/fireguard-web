import type { OrganizationMobileNavigationLink } from './organization-mobile-navigation-link.interface';

/**
 * Interface OrganizationMobileNavigationSection
 * @interface OrganizationMobileNavigationSection
 *
 * @description
 * An allowed secondary destination group for the More page.
 *
 * @since 1.0.0
 */
export interface OrganizationMobileNavigationSection {
  /**
   * Property id
   * @readonly
   * @description Stable section identifier.
   * @access public
   * @since 1.0.0
   * @type {string}
   */
  readonly id: string;
  /**
   * Property label
   * @readonly
   * @description Localized section heading.
   * @access public
   * @since 1.0.0
   * @type {string}
   */
  readonly label: string;
  /**
   * Property links
   * @readonly
   * @description Allowed destinations in display order.
   * @access public
   * @since 1.0.0
   * @type {readonly OrganizationMobileNavigationLink[]}
   */
  readonly links: readonly OrganizationMobileNavigationLink[];

  /**
   * Property includesSignOut
   * @readonly
   * @description Whether this section's row list ends with the sign-out control, so the More page renders it without matching a section id.
   * @access public
   * @since 1.1.0
   * @type {boolean}
   */
  readonly includesSignOut?: boolean;
}
