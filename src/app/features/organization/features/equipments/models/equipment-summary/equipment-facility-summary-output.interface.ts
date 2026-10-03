import type { HydraItem } from '@core/api/models';
import type { EquipmentStatus } from '../equipment/equipment-output.interface';

/**
 * Interface EquipmentFacilitySummaryOutput
 * @interface EquipmentFacilitySummaryOutput
 *
 * @description
 * Exact equipment counts in one facility scope, independent of collection pages.
 *
 * @since unreleased
 */
export interface EquipmentFacilitySummaryOutput extends HydraItem {
  /**
   * Property scope
   * @readonly
   *
   * @description
   * Whether the counts include descendant facilities.
   *
   * @type {'subtree' | 'direct'}
   */
  readonly scope: 'subtree' | 'direct';

  /**
   * Property totalItems
   * @readonly
   *
   * @description
   * Number of equipment records across the complete scope.
   *
   * @type {number}
   */
  readonly totalItems: number;

  /**
   * Property byStatus
   * @readonly
   *
   * @description
   * Counts for every published equipment status, including zero counts.
   *
   * @type {Readonly<Record<EquipmentStatus, number>>}
   */
  readonly byStatus: Readonly<Record<EquipmentStatus, number>>;

  /**
   * Property needingAttentionCount
   * @readonly
   *
   * @description
   * Equipment under maintenance or decommissioned in the complete scope.
   *
   * @type {number}
   */
  readonly needingAttentionCount: number;
}
