import type { FacilityBuildingModelFloor } from '@features/organization/features/facilities/models';
import { isMetricFacilityFloor } from '../facility-metric-floor.utils';

const floor: FacilityBuildingModelFloor = {
  hierarchyIssues: [],
  facilityId: 'floor-1',
  name: 'Basement',
  levelIndex: -1,
  elevationMeters: -3,
  heightMeters: 3,
  status: 'active',
  outline: null,
  rooms: [],
  equipment: [],
  diagnostics: { invalidGeometryCount: 0, unpositionedEquipmentCount: 0, geometryIssues: [] },
  plan: {
    attachmentId: 'plan-1',
    imageWidth: 1000,
    imageHeight: 500,
    calibration: { widthMeters: 20, rotationDegrees: 90, offsetXMeters: 5, offsetZMeters: 2 },
    calibrationBuildingId: 'building-1',
    calibrationIssue: null,
  },
};

describe('isMetricFacilityFloor', () => {
  it('accepts complete non-square calibrated plans and negative elevations', () => {
    expect(isMetricFacilityFloor(floor)).toBe(true);
  });

  it('keeps a complete calibrated legacy branch metric despite its structural warning', () => {
    expect(
      isMetricFacilityFloor({
        ...floor,
        hierarchyIssues: ['invalid_parent_type', 'invalid_ancestor'],
      }),
    ).toBe(true);
  });

  it.each(['building_changed', 'unverified_frame'] as const)(
    'rejects a retained unusable %s frame without altering its calibration',
    (calibrationIssue) => {
      const retained = {
        ...floor,
        plan: { ...floor.plan, calibrationIssue },
      } as FacilityBuildingModelFloor;
      expect(isMetricFacilityFloor(retained)).toBe(false);
      expect(retained.plan?.calibration).toEqual(floor.plan?.calibration);
    },
  );

  it('rejects missing or non-finite physical data rather than deriving elevation from levelIndex', () => {
    expect(isMetricFacilityFloor({ ...floor, elevationMeters: null })).toBe(false);
    expect(isMetricFacilityFloor({ ...floor, heightMeters: Infinity })).toBe(false);
    expect(isMetricFacilityFloor({ ...floor, plan: null })).toBe(false);
    expect(isMetricFacilityFloor(null)).toBe(false);
  });
});
