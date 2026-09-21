import type { ChecklistItemInput } from '../checklist-item/checklist-item-input.interface';

/**
 * Interface CreateChecklistInput
 * @interface CreateChecklistInput
 *
 * @description
 * Payload used to create a checklist.
 */
export interface CreateChecklistInput {
  //#region Properties
  /** @type {string} */
  readonly name: string;
  /** @type {string} */
  readonly version: string;
  /** Optional new reference; never copied implicitly from the previous revision. @type {string | null} */
  readonly referenceCode?: string | null;
  /** Checklist retained by existing inspections. @type {string | null} */
  readonly previousChecklistId?: string | null;
  /** @type {ReadonlyArray<ChecklistItemInput>} */
  readonly items?: ReadonlyArray<ChecklistItemInput>;
  //#endregion
}
