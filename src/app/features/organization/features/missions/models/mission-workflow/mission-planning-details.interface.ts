import type { MissionPriority } from '../mission/mission-priority.type';

/**
 * Editable planning details submitted by the prepare workflow.
 */
export interface MissionPlanningDetails {
  readonly site: string;
  readonly responsible: string;
  readonly participants: readonly string[];
  readonly priority: MissionPriority;
  readonly plannedStartAt: string;
  readonly dueAt: string;
}
