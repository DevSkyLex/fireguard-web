import type { CallState } from '@core/request-state';
import type {
  FacilityOutput,
  FacilityType,
} from '@features/organization/features/facilities/models';

/**
 * Interface FacilityOptionsState
 * @interface FacilityOptionsState
 *
 * @description
 * The organization's facilities as loaded for a picker, and the lifecycle
 * of that load. The raw records are kept so the map centre can be averaged
 * from their coordinates; the picker reads the derived `options` signal.
 *
 * @since 1.0.0
 */
export interface FacilityOptionsState {
  /**
   * Property interventionId
   *
   * @description
   * Property interventionId
   * Current creation workspace; null for a published-place picker.
   */
  readonly interventionId: string | null;
  /**
   * Property parentForType
   *
   * @description
   * Stores parentForType.
   */
  readonly parentForType: FacilityType | null;
  /**
   * Property parentForFacilityId
   *
   * @description
   * Existing facility whose admissible parents are requested, excluding cycles.
   */
  readonly parentForFacilityId: string | null;
  /**
   * Property selectedFacility
   *
   * @description
   * Independently hydrated selected record outside the current server page.
   */
  readonly selectedFacility: FacilityOutput | null;
  /**
   * Property selectedCallState
   *
   * @description
   * Lifecycle of the selected record hydration.
   */
  readonly selectedCallState: CallState;

  /**
   * Property page
   * @readonly
   *
   * @description
   * One-based facility server page.
   *
   * @access public
   *
   * @type {number}
   */
  readonly page: number;

  /**
   * Property total
   * @readonly
   *
   * @description
   * Server count of facilities matching the current search.
   *
   * @access public
   *
   * @type {number}
   */
  readonly total: number;

  /**
   * Property search
   * @readonly
   *
   * @description
   * Search applied to the facility selector.
   *
   * @access public
   *
   * @type {string}
   */
  readonly search: string;
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Organization owning the cached options, including an empty successful list.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string | null}
   */
  readonly organizationId: string | null;

  /**
   * Property facilities
   *
   * @description
   * The loaded facilities, in API order.
   */
  readonly facilities: readonly FacilityOutput[];

  /**
   * Property loadCallState
   *
   * @description
   * Lifecycle of the options load (pending / success / error).
   */
  readonly loadCallState: CallState;
}
