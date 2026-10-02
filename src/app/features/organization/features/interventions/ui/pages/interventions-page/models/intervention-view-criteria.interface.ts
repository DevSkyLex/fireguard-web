import type { InterventionFilterFieldKey } from '@features/organization/features/interventions/models';
import type { InterventionView } from './intervention-view.type';

/**
 * Interface InterventionViewCriteria
 * @interface InterventionViewCriteria
 *
 * @description
 * The permitted collection view and its visible filter catalogue, without altering the route.
 *
 * @access public
 */
export interface InterventionViewCriteria {
  /**
   * Property view
   * @readonly
   *
   * @description
   * The permitted collection surface.
   *
   * @access public
   *
   * @type {InterventionView}
   */
  readonly view: InterventionView;

  /**
   * Property filterKeys
   * @readonly
   *
   * @description
   * The fields this view actually honours, in the filter menu's order.
   *
   * @access public
   *
   * @type {readonly InterventionFilterFieldKey[]}
   */
  readonly filterKeys: readonly InterventionFilterFieldKey[];
}
