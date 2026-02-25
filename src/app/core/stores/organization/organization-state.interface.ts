import type {
  OrganizationOutput,
  OrganizationMemberOutput,
  OrganizationRoleOutput,
  OrganizationInvitationOutput,
  OrganizationLegalProfileOutput,
} from '@core/models/organization';
import type { CollectionOperation, Operation } from '@core/stores/operations';

/**
 * Interface OrganizationState
 * @interface OrganizationState
 *
 * @description
 * State interface for the organization store.
 * Manages the full lifecycle of organization management:
 * organization list & detail, members, roles, invitations, and legal profile.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface OrganizationState {
  //#region Organizations
  /** List of organizations the user belongs to. */
  readonly organizations: ReadonlyArray<OrganizationOutput>;
  /** Total count of organizations (for pagination). */
  readonly totalOrganizations: number;
  /** Currently selected / viewed organization. */
  readonly selectedOrganization: OrganizationOutput | null;

  readonly listOperation: CollectionOperation<OrganizationOutput, unknown>;
  readonly getOperation: Operation<OrganizationOutput | null, unknown>;
  readonly createOperation: Operation<OrganizationOutput | null, unknown>;
  //#endregion

  //#region Members
  readonly members: ReadonlyArray<OrganizationMemberOutput>;
  readonly totalMembers: number;
  readonly membersListOperation: CollectionOperation<OrganizationMemberOutput, unknown>;
  readonly addMemberOperation: Operation<OrganizationMemberOutput | null, unknown>;
  //#endregion

  //#region Roles
  readonly roles: ReadonlyArray<OrganizationRoleOutput>;
  readonly totalRoles: number;
  readonly rolesListOperation: CollectionOperation<OrganizationRoleOutput, unknown>;
  readonly createRoleOperation: Operation<OrganizationRoleOutput | null, unknown>;
  //#endregion

  //#region Invitations
  readonly invitations: ReadonlyArray<OrganizationInvitationOutput>;
  readonly totalInvitations: number;
  readonly invitationsListOperation: CollectionOperation<OrganizationInvitationOutput, unknown>;
  readonly inviteOperation: Operation<OrganizationInvitationOutput | null, unknown>;
  readonly revokeInvitationOperation: Operation<OrganizationInvitationOutput | null, unknown>;
  //#endregion

  //#region Legal Profile
  readonly legalProfile: OrganizationLegalProfileOutput | null;
  readonly legalProfileOperation: Operation<OrganizationLegalProfileOutput | null, unknown>;
  readonly upsertLegalProfileOperation: Operation<OrganizationLegalProfileOutput | null, unknown>;
  //#endregion
}
