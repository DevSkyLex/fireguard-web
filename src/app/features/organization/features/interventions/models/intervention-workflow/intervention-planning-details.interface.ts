import type { InterventionPriority } from '../intervention/intervention-priority.type';

/**
 * Editable planning details submitted by the prepare workflow.
 */
export interface InterventionPlanningDetails {
  readonly site: string;
  readonly responsible: string;
  readonly participants: readonly string[];
  readonly priority: InterventionPriority;
  readonly plannedStartAt: Date | null;
  readonly dueAt: Date | null;
}
