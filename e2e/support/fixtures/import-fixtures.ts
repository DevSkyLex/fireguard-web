/**
 * Import-job transport fixtures for the e2e suite, mirroring the backend
 * contract consumed by the bulk CSV import surface. Plain factory function
 * (like `equipment-fixtures.ts`), so tests override fields via object
 * spread.
 */

import { E2E_ORGANIZATION_ID } from './api-fixtures';

export const E2E_IMPORT_JOB_ID = 'e2e-import-1';

export interface ImportJobOutputFixture {
  readonly '@id': string;
  readonly '@type': string;
  readonly id: string;
  readonly organization: string;
  readonly kind: 'equipment' | 'facility';
  readonly status: 'pending' | 'processing' | 'completed' | 'failed';
  readonly originalFilename: string;
  readonly dryRun: boolean;
  readonly totalRows?: number;
  readonly processedRows: number;
  readonly successfulRows: number;
  readonly failedRows: number;
  readonly errorReport: ReadonlyArray<unknown>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** A completed equipment import job with every row successful. */
export function importJobOutput(
  overrides: Partial<ImportJobOutputFixture> = {},
): ImportJobOutputFixture {
  return {
    '@id': `/api/imports/${E2E_IMPORT_JOB_ID}`,
    '@type': 'ImportJob',
    id: E2E_IMPORT_JOB_ID,
    organization: `/api/organizations/${E2E_ORGANIZATION_ID}`,
    kind: 'equipment',
    status: 'completed',
    originalFilename: 'equipment-batch.csv',
    dryRun: false,
    totalRows: 12,
    processedRows: 12,
    successfulRows: 12,
    failedRows: 0,
    errorReport: [],
    createdAt: '2026-08-01T09:00:00+00:00',
    updatedAt: '2026-08-01T09:05:00+00:00',
    ...overrides,
  };
}
