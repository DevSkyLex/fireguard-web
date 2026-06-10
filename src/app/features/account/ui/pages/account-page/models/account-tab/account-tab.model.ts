/**
 * Type AccountTab
 *
 * @description
 * Identifier of a selectable account page section.
 *
 * @since 1.0.0
 */
export type AccountTab = 'profile' | 'security' | 'notifications';

/**
 * Constant ACCOUNT_TABS
 * @const ACCOUNT_TABS
 *
 * @description
 * Set of tab identifiers accepted from the `tab` query parameter.
 *
 * @since 1.0.0
 *
 * @type {ReadonlySet<string>}
 */
export const ACCOUNT_TABS: ReadonlySet<string> = new Set<AccountTab>([
  'profile',
  'security',
  'notifications',
]);
