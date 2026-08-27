import type { InspectionResult, InspectionStatus } from './inspection-output.interface';

/**
 * Interface InspectionExportOptions
 *
 * @description
 * The narrowing the inspections CSV export endpoint
 * (`GET /api/organizations/{organizationId}/inspections/export`) accepts.
 * Free-text search is deliberately absent — the endpoint does not serve it,
 * so a searching caller must warn that the export is wider than the screen.
 * The collection is capped server-side at 50,000 rows — past it the endpoint
 * answers `422` with an RFC 7807 `detail` instead of the file.
 *
 * @since 1.1.0
 */
export interface InspectionExportOptions {
  //#region Properties
  /** Narrow to one equipment. @type {string | undefined} */
  readonly equipmentId?: string;
  /** Narrow to one facility. @type {string | undefined} */
  readonly facilityId?: string;
  /** Narrow to one result. @type {InspectionResult | undefined} */
  readonly result?: InspectionResult;
  /** Narrow to one status. @type {InspectionStatus | undefined} */
  readonly status?: InspectionStatus;
  /** ISO-8601 inclusive lower bound on `performedAt`. @type {string | undefined} */
  readonly performedAtFrom?: string;
  /** ISO-8601 inclusive upper bound on `performedAt`. @type {string | undefined} */
  readonly performedAtTo?: string;
  /** Narrow to one inspector. @type {string | undefined} */
  readonly inspectorUserId?: string;
  /** Narrow to one checklist. @type {string | undefined} */
  readonly checklistId?: string;
  //#endregion
}
