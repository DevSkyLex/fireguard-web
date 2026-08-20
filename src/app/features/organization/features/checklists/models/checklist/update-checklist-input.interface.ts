import type { ChecklistItemInput } from '../checklist-item/checklist-item-input.interface';

/**
 * Interface UpdateChecklistInput
 * @interface UpdateChecklistInput
 *
 * @description
 * Partial-update (`PATCH`) payload for a checklist. Every field is optional
 * and a field omitted from the request body is left unchanged server-side
 * (`UpdateChecklistInput` DTO, backend). `items` is a full replacement list
 * when provided, never a merge.
 *
 * @since 1.0.0
 */
export interface UpdateChecklistInput {
  //#region Properties
  /** @type {string} */
  readonly name?: string;
  /** @type {string | null} */
  readonly referenceCode?: string | null;
  /** @type {ReadonlyArray<ChecklistItemInput>} */
  readonly items?: ReadonlyArray<ChecklistItemInput>;
  //#endregion
}
