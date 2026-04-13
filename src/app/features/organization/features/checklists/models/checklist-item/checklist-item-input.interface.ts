/**
 * Interface ChecklistItemInput
 * @interface ChecklistItemInput
 *
 * @description
 * Payload used to define one checklist item.
 */
export interface ChecklistItemInput {
  //#region Properties
  /** @type {string} */
  readonly label: string;
  /** @type {string | null} */
  readonly description?: string | null;
  /** @type {boolean} */
  readonly required?: boolean;
  /** @type {number} */
  readonly position?: number;
  //#endregion
}
