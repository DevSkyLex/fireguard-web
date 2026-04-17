/**
 * Constant WHOLE_NUMBER_FMT
 *
 * @description
 * Number formatter used by dashboard metrics that render integer values.
 */
export const WHOLE_NUMBER_FMT = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

/**
 * Constant DECIMAL_FMT
 *
 * @description
 * Number formatter used by dashboard metrics that render one decimal place.
 */
export const DECIMAL_FMT = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
