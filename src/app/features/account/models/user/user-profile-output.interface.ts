import type { HydraItem } from '@core/models/api';

/**
 * Interface UserProfileOutput
 * @interface UserProfileOutput
 *
 * @description
 * Current authenticated user profile returned by the account-owned
 * user profile transport. The underlying endpoint currently maps to
 * the OIDC userinfo resource.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface UserProfileOutput extends HydraItem {
  /**
   * Property sub
   * @readonly
   *
   * @description
   * Subject identifier of the authenticated user.
   *
   * @type {string}
   */
  readonly sub: string;

  /**
   * Property name
   * @readonly
   *
   * @description
   * Full display name of the user.
   *
   * @type {string | null | undefined}
   */
  readonly name?: string | null;

  /**
   * Property given_name
   * @readonly
   *
   * @description
   * Given name of the user.
   *
   * @type {string | null | undefined}
   */
  readonly given_name?: string | null;

  /**
   * Property family_name
   * @readonly
   *
   * @description
   * Family name of the user.
   *
   * @type {string | null | undefined}
   */
  readonly family_name?: string | null;

  /**
   * Property preferred_username
   * @readonly
   *
   * @description
   * Preferred display username.
   *
   * @type {string | null | undefined}
   */
  readonly preferred_username?: string | null;

  /**
   * Property picture
   * @readonly
   *
   * @description
   * Avatar URL of the authenticated user.
   *
   * @type {string | null | undefined}
   */
  readonly picture?: string | null;

  /**
   * Property email
   * @readonly
   *
   * @description
   * Email address of the user.
   *
   * @type {string | null | undefined}
   */
  readonly email?: string | null;

  /**
   * Property email_verified
   * @readonly
   *
   * @description
   * Whether the email address has been verified.
   *
   * @type {boolean | null | undefined}
   */
  readonly email_verified?: boolean | null;

  /**
   * Property updated_at
   * @readonly
   *
   * @description
   * Last profile update timestamp, in Unix seconds.
   *
   * @type {number | null | undefined}
   */
  readonly updated_at?: number | null;
}