import type { HydraItem } from '@core/models/api';
import type { ChecklistItemOutput } from '../checklist-item/checklist-item-output.interface';

/**
 * Type ChecklistStatus
 *
 * @description
 * Supported lifecycle statuses for a checklist.
 */
export type ChecklistStatus = 'active' | 'archived';

/**
 * Interface ChecklistOutput
 * @interface ChecklistOutput
 *
 * @description
 * Checklist resource returned by the API.
 */
export interface ChecklistOutput extends HydraItem {
  //#region Properties
  /** @type {string} */
  readonly id: string;
  /** @type {string} */
  readonly organizationId: string;
  /** @type {string} */
  readonly name: string;
  /** @type {string} */
  readonly version: string;
  /** @type {ChecklistStatus} */
  readonly status: ChecklistStatus;
  /** @type {ReadonlyArray<ChecklistItemOutput>} */
  readonly items: ReadonlyArray<ChecklistItemOutput>;
  /** @type {string} */
  readonly createdAt: string;
  /** @type {string} */
  readonly updatedAt: string;
  //#endregion
}
