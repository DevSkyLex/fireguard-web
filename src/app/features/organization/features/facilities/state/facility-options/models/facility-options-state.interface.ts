import type { CallState } from '@core/request-state';
import type { FacilityOutput } from '@features/organization/features/facilities/models';

/**
 * Interface FacilityOptionsState
 * @interface FacilityOptionsState
 * @description
 * The organization's facilities as loaded for a picker, and the lifecycle
 * of that load. The raw records are kept so the map centre can be averaged
 * from their coordinates; the picker reads the derived `options` signal.
 * @since 1.0.0
 */
export interface FacilityOptionsState {
  /** The loaded facilities, in API order. */
  readonly facilities: readonly FacilityOutput[];

  /** Lifecycle of the options load (pending / success / error). */
  readonly loadCallState: CallState;
}
