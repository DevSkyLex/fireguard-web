import type {
  InterventionListOptions,
  InterventionPriority,
  InterventionStatus,
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

/**
 * Command applying a single status transition to a cached intervention entity.
 * Carries the revision required for the optimistic-concurrency `If-Match`
 * header; the store patches the entity optimistically and rolls back on
 * failure.
 */
export interface InterventionTransitionCommand {
  readonly id: string;
  readonly status: InterventionStatus;
  readonly revision: number;
}

/**
 * Command deleting a single cached intervention entity. Carries the revision
 * required for the optimistic-concurrency `If-Match` header; the store may
 * receive several of these in quick succession (bulk selection), each
 * resolved independently.
 */
export interface InterventionDeleteCommand {
  readonly interventionId: string;
  readonly revision: number;
}

/**
 * Command assigning a responsible member to a single cached intervention
 * entity. Carries the revision required for the optimistic-concurrency
 * `If-Match` header; the store may receive several of these in quick
 * succession (bulk assignment from the list), each resolved independently.
 */
export interface InterventionAssignCommand {
  readonly interventionId: string;
  readonly responsible: string;
  readonly revision: number;
}
