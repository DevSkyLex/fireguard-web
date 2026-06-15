import type { InterventionPriority } from '@features/organization/features/interventions/models';

/** Editable values emitted by the intervention planning form. */
export interface InterventionPlanningFormValues {
  readonly site: string;
  readonly responsible: string;
  readonly participants: readonly string[];
  readonly priority: InterventionPriority;
  readonly plannedStartAt: Date | null;
  readonly dueAt: Date | null;
}
