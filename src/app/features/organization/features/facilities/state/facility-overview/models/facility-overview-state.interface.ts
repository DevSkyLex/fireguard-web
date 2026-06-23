import type { CallState } from '@core/request-state';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import type { InspectionOutput } from '@features/organization/features/inspections/models';

/**
 * Interface FacilityOverviewState
 * @interface FacilityOverviewState
 *
 * @description
 * Component-scoped state backing the facility detail overview tab. Holds
 * the compact inspection and equipment previews used to derive the page's
 * KPI metrics and summary cards, together with their independent async
 * call states.
 *
 * @version 1.0.0
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
   * Property equipment
   *
   * @description
   * Equipment previews loaded for the active facility.
   *
   * @type {ReadonlyArray<EquipmentOutput>}
   */
  readonly equipment: ReadonlyArray<EquipmentOutput>;

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
   * Async lifecycle of the equipment preview request.
   *
   * @type {CallState}
   */
  readonly equipmentCallState: CallState;
  //#endregion
}
