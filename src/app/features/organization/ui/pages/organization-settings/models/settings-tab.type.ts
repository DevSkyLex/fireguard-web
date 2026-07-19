/**
 * Type OrganizationSettingsTab
 * @type OrganizationSettingsTab
 *
 * @description
 * Identifies an in-page section of the organization settings page, selected
 * through the `tab` query parameter.
 *
 * The danger zone and the legal profile are **not** here: they are sibling
 * routes with their own guards, and billing moved out to `/billing` entirely.
 *
 * @since 1.0.0
 */
export type OrganizationSettingsTab = 'general' | 'notifications' | 'regional';
