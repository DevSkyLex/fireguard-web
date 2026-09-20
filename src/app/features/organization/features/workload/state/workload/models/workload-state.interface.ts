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
  readonly query: WorkloadQuery | null;
  readonly projectionCallState: CallState<WorkloadOutput>;
  readonly capacityCallState: CallState<CapacityOutput>;
  readonly capacityWriteCallState: CallState;
  readonly capacityScope: {
    readonly organizationId: string;
    readonly memberId: string | null;
  } | null;
}
