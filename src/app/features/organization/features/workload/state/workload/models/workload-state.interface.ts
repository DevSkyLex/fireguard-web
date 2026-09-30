import type { CallState } from '@core/request-state';
import type {
  CapacityOutput,
  WorkloadOutput,
  WorkloadQuery,
} from '@features/organization/features/workload/models';

/**
 * Interface WorkloadState
 * @interface WorkloadState
 *
 * @description
 * Independent reads and writes for one workload page.
 *
 * @since 1.0.0
 */
export interface WorkloadState {
  /**
   * Property query
   * @readonly
   *
   * @description
   * Carries the filters used to load this workload collection.
   *
   * @access public
   *
   * @type {WorkloadQuery | null}
   */
  readonly query: WorkloadQuery | null;

  /**
   * Property projectionCallState
   * @readonly
   *
   * @description
   * Tracks the request state for projection.
   *
   * @access public
   *
   * @type {CallState<WorkloadOutput>}
   */
  readonly projectionCallState: CallState<WorkloadOutput>;

  /**
   * Property capacityCallState
   * @readonly
   *
   * @description
   * Tracks the request state for capacity.
   *
   * @access public
   *
   * @type {CallState<CapacityOutput>}
   */
  readonly capacityCallState: CallState<CapacityOutput>;

  /**
   * Property capacityWriteCallState
   * @readonly
   *
   * @description
   * Tracks the request state for capacity write.
   *
   * @access public
   *
   * @type {CallState}
   */
  readonly capacityWriteCallState: CallState;

  /**
   * Property capacityScope
   * @readonly
   *
   * @description
   * Identifies the organization and optional member whose capacity is loaded.
   *
   * @access public
   *
   * @type {{ readonly organizationId: string; readonly memberId: string | null } | null}
   */
  readonly capacityScope: {
    readonly organizationId: string;
    readonly memberId: string | null;
  } | null;
}
