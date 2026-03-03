import type {
  FacilityOutput,
  FacilityTypeOutput,
} from '@core/models/facility';
import type { CollectionOperation, Operation } from '@core/stores/operations';

/**
 * Interface FacilityState
 * @interface FacilityState
 *
 * @description
 * State interface for the facility store.
 * Manages facility CRUD, types reference data, and lifecycle operations.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface FacilityState {
  //#region Facilities
  readonly totalFacilities: number;
  readonly selectedFacility: FacilityOutput | null;

  readonly listOperation: CollectionOperation<FacilityOutput, unknown>;
  readonly getOperation: Operation<FacilityOutput | null, unknown>;
  readonly createOperation: Operation<FacilityOutput | null, unknown>;
  readonly updateOperation: Operation<FacilityOutput | null, unknown>;
  readonly archiveOperation: Operation<FacilityOutput | null, unknown>;
  readonly moveOperation: Operation<FacilityOutput | null, unknown>;
  //#endregion

  //#region Types
  readonly facilityTypes: ReadonlyArray<FacilityTypeOutput>;
  readonly typesOperation: CollectionOperation<FacilityTypeOutput, unknown>;
  //#endregion
}
