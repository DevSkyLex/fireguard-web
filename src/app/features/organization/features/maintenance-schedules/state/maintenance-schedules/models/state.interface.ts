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
  /**
   * Property organization
   * @readonly
   *
   * @description
   * Canonical organization IRI owning the visible historical schedules.
   *
   * @type {string | null}
   */
  readonly organization: string | null;

  /**
   * Property scopeGeneration
   * @readonly
   *
   * @description
   * Monotonic fence for responses from earlier organization visits.
   *
   * @type {number}
   */
  readonly scopeGeneration: number;

  /**
   * Property campaignResultOrganization
   * @readonly
   *
   * @description
   * Original organization IRI of the confirmed campaign used for navigation.
   *
   * @type {string | null}
   */
  readonly campaignResultOrganization: string | null;

  /**
   * Property listCallState
   * @readonly
   *
   * @description
   * Request state of the current organization's schedule query.
   *
   * @type {CallState<null>}
   */
  readonly listCallState: CallState<null>;

  /**
   * Property totalSchedules
   * @readonly
   *
   * @description
   * Exact server total for the current query.
   *
   * @type {number}
   */
  readonly totalSchedules: number;

  /**
   * Property overrideCallState
   * @readonly
   *
   * @description
   * Current organization's interval override result and request state.
   *
   * @type {CallState<MaintenanceScheduleOutput>}
   */
  readonly overrideCallState: CallState<MaintenanceScheduleOutput>;

  /**
   * Property campaignCallState
   * @readonly
   *
   * @description
   * Current organization's campaign generation result and request state.
   *
   * @type {CallState<MaintenanceCampaignOutput>}
   */
  readonly campaignCallState: CallState<MaintenanceCampaignOutput>;
}
