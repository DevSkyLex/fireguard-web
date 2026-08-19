import type { OrganizationComplianceSettings } from '@features/organization/models';

/**
 * Type OrganizationComplianceFormValues
 *
 * @description
 * The shape the compliance form edits: the two effective-value maps and the
 * reminder window. Excludes {@link OrganizationComplianceSettings}'s
 * `customizedSlaSeverities` and `customizedPeriodicityTypes` — read-only
 * hints the form renders but never edits.
 *
 * @since 1.0.0
 */
export type OrganizationComplianceFormValues = Pick<
  OrganizationComplianceSettings,
  'nonConformitySlaDays' | 'inspectionPeriodicityDefaults' | 'reminderWindowDays'
>;
