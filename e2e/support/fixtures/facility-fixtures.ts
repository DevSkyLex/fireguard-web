/**
 * Facility transport fixtures for the e2e suite, mirroring the backend
 * contract consumed by the facility list/create/detail pages. Plain factory
 * functions (like `api-fixtures.ts`) so tests override fields via object
 * spread.
 */

import { E2E_ORGANIZATION_ID } from './api-fixtures';

/** Facility the list/detail e2e scenarios deep-link into. */
export const E2E_FACILITY_ID = 'e2e-facility-1';

/** A second, child facility used to exercise the hierarchy chart. */
export const E2E_FACILITY_CHILD_ID = 'e2e-facility-2';

export interface FacilityOutputFixture {
  readonly '@id': string;
  readonly '@type': string;
  readonly id: string;
  readonly organizationId: string;
  readonly parentFacilityId: string | null;
  readonly hasChildren: boolean;
  readonly type: string;
  readonly name: string;
  readonly code: string | null;
  readonly status: string;
  readonly address: string | null;
  readonly metadata: Record<string, string | null>;
  readonly latitude?: number | null;
  readonly longitude?: number | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * A published facility with one child — realistic enough to populate the
 * detail page's header, hierarchy chart and information panel.
 */
export function facilityOutput(
  overrides: Partial<FacilityOutputFixture> = {},
): FacilityOutputFixture {
  return {
    '@id': `/api/facilities/${E2E_FACILITY_ID}`,
    '@type': 'Facility',
    id: E2E_FACILITY_ID,
    organizationId: E2E_ORGANIZATION_ID,
    parentFacilityId: null,
    hasChildren: false,
    type: 'building',
    name: 'North Building',
    code: 'BLD-001',
    status: 'active',
    address: '12 Rue de la Paix, 75002 Paris',
    metadata: {},
    latitude: 48.8566,
    longitude: 2.3522,
    createdAt: '2026-01-05T00:00:00+00:00',
    updatedAt: '2026-06-01T00:00:00+00:00',
    ...overrides,
  };
}

/** A direct child of {@link facilityOutput}, used to populate the descendants collection. */
export function facilityChildOutput(
  overrides: Partial<FacilityOutputFixture> = {},
): FacilityOutputFixture {
  return facilityOutput({
    id: E2E_FACILITY_CHILD_ID,
    '@id': `/api/facilities/${E2E_FACILITY_CHILD_ID}`,
    parentFacilityId: E2E_FACILITY_ID,
    type: 'floor',
    name: 'Ground Floor',
    code: 'BLD-001-GF',
    ...overrides,
  });
}
