import type { ProcurementLineKind } from '@features/organization/features/procurement/models';
import { exactDecimalUnits } from '@features/organization/features/procurement/utils';
/**
 * Function isProcurementQuantity
 *
 * @description
 * Validates local decimal input and individual-unit constraints against an explicit server bound.
 * The API remains authoritative for concurrent deliveries and stock.
 *
 * @access public
 * @since unreleased
 *
 * @param {string} value - User-entered quantity.
 * @param {ProcurementLineKind} kind - Stock article or individual equipment.
 * @param {string} limit - Exact upper bound from the server or order input contract.
 *
 * @returns {boolean} Whether the input can be submitted without decimal loss.
 */
export function isProcurementQuantity(
  value: string,
  kind: ProcurementLineKind,
  limit: string = '100000.000000',
): boolean {
  const units: bigint | null = exactDecimalUnits(value);
  const maximum: bigint | null = exactDecimalUnits(limit);
  return (
    units !== null &&
    maximum !== null &&
    units > 0n &&
    units <= maximum &&
    (kind === 'part' || units % 1000000n === 0n)
  );
}
