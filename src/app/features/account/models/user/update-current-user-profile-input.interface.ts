import type { UserLocale } from './user-locale.type';

/**
 * Interface UpdateCurrentUserProfileInput
 *
 * @description
 * Partial payload accepted by the authenticated-user profile endpoint.
 */
export interface UpdateCurrentUserProfileInput {
  readonly firstName?: string;
  readonly lastName?: string;

  /**
   * Display language, persisted on the account so the choice follows the user
   * across devices instead of living only in this browser's cookie.
   * `'system'` means "follow the browser".
   *
   * @since 1.1.0
   */
  readonly locale?: UserLocale;
}
