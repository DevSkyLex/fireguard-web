import type { AppLocaleOption, AppLocaleSubPath } from '../models/app-locale.type';

/**
 * Constant LANG_COOKIE_NAME
 *
 * @description
 * Name of the cookie that persists the user's explicit display-language
 * choice. The SSR server reads it to serve the matching locale bundle; when it
 * is absent the server falls back to the browser `Accept-Language` header.
 *
 * @type {string}
 */
export const LANG_COOKIE_NAME: string = 'lang';

/**
 * Constant DEFAULT_LOCALE_SUBPATH
 *
 * @description
 * Source locale used as the last-resort fallback when neither an explicit
 * cookie choice nor a supported `Accept-Language` match is available.
 *
 * @type {AppLocaleSubPath}
 */
export const DEFAULT_LOCALE_SUBPATH: AppLocaleSubPath = 'en';

/**
 * Constant SUPPORTED_LOCALES
 *
 * @description
 * Display languages offered by the application, in picker order. Kept in sync
 * with the `i18n.locales` entries in `angular.json` and the per-locale build /
 * serve configurations.
 *
 * @type {ReadonlyArray<AppLocaleOption>}
 */
export const SUPPORTED_LOCALES: ReadonlyArray<AppLocaleOption> = [
  { subPath: 'en', label: 'English', flag: 'flags/us.svg' },
  { subPath: 'fr', label: 'Français', flag: 'flags/fr.svg' },
  { subPath: 'es', label: 'Español', flag: 'flags/es.svg' },
];

/**
 * Constant SUPPORTED_LOCALE_SUBPATHS
 *
 * @description
 * Flat list of supported locale sub-paths derived from {@link SUPPORTED_LOCALES},
 * used for fast membership checks in pure resolution helpers.
 *
 * @type {ReadonlyArray<AppLocaleSubPath>}
 */
export const SUPPORTED_LOCALE_SUBPATHS: ReadonlyArray<AppLocaleSubPath> = SUPPORTED_LOCALES.map(
  (locale) => locale.subPath,
);
