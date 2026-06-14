import type {
  InterventionOutput,
  InterventionWorkItemOutput,
} from '@features/organization/features/interventions/models';

/**
 * Optimistic workspace state produced by a work-item mutation.
 */
export interface InterventionWorkItemOptimisticResult {
  readonly intervention: InterventionOutput | null;
  readonly workItem: InterventionWorkItemOutput;
}
