import type {
  InterventionListOptions,
  InterventionPriority,
  InterventionType,
} from '@features/organization/features/interventions/models';

/**
 * Command loading interventions for an organization.
 */
export interface InterventionListLoadCommand {
  readonly organizationId: string;

  /**
   * Pagination, status filter and sort options forwarded to the API.
   */
  readonly options?: InterventionListOptions;
}

/**
 * Command creating an intervention from the manager list. Carries the full
 * guided-creation payload so the store owns the whole create workflow (request
 * state + success handoff) instead of the page calling the service directly.
 */
export interface InterventionCreateCommand {
  readonly organizationId: string;
  readonly name: string;
  readonly type?: InterventionType;
  readonly site?: string;
  readonly responsible?: string;
  readonly participants?: readonly string[];
  readonly priority?: InterventionPriority;
  readonly plannedStartAt?: Date;
  readonly dueAt?: Date;
}
