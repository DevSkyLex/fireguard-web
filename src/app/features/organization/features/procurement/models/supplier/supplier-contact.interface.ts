/**
 * Interface SupplierContact
 * @interface SupplierContact
 *
 * @description
 * Internal supplier contact retained within its organization.
 */
export interface SupplierContact {
  /**
   * Property name
   * @readonly
   *
   * @description
   * Contact's display name.
   *
   * @access public
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
   *
   * @type {string | null}
   */
  readonly phone?: string | null;

  /**
   * Property role
   * @readonly
   *
   * @description
   * Optional responsibility.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly role?: string | null;
}
