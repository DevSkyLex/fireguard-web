import type { HydraItem } from '@core/api/models';
import type { InterventionWorkItemAction } from '../intervention-work-item/intervention-work-item-action.type';

/**
 * Interface InterventionTypeOutput
 * @interface InterventionTypeOutput
 *
 * @description
 * Defines the intervention type output contract.
 */
export interface InterventionTypeOutput extends HydraItem {
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
   * @type {readonly InterventionWorkItemAction[]}
   */
  readonly actions: readonly InterventionWorkItemAction[];
}
