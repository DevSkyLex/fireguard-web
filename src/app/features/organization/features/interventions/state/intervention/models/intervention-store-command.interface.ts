/**
 * Command loading interventions for an organization.
 */
export interface InterventionListLoadCommand {
  readonly organizationId: string;
}

/**
 * Command creating a intervention from the manager list.
 */
export interface InterventionCreateCommand {
  readonly organizationId: string;
  readonly name: string;
}
