import type { CallState } from '@core/request-state';
import type { OrganizationRoleOutput } from '@features/organization/models';

/**
 * Options controlling which member-page resources are loaded, gated by the
 * active member's permissions.
 */
export interface OrganizationMembersLoadOptions {
  /** Active organization identifier. */
  readonly organizationId: string;
  /** Whether to load members. */
  readonly includeMembers: boolean;
  /** Whether to load pending/past invitations. */
  readonly includeInvitations: boolean;
  /** Whether to load roles (for chips and role assignment). */
  readonly includeRoles: boolean;
}

/**
 * State owned by the organization members page workflow store.
 *
 * Members and invitations are managed as `withEntities` collections (`member`,
 * `invitation`); only roles, the link map and call states live in plain state.
 */
export interface OrganizationMembersState {
  /** Loaded organization roles. */
  readonly roles: OrganizationRoleOutput[];
  /** Total members matching the current server-side query (for pagination). */
  readonly membersTotal: number;
  /** One-based current members page. */
  readonly membersPage: number;
  /** Active server-side member search term. */
  readonly membersSearch: string;
  /**
   * Map of invitation id → fresh accept link, captured from invite/resend
   * responses (the raw token is never recoverable from a listed invitation).
   */
  readonly invitationLinks: Record<string, string>;
  /** Request state for the initial resource load. */
  readonly loadCallState: CallState;
  /** Request state for member/invitation mutations. */
  readonly mutationCallState: CallState;
  /**
   * Whether the last dispatched mutation can be rejected for exceeding the plan
   * quota (only inviting a member does). Lets the page tell a quota 409 — which
   * opens the upgrade dialog — apart from other 409s such as the last-admin guard.
   */
  readonly lastMutationCanExceedQuota: boolean;
}
