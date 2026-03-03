import type { ChecklistOutput } from '@core/models/checklist';
import type { CollectionOperation, Operation } from '@core/stores/operations';

export interface ChecklistState {
  //#region Checklists
  readonly totalChecklists: number;
  readonly selectedChecklist: ChecklistOutput | null;
  readonly listOperation: CollectionOperation<ChecklistOutput, unknown>;
  readonly getOperation: Operation<ChecklistOutput | null, unknown>;
  readonly createOperation: Operation<ChecklistOutput | null, unknown>;
  readonly archiveOperation: Operation<ChecklistOutput | null, unknown>;
  //#endregion
}
