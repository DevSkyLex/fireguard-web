import type { HydraItem } from '@core/models/api';
import type { MissionWorkItemAction } from '../mission-work-item/mission-work-item-action.type';

/**
 * Interface MissionTypeOutput
 * @interface MissionTypeOutput
 *
 * @description
 * Defines the mission type output contract.
 */
export interface MissionTypeOutput extends HydraItem {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Provides the id value.
   *
   * @type {'site_setup' | 'inventory' | 'inspection_campaign'}
   */
  readonly id: 'site_setup' | 'inventory' | 'inspection_campaign';

  /**
   * Property label
   * @readonly
   *
   * @description
   * Provides the label value.
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property description
   * @readonly
   *
   * @description
   * Provides the description value.
   *
   * @type {string}
   */
  readonly description: string;

  /**
   * Property actions
   * @readonly
   *
   * @description
   * Provides the actions value.
   *
   * @type {readonly MissionWorkItemAction[]}
   */
  readonly actions: readonly MissionWorkItemAction[];
}
