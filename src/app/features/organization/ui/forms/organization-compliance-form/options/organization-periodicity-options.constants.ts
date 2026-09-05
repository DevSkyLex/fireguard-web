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
 * @type {ReadonlyArray<{ readonly icon: string; readonly label: string; readonly value: string }>}
 */
export const ORGANIZATION_PERIODICITY_OPTIONS: ReadonlyArray<{
  readonly icon: string;
  readonly label: string;
  readonly value: string;
}> = [
  {
    icon: 'lucideCalendarDays',
    label: $localize`:@@org.settings.compliance.periodicityP1M:Every month`,
    value: 'P1M',
  },
  {
    icon: 'lucideCalendarDays',
    label: $localize`:@@org.settings.compliance.periodicityP3M:Every 3 months`,
    value: 'P3M',
  },
  {
    icon: 'lucideCalendarDays',
    label: $localize`:@@org.settings.compliance.periodicityP6M:Every 6 months`,
    value: 'P6M',
  },
  {
    icon: 'lucideCalendarRange',
    label: $localize`:@@org.settings.compliance.periodicityP1Y:Every year`,
    value: 'P1Y',
  },
  {
    icon: 'lucideCalendarRange',
    label: $localize`:@@org.settings.compliance.periodicityP2Y:Every 2 years`,
    value: 'P2Y',
  },
];
