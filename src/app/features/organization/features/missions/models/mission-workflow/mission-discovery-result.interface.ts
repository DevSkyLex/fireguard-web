import type { CreateMissionWorkItemInput } from '../mission-work-item/create-mission-work-item-input.interface';

/**
 * Result of creating the canonical resource and work item for a discovery.
 */
export interface MissionDiscoveryResult {
  readonly queued: boolean;
  readonly workItem: CreateMissionWorkItemInput;
}
