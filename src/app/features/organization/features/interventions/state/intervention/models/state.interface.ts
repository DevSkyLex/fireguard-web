import type { CallState } from '@core/state/request-state';
import type { InterventionOutput } from '@features/organization/features/interventions/models';

/**
 * Interface InterventionState
 * @interface InterventionState
 *
 * @description
 * Component-scoped state for intervention list and creation workflows. Intervention
 * entities are managed by the `withEntities` feature; this interface tracks
 * auxiliary request state and server totals.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface InterventionState {
  //#region Properties
  /**
   * Property totalInterventions
   * @readonly
   *
   * @description
   * Server-reported number of interventions for the active organization.
   *
   * @since 1.0.0
   *
   * @type {number}
   */
  readonly totalInterventions: number;

  /**
   * Property listCallState
   * @readonly
   *
   * @description
   * Loading / success / error state for intervention listing.
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
   * Loading / success / error state for intervention creation.
   * Carries the created intervention on success so route pages can navigate.
   *
   * @since 1.0.0
   *
   * @type {CallState<InterventionOutput>}
   */
  readonly createCallState: CallState<InterventionOutput>;
  //#endregion
}
