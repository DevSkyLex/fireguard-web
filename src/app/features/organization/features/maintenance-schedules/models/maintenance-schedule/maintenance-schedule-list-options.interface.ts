import type { RequestOptions } from '@core/api/models';
import type { MaintenanceDueStatus } from './maintenance-due-status.type';

/**
 * Interface MaintenanceScheduleListFilter
 * @interface MaintenanceScheduleListFilter
 *
 * @description
 * Filtering options supported by `GET /api/maintenance/schedules`.
 * `organization` is required by the backend — a request without it is a 400.
 *
 * @since 1.0.0
 */
export interface MaintenanceScheduleListFilter {
  //#region Properties
  /** IRI of the organization, required. @type {string} */
  readonly organization: string;
  /** IRI of the facility to narrow to. @type {string | undefined} */
  readonly facility?: string;
  /** Bare equipment type value to narrow to. @type {string | undefined} */
  readonly equipmentType?: string;
  /** Bare due-status value to narrow to. @type {MaintenanceDueStatus | undefined} */
  readonly dueStatus?: MaintenanceDueStatus;
  /** ISO-8601 upper bound on `nextDueAt`. @type {string | undefined} */
  readonly dueBefore?: string;
  //#endregion
}

/**
 * Type MaintenanceScheduleListOptions
 *
 * @description
 * Complete query options for the schedules listing endpoint: the feature's
 * own filters composed with the typed pagination, sorting and search options
 * `RequestOptions` (`@core/api`) exposes.
 *
 * @since 1.0.0
 */
export type MaintenanceScheduleListOptions = MaintenanceScheduleListFilter & RequestOptions;
