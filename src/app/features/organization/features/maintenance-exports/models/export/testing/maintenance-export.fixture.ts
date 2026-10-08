import type { MaintenanceExportOutput } from '../maintenance-export-output.interface';

/**
 * Function maintenanceExportFixture
 *
 * @description
 * Builds server-authoritative archive metadata for behavior tests; retained file bytes are never
 * reconstructed from this fixture.
 *
 * @access public
 * @since unreleased
 *
 * @param {Partial<MaintenanceExportOutput>} changes - Explicit scenario metadata overrides.
 *
 * @returns {MaintenanceExportOutput} Typed scoped archive metadata with immutable file manifests.
 */
export const maintenanceExportFixture = (
  changes: Partial<MaintenanceExportOutput> = {},
): MaintenanceExportOutput => ({
  '@id': '/api/organizations/org/maintenance-exports/export-1',
  '@type': 'MaintenanceExport',
  id: 'export-1',
  organizationId: 'org',
  kind: 'initial',
  schemaVersion: 1,
  system: 'ERP',
  includeInternalCosts: false,
  sourceInterventionIds: ['dossier-1'],
  originalExportId: null,
  adjustmentOf: null,
  createdAt: '2026-10-07T12:00:00Z',
  actorId: 'member',
  revision: 1,
  state: 'generated',
  confirmation: null,
  rowCount: 1,
  files: {
    json: { mediaType: 'application/json', sha256: 'original-json-hash', size: 120 },
    csv: { mediaType: 'text/csv', sha256: 'original-csv-hash', size: 60 },
  },
  replayed: false,
  costsComplete: null,
  incompleteCostCount: null,
  ...changes,
});
