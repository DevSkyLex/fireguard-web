import type { CallState } from '@core/request-state';
import type { ChecklistOutput } from '@features/organization/features/checklists/models';

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
   * Property createCallState
   * @readonly
   *
   * @description
   * Loading / success / error state for the create checklist operation.
   * Starts idle and transitions through loading → success | error when
   * {@link ChecklistStore#create} is called.
   *
   * @since 1.0.0
   *
   * @type {CallState<ChecklistOutput | null>}
   */
  readonly createCallState: CallState<ChecklistOutput | null>;

  /**
   * Property archiveCallState
   * @readonly
   *
   * @description
   * Loading / success / error state for the archive checklist operation.
   * Starts idle and transitions through loading → success | error when
   * {@link ChecklistStore#archive} is called.
   *
   * @since 1.0.0
   *
   * @type {CallState<ChecklistOutput | null>}
   */
  readonly archiveCallState: CallState<ChecklistOutput | null>;

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
  readonly listCallState: CallState;
  //#endregion
}
