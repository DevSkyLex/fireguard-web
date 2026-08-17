import type { SortDirection } from '@core/api';

/**
 * Type EquipmentSortField
 *
 * @description
 * The fields the equipment collection can be ordered by — the backend's own
 * sort whitelist for `GET /api/organizations/{organizationId}/equipment`
 * (`ListEquipmentsProvider`), passed through as `order[field]` with no
 * mapping.
 *
 * @since 1.2.0
 */
export type EquipmentSortField = 'type' | 'status' | 'brand' | 'model' | 'createdAt' | 'updatedAt';

/**
 * Interface EquipmentListSort
 * @interface EquipmentListSort
 *
 * @description
 * How the equipment collection is ordered: which field, and which way.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface EquipmentListSort {
  //#region Properties
  /** Field the collection is ordered by. */
  readonly field: EquipmentSortField;

  /** Direction, in the API's own vocabulary. */
  readonly direction: SortDirection;
  //#endregion
}
