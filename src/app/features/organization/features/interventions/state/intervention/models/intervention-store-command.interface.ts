import type { InterventionListOptions } from '@features/organization/features/interventions/models';

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
 * Command creating a intervention from the manager list.
 */
export interface InterventionCreateCommand {
  readonly organizationId: string;
  readonly name: string;
}
