import type {
  OrganizationDateFormat,
  OrganizationFirstDayOfWeek,
  OrganizationMeasurementSystem,
} from '@features/organization/models';

/**
 * Constant ORGANIZATION_DATE_FORMAT_OPTIONS
 * @const ORGANIZATION_DATE_FORMAT_OPTIONS
 *
 * @description
 * Choices for the regional form's date format picker, each shown against
 * today's example so the pattern reads without decoding.
 *
 * @since 1.0.0
 *
 * @type {ReadonlyArray<{ readonly label: string; readonly value: OrganizationDateFormat }>}
 */
export const ORGANIZATION_DATE_FORMAT_OPTIONS: ReadonlyArray<{
  readonly label: string;
  readonly value: OrganizationDateFormat;
}> = [
  {
    label: $localize`:@@org.settings.regional.dateFormatSlashEuropean:dd/MM/yyyy (31/12/2026)`,
    value: 'dd/MM/yyyy',
  },
  {
    label: $localize`:@@org.settings.regional.dateFormatSlashUs:MM/dd/yyyy (12/31/2026)`,
    value: 'MM/dd/yyyy',
  },
  {
    label: $localize`:@@org.settings.regional.dateFormatIso:yyyy-MM-dd (2026-12-31)`,
    value: 'yyyy-MM-dd',
  },
  {
    label: $localize`:@@org.settings.regional.dateFormatDotEuropean:dd.MM.yyyy (31.12.2026)`,
    value: 'dd.MM.yyyy',
  },
  {
    label: $localize`:@@org.settings.regional.dateFormatDashEuropean:dd-MM-yyyy (31-12-2026)`,
    value: 'dd-MM-yyyy',
  },
];

/**
 * Constant ORGANIZATION_FIRST_DAY_OF_WEEK_OPTIONS
 * @const ORGANIZATION_FIRST_DAY_OF_WEEK_OPTIONS
 *
 * @description
 * Choices for the regional form's first-day-of-week picker.
 *
 * @since 1.0.0
 *
 * @type {ReadonlyArray<{ readonly label: string; readonly value: OrganizationFirstDayOfWeek }>}
 */
export const ORGANIZATION_FIRST_DAY_OF_WEEK_OPTIONS: ReadonlyArray<{
  readonly label: string;
  readonly value: OrganizationFirstDayOfWeek;
}> = [
  { label: $localize`:@@org.settings.regional.firstDayMonday:Monday`, value: 'monday' },
  { label: $localize`:@@org.settings.regional.firstDaySunday:Sunday`, value: 'sunday' },
];

/**
 * Constant ORGANIZATION_MEASUREMENT_SYSTEM_OPTIONS
 * @const ORGANIZATION_MEASUREMENT_SYSTEM_OPTIONS
 *
 * @description
 * Choices for the regional form's measurement system picker.
 *
 * @since 1.0.0
 *
 * @type {ReadonlyArray<{ readonly label: string; readonly value: OrganizationMeasurementSystem }>}
 */
export const ORGANIZATION_MEASUREMENT_SYSTEM_OPTIONS: ReadonlyArray<{
  readonly label: string;
  readonly value: OrganizationMeasurementSystem;
}> = [
  { label: $localize`:@@org.settings.regional.metric:Metric`, value: 'metric' },
  { label: $localize`:@@org.settings.regional.imperial:Imperial`, value: 'imperial' },
];
