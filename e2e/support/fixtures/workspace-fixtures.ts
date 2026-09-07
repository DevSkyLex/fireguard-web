import type { OrganizationAvailableInvitationOutput } from '../../../src/app/features/organization/models/access/organization-available-invitation-output.interface';
import type { OrganizationJoinOptionOutput } from '../../../src/app/features/organization/models/access/organization-join-option-output.interface';
import type { OrganizationJoinOptionsOutput } from '../../../src/app/features/organization/models/access/organization-join-options-output.interface';
import type { OrganizationJoinRequestOutput } from '../../../src/app/features/organization/models/access/organization-join-request-output.interface';
import { E2E_ORGANIZATION_ID } from './api-fixtures';

/** Caller-owned invitation fixture, with no bearer invitation token. */
export function workspaceInvitation(): OrganizationAvailableInvitationOutput {
  return {
    '@id': '/api/organizations/invitations/e2e-invitation',
    '@type': 'OrganizationAvailableInvitation',
    id: 'e2e-invitation',
    organizationId: E2E_ORGANIZATION_ID,
    organizationName: 'Invited safety team',
    expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
  };
}

/** Exact-domain match with one server-authorized action. */
export function workspaceOrganization(
  overrides: Partial<OrganizationJoinOptionOutput> = {},
): OrganizationJoinOptionOutput {
  return {
    '@id': '/api/organizations/' + E2E_ORGANIZATION_ID,
    '@type': 'OrganizationJoinOption',
    id: E2E_ORGANIZATION_ID,
    name: 'Northern regional fire safety and maintenance operations',
    domain: 'regional-maintenance.example.com',
    actions: ['request'],
    ...overrides,
  };
}

/** Pending requests expire relative to the current test date. */
export function workspaceRequest(
  overrides: Partial<OrganizationJoinRequestOutput> = {},
): OrganizationJoinRequestOutput {
  return {
    '@id': '/api/organizations/join-requests/e2e-request',
    '@type': 'OrganizationJoinRequest',
    id: 'e2e-request',
    organizationId: E2E_ORGANIZATION_ID,
    organizationName: workspaceOrganization().name,
    status: 'pending',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    actions: ['cancel'],
    ...overrides,
  };
}

/** Private discovery response: selecting this screen cannot create an organization. */
export function workspaceOptions(
  overrides: Partial<OrganizationJoinOptionsOutput> = {},
): OrganizationJoinOptionsOutput {
  return {
    '@id': '/api/organizations/join-options',
    '@type': 'OrganizationJoinOptions',
    emailProofRequired: false,
    invitations: [],
    organizations: [workspaceOrganization()],
    requests: [],
    ...overrides,
  };
}
