import type { InspectionOutput } from '@features/organization/features/inspections/models';
import type { CallState } from '@core/state/request-state';

/**
 * Interface ActiveInspectionState
 * @interface ActiveInspectionState
 *
 * @description
 * Minimal root-level state for the currently selected / active inspection.
 * Only tracks the routing context (which inspection is being viewed) and its
 * associated loading state. All list management and CRUD operations live in
 * the component-scoped {@link InspectionStore}.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface ActiveInspectionState {
  //#region Properties
  /**
   * Property selectedInspection
   * @readonly
   *
   * @description
   * Currently selected / viewed inspection (set by
   * resolver or DashboardLayout).
   *
   * @since 1.0.0
   *
   * @type {InspectionOutput | null}
   */
  readonly selectedInspection: InspectionOutput | null;

  /**
   * Property getOperation
   * @readonly
   *
   * @description
   * Loading / error state for fetching the selected inspection.
   *
   * @since 1.0.0
   *
   * @type {CallState<InspectionOutput | null>}
   */
  readonly getCallState: CallState<InspectionOutput | null>;
  //#endregion
}
