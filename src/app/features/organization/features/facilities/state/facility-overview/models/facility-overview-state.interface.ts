import type { CallState } from '@core/request-state';
import type { EquipmentFacilitySummaryOutput } from '@features/organization/features/equipments/models';
import type { InspectionOutput } from '@features/organization/features/inspections/models';
import type { InterventionOutput } from '@features/organization/features/interventions/models';

/**
 * Interface FacilityOverviewState
 * @interface FacilityOverviewState
 *
 * @description
 * Component-scoped state backing the facility detail overview tab. Holds
 * compact inspection/intervention previews and exact equipment summary used
 * by the page's KPI metrics and summary cards, together with their
 * independent async call states.
 *
 * @version 1.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface FacilityOverviewState {
  //#region Properties
  /**
   * Property inspections
   *
   * @description
   * Inspection previews loaded for the active facility.
   *
   * @type {ReadonlyArray<InspectionOutput>}
   */
  readonly inspections: ReadonlyArray<InspectionOutput>;

  /**
   * Property equipmentIncludeDescendants
   *
   * @description
   * Whether the exact equipment summary includes the facility subtree.
   *
   * @type {boolean}
   */
  readonly equipmentIncludeDescendants: boolean;

  /**
   * Property interventions
   *
   * @description
   * The most recently updated interventions whose `site` is this facility,
   * capped to a compact preview — see `RECENT_INTERVENTIONS_LIMIT`.
   *
   * @type {ReadonlyArray<InterventionOutput>}
   */
  readonly interventions: ReadonlyArray<InterventionOutput>;

  /**
   * Property inspectionsTotal
   *
   * @description
   * Server-side `totalItems` of the facility's inspection collection, which
   * may exceed the single preview page held in `inspections`.
   *
   * @type {number}
   */
  readonly inspectionsTotal: number;

  /**
   * Property inspectionsCallState
   *
   * @description
   * Async lifecycle of the inspection preview request.
   *
   * @type {CallState}
   */
  readonly inspectionsCallState: CallState;

  /**
   * Property equipmentCallState
   *
   * @description
   * Async lifecycle and exact counts of the selected equipment scope.
   *
   * @type {CallState<EquipmentFacilitySummaryOutput>}
   */
  readonly equipmentCallState: CallState<EquipmentFacilitySummaryOutput>;

  /**
   * Property interventionsCallState
   *
   * @description
   * Async lifecycle of the intervention preview request.
   *
   * @type {CallState}
   */
  readonly interventionsCallState: CallState;
  //#endregion
}
