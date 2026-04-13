import type { CallState } from '@core/state/request-state';
import type {
  InspectionOutput,
  NonConformityOutput,
} from '@features/organization/features/inspections/models';

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
  readonly listCallState: CallState;
  /** Tracks the create inspection operation state. */
  readonly createCallState: CallState<InspectionOutput | null>;
  /** Tracks the submit inspection operation state. */
  readonly submitCallState: CallState<InspectionOutput | null>;
  /** Tracks the close inspection operation state. */
  readonly closeCallState: CallState<InspectionOutput | null>;
  //#endregion

  //#region Non-Conformities
  /** Total number of non-conformities returned by the last list request. */
  readonly totalNonConformities: number;
  /** Tracks the load non-conformities list operation state. */
  readonly nonConformitiesListCallState: CallState;
  /** Tracks the add non-conformity operation state. */
  readonly addNonConformityCallState: CallState<NonConformityOutput | null>;
  /** Tracks the update non-conformity status operation state. */
  readonly updateNonConformityStatusCallState: CallState<NonConformityOutput | null>;
  //#endregion
}
