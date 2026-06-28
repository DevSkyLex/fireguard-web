import type { CallState } from '@core/request-state';
import type {
  OrganizationInvitationOutput,
  OrganizationMemberOutput,
  OrganizationPermissionOutput,
  OrganizationRoleOutput,
} from '@features/organization/models';

/**
 * Interface OrganizationTeamState
 * @interface OrganizationTeamState
 *
 * @description
 * State owned by the organization team workflow: the loaded members, roles,
 * invitations, and assignable permissions, plus the shared load and mutation
 * call states.
 */
export interface OrganizationTeamState {
  /** Members loaded for the active organization. */
  readonly members: readonly OrganizationMemberOutput[];
  /** Roles loaded for the active organization. */
  readonly roles: readonly OrganizationRoleOutput[];
  /** Pending invitations loaded for the active organization. */
  readonly invitations: readonly OrganizationInvitationOutput[];
  /** Permissions available for role configuration. */
  readonly permissions: readonly OrganizationPermissionOutput[];
  /** Request state for team resource loading. */
  readonly loadCallState: CallState;
  /** Request state shared by team mutations. */
  readonly mutationCallState: CallState;
}

/**
 * Interface OrganizationTeamLoadOptions
 * @interface OrganizationTeamLoadOptions
 *
 * @description
 * Selects the team resources that must be loaded for the current member, so the
 * load action only fetches what the active member is permitted to read.
 */
export interface OrganizationTeamLoadOptions {
  /** Organization whose team resources must be loaded. */
  readonly organizationId: string;
  /** Whether members must be loaded. */
  readonly includeMembers: boolean;
  /** Whether roles must be loaded. */
  readonly includeRoles: boolean;
  /** Whether invitations must be loaded. */
  readonly includeInvitations: boolean;
  /** Whether permissions must be loaded. */
  readonly includePermissions: boolean;
}
