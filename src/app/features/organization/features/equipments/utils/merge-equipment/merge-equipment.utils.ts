import type { EquipmentOutput } from '@features/organization/features/equipments/models';

/**
 * Function mergeEquipment
 *
 * @description
 * Merges a write-response payload into the already-known equipment instead of
 * replacing it: API Platform omits null fields and a lifecycle Result may
 * serialize fewer fields than the detail read, so only the keys the response
 * actually defines overwrite the known values. When the response moves the
 * equipment to a different facility without naming it, `facilityName` is
 * cleared rather than inherited from the previous facility — an unresolved
 * name is not the old name. Returns the incoming payload untouched when there
 * is nothing to merge into (no known equipment, or a different record).
 *
 * @access public
 * @since 1.0.0
 *
 * @param {EquipmentOutput | null} existing - The equipment as currently known, or `null`.
 * @param {EquipmentOutput} incoming - The payload a write operation answered with.
 *
 * @returns {EquipmentOutput} The known equipment overlaid with the response's defined keys.
 */
export function mergeEquipment(
  existing: EquipmentOutput | null,
  incoming: EquipmentOutput,
): EquipmentOutput {
  if (existing === null || existing.id !== incoming.id) return incoming;

  const defined: Partial<EquipmentOutput> = Object.fromEntries(
    Object.entries(incoming).filter(([, value]) => value !== undefined),
  ) as Partial<EquipmentOutput>;

  const merged: EquipmentOutput = { ...existing, ...defined };

  return merged.facilityId !== existing.facilityId && incoming.facilityName === undefined
    ? { ...merged, facilityName: null }
    : merged;
}
