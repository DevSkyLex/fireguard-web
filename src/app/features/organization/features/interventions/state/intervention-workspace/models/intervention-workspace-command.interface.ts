import type { InterventionService } from '@features/organization/features/interventions/data-access';
import type {
  CreateInterventionWorkItemInput,
  InterventionWorkItemOutput,
  InterventionWorkItemStatusChange,
} from '@features/organization/features/interventions/models';

/**
 * Interface InterventionDetailsUpdateCommand
 * @interface InterventionDetailsUpdateCommand
 *
 * @description
 * Command used to update intervention planning details.
 *
 * @since 1.0.0
 */
export interface InterventionDetailsUpdateCommand {
  readonly interventionId: string;
  readonly input: Parameters<InterventionService['update']>[1];
}

/**
 * Interface InterventionWorkItemCreateCommand
 * @interface InterventionWorkItemCreateCommand
 *
 * @description
 * Command used to create an intervention work item.
 *
 * @since 1.0.0
 */
export interface InterventionWorkItemCreateCommand {
  readonly interventionId: string;
  readonly input: CreateInterventionWorkItemInput;
}

/**
 * Interface InterventionWorkItemStatusCommand
 * @interface InterventionWorkItemStatusCommand
 *
 * @description
 * Command used to update an intervention work item status.
 *
 * @since 1.0.0
 */
export interface InterventionWorkItemStatusCommand extends InterventionWorkItemStatusChange {
  readonly interventionId: string;
}

/**
 * Interface InterventionWorkItemDeleteCommand
 * @interface InterventionWorkItemDeleteCommand
 *
 * @description
 * Command used to delete one or more prepared intervention work items in a
 * single batch. Each work item carries the revision required for its
 * optimistic-concurrency `If-Match` header.
 *
 * @since 1.0.0
 */
export interface InterventionWorkItemDeleteCommand {
  readonly interventionId: string;
  readonly workItems: readonly InterventionWorkItemOutput[];
}
