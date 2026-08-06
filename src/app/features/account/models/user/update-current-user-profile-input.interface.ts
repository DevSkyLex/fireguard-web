import type { UserLocale } from './user-locale.type';

/**
 * Interface UpdateCurrentUserProfileInput
 *
 * @description
 * Partial payload accepted by the authenticated-user profile endpoint. Every
 * field is optional under JSON Merge Patch semantics: an omitted field is left
 * unchanged rather than cleared.
 */
export interface UpdateCurrentUserProfileInput {
  /**
   * Given name. `null` clears it; omitting the field leaves it unchanged. The
   * API accepts a null name but rejects a blank one, so an emptied field must
   * be sent as `null` rather than as `''`.
   */
  readonly firstName?: string | null;

  /** Family name, with the same null-versus-omitted semantics as `firstName`. */
  readonly lastName?: string | null;

  /** Interface language preference. */
  readonly locale?: UserLocale;
}
