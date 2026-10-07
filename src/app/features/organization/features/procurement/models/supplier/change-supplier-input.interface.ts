import type { SupplierContact } from './supplier-contact.interface';
/**
 * Interface ChangeSupplierInput
 * @interface ChangeSupplierInput
 *
 * @description
 * Supplier fields accepted for creation and draft-preserving changes.
 */
export interface ChangeSupplierInput {
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
   * Optional internal supplier code; null explicitly clears it.
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
   * Optional general contact address.
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
   * Internal contacts, without creating an external user account.
   *
   * @access public
   *
   * @type {readonly SupplierContact[]}
   */
  readonly contacts: readonly SupplierContact[];
}
