import type { OrganizationDateFormat } from './organization-date-format.type';
import type { OrganizationFirstDayOfWeek } from './organization-first-day-of-week.type';
import type { OrganizationMeasurementSystem } from './organization-measurement-system.type';

/**
 * Interface OrganizationRegionalSettings
 * @interface OrganizationRegionalSettings
 *
 * @description
 * Organization-wide regional and formatting preferences (timezone, locale, date
 * format, first day of week, measurement system).
 */
export interface OrganizationRegionalSettings {
  //#region Properties
  /** @type {string} */
  readonly timezone: string;
  /** @type {string} */
  readonly locale: string;
  /** @type {OrganizationDateFormat} */
  readonly dateFormat: OrganizationDateFormat;
  /** @type {OrganizationFirstDayOfWeek} */
  readonly firstDayOfWeek: OrganizationFirstDayOfWeek;
  /** @type {OrganizationMeasurementSystem} */
  readonly measurementSystem: OrganizationMeasurementSystem;
  //#endregion
}
