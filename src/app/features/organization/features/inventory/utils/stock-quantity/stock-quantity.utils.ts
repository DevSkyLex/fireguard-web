/**
 * Function normalizeInventoryQuantity
 *
 * @description
 * Validates and pads exact quantities through string operations; no floating-point arithmetic is
 * used.
 *
 * @access public
 * @since unreleased
 *
 * @param {string} value - Decimal text entered by the operator.
 * @param {boolean} signed - Whether a motivated correction may decrease stock.
 *
 * @returns {string | null} Canonical six-place nonzero decimal, or null when invalid.
 *
 * @function normalizeInventoryQuantity
 */
export function normalizeInventoryQuantity(value: string, signed = false): string | null {
  const raw = value.trim();
  const pattern = signed
    ? /^-?(?:0|[1-9][0-9]{0,17})(?:\.[0-9]{1,6})?$/
    : /^(?:0|[1-9][0-9]{0,17})(?:\.[0-9]{1,6})?$/;
  if (!pattern.test(raw) || /^-?0(?:\.0+)?$/.test(raw)) return null;
  const [whole, fraction = ''] = raw.split('.');
  return `${whole}.${fraction.padEnd(6, '0')}`;
}
