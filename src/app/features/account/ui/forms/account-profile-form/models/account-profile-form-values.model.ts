import type { UserLocale } from '@features/account/models';

/**
 * Interface AccountProfileFormValues
 * @interface AccountProfileFormValues
 *
 * @description
 * The shape the profile form edits. Distinct from
 * `UpdateCurrentUserProfileInput`: the form always carries a string for each
 * name, while the transport DTO omits the ones left empty — the backend rejects
 * a blank name but accepts an absent one, so the page maps one to the other
 * (`ARCHITECTURE.md` §10.4).
 *
 * @since 1.0.0
 */
export interface AccountProfileFormValues {
  /**
   * Property firstName
   *
   * @description
   * Editable given name; the page omits it from the request when blank.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  firstName: string;

  /**
   * Property lastName
   *
   * @description
   * Editable family name; the page omits it from the request when blank.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  lastName: string;

  /**
   * Property locale
   *
   * @description
   * Selected interface language sent with profile updates.
   *
   * @access public
   * @since unreleased
   *
   * @type {UserLocale}
   */
  locale: UserLocale;
}
