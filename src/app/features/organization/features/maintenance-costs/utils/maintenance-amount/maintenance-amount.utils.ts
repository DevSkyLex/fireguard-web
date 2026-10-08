/**
 * Function formatMaintenanceAmount
 *
 * @description
 * Formats an exact server amount with integer grouping and its significant fraction, without
 * floating-point conversion.
 *
 * @param {string | null | undefined} amount - Contract input value.
 * @param {string} currency - Contract input value.
 * @param {string} locale - Contract input value.
 *
 * @returns {string} Validated financial contract result.
 */
export function formatMaintenanceAmount(
  amount: string | null | undefined,
  currency: string,
  locale: string,
): string {
  if (amount === null || amount === undefined)
    return $localize`:@@maintenanceCost.amount.unknown:Unknown`;
  if (!/^-?(?:0|[1-9]\d*)(?:\.\d{1,6})?$/.test(amount))
    return $localize`:@@maintenanceCost.amount.unknown:Unknown`;
  const negative = amount.startsWith('-');
  const [whole = '0', fraction = ''] = amount.replace(/^-/, '').split('.');
  const integer = new Intl.NumberFormat(locale).format(BigInt(whole));
  const parts = new Intl.NumberFormat(locale, { minimumFractionDigits: 1 }).formatToParts(1n);
  const separator = parts.find((part) => part.type === 'decimal')?.value ?? '.';
  const significant = fraction.padEnd(6, '0');
  return `${negative ? '−' : ''}${integer}${separator}${significant} ${currency}`;
}

/**
 * Function isMaintenanceAmount
 *
 * @description
 * Validates bounded exact decimal input; monetary values never enter number arithmetic.
 *
 * @param {string} value - Exact field text to validate.
 * @param {unknown} signed - Contract input value.
 *
 * @returns {boolean} Validated financial contract result.
 */
export function isMaintenanceAmount(value: string, signed = false): boolean {
  return (
    signed ? /^-?(?:0|[1-9]\d{0,17})(?:\.\d{1,6})?$/ : /^(?:0|[1-9]\d{0,17})(?:\.\d{1,6})?$/
  ).test(value.trim());
}
