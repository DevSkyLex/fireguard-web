import type { NonConformitySeverity, NonConformityStatus } from './non-conformity-output.interface';

/**
 * Interface NonConformityExportOptions
 *
 * @description
 * The narrowing the organization-wide non-conformities CSV export endpoint
 * (`GET /api/organizations/{organizationId}/non-conformities/export`)
 * accepts. There is no per-inspection scoping — the export always covers the
 * whole organization. The collection is capped server-side at 50,000 rows —
 * past it the endpoint answers `422` with an RFC 7807 `detail` instead of
 * the file.
 *
 * @since 1.1.0
 */
export interface NonConformityExportOptions {
  //#region Properties
  /** Narrow to one severity. @type {NonConformitySeverity | undefined} */
  readonly severity?: NonConformitySeverity;
  /** Narrow to one status. @type {NonConformityStatus | undefined} */
  readonly status?: NonConformityStatus;
  //#endregion
}
