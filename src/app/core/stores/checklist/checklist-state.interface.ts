import type { ChecklistOutput } from '@core/models/checklist';
import type { Operation } from '@core/stores/operations';

/**
 * Interface ChecklistState
 * @interface ChecklistState
 *
 * @description
 * Component-scoped state for the checklist list store. Entities are
 * managed by the `withEntities` feature (providing `checklistEntities`,
 * `checklistEntityMap`, `checklistIds`). This interface tracks
 * auxiliary state that does not belong to the entity collection itself:
 * CRUD operation tracking, list loading flags, and total count for
 * pagination.
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface ChecklistState {
  //#region Properties
  /**
   * Property createOperation
   * @readonly
   *
   * @description
   * Loading / success / error state for the create checklist operation.
   * Starts idle and transitions through loading → success | error when
   * {@link ChecklistStore#create} is called.
   *
   * @since 1.0.0
   *
   * @type {Operation<ChecklistOutput | null, unknown>}
   */
  readonly createOperation: Operation<ChecklistOutput | null, unknown>;

  /**
   * Property archiveOperation
   * @readonly
   *
   * @description
   * Loading / success / error state for the archive checklist operation.
   * Starts idle and transitions through loading → success | error when
   * {@link ChecklistStore#archive} is called.
   *
   * @since 1.0.0
   *
   * @type {Operation<ChecklistOutput | null, unknown>}
   */
  readonly archiveOperation: Operation<ChecklistOutput | null, unknown>;

  /**
   * Property totalChecklists
   * @readonly
   *
   * @description
   * Server-reported total count of checklists for the current query.
   * Used to drive pagination controls. Updated on every successful list
   * response and incremented on create success.
   *
   * @since 2.0.0
   *
   * @type {number}
   */
  readonly totalChecklists: number;

  /**
   * Property isLoading
   * @readonly
   *
   * @description
   * True while a list request is in-flight. Set to `true` at the start of
   * every `load` / `loadChecklists` call and back to `false` on both
   * success and error.
   *
   * @since 2.0.0
   *
   * @type {boolean}
   */
  readonly isLoading: boolean;
  //#endregion
}
