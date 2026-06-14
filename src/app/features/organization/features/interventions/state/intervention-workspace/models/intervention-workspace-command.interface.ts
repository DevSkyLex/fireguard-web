import type { InterventionService } from '@features/organization/features/interventions/data-access';
import type {
  CreateInterventionWorkItemInput,
  InterventionWorkItemStatusChange,
} from '@features/organization/features/interventions/models';

export interface InterventionDetailsUpdateCommand {
  readonly interventionId: string;
  readonly input: Parameters<InterventionService['update']>[1];
}

export interface InterventionWorkItemCreateCommand {
  readonly interventionId: string;
  readonly input: CreateInterventionWorkItemInput;
}

export interface InterventionWorkItemStatusCommand extends InterventionWorkItemStatusChange {
  readonly interventionId: string;
}
