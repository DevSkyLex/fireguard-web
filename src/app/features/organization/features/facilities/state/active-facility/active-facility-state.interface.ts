import type { CallState } from '@core/state/request-state';
import type { FacilityOutput } from '@features/organization/features/facilities/models';

/**
 * Interface ActiveFacilityState
 * @interface ActiveFacilityState
 *
 * @description
 * Minimal root-level state for the currently selected / active facility.
 * Only tracks the routing context (which facility is being viewed) and its
 * associated loading state. All list management and CRUD operations live in
 * the component-scoped {@link FacilityStore}.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface ActiveFacilityState {
  //#region Properties
  /**
   * Property selectedFacility
   * @readonly
   *
   * @description
   * Currently selected / viewed facility (set by
   * resolver or DashboardLayout).
   *
   * @since 1.0.0
   *
   * @type {FacilityOutput | null}
   */
  readonly selectedFacility: FacilityOutput | null;

  /**
   * Property getOperation
   * @readonly
   *
   * @description
   * Loading / error state for fetching the selected facility.
   *
   * @since 1.0.0
   *
   * @type {CallState<FacilityOutput | null>}
   */
  readonly getCallState: CallState<FacilityOutput | null>;
  //#endregion
}
