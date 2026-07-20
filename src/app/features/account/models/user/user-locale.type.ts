/**
 * Display language stored on the account.
 *
 * Mirrors the backend's `Locale::VALUES` exactly. `'system'` is not a language:
 * it means the interface follows the browser, and it is the default.
 *
 * @since 1.0.0
 */
export type UserLocale = 'system' | 'en' | 'fr' | 'es';
