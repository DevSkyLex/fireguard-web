import type { CallState } from '@core/state/request-state';
import type { MissionOutput } from '@features/organization/features/missions/models';

/**
 * Interface MissionState
 * @interface MissionState
 *
 * @description
 * Component-scoped state for mission list and creation workflows. Mission
 * entities are managed by the `withEntities` feature; this interface tracks
 * auxiliary request state and server totals.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface MissionState {
  //#region Properties
  /**
   * Property totalMissions
   * @readonly
   *
   * @description
   * Server-reported number of missions for the active organization.
   *
   * @since 1.0.0
   *
   * @type {number}
   */
  readonly totalMissions: number;

  /**
   * Property listCallState
   * @readonly
   *
   * @description
   * Loading / success / error state for mission listing.
   *
   * @since 1.0.0
   *
   * @type {CallState}
   */
  readonly listCallState: CallState;

  /**
   * Property createCallState
   * @readonly
   *
   * @description
   * Loading / success / error state for mission creation.
   * Carries the created mission on success so route pages can navigate.
   *
   * @since 1.0.0
   *
   * @type {CallState<MissionOutput>}
   */
  readonly createCallState: CallState<MissionOutput>;
  //#endregion
}
