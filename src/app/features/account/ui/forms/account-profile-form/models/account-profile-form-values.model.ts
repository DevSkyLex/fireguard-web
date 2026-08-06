import type { UserLocale } from '@features/account/models';

/**
 * Interface AccountProfileFormValues
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
  firstName: string;
  lastName: string;
  locale: UserLocale;
}
