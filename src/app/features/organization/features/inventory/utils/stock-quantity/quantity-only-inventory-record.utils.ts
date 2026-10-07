import type { HydraItem } from '@core/api/models';

/**
 * Function quantityOnlyInventoryRecord
 *
 * @description
 * Ordinary stock state strips dedicated financial valuations even for an authorized reader.
 *
 * @param {T} entry - Canonical transport resource.
 *
 * @returns {T} Copied record containing no valuation.
 */
export function quantityOnlyInventoryRecord<T extends HydraItem>(entry: T): T {
  const copy = { ...entry };
  Reflect.deleteProperty(copy, 'valuation');
  return copy;
}
