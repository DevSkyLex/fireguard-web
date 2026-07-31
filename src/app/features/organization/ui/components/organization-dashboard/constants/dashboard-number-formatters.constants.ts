/**
 * Constant WHOLE_NUMBER_FMT
 *
 * @description
 * Number formatter used by dashboard metrics that render integer values.
 * Formats numbers with no decimal places (e.g. `1,234`).
 *
 * @type {Intl.NumberFormat}
 */
export const WHOLE_NUMBER_FMT: Intl.NumberFormat = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
});

/**
 * Constant DECIMAL_FMT
 *
 * @description
 * Number formatter used by dashboard metrics that render one decimal place
 * (e.g. `95.6`).
 *
 * @type {Intl.NumberFormat}
 */
export const DECIMAL_FMT: Intl.NumberFormat = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
});
