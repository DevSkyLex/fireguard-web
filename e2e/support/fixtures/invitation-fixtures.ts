/**
 * Organization invitation transport fixtures for the e2e suite, mirroring
 * the backend contract consumed by the public invitation-accept page. Plain
 * factory functions (like `api-fixtures.ts`) so tests override fields via
 * object spread.
 */

import { E2E_ORGANIZATION_ID } from './api-fixtures';

/** Invitation token the accept-page e2e scenarios deep-link into. */
export const E2E_INVITATION_TOKEN = 'e2e-invitation-token';

export interface OrganizationInvitationPreviewOutputFixture {
  readonly '@id': string;
  readonly '@type': string;
  readonly organizationId: string;
  readonly organizationName: string;
  readonly organizationLogoUrl: string | null;
  readonly inviterDisplayName: string;
  readonly invitedEmail: string;
  readonly status: 'pending' | 'accepted' | 'revoked' | 'expired';
  readonly expiresAt: string;
}

/** A still-open invitation — renders the accept card with its Accept CTA. */
export function invitationPreviewOutput(
  overrides: Partial<OrganizationInvitationPreviewOutputFixture> = {},
): OrganizationInvitationPreviewOutputFixture {
  return {
    '@id': `/api/organizations/invitations/${E2E_INVITATION_TOKEN}/preview`,
    '@type': 'OrganizationInvitationPreview',
    organizationId: E2E_ORGANIZATION_ID,
    organizationName: 'E2E Organization',
    organizationLogoUrl: null,
    inviterDisplayName: 'Ella Uzer',
    invitedEmail: 'invitee@fireguard.test',
    status: 'pending',
    expiresAt: '2026-09-01T00:00:00+00:00',
    ...overrides,
  };
}

export interface OrganizationMemberOutputFixture {
  readonly '@id': string;
  readonly '@type': string;
  readonly id: string;
  readonly organizationId: string;
  readonly userId: string;
  readonly email?: string | null;
  readonly firstName?: string | null;
  readonly lastName?: string | null;
  readonly displayName?: string;
  readonly avatarUrl?: string | null;
  readonly isActive: boolean;
  readonly joinedAt: string;
  readonly roleIds: ReadonlyArray<string>;
  readonly roleNames?: ReadonlyArray<string>;
}

/** The membership created once an invitation is accepted. */
export function acceptedOrganizationMemberOutput(
  overrides: Partial<OrganizationMemberOutputFixture> = {},
): OrganizationMemberOutputFixture {
  return {
    '@id': '/api/organizations/members/e2e-member-2',
    '@type': 'OrganizationMember',
    id: 'e2e-member-2',
    organizationId: E2E_ORGANIZATION_ID,
    userId: 'e2e-user-1',
    email: 'invitee@fireguard.test',
    firstName: 'Ella',
    lastName: 'Uzer',
    displayName: 'Ella Uzer',
    avatarUrl: null,
    isActive: true,
    joinedAt: '2026-08-11T00:00:00+00:00',
    roleIds: [],
    roleNames: [],
    ...overrides,
  };
}
