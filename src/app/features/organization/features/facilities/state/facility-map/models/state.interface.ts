import type { CallState } from '@core/request-state';
import type { FacilityOutput } from '@features/organization/features/facilities/models';

/**
 * Interface FacilityMapState
 * @interface FacilityMapState
 *
 * @description
 * Component-level state interface for the facility map store: the located
 * facilities the map renders, and the count of facilities still missing
 * coordinates (`FEATURE.md` "Unplaced facilities affordance").
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface FacilityMapState {
  /**
   * Property mappedCallState
   * @readonly
   * @description Tracks the load of every facility with both coordinates set.
   * @since 1.0.0
   * @type {CallState<readonly FacilityOutput[]>}
   */
  readonly mappedCallState: CallState<readonly FacilityOutput[]>;

  /**
   * Property unplacedCallState
   * @readonly
   * @description Tracks the load of the total count of facilities missing a coordinate.
   * @since 1.0.0
   * @type {CallState<number>}
   */
  readonly unplacedCallState: CallState<number>;
}
