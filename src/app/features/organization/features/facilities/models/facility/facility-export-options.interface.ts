import type { FacilityStatus, FacilityType } from './facility-output.interface';

/**
 * Interface FacilityExportOptions
 *
 * @description
 * The narrowing the facilities CSV export endpoint
 * (`GET /api/organizations/{organizationId}/facilities/export`) accepts.
 * Every field is forwarded as a query parameter; the collection is capped
 * server-side at 50,000 rows — past it the endpoint answers `422` with an
 * RFC 7807 `detail` instead of the file.
 *
 * @since 1.1.0
 */
export interface FacilityExportOptions {
  //#region Properties
  /** Include archived facilities in the export. @type {boolean | undefined} */
  readonly includeArchived?: boolean;
  /** Narrow to one facility type. @type {FacilityType | undefined} */
  readonly type?: FacilityType;
  /** Narrow to one lifecycle status. @type {FacilityStatus | undefined} */
  readonly status?: FacilityStatus;
  /** Narrow to the direct children of one facility. @type {string | undefined} */
  readonly parentFacilityId?: string;
  /** Export only root facilities (no parent). @type {boolean | undefined} */
  readonly rootsOnly?: boolean;
  /** Narrow to one facility code. @type {string | undefined} */
  readonly code?: string;
  /** Free-text search over name and code. @type {string | undefined} */
  readonly search?: string;
  /** Narrow on the presence (or absence) of coordinates. @type {boolean | undefined} */
  readonly hasCoordinates?: boolean;
  //#endregion
}
