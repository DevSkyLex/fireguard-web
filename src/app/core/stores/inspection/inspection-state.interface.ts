import type {
  InspectionOutput,
  NonConformityOutput,
} from '@core/models/inspection';
import type { CollectionOperation, Operation } from '@core/stores/operations';

/**
 * Interface InspectionState
 * @interface InspectionState
 *
 * @description
 * Component-level state interface for the inspection store.
 * Manages inspection list, CRUD, lifecycle, and non-conformity tracking.
 *
 * The currently selected / active inspection is tracked in the root-level
 * {@link ActiveInspectionStore} instead.
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface InspectionState {
  //#region Inspections
  /** Total number of inspections returned by the last list request. */
  readonly totalInspections: number;
  /** True while a list request is in-flight. */
  readonly isLoading: boolean;
  /** Tracks the create inspection operation state. */
  readonly createOperation: Operation<InspectionOutput | null, unknown>;
  /** Tracks the submit inspection operation state. */
  readonly submitOperation: Operation<InspectionOutput | null, unknown>;
  /** Tracks the close inspection operation state. */
  readonly closeOperation: Operation<InspectionOutput | null, unknown>;
  //#endregion

  //#region Non-Conformities
  /** Total number of non-conformities returned by the last list request. */
  readonly totalNonConformities: number;
  /** Tracks the load non-conformities list operation state. */
  readonly nonConformitiesListOperation: CollectionOperation<NonConformityOutput, unknown>;
  /** Tracks the add non-conformity operation state. */
  readonly addNonConformityOperation: Operation<NonConformityOutput | null, unknown>;
  /** Tracks the update non-conformity status operation state. */
  readonly updateNonConformityStatusOperation: Operation<NonConformityOutput | null, unknown>;
  //#endregion
}
