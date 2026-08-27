import type { MaintenanceDueStatus } from './maintenance-due-status.type';

/**
 * Interface MaintenanceScheduleExportOptions
 *
 * @description
 * The narrowing the maintenance-schedules CSV export endpoint
 * (`GET /api/maintenance/schedules/export`) accepts. Like {@link
 * MaintenanceScheduleListFilter}, the organization travels as a required
 * `organization` IRI query parameter — the collection is not
 * organization-scoped by path. `dueBefore` is deliberately absent: the
 * endpoint does not serve it. The collection is capped server-side at
 * 50,000 rows — past it the endpoint answers `422` with an RFC 7807
 * `detail` instead of the file.
 *
 * @since 1.1.0
 */
export interface MaintenanceScheduleExportOptions {
  //#region Properties
  /** IRI of the organization, required. @type {string} */
  readonly organization: string;
  /** IRI of the facility to narrow to. @type {string | undefined} */
  readonly facility?: string;
  /** Bare equipment type value to narrow to. @type {string | undefined} */
  readonly equipmentType?: string;
  /** Bare due-status value to narrow to. @type {MaintenanceDueStatus | undefined} */
  readonly dueStatus?: MaintenanceDueStatus;
  //#endregion
}
