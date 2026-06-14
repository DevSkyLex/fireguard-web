/**
 * Command loading missions for an organization.
 */
export interface MissionListLoadCommand {
  readonly organizationId: string;
}

/**
 * Command creating a mission from the manager list.
 */
export interface MissionCreateCommand {
  readonly organizationId: string;
  readonly name: string;
}
