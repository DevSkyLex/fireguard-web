import type { RegionalDateFormat } from './regional-date-format.type';

/**
 * Interface RegionalFormatSettings
 * @interface RegionalFormatSettings
 *
 * @description
 * Neutral formatting context consumed by {@link OrgDatePipe}: the date
 * pattern and the IANA timezone a value is rendered in. Owned by `shared` so
 * a feature can supply it without the pipe ever importing feature state.
 *
 * @since 1.0.0
 */
export interface RegionalFormatSettings {
  //#region Properties
  /** @type {RegionalDateFormat} */
  readonly dateFormat: RegionalDateFormat;
  /** @type {string} */
  readonly timezone: string;
  //#endregion
}
