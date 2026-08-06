/**
 * Type UserLocale
 * @type UserLocale
 *
 * @description
 * Interface language the authenticated user has chosen. `'system'` is a real
 * stored value rather than the absence of one: it means "follow the browser",
 * and it is what the backend defaults to.
 *
 * The literals mirror `Locale::VALUES` on the backend byte for byte — a
 * mismatch here is invisible to TypeScript and surfaces as a rejected `PATCH`.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export type UserLocale = 'system' | 'en' | 'fr' | 'es';
