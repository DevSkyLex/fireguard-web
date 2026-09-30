/**
 * Organization role and permission transport fixtures for the e2e suite,
 * mirroring the backend contract consumed by the members and team pages.
 * Plain factory functions (like `api-fixtures.ts`), so tests override fields
 * via object spread.
 */

import { ALL_ORGANIZATION_PERMISSIONS, E2E_ORGANIZATION_ID } from './api-fixtures';

/** Custom role the team-page e2e scenarios edit and delete. */
export const E2E_ROLE_ID = 'e2e-role-inspector';

export interface OrganizationRolePermissionEntryFixture {
  readonly name: string;
  readonly description: string;
}

export interface OrganizationRoleOutputFixture {
  readonly '@id': string;
  readonly '@type': string;
  readonly id: string;
  readonly organizationId: string;
  readonly name: string;
  readonly description: string | null;
  readonly isSystem: boolean;
  readonly permissions: ReadonlyArray<OrganizationRolePermissionEntryFixture>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Wraps a bare permission name into the `{name, description}` entry the role contract carries. */
function permissionEntry(name: string): OrganizationRolePermissionEntryFixture {
  return { name, description: name };
}

/** The built-in Owner role — read-only in the permission editor. */
export function ownerOrganizationRoleOutput(
  overrides: Partial<OrganizationRoleOutputFixture> = {},
): OrganizationRoleOutputFixture {
  return {
    '@id': '/api/organizations/roles/e2e-role-owner',
    '@type': 'OrganizationRole',
    id: 'e2e-role-owner',
    organizationId: E2E_ORGANIZATION_ID,
    name: 'Owner',
    description: 'Full access to every organization resource.',
    isSystem: true,
    permissions: ALL_ORGANIZATION_PERMISSIONS.map(permissionEntry),
    createdAt: '2026-01-01T00:00:00+00:00',
    updatedAt: '2026-01-01T00:00:00+00:00',
    ...overrides,
  };
}

/** A custom, editable role — exercises the create/edit/delete flows. */
export function organizationRoleOutput(
  overrides: Partial<OrganizationRoleOutputFixture> = {},
): OrganizationRoleOutputFixture {
  return {
    '@id': `/api/organizations/roles/${E2E_ROLE_ID}`,
    '@type': 'OrganizationRole',
    id: E2E_ROLE_ID,
    organizationId: E2E_ORGANIZATION_ID,
    name: 'Inspector',
    description: 'Reads and writes inspections and equipment.',
    isSystem: false,
    permissions: ['organization.inspection.read', 'organization.inspection.write'].map(
      permissionEntry,
    ),
    createdAt: '2026-02-01T00:00:00+00:00',
    updatedAt: '2026-02-01T00:00:00+00:00',
    ...overrides,
  };
}

export interface OrganizationPermissionOutputFixture {
  readonly '@id': string;
  readonly '@type': string;
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
}

/** The full permission catalog, matching `ALL_ORGANIZATION_PERMISSIONS`. */
export const E2E_PERMISSION_CATALOG: ReadonlyArray<OrganizationPermissionOutputFixture> =
  ALL_ORGANIZATION_PERMISSIONS.map((name: string, index: number) => ({
    '@id': `/api/organizations/permissions/${index}`,
    '@type': 'OrganizationPermission',
    id: `e2e-permission-${index}`,
    name,
    description: null,
  }));
