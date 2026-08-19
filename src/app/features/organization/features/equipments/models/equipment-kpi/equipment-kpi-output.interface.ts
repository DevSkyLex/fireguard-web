import type { HydraItem } from '@core/api/models';

/**
 * Interface EquipmentKpiOutput
 * @interface EquipmentKpiOutput
 *
 * @description
 * The organization's equipment overview KPI snapshot
 * (`GET /organizations/{organizationId}/equipment/kpis`): the list page's
 * KPI strip. `openNonConformities` is deliberately ORGANIZATION-WIDE, not
 * equipment-scoped — non-conformities attach to inspections, not to
 * equipment, so there is no reliable per-equipment count.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface EquipmentKpiOutput extends HydraItem {
  //#region Properties
  /**
   * Property totalAssets
   * @readonly
   *
   * @description
   * Total equipment count for the organization, every status included
   * (decommissioned equipment stays a recorded asset).
   *
   * @type {number}
   */
  readonly totalAssets: number;

  /**
   * Property compliant
   * @readonly
   *
   * @description
   * Equipment count whose cross-module maintenance due status is
   * `up_to_date`.
   *
   * @type {number}
   */
  readonly compliant: number;

  /**
   * Property dueSoon
   * @readonly
   *
   * @description
   * Equipment count whose cross-module maintenance due status is
   * `due_soon`.
   *
   * @type {number}
   */
  readonly dueSoon: number;

  /**
   * Property openNonConformities
   * @readonly
   *
   * @description
   * Every non-conformity currently `open` or `in_progress` across the
   * whole organization — not scoped to this feature's equipment records.
   *
   * @type {number}
   */
  readonly openNonConformities: number;
  //#endregion
}
