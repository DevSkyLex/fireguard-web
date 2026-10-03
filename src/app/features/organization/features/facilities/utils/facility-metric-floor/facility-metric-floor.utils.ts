import type { FacilityBuildingModelFloor } from '@features/organization/features/facilities/models';

/**
 * Function isMetricFacilityFloor
 *
 * @description
 * Requires complete physical dimensions and a usable calibration in the current building.
 *
 * @param {FacilityBuildingModelFloor | null | undefined} floor - Floor projection to check.
 *
 * @returns {boolean} Whether the floor may be placed in the metric building frame.
 */
export function isMetricFacilityFloor(
  floor: FacilityBuildingModelFloor | null | undefined,
): boolean {
  const plan = floor?.plan;
  return (
    plan?.calibration != null &&
    plan.calibrationIssue == null &&
    (plan.imageWidth ?? 0) > 0 &&
    (plan.imageHeight ?? 0) > 0 &&
    Number.isFinite(floor?.elevationMeters) &&
    floor?.elevationMeters != null &&
    Number.isFinite(floor.heightMeters) &&
    (floor.heightMeters ?? 0) > 0
  );
}
