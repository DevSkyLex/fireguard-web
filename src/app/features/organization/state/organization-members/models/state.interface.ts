import type { CallState } from '@core/request-state';
import type {
  OrganizationMemberStatusFilter,
  OrganizationRoleOutput,
} from '@features/organization/models';

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
  /** Rows per members page, chosen from the pagination band's rows-per-page select. */
  readonly membersPageSize: number;
  /** Active server-side member search term. */
  readonly membersSearch: string;
  /** Active server-side member status filter. */
  readonly membersStatus: OrganizationMemberStatusFilter;
  /**
   * Organization-wide count of active memberships, fetched once alongside the
   * initial load and independent of {@link membersSearch} / {@link membersStatus}
   * — a fixed KPI snapshot rather than a count that would shrink to zero the
   * moment the roster is filtered to `inactive`.
   */
  readonly membersActiveTotal: number;
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
