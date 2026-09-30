import type { AvatarUrls, HydraItem } from '@core/api/models';

/**
 * Interface UserOutput
 * @interface UserOutput
 *
 * @description
 * Read model returned by user endpoints.
 */
export interface UserOutput extends HydraItem {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Stable identifier used to address this account in API operations.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property username
   * @readonly
   *
   * @description
   * Account name displayed wherever the user is identified by username.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {string}
   */
  readonly username: string;

  /**
   * Property email
   * @readonly
   *
   * @description
   * Email address associated with the account.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {string}
   */
  readonly email: string;

  /**
   * Property firstName
   * @readonly
   *
   * @description
   * Given name returned for profile display and editing.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {string}
   */
  readonly firstName: string;

  /**
   * Property lastName
   * @readonly
   *
   * @description
   * Family name returned for profile display and editing.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {string}
   */
  readonly lastName: string;

  /**
   * Property avatarUrl
   * @readonly
   *
   * @description
   * Optional legacy avatar URL; it can be omitted or explicitly null.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {string | null | undefined}
   */
  readonly avatarUrl?: string | null;

  /**
   * Property avatarUrls
   * @readonly
   *
   * @description
   * Optional size-specific avatar URLs; unavailable variants may be null.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {AvatarUrls | null | undefined}
   */
  readonly avatarUrls?: AvatarUrls | null;

  /**
   * Property status
   * @readonly
   *
   * @description
   * Optional account status supplied by the user endpoint.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {string | null | undefined}
   */
  readonly status?: string | null;

  /**
   * Property emailVerified
   * @readonly
   *
   * @description
   * Indicates whether the account email has been verified.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {boolean}
   */
  readonly emailVerified: boolean;

  /**
   * Property tenantId
   * @readonly
   *
   * @description
   * Optional identifier of the account's tenant context.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {string | null | undefined}
   */
  readonly tenantId?: string | null;

  /**
   * Property createdAt
   * @readonly
   *
   * @description
   * Optional creation timestamp supplied by the API.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {string | null | undefined}
   */
  readonly createdAt?: string | null;

  /**
   * Property lastLoginAt
   * @readonly
   *
   * @description
   * Optional timestamp of the user's most recent login.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {string | null | undefined}
   */
  readonly lastLoginAt?: string | null;
}
