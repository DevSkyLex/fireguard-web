import type { RegionalFormatSettings } from '../models/regional-format-settings.interface';

/**
 * Constant DEFAULT_REGIONAL_FORMAT_SETTINGS
 *
 * @description
 * Fallback formatting context used whenever no regional preference is
 * available yet — {@link OrgDatePipe}'s own parameter default, and reused by
 * feature-side ports so an organization with no `settings.regional` (or none
 * selected at all) renders the same way everywhere.
 *
 * Mirrors the API's own defaults (`OrganizationRegionalSettings::DEFAULT_*`,
 * `yyyy-MM-dd` / UTC) so the fallback never visibly flips once the
 * organization's settings arrive.
 *
 * @since 1.0.0
 */
export const DEFAULT_REGIONAL_FORMAT_SETTINGS: RegionalFormatSettings = {
  dateFormat: 'yyyy-MM-dd',
  timezone: 'UTC',
};
