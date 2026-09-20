import type { InterventionTransitionRequest } from '@features/organization/features/interventions/models';
import type { WorkloadAssessment } from '@features/organization/features/workload/models';
import type { InterventionWorkItemUpdateCommand } from './intervention-work-item-update-command.interface';
import type {
  InterventionDetailsUpdateCommand,
  InterventionWorkItemCreateCommand,
} from './intervention-workspace-command.interface';

/**
 * Type InterventionPlanningConfirmation
 * @type InterventionPlanningConfirmation
 *
 * @description
 * Captured intention and its exact server assessment. Revisions are never silently rebased.
 *
 * @since 1.0.0
 */
export type InterventionPlanningConfirmation = { readonly assessment: WorkloadAssessment } & (
  | { readonly kind: 'create'; readonly command: InterventionWorkItemCreateCommand }
  | { readonly kind: 'transition'; readonly command: InterventionTransitionRequest }
  | { readonly kind: 'details'; readonly command: InterventionDetailsUpdateCommand }
  | { readonly kind: 'workItem'; readonly command: InterventionWorkItemUpdateCommand }
);
