import type { InterventionPriority } from '@features/organization/features/interventions/models';

/**
 * Partial planning fields captured by one guided-planning step, emitted for a
 * merge-patch save. Only the keys the step actually edited are present.
 */
export type InterventionPlanningGuideValues = Partial<{
  readonly name: string;
  readonly description: string | null;
  readonly site: string | null;
  readonly responsible: string | null;
  readonly participants: readonly string[];
  readonly priority: InterventionPriority;
  readonly plannedStartAt: Date | null;
  readonly dueAt: Date | null;
}>;
