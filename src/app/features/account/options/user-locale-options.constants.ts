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
 * @type {readonly [{ readonly label: string; readonly value: UserLocale; readonly icon: string }, ...Array<{ readonly label: string; readonly value: UserLocale; readonly icon: string }>]}
 */
export const USER_LOCALE_OPTIONS: readonly [
  {
    readonly label: string;
    readonly value: UserLocale;
    readonly icon: string;
  },
  ...Array<{
    readonly label: string;
    readonly value: UserLocale;
    readonly icon: string;
  }>,
] = [
  {
    label: $localize`:@@account.locale.system:Use my browser language`,
    value: 'system',
    icon: 'flagUn',
  },
  { label: 'English', value: 'en', icon: 'flagUs' },
  { label: 'Français', value: 'fr', icon: 'flagFr' },
  { label: 'Español', value: 'es', icon: 'flagEs' },
];
