import type {
  OrganizationDateFormat,
  OrganizationFirstDayOfWeek,
  OrganizationMeasurementSystem,
} from '@features/organization/models';

/**
 * Constant ORGANIZATION_TIMEZONE_OPTIONS
 *
 * @description
 * Curated list of common IANA timezones offered in the regional settings form.
 * The API validates against the full IANA catalog, so this list can grow freely.
 *
 * @since 1.0.0
 */
export const ORGANIZATION_TIMEZONE_OPTIONS: ReadonlyArray<{ label: string; value: string }> = [
  { label: 'UTC', value: 'UTC' },
  { label: 'London', value: 'Europe/London' },
  { label: 'Paris', value: 'Europe/Paris' },
  { label: 'Berlin', value: 'Europe/Berlin' },
  { label: 'Madrid', value: 'Europe/Madrid' },
  { label: 'Rome', value: 'Europe/Rome' },
  { label: 'Amsterdam', value: 'Europe/Amsterdam' },
  { label: 'Lisbon', value: 'Europe/Lisbon' },
  { label: 'Athens', value: 'Europe/Athens' },
  { label: 'New York', value: 'America/New_York' },
  { label: 'Chicago', value: 'America/Chicago' },
  { label: 'Denver', value: 'America/Denver' },
  { label: 'Los Angeles', value: 'America/Los_Angeles' },
  { label: 'São Paulo', value: 'America/Sao_Paulo' },
  { label: 'Dubai', value: 'Asia/Dubai' },
  { label: 'Kolkata', value: 'Asia/Kolkata' },
  { label: 'Singapore', value: 'Asia/Singapore' },
  { label: 'Tokyo', value: 'Asia/Tokyo' },
  { label: 'Sydney', value: 'Australia/Sydney' },
  { label: 'Auckland', value: 'Pacific/Auckland' },
];

/**
 * Constant ORGANIZATION_LOCALE_OPTIONS
 *
 * @description
 * Supported display locales, mirroring the API catalog.
 *
 * @since 1.0.0
 */
export const ORGANIZATION_LOCALE_OPTIONS: ReadonlyArray<{
  label: string;
  value: string;
  flag: string;
}> = [
  { label: 'English (United States)', value: 'en-US', flag: 'flags/us.svg' },
  { label: 'English (United Kingdom)', value: 'en-GB', flag: 'flags/gb.svg' },
  { label: 'French (France)', value: 'fr-FR', flag: 'flags/fr.svg' },
  { label: 'German (Germany)', value: 'de-DE', flag: 'flags/de.svg' },
  { label: 'Spanish (Spain)', value: 'es-ES', flag: 'flags/es.svg' },
  { label: 'Italian (Italy)', value: 'it-IT', flag: 'flags/it.svg' },
  { label: 'Dutch (Netherlands)', value: 'nl-NL', flag: 'flags/nl.svg' },
  { label: 'Portuguese (Portugal)', value: 'pt-PT', flag: 'flags/pt.svg' },
];

/**
 * Constant ORGANIZATION_DATE_FORMAT_OPTIONS
 *
 * @description
 * Supported date format patterns, mirroring the API catalog.
 *
 * @since 1.0.0
 */
export const ORGANIZATION_DATE_FORMAT_OPTIONS: ReadonlyArray<{
  label: string;
  value: OrganizationDateFormat;
}> = [
  { label: '31/12/2026 (dd/MM/yyyy)', value: 'dd/MM/yyyy' },
  { label: '12/31/2026 (MM/dd/yyyy)', value: 'MM/dd/yyyy' },
  { label: '2026-12-31 (yyyy-MM-dd)', value: 'yyyy-MM-dd' },
  { label: '31.12.2026 (dd.MM.yyyy)', value: 'dd.MM.yyyy' },
  { label: '31-12-2026 (dd-MM-yyyy)', value: 'dd-MM-yyyy' },
];

/**
 * Constant ORGANIZATION_FIRST_DAY_OPTIONS
 *
 * @description
 * Supported first-day-of-week values.
 *
 * @since 1.0.0
 */
export const ORGANIZATION_FIRST_DAY_OPTIONS: ReadonlyArray<{
  label: string;
  value: OrganizationFirstDayOfWeek;
}> = [
  { label: $localize`:@@org.firstDay.monday:Monday`, value: 'monday' },
  { label: $localize`:@@org.firstDay.sunday:Sunday`, value: 'sunday' },
];

/**
 * Constant ORGANIZATION_MEASUREMENT_SYSTEM_OPTIONS
 *
 * @description
 * Supported measurement systems.
 *
 * @since 1.0.0
 */
export const ORGANIZATION_MEASUREMENT_SYSTEM_OPTIONS: ReadonlyArray<{
  label: string;
  value: OrganizationMeasurementSystem;
}> = [
  { label: $localize`:@@org.measurement.metric:Metric`, value: 'metric' },
  { label: $localize`:@@org.measurement.imperial:Imperial`, value: 'imperial' },
];
