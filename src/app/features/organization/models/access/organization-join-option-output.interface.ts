import type { HydraItem } from '@core/api/models';

/**
 * Interface OrganizationJoinOptionOutput
 * @interface OrganizationJoinOptionOutput
 *
 * @description
 * Minimal discoverable organization with explicit admission actions.
 *
 * @since 1.0.0
 */
export interface OrganizationJoinOptionOutput extends HydraItem {
  /**
   * Property id
   *
   * @description
   * Identifier used to select this organization in a join flow.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  id: string;

  /**
   * Property name
   *
   * @description
   * Organization name displayed in the discovery result.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  name: string;

  /**
   * Property logoUrl
   *
   * @description
   * Optional organization logo shown with the discovery result.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | undefined}
   */
  logoUrl?: string;

  /**
   * Property domain
   *
   * @description
   * Primary domain associated with the organization.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  domain: string;

  /**
   * Property roleLabel
   *
   * @description
   * Optional role label shown for the available admission choice.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | undefined}
   */
  roleLabel?: string;

  /**
   * Property actions
   *
   * @description
   * Server-authorized actions the caller may take for this organization.
   *
   * @access public
   * @since unreleased
   *
   * @type {('join' | 'request' | 'open' | 'view_request')[]}
   */
  actions: ('join' | 'request' | 'open' | 'view_request')[];
}
