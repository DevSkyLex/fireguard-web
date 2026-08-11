/**
 * Inspection transport fixtures for the e2e suite, mirroring the backend
 * contract consumed by the inspection list/create/detail pages. Plain
 * factory functions (like `api-fixtures.ts`) so tests override fields via
 * object spread.
 */

import { E2E_ORGANIZATION_ID } from './api-fixtures';
import { E2E_EQUIPMENT_ID } from './equipment-fixtures';
import { E2E_FACILITY_ID } from './facility-fixtures';

/** Inspection the list/detail e2e scenarios deep-link into. */
export const E2E_INSPECTION_ID = 'e2e-inspection-1';

export interface InspectorOutputFixture {
  readonly type: string;
  readonly id: string | null;
  readonly firstName: string | null;
  readonly lastName: string | null;
  readonly displayName: string;
  readonly avatarUrl: string | null;
  readonly organizationName: string | null;
}

export interface InspectionOutputFixture {
  readonly '@id': string;
  readonly '@type': string;
  readonly id: string;
  readonly organizationId: string;
  readonly equipmentId: string;
  readonly facilityId: string | null;
  readonly result: string;
  readonly status: string;
  readonly performedAt: string;
  readonly inspector: InspectorOutputFixture | null;
  readonly checklistId: string | null;
  readonly notes: string | null;
  readonly signature: string | null;
  readonly nonConformitiesCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** A closed, passing inspection — realistic enough to populate the detail page's header and information panel. */
export function inspectionOutput(
  overrides: Partial<InspectionOutputFixture> = {},
): InspectionOutputFixture {
  return {
    '@id': `/api/inspections/${E2E_INSPECTION_ID}`,
    '@type': 'Inspection',
    id: E2E_INSPECTION_ID,
    organizationId: E2E_ORGANIZATION_ID,
    equipmentId: E2E_EQUIPMENT_ID,
    facilityId: E2E_FACILITY_ID,
    result: 'pass',
    status: 'closed',
    performedAt: '2026-06-15T09:30:00+00:00',
    inspector: {
      type: 'user',
      id: 'e2e-user-1',
      firstName: 'Ella',
      lastName: 'Uzer',
      displayName: 'Ella Uzer',
      avatarUrl: null,
      organizationName: null,
    },
    checklistId: null,
    notes: 'All checks passed, no issues found.',
    signature: null,
    nonConformitiesCount: 0,
    createdAt: '2026-06-15T09:30:00+00:00',
    updatedAt: '2026-06-15T09:45:00+00:00',
    ...overrides,
  };
}

/** A draft inspection with an open non-conformity — exercises the Submit/Cancel lifecycle band and the editable panel. */
export function draftInspectionOutput(
  overrides: Partial<InspectionOutputFixture> = {},
): InspectionOutputFixture {
  return inspectionOutput({
    id: 'e2e-inspection-2',
    '@id': '/api/inspections/e2e-inspection-2',
    result: 'fail',
    status: 'draft',
    notes: null,
    nonConformitiesCount: 2,
    ...overrides,
  });
}
