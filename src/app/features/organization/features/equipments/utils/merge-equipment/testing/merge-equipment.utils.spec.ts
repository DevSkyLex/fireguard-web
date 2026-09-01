import { describe, expect, it } from 'vitest';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import { mergeEquipment } from '@features/organization/features/equipments/utils';

/** A fully-populated known equipment, as the detail read delivers it. */
const KNOWN: EquipmentOutput = {
  '@id': '/api/organizations/org-1/equipment/eq-1',
  '@type': 'Equipment',
  id: 'eq-1',
  organizationId: 'org-1',
  facilityId: 'fac-1',
  type: 'fire_extinguisher',
  subType: 'CO2',
  brand: 'Kidde',
  model: 'Pro 210',
  serialNumber: 'SN-42',
  locationLabel: 'Hall east wall',
  facilityName: 'Main building',
  status: 'operational',
  installedAt: '2025-01-01T00:00:00+00:00',
  commissionedAt: '2025-02-01T00:00:00+00:00',
  tags: [],
  maintenanceDueStatus: 'unscheduled',
  createdAt: '2025-01-01T00:00:00+00:00',
  updatedAt: '2025-02-01T00:00:00+00:00',
};

describe('mergeEquipment', () => {
  it('returns the incoming payload when nothing is known yet', () => {
    expect(mergeEquipment(null, KNOWN)).toBe(KNOWN);
  });

  it('returns the incoming payload when it describes a different record', () => {
    const other: EquipmentOutput = { ...KNOWN, id: 'eq-2' };

    expect(mergeEquipment(KNOWN, other)).toBe(other);
  });

  it('keeps known values for keys the response omits', () => {
    const { facilityName: _omitted, ...rest } = KNOWN;
    const partial: EquipmentOutput = { ...rest, status: 'under_maintenance' } as EquipmentOutput;

    const merged: EquipmentOutput = mergeEquipment(KNOWN, partial);

    expect(merged.status).toBe('under_maintenance');
    expect(merged.facilityName).toBe('Main building');
    expect(merged.locationLabel).toBe('Hall east wall');
  });

  it('overwrites known values with the keys the response defines', () => {
    const merged: EquipmentOutput = mergeEquipment(KNOWN, {
      ...KNOWN,
      facilityName: 'Renamed building',
      updatedAt: '2025-03-01T00:00:00+00:00',
    });

    expect(merged.facilityName).toBe('Renamed building');
    expect(merged.updatedAt).toBe('2025-03-01T00:00:00+00:00');
  });

  it('clears facilityName when the facility changes without a resolved name', () => {
    const { facilityName: _omitted, ...rest } = KNOWN;
    const reassigned: EquipmentOutput = { ...rest, facilityId: 'fac-2' } as EquipmentOutput;

    expect(mergeEquipment(KNOWN, reassigned).facilityName).toBeNull();
  });

  it('keeps the resolved facilityName when the facility changes with one', () => {
    const reassigned: EquipmentOutput = {
      ...KNOWN,
      facilityId: 'fac-2',
      facilityName: 'Annex',
    };

    expect(mergeEquipment(KNOWN, reassigned).facilityName).toBe('Annex');
  });
});
