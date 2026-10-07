/**
 * Function canonicalExactDecimal
 *
 * @description
 * Normalizes user-entered decimals textually to the six-digit transport format, without floats.
 *
 * @access public
 * @since unreleased
 *
 * @param {string} value - Ungrouped nonnegative decimal text with at most six fractional digits.
 *
 * @returns {string | null} Canonical exact decimal or null when the input is invalid.
 */
export function canonicalExactDecimal(value: string): string | null {
  const match: RegExpMatchArray | null = /^(\d+)(?:\.(\d{1,6}))?$/.exec(value.trim());
  if (!match) return null;
  return `${BigInt(match[1]).toString()}.${(match[2] ?? '').padEnd(6, '0')}`;
}

/**
 * Function exactDecimalUnits
 *
 * @description
 * Converts a validated decimal into integer millionths for local input bounds, never valuation.
 *
 * @access public
 * @since unreleased
 *
 * @param {string} value - Exact decimal text.
 *
 * @returns {bigint | null} Millionths or null for invalid input.
 */
export function exactDecimalUnits(value: string): bigint | null {
  const canonical: string | null = canonicalExactDecimal(value);
  return canonical ? BigInt(canonical.replace('.', '')) : null;
}

/**
 * Function exactDecimalDifference
 *
 * @description
 * Gives a local return-form bound from one retained receipt, without mutating server quantities.
 *
 * @access public
 * @since unreleased
 *
 * @param {string} value - Gross received decimal quantity.
 * @param {string} removed - Already returned decimal quantity.
 *
 * @returns {string} Remaining exact local bound; invalid server values disable the form with zero.
 */
export function exactDecimalDifference(value: string, removed: string): string {
  const first: bigint | null = exactDecimalUnits(value);
  const second: bigint | null = exactDecimalUnits(removed);
  if (first === null || second === null || second > first) return '0.000000';
  const difference: bigint = first - second;
  return `${difference / 1000000n}.${(difference % 1000000n).toString().padStart(6, '0')}`;
}
