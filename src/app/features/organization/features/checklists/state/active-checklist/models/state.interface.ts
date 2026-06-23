import type { CallState } from '@core/request-state';
import type { ChecklistOutput } from '@features/organization/features/checklists/models';

/**
 * Interface ActiveChecklistState
 * @interface ActiveChecklistState
 *
 * @description
 * Minimal root-level state for the currently selected / active checklist.
 * Only tracks the routing context (which checklist is being viewed) and its
 * associated loading state. All list management and CRUD operations live in
 * the component-scoped {@link ChecklistStore}.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface ActiveChecklistState {
  //#region Properties
  /**
   * Property selectedChecklist
   * @readonly
   *
   * @description
   * Currently selected / viewed checklist (set by
   * resolver or DashboardLayout).
   *
   * @since 1.0.0
   *
   * @type {ChecklistOutput | null}
   */
  readonly selectedChecklist: ChecklistOutput | null;

  /**
   * Property getCallState
   * @readonly
   *
   * @description
   * Loading / error state for fetching the selected checklist.
   *
   * This operation is managed by the resolver and DashboardLayout, not by
   * the store itself, but it's included here for convenience since it's
   * tightly coupled to the selected checklist.
   *
   * @since 1.0.0
   *
   * @type {CallState<ChecklistOutput | null>}
   */
  readonly getCallState: CallState<ChecklistOutput | null>;
  //#endregion
}
