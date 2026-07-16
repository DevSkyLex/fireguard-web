/**
 * Constant LAST_ORGANIZATION_COOKIE_NAME
 * @const LAST_ORGANIZATION_COOKIE_NAME
 *
 * @description
 * Name of the cookie persisting the identifier of the last organization the
 * user worked in. Written by the active-organization store on every successful
 * selection and read by `organizationGuard` to restore the workspace on the
 * next visit. A cookie (not Web Storage) keeps the preference readable during
 * SSR, matching the `theme-preference` / `lang` persistence idiom.
 *
 * @since 1.0.0
 *
 * @type {string}
 */
export const LAST_ORGANIZATION_COOKIE_NAME: string = 'last-organization';

/**
 * Constant LAST_ORGANIZATION_COOKIE_MAX_AGE
 * @const LAST_ORGANIZATION_COOKIE_MAX_AGE
 *
 * @description
 * Lifetime of the last-organization cookie in seconds (one year), aligned with
 * the other preference cookies.
 *
 * @since 1.0.0
 *
 * @type {number}
 */
export const LAST_ORGANIZATION_COOKIE_MAX_AGE: number = 365 * 24 * 60 * 60;
