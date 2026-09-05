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
 * @type {ReadonlyArray<{ readonly description: string; readonly icon: string; readonly iconClass: string; readonly label: string; readonly value: string }>}
 */
export const ORGANIZATION_COMPLIANCE_SEVERITY_OPTIONS: ReadonlyArray<{
  readonly description: string;
  readonly icon: string;
  readonly iconClass: string;
  readonly label: string;
  readonly value: string;
}> = [
  {
    description: $localize`:@@org.settings.compliance.severityLowDescription:Routine issues with limited operational impact.`,
    icon: 'lucideCircleDotDashed',
    iconClass: 'size-4 text-muted-foreground',
    label: $localize`:@@org.settings.compliance.severityLow:Low`,
    value: 'low',
  },
  {
    description: $localize`:@@org.settings.compliance.severityMediumDescription:Issues that should be resolved before they escalate.`,
    icon: 'lucideCircleAlert',
    iconClass: 'size-4 text-warning',
    label: $localize`:@@org.settings.compliance.severityMedium:Medium`,
    value: 'medium',
  },
  {
    description: $localize`:@@org.settings.compliance.severityHighDescription:Serious risks that require a rapid response.`,
    icon: 'lucideTriangleAlert',
    iconClass: 'size-4 text-destructive',
    label: $localize`:@@org.settings.compliance.severityHigh:High`,
    value: 'high',
  },
  {
    description: $localize`:@@org.settings.compliance.severityCriticalDescription:Immediate threats to safety or compliance.`,
    icon: 'lucideOctagonAlert',
    iconClass: 'size-4 text-destructive',
    label: $localize`:@@org.settings.compliance.severityCritical:Critical`,
    value: 'critical',
  },
];
