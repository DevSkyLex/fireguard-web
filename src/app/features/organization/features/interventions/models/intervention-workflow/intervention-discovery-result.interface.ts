import type { CreateInterventionWorkItemInput } from '../intervention-work-item/create-intervention-work-item-input.interface';

/**
 * Result of creating the canonical resource and work item for a discovery.
 */
export interface InterventionDiscoveryResult {
  readonly queued: boolean;
  readonly workItem: CreateInterventionWorkItemInput;
}
