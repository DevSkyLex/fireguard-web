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
  /** @type {ReadonlyArray<ChecklistItemInput>} */
  readonly items?: ReadonlyArray<ChecklistItemInput>;
  //#endregion
}
