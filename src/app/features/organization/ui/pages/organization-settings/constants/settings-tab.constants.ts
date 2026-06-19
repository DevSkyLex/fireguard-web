import type { OrganizationSettingsTab } from '../models';

/**
 * Constant DEFAULT_ORGANIZATION_SETTINGS_TAB
 *
 * @description
 * Section shown when no (or an unknown) `tab` query parameter is present.
 *
 * @since 1.0.0
 */
export const DEFAULT_ORGANIZATION_SETTINGS_TAB: OrganizationSettingsTab = 'general';

/**
 * Constant ORGANIZATION_SETTINGS_TABS
 *
 * @description
 * Set of valid settings section identifiers, used to validate the `tab` query
 * parameter before activating a section.
 *
 * @since 1.0.0
 */
export const ORGANIZATION_SETTINGS_TABS: ReadonlySet<string> = new Set<OrganizationSettingsTab>([
  'general',
  'notifications',
  'regional',
  'danger',
]);
