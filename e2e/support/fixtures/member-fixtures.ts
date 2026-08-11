/**
 * Organization member and invitation transport fixtures for the e2e suite,
 * mirroring the backend contract consumed by the members page. Plain factory
 * functions (like `api-fixtures.ts`), so tests override fields via object
 * spread. The member shape is shared with `invitation-fixtures.ts`, which
 * owns {@link OrganizationMemberOutputFixture}.
 */

import { E2E_ORGANIZATION_ID } from './api-fixtures';
import type { OrganizationMemberOutputFixture } from './invitation-fixtures';

/** Member the members-page e2e scenarios read and act on. */
export const E2E_MEMBER_ID = 'e2e-member-1';

/** The acting member's own roster row — active, holding the Owner role. */
export function organizationMemberOutput(
  overrides: Partial<OrganizationMemberOutputFixture> = {},
): OrganizationMemberOutputFixture {
  return {
    '@id': `/api/organizations/members/${E2E_MEMBER_ID}`,
    '@type': 'OrganizationMember',
    id: E2E_MEMBER_ID,
    organizationId: E2E_ORGANIZATION_ID,
    userId: 'e2e-user-1',
    email: 'e2e.user@fireguard.test',
    firstName: 'Ella',
    lastName: 'Uzer',
    displayName: 'Ella Uzer',
    avatarUrl: null,
    isActive: true,
    joinedAt: '2026-01-01T00:00:00+00:00',
    roleIds: ['e2e-role-owner'],
    roleNames: ['Owner'],
    ...overrides,
  };
}

/** A second, non-owner member — populates a multi-row roster. */
export function inspectorOrganizationMemberOutput(
  overrides: Partial<OrganizationMemberOutputFixture> = {},
): OrganizationMemberOutputFixture {
  return organizationMemberOutput({
    id: 'e2e-member-2',
    '@id': '/api/organizations/members/e2e-member-2',
    userId: 'e2e-user-2',
    email: 'inspector@fireguard.test',
    firstName: 'Ines',
    lastName: 'Pector',
    displayName: 'Ines Pector',
    roleIds: ['e2e-role-inspector'],
    roleNames: ['Inspector'],
    ...overrides,
  });
}

export interface OrganizationInvitationOutputFixture {
  readonly '@id': string;
  readonly '@type': string;
  readonly id: string;
  readonly organizationId: string;
  readonly email: string;
  readonly status: 'pending' | 'accepted' | 'revoked' | 'expired';
  readonly invitedByUserId: string;
  readonly invitedByDisplayName?: string | null;
  readonly acceptedByUserId: string | null;
  readonly revokedByUserId: string | null;
  readonly expiresAt: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly roleIds: ReadonlyArray<string>;
  readonly acceptUrl?: string;
}

/** A still-open invitation — renders in the members page's pending-invitations grid. */
export function organizationInvitationOutput(
  overrides: Partial<OrganizationInvitationOutputFixture> = {},
): OrganizationInvitationOutputFixture {
  return {
    '@id': '/api/organizations/invitations/e2e-invitation-1',
    '@type': 'OrganizationInvitation',
    id: 'e2e-invitation-1',
    organizationId: E2E_ORGANIZATION_ID,
    email: 'newcomer@fireguard.test',
    status: 'pending',
    invitedByUserId: 'e2e-user-1',
    invitedByDisplayName: 'Ella Uzer',
    acceptedByUserId: null,
    revokedByUserId: null,
    expiresAt: '2026-09-01T00:00:00+00:00',
    createdAt: '2026-08-01T00:00:00+00:00',
    updatedAt: '2026-08-01T00:00:00+00:00',
    roleIds: [],
    acceptUrl:
      'https://fireguard.test/organizations/invitations/accept?token=e2e-invitation-token-1',
    ...overrides,
  };
}
