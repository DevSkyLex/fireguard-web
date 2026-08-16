import type { CallState } from '@core/request-state';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import type { InspectionOutput } from '@features/organization/features/inspections/models';

/**
 * Interface OrganizationAssetsPaneState
 * @interface OrganizationAssetsPaneState
 *
 * @description
 * State of the assets explorer's right pane: the equipment and inspections
 * for whatever the left tree currently scopes the view to — one facility, or
 * the whole organization on the "everything" axis.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface OrganizationAssetsPaneState {
  //#region Properties
  /** The equipment currently in view. */
  readonly equipmentListCallState: CallState<readonly EquipmentOutput[]>;

  /** The inspections currently in view. */
  readonly inspectionListCallState: CallState<readonly InspectionOutput[]>;
  //#endregion
}
