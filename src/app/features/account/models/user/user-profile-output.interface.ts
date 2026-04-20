import type { HydraItem } from '@core/models/api';

/**
 * Interface UserProfileOutput
 * @interface UserProfileOutput
 *
 * @description
 * Current authenticated user profile returned by the account-owned
 * `/api/me` transport.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface UserProfileOutput extends HydraItem {
  /** Stable identifier of the authenticated user. */
  readonly id: string | null;

  /** Username resolved for the authenticated user. */
  readonly username: string | null;

  /** Email address of the authenticated user. */
  readonly email: string | null;

  /** Given name of the authenticated user. */
  readonly firstName: string | null;

  /** Family name of the authenticated user. */
  readonly lastName: string | null;

  /** Avatar URL of the authenticated user. */
  readonly avatarUrl: string | null;

  /** Account status returned by the backend. */
  readonly status: string | null;

  /** Whether the email address has been verified. */
  readonly emailVerified: boolean;

  /** Tenant identifier when the user belongs to one. */
  readonly tenantId: string | null;

  /** Account creation timestamp. */
  readonly createdAt: string | null;

  /** Last successful login timestamp. */
  readonly lastLoginAt: string | null;

  /** Resolved global role names for the authenticated user. */
  readonly roles: ReadonlyArray<string>;

  /** Resolved global permission names for the authenticated user. */
  readonly permissions: ReadonlyArray<string>;

  /** Legacy compatibility alias kept during the `/api/me` migration. */
  readonly sub?: string | null;

  /** Legacy compatibility alias kept during the `/api/me` migration. */
  readonly name?: string | null;

  /** Legacy compatibility alias kept during the `/api/me` migration. */
  readonly given_name?: string | null;

  /** Legacy compatibility alias kept during the `/api/me` migration. */
  readonly family_name?: string | null;

  /** Legacy compatibility alias kept during the `/api/me` migration. */
  readonly preferred_username?: string | null;

  /** Legacy compatibility alias kept during the `/api/me` migration. */
  readonly picture?: string | null;

  /** Legacy compatibility alias kept during the `/api/me` migration. */
  readonly email_verified?: boolean | null;

  /** Legacy compatibility alias kept during the `/api/me` migration. */
  readonly updated_at?: number | null;
}
