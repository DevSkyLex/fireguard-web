/**
 * Equipment transport fixtures for the e2e suite, mirroring the backend
 * contract consumed by the equipment detail/edit pages. Plain factory
 * functions (like `api-fixtures.ts` and `intervention-fixtures.ts`) so specs
 * override fields via object spread.
 */

import { E2E_FACILITY_ID } from './facility-fixtures';
import { E2E_ORGANIZATION_ID } from './intervention-fixtures';

/** Equipment the detail/edit e2e scenarios deep-link into. */
export const E2E_EQUIPMENT_ID = 'e2e-equipment-1';

export interface EquipmentOutputFixture {
  readonly '@id': string;
  readonly '@type': string;
  readonly id: string;
  readonly organizationId: string;
  readonly facilityId: string | null;
  readonly type: string;
  readonly subType: string | null;
  readonly brand: string | null;
  readonly model: string | null;
  readonly serialNumber: string | null;
  readonly locationLabel: string | null;
  readonly status: string;
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
    type: 'fire_extinguisher',
    subType: 'CO2',
    brand: 'Desautel',
    model: 'X-Fire 6kg',
    serialNumber: 'SN-2024-001',
    locationLabel: 'Corridor A, 2nd floor',
    status: 'operational',
    installedAt: '2025-03-01T00:00:00+00:00',
    commissionedAt: '2025-03-05T00:00:00+00:00',
    tags: [],
    createdAt: '2025-03-01T00:00:00+00:00',
    updatedAt: '2026-06-01T00:00:00+00:00',
    ...overrides,
  };
}
