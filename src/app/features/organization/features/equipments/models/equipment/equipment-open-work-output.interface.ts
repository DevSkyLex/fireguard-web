import type { HydraItem } from '@core/api/models';

/**
 * Interface EquipmentOpenWorkOutput
 * @interface EquipmentOpenWorkOutput
 *
 * @description
 * Intervention-owned open work projection for one authorized equipment.
 */
export interface EquipmentOpenWorkOutput extends HydraItem {
  /**
   * Property interventionId
   *
   * @description
   * Authorized intervention containing this work.
   */
  readonly interventionId: string;

  /**
   * Property number
   *
   * @description
   * Human-readable intervention number, when assigned.
   */
  readonly number?: number | null;

  /**
   * Property name
   *
   * @description
   * Display name of the authorized intervention.
   */
  readonly name?: string | null;

  /**
   * Property status
   *
   * @description
   * Intervention workflow status, independent of equipment lifecycle.
   */
  readonly status: string;

  /**
   * Property workItemId
   *
   * @description
   * Stable work item identity revealed by the intervention deep link.
   */
  readonly workItemId: string;

  /**
   * Property action
   *
   * @description
   * Work operation offered by the intervention module.
   */
  readonly action: string;

  /**
   * Property workItemStatus
   *
   * @description
   * Execution state of the specific equipment work item.
   */
  readonly workItemStatus: string;
}
