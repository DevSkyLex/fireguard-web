import type { HydraItem } from '@core/models/api';

/**
 * Interface UserInfoOutput
 * @interface UserInfoOutput
 *
 * @description
 * OpenID Connect UserInfo response.
 * Returned by GET /api/oauth2/userinfo.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```typescript
 * const userInfo: UserInfoOutput = {
 *   '@id': '/api/oauth2/userinfo',
 *   '@type': 'UserInfo',
 *   sub: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
 *   name: 'John Doe',
 *   given_name: 'John',
 *   family_name: 'Doe',
 *   preferred_username: 'johndoe',
 *   email: 'john.doe@example.com',
 *   email_verified: true,
 *   picture: 'https://cdn.example.com/avatars/johndoe.png',
 *   updated_at: 1733746800
 * };
 * ```
 */
export interface UserInfoOutput extends HydraItem {
  /**
   * Property sub
   * @readonly
   *
   * @description
   * Subject identifier (unique user UUID) per OIDC specification.
   *
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly sub: string;

  /**
   * Property name
   * @readonly
   *
   * @description
   * Full name of the user.
   *
   * @since 1.0.0
   *
   * @type {string | null | undefined}
   */
  readonly name?: string | null;

  /**
   * Property given_name
   * @readonly
   *
   * @description
   * First name (given name) of the user.
   *
   * @since 1.0.0
   *
   * @type {string | null | undefined}
   */
  readonly given_name?: string | null;

  /**
   * Property family_name
   * @readonly
   *
   * @description
   * Last name (family name) of the user.
   *
   * @since 1.0.0
   *
   * @type {string | null | undefined}
   */
  readonly family_name?: string | null;

  /**
   * Property preferred_username
   * @readonly
   *
   * @description
   * Preferred display name or username.
   *
   * @since 1.0.0
   *
   * @type {string | null | undefined}
   */
  readonly preferred_username?: string | null;

  /**
   * Property picture
   * @readonly
   *
   * @description
   * URL of the user profile picture (avatar).
   *
   * @since 1.0.0
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
   * @since 1.0.0
   *
   * @type {string | null | undefined}
   */
  readonly email?: string | null;

  /**
   * Property email_verified
   * @readonly
   *
   * @description
   * Whether the user's email address has been verified.
   *
   * @since 1.0.0
   *
   * @type {boolean | null | undefined}
   */
  readonly email_verified?: boolean | null;

  /**
   * Property updated_at
   * @readonly
   *
   * @description
   * Time when the user profile was last updated (Unix timestamp in seconds).
   *
   * @since 1.0.0
   *
   * @type {number | null | undefined}
   */
  readonly updated_at?: number | null;
}
