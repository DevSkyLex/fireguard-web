/**
 * Constant ORGANIZATION_PERIODICITY_OPTIONS
 * @const ORGANIZATION_PERIODICITY_OPTIONS
 *
 * @description
 * The standard inspection periodicity choices offered per equipment type, as
 * ISO-8601 durations — the exact wire format `inspectionPeriodicityDefaults`
 * carries.
 *
 * @since 1.0.0
 *
 * @type {ReadonlyArray<{ readonly label: string; readonly value: string }>}
 */
export const ORGANIZATION_PERIODICITY_OPTIONS: ReadonlyArray<{
  readonly label: string;
  readonly value: string;
}> = [
  { label: $localize`:@@org.settings.compliance.periodicityP1M:Every month`, value: 'P1M' },
  { label: $localize`:@@org.settings.compliance.periodicityP3M:Every 3 months`, value: 'P3M' },
  { label: $localize`:@@org.settings.compliance.periodicityP6M:Every 6 months`, value: 'P6M' },
  { label: $localize`:@@org.settings.compliance.periodicityP1Y:Every year`, value: 'P1Y' },
  { label: $localize`:@@org.settings.compliance.periodicityP2Y:Every 2 years`, value: 'P2Y' },
];
