/**
 * Constant ORGANIZATION_COMPLIANCE_SEVERITY_OPTIONS
 * @const ORGANIZATION_COMPLIANCE_SEVERITY_OPTIONS
 *
 * @description
 * The non-conformity severities `nonConformitySlaDays` is keyed by, in the
 * order the SLA rows render — low resolution urgency first, critical last.
 *
 * @since 1.0.0
 *
 * @type {ReadonlyArray<{ readonly label: string; readonly value: string }>}
 */
export const ORGANIZATION_COMPLIANCE_SEVERITY_OPTIONS: ReadonlyArray<{
  readonly label: string;
  readonly value: string;
}> = [
  { label: $localize`:@@org.settings.compliance.severityLow:Low`, value: 'low' },
  { label: $localize`:@@org.settings.compliance.severityMedium:Medium`, value: 'medium' },
  { label: $localize`:@@org.settings.compliance.severityHigh:High`, value: 'high' },
  { label: $localize`:@@org.settings.compliance.severityCritical:Critical`, value: 'critical' },
];
