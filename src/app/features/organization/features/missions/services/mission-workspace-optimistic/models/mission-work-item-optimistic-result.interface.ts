import type {
  MissionOutput,
  MissionWorkItemOutput,
} from '@features/organization/features/missions/models';

/**
 * Optimistic workspace state produced by a work-item mutation.
 */
export interface MissionWorkItemOptimisticResult {
  readonly mission: MissionOutput | null;
  readonly workItem: MissionWorkItemOutput;
}
