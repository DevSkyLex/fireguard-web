import type { NonConformityOutput } from '@features/organization/features/inspections/models';
import { E2E_ORGANIZATION_ID } from './api-fixtures';
import { E2E_INSPECTION_ID } from './inspection-fixtures';

/** A populated row with absent optional fields, matching skip-null API serialization. */
export function nonConformityOutput(
  overrides: Partial<NonConformityOutput> = {},
): NonConformityOutput {
  return {
    '@id':
      '/api/organizations/' +
      E2E_ORGANIZATION_ID +
      '/inspections/' +
      E2E_INSPECTION_ID +
      '/non-conformities/e2e-nc-1',
    '@type': 'NonConformity',
    id: 'e2e-nc-1',
    inspectionId: E2E_INSPECTION_ID,
    description: 'Replace the damaged inspection label',
    severity: 'medium',
    status: 'open',
    createdAt: '2026-09-21T10:00:00Z',
    updatedAt: '2026-09-21T10:00:00Z',
    ...overrides,
  };
}
