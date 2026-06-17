import type { AccountTab } from '../models';

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
