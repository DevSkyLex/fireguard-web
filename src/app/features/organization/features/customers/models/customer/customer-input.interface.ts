import type { CustomerContact } from './customer-output.interface';

/**
 * Interface CustomerInput
 * @interface
 *
 * @description
 * Writable customer fields; optional empty values explicitly clear existing information.
 *
 * @since unreleased
 */
export interface CustomerInput {
  /**
   * Property name
   * @readonly
   *
   * @description
   * Customer display name.
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
   * Optional general email.
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
   * Optional general telephone.
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
   * Internal contacts without independent identities.
   *
   * @access public
   * @since unreleased
   *
   * @type {readonly CustomerContact[]}
   */
  readonly contacts?: readonly CustomerContact[];
}
