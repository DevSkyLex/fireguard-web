import type { HydraItem } from '@core/api/models';
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
  /** Optional reference, unique within the organization. @type {string | null} */
  readonly referenceCode?: string | null;
  /** Previous immutable revision. @type {string | null} */
  readonly previousChecklistId?: string | null;
  /** Server-authorized metadata update. @type {boolean} */
  readonly canEditMetadata?: boolean;
  /** Server-authorized structural update. @type {boolean} */
  readonly canEditItems?: boolean;
  /** Server-authorized creation of a linked revision. @type {boolean} */
  readonly canCreateRevision?: boolean;
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
