/**
 * Constant ORGANIZATION_APPROVAL_SEVERITY_OPTIONS
 * @const ORGANIZATION_APPROVAL_SEVERITY_OPTIONS
 *
 * @description
 * The `nc_waiver` minimum-severity picker's choices — the same four
 * non-conformity severities `OrganizationComplianceSettings::ALLOWED_SEVERITIES`
 * bounds, the only legal values `OrganizationApprovalSettings::validateActionRules`
 * accepts for `minSeverity`. Kept as this form's own local copy rather than
 * importing `organization-compliance-form`'s — a sibling, private-to-its-form
 * options file with no barrel — since one more consumer does not yet justify
 * lifting it (`ARCHITECTURE.md` §2.9).
 *
 * @since 1.0.0
 *
 * @type {ReadonlyArray<{ readonly label: string; readonly value: string }>}
 */
export const ORGANIZATION_APPROVAL_SEVERITY_OPTIONS: ReadonlyArray<{
  readonly label: string;
  readonly value: string;
}> = [
  { label: $localize`:@@org.settings.approval.severityLow:Low`, value: 'low' },
  { label: $localize`:@@org.settings.approval.severityMedium:Medium`, value: 'medium' },
  { label: $localize`:@@org.settings.approval.severityHigh:High`, value: 'high' },
  { label: $localize`:@@org.settings.approval.severityCritical:Critical`, value: 'critical' },
];
