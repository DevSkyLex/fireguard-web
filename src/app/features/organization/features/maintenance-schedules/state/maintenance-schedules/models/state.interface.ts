import type { CallState } from '@core/request-state';
import type {
  MaintenanceCampaignOutput,
  MaintenanceScheduleOutput,
} from '@features/organization/features/maintenance-schedules/models';

/**
 * Interface MaintenanceSchedulesState
 * @interface MaintenanceSchedulesState
 *
 * @description
 * Auxiliary state for {@link MaintenanceSchedulesStore}. Entity state
 * (`scheduleEntities`, `scheduleEntityMap`, `scheduleIds`) is initialised by
 * `withEntities` and lives outside this interface.
 *
 * @since 1.0.0
 */
export interface MaintenanceSchedulesState {
  /** @type {CallState<null>} */
  readonly listCallState: CallState<null>;
  /** @type {number} */
  readonly totalSchedules: number;
  /** @type {CallState<MaintenanceScheduleOutput>} */
  readonly overrideCallState: CallState<MaintenanceScheduleOutput>;
  /** @type {CallState<MaintenanceCampaignOutput>} */
  readonly campaignCallState: CallState<MaintenanceCampaignOutput>;
}
