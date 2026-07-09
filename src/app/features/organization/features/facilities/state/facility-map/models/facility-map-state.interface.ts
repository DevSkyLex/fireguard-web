import type { CallState } from '@core/request-state';
import type { FacilityOutput } from '@features/organization/features/facilities/models';

/**
 * Interface FacilityMapState
 * @interface FacilityMapState
 *
 * @description
 * State for the facilities map: the full set of the organization's facilities
 * loaded browser-side for plotting, plus the async call state of that load.
 */
export interface FacilityMapState {
  /** Every facility loaded for the current organization. */
  readonly facilities: readonly FacilityOutput[];
  /** Async state of the facilities load. */
  readonly loadCallState: CallState<readonly FacilityOutput[]>;
}
