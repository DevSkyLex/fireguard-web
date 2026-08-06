import type { UserLocale } from '@features/account/models';

/**
 * Constant USER_LOCALE_OPTIONS
 * @const USER_LOCALE_OPTIONS
 *
 * @description
 * Choices for the interface-language picker on the account profile form.
 *
 * Each language names itself rather than being translated — someone who has
 * landed on the wrong locale needs to recognise their own, and "Spanish" in
 * Spanish is the only label that works for a reader who cannot read the current
 * one. `system` is the exception: it describes a behavior, not a language, so
 * it is localized.
 *
 * @since 1.0.0
 *
 * @type {ReadonlyArray<{ readonly label: string; readonly value: UserLocale }>}
 */
export const USER_LOCALE_OPTIONS: ReadonlyArray<{
  readonly label: string;
  readonly value: UserLocale;
}> = [
  { label: $localize`:@@account.locale.system:Use my browser language`, value: 'system' },
  { label: 'English', value: 'en' },
  { label: 'Français', value: 'fr' },
  { label: 'Español', value: 'es' },
];
