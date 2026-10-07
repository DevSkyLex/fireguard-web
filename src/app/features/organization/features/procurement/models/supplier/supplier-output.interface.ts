import type { HydraItem } from '@core/api/models';
import type { SupplierContact } from './supplier-contact.interface';
/**
 * Interface SupplierOutput
 * @interface SupplierOutput
 *
 * @description
 * Server-authorized internal supplier and displayed optimistic revision.
 */
export interface SupplierOutput extends HydraItem {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Stable supplier UUID.
   *
   * @access public
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Owning tenant.
   *
   * @access public
   *
   * @type {string}
   */
  readonly organizationId: string;

  /**
   * Property name
   * @readonly
   *
   * @description
   * Internal display name.
   *
   * @access public
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
   *
   * @type {string | null}
   */
  readonly code?: string | null;

  /**
   * Property email
   * @readonly
   *
   * @description
   * Optional general email.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly email?: string | null;

  /**
   * Property phone
   * @readonly
   *
   * @description
   * Optional general telephone.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly phone?: string | null;

  /**
   * Property contacts
   * @readonly
   *
   * @description
   * Internal contacts.
   *
   * @access public
   *
   * @type {readonly SupplierContact[]}
   */
  readonly contacts: readonly SupplierContact[];

  /**
   * Property archivedAt
   * @readonly
   *
   * @description
   * Retained archival instant; archived suppliers cannot receive new orders.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly archivedAt?: string | null;

  /**
   * Property revision
   * @readonly
   *
   * @description
   * Server revision required by changes.
   *
   * @access public
   *
   * @type {number}
   */
  readonly revision: number;

  /**
   * Property createdAt
   * @readonly
   *
   * @description
   * Original creation instant.
   *
   * @access public
   *
   * @type {string}
   */
  readonly createdAt: string;

  /**
   * Property updatedAt
   * @readonly
   *
   * @description
   * Most recent server mutation instant.
   *
   * @access public
   *
   * @type {string}
   */
  readonly updatedAt: string;

  /**
   * Property replayed
   * @readonly
   *
   * @description
   * Whether the server recognized a prior mutation.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly replayed: boolean;
}
