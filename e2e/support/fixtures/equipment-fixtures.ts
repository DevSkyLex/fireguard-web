/**
 * Equipment transport fixtures for the e2e suite, mirroring the backend
 * contract consumed by the equipment list/create/detail pages. Plain factory
 * functions (like `api-fixtures.ts`) so tests override fields via object
 * spread.
 */

import { E2E_ORGANIZATION_ID } from './api-fixtures';
import { E2E_FACILITY_ID } from './facility-fixtures';

/** Equipment the list/detail e2e scenarios deep-link into. */
export const E2E_EQUIPMENT_ID = 'e2e-equipment-1';

export interface EquipmentOutputFixture {
  readonly '@id': string;
  readonly '@type': string;
  readonly id: string;
  readonly organizationId: string;
  readonly facilityId: string | null;
  readonly facilityName: string | null;
  readonly type: string;
  readonly subType: string | null;
  readonly brand: string | null;
  readonly model: string | null;
  readonly serialNumber: string | null;
  readonly locationLabel: string | null;
  readonly status: string;
  readonly maintenanceDueStatus: string;
  readonly installedAt: string | null;
  readonly commissionedAt: string | null;
  readonly tags: ReadonlyArray<{ readonly id: string; readonly name: string }>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** An operational, facility-assigned fire extinguisher — realistic enough to populate the detail page's header and information panel. */
export function equipmentOutput(
  overrides: Partial<EquipmentOutputFixture> = {},
): EquipmentOutputFixture {
  return {
    '@id': `/api/equipment/${E2E_EQUIPMENT_ID}`,
    '@type': 'Equipment',
    id: E2E_EQUIPMENT_ID,
    organizationId: E2E_ORGANIZATION_ID,
    facilityId: E2E_FACILITY_ID,
    facilityName: 'North Building',
    type: 'fire_extinguisher',
    subType: 'CO2',
    brand: 'Desautel',
    model: 'X-Fire 6kg',
    serialNumber: 'SN-2024-001',
    locationLabel: 'Corridor A, 2nd floor',
    status: 'operational',
    maintenanceDueStatus: 'up_to_date',
    installedAt: '2025-03-01T00:00:00+00:00',
    commissionedAt: '2025-03-05T00:00:00+00:00',
    tags: [],
    createdAt: '2025-03-01T00:00:00+00:00',
    updatedAt: '2026-06-01T00:00:00+00:00',
    ...overrides,
  };
}

/** An in-stock, unassigned equipment — exercises the "Commission" primary action and the unassigned label. */
export function inStockEquipmentOutput(
  overrides: Partial<EquipmentOutputFixture> = {},
): EquipmentOutputFixture {
  return equipmentOutput({
    id: 'e2e-equipment-2',
    '@id': '/api/equipment/e2e-equipment-2',
    facilityId: null,
    facilityName: null,
    status: 'in_stock',
    maintenanceDueStatus: 'unscheduled',
    commissionedAt: null,
    ...overrides,
  });
}
