import type { GranularityOption } from '../models';

/**
 * Constant GRANULARITY_OPTIONS
 *
 * @description
 * Localized dashboard intervals exposed to the granularity selector.
 *
 * @access public
 * @since 0.1.0
 *
 * @type {readonly GranularityOption[]}
 */
export const GRANULARITY_OPTIONS: readonly GranularityOption[] = [
  { label: $localize`:@@dash.granularity.daily:Daily`, value: 'day' },
  { label: $localize`:@@dash.granularity.weekly:Weekly`, value: 'week' },
  { label: $localize`:@@dash.granularity.monthly:Monthly`, value: 'month' },
];

/**
 * Function toIsoString
 *
 * @description
 * Converts a present date to its ISO representation while preserving an absent value.
 *
 * @access public
 * @since 0.1.0
 *
 * @type {(value: Date | undefined) => string | undefined}
 *
 * @param {Date | undefined} value - Date to serialize; omitted dates remain undefined.
 *
 * @returns {string | undefined}
 */
export const toIsoString = (value: Date | undefined): string | undefined => value?.toISOString();

/**
 * Function getDashboardInitialDateRange
 *
 * @description
 * Creates the initial dashboard interval from the start of the previous month through today.
 *
 * @access public
 * @since 0.1.0
 *
 * @type {() => [Date, Date]}
 *
 * @returns {[Date, Date]}
 */
export const getDashboardInitialDateRange = (): [Date, Date] => [
  new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
  new Date(),
];
