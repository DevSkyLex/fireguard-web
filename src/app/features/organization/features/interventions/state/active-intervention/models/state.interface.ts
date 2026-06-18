import type { CallState } from '@core/state/request-state';
import type { InterventionOutput } from '@features/organization/features/interventions/models';

/**
 * Interface ActiveInterventionState
 * @interface ActiveInterventionState
 *
 * @description
 * Minimal root-level state for the currently selected / active intervention.
 * Only tracks the routing context (which intervention is being viewed) and its
 * associated loading state, so resolvers can resolve the breadcrumb, page title
 * and header banner before the route activates. The full workspace (work items,
 * changes, issues, offline handling) lives in the component-scoped
 * {@link InterventionWorkspaceStore}.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface ActiveInterventionState {
  //#region Properties
  /**
   * Property selectedIntervention
   * @readonly
   *
   * @description
   * Currently selected / viewed intervention (set by the title resolver).
   *
   * @since 1.0.0
   *
   * @type {InterventionOutput | null}
   */
  readonly selectedIntervention: InterventionOutput | null;

  /**
   * Property getCallState
   * @readonly
   *
   * @description
   * Loading / error state for fetching the selected intervention.
   *
   * @since 1.0.0
   *
   * @type {CallState<InterventionOutput | null>}
   */
  readonly getCallState: CallState<InterventionOutput | null>;
  //#endregion
}
