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
  /**
   * Human-facing reference code, `null` for checklists created before this
   * field existed.
   *
   * @type {(string | null)}
   * @since 1.1.0
   */
  readonly referenceCode: string | null;
  /** @type {string} */
  readonly version: string;
  /** @type {ChecklistStatus} */
  readonly status: ChecklistStatus;
  /**
   * Number of items on the checklist. Always populated, on every operation.
   *
   * @type {number}
   * @since 1.1.0
   */
  readonly itemCount: number;
  /**
   * Full item list. Populated on create/get/patch/archive responses; the
   * list (collection) response leaves this empty and relies on
   * {@link itemCount} instead, to avoid shipping every row's full item
   * payload just so clients can count them.
   *
   * @type {ReadonlyArray<ChecklistItemOutput>}
   */
  readonly items: ReadonlyArray<ChecklistItemOutput>;
  /** @type {string} */
  readonly createdAt: string;
  /** @type {string} */
  readonly updatedAt: string;
  //#endregion
}
