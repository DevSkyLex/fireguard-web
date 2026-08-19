import type { HydraItem } from '@core/api/models';
import type { MaintenanceDueStatus } from './maintenance-due-status.type';

/**
 * Interface MaintenanceScheduleOutput
 * @interface MaintenanceScheduleOutput
 *
 * @description
 * One equipment type's maintenance schedule within an organization, as
 * returned by `GET /api/maintenance/schedules`. Mirrors the backend
 * `MaintenanceScheduleOutput` DTO byte for byte — API Platform omits a null
 * optional field entirely rather than serializing it as `null`, so every
 * optional property here is read as possibly `undefined`, never `=== null`.
 *
 * @since 1.0.0
 */
export interface MaintenanceScheduleOutput extends HydraItem {
  /** @type {string} */
  readonly id: string;

  /** IRI of the owning organization. @type {string} */
  readonly organization: string;

  /** IRI of the tracked equipment, `/api/equipment/{id}`. @type {string} */
  readonly equipment: string;

  /** IRI of the equipment's facility, omitted when unassigned. @type {string | undefined} */
  readonly facility?: string;

  /** Bare equipment type value, e.g. `fire_extinguisher`. @type {string} */
  readonly equipmentType: string;

  /**
   * Organization-level default overridden for this schedule, as an ISO-8601
   * duration bounded `[P28D, P10Y]`. Omitted when the schedule follows the
   * organization default.
   *
   * @type {string | undefined}
   */
  readonly intervalOverride?: string;

  /** When the last closed inspection covering this equipment landed. @type {string | undefined} */
  readonly lastInspectionClosedAt?: string;

  /**
   * Next scheduled maintenance date. Omitted both when unscheduled and when
   * `dueStatus` is `overdue` with no inspection ever recorded — render
   * "Never inspected" in the latter case, never a blank cell.
   *
   * @type {string | undefined}
   */
  readonly nextDueAt?: string;

  /** Authoritative urgency, computed server-side. @type {MaintenanceDueStatus} */
  readonly dueStatus: MaintenanceDueStatus;

  /** When the last due-soon/overdue reminder was sent, if any. @type {string | undefined} */
  readonly lastRemindedAt?: string;

  /** @type {string} */
  readonly createdAt: string;

  /** @type {string} */
  readonly updatedAt: string;
}
