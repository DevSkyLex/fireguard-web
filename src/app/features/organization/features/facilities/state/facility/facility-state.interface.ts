import type { CallState } from '@core/state/request-state';
import type {
  FacilityOutput,
  FacilityTypeOutput,
} from '@features/organization/features/facilities/models';

/**
 * Interface FacilityState
 * @interface FacilityState
 *
 * @description
 * Component-level state interface for the facility store.
 * Manages facility list, CRUD, archiving, moving, and type reference data.
 *
 * The currently selected / active facility is tracked in the root-level
 * {@link ActiveFacilityStore} instead.
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface FacilityState {
  //#region Facilities
  /**
   * Property totalFacilities
   * @readonly
   *
   * @description
   * Total number of facilities returned by the last list request.
   *
   * @since 1.0.0
   *
   * @type {number}
   */
  readonly totalFacilities: number;

  /**
   * Property isLoading
   * @readonly
   *
   * @description
   * True while a list request is in-flight.
   *
   * @since 2.0.0
   *
   * @type {boolean}
   */
  readonly listCallState: CallState;

  /**
   * Property createOperation
   * @readonly
   *
   * @description
   * Tracks the create facility operation state.
   *
   * @since 1.0.0
   *
   * @type {CallState<FacilityOutput | null>}
   */
  readonly createCallState: CallState<FacilityOutput | null>;

  /**
   * Property updateOperation
   * @readonly
   *
   * @description
   * Tracks the update facility operation state.
   *
   * @since 1.0.0
   *
   * @type {CallState<FacilityOutput | null>}
   */
  readonly updateCallState: CallState<FacilityOutput | null>;

  /**
   * Property archiveOperation
   * @readonly
   *
   * @description
   * Tracks the archive facility operation state.
   *
   * @since 1.0.0
   *
   * @type {CallState<FacilityOutput | null>}
   */
  readonly archiveCallState: CallState<FacilityOutput | null>;

  /**
   * Property moveOperation
   * @readonly
   *
   * @description
   * Tracks the move facility operation state.
   *
   * @since 1.0.0
   *
   * @type {CallState<FacilityOutput | null>}
   */
  readonly moveCallState: CallState<FacilityOutput | null>;
  //#endregion

  //#region Types
  /**
   * Property facilityTypes
   * @readonly
   *
   * @description
   * Cached list of facility types (reference data).
   *
   * @since 1.0.0
   *
   * @type {ReadonlyArray<FacilityTypeOutput>}
   */
  readonly facilityTypes: ReadonlyArray<FacilityTypeOutput>;

  /**
   * Property typesOperation
   * @readonly
   *
   * @description
   * Tracks the load facility types operation state.
   *
   * @since 1.0.0
   *
   * @type {CallState}
   */
  readonly typesCallState: CallState;
  //#endregion
}
