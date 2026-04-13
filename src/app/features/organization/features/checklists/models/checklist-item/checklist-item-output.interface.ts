/**
 * Interface ChecklistItemOutput
 * @interface ChecklistItemOutput
 *
 * @description
 * Checklist item resource returned by the API.
 */
export interface ChecklistItemOutput {
  //#region Properties
  /** @type {string} */
  readonly id: string;
  /** @type {string} */
  readonly label: string;
  /** @type {number} */
  readonly position: number;
  /** @type {boolean} */
  readonly required: boolean;
  /** @type {string | null} */
  readonly description: string | null;
  //#endregion
}
