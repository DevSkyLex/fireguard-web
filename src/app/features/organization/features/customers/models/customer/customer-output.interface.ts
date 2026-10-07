import type { HydraItem } from '@core/api/models';

/**
 * Interface CustomerContact
 * @interface
 *
 * @description
 * Internal contact retained with an organization's customer record.
 *
 * @since unreleased
 */
export interface CustomerContact {
  /**
   * Property name
   * @readonly
   *
   * @description
   * Contact name.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly name: string;
  /**
   * Property email
   * @readonly
   *
   * @description
   * Optional contact email.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | null}
   */
  readonly email?: string | null;
  /**
   * Property phone
   * @readonly
   *
   * @description
   * Optional telephone number.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | null}
   */
  readonly phone?: string | null;
  /**
   * Property role
   * @readonly
   *
   * @description
   * Optional responsibility within the customer organization.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | null}
   */
  readonly role?: string | null;
}

/**
 * Interface CustomerOutput
 * @interface
 *
 * @description
 * Organization-scoped customer; this record grants no external account access.
 *
 * @since unreleased
 */
export interface CustomerOutput extends HydraItem {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Stable record identity.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly id: string;
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Owning organization.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly organizationId: string;
  /**
   * Property name
   * @readonly
   *
   * @description
   * Display name.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly name: string;
  /**
   * Property code
   * @readonly
   *
   * @description
   * Optional internal reference.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | null}
   */
  readonly code?: string | null;
  /**
   * Property email
   * @readonly
   *
   * @description
   * General email.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | null}
   */
  readonly email?: string | null;
  /**
   * Property phone
   * @readonly
   *
   * @description
   * General telephone.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | null}
   */
  readonly phone?: string | null;
  /**
   * Property contacts
   * @readonly
   *
   * @description
   * Internal contact directory.
   *
   * @access public
   * @since unreleased
   *
   * @type {readonly CustomerContact[]}
   */
  readonly contacts: readonly CustomerContact[];
  /**
   * Property archivedAt
   * @readonly
   *
   * @description
   * Archive instant; omitted or null for active customers.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | null}
   */
  readonly archivedAt?: string | null;
  /**
   * Property createdAt
   * @readonly
   *
   * @description
   * Creation instant.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly createdAt: string;
  /**
   * Property updatedAt
   * @readonly
   *
   * @description
   * Last update instant.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly updatedAt: string;
  /**
   * Property revision
   * @readonly
   *
   * @description
   * Revision required for concurrent writes.
   *
   * @access public
   * @since unreleased
   *
   * @type {number}
   */
  readonly revision: number;
}
