import type {
  InspectionOutput,
  NonConformityOutput,
} from '@core/models/inspection';
import type { CollectionOperation, Operation } from '@core/stores/operations';

export interface InspectionState {
  //#region Inspections
  readonly totalInspections: number;
  readonly selectedInspection: InspectionOutput | null;
  readonly listOperation: CollectionOperation<InspectionOutput, unknown>;
  readonly getOperation: Operation<InspectionOutput | null, unknown>;
  readonly createOperation: Operation<InspectionOutput | null, unknown>;
  readonly submitOperation: Operation<InspectionOutput | null, unknown>;
  readonly closeOperation: Operation<InspectionOutput | null, unknown>;
  //#endregion

  //#region Non-Conformities
  readonly totalNonConformities: number;
  readonly nonConformitiesListOperation: CollectionOperation<NonConformityOutput, unknown>;
  readonly addNonConformityOperation: Operation<NonConformityOutput | null, unknown>;
  readonly updateNonConformityStatusOperation: Operation<NonConformityOutput | null, unknown>;
  //#endregion
}
