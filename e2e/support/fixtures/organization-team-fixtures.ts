/**
 * Organization team transport fixtures: members, pending invitations, roles,
 * and the assignable permission catalog. Shapes mirror `OrganizationMemberOutput`
 * / `OrganizationInvitationOutput` / `OrganizationRoleOutput` /
 * `OrganizationPermissionOutput` (`src/app/features/organization/models`) —
 * loose Hydra-style records keyed by backend-defined field names, not strict
 * DTOs.
 *
 * Plain factory functions (like `api-fixtures.ts`) so specs override fields
 * via object spread. Permission names follow the real backend
 * `OrganizationPermissionCatalog` convention (`organization.<resource>.<action>`,
 * `fireguard-sso-api/src/Organization/Domain/Catalog/OrganizationPermissionCatalog.php`)
 * because `OrganizationTeamPage` builds its permission matrix from the segment
 * before/after a permission name's last dot — a two-segment name would still
 * render, but this keeps the fixture byte-for-byte with the real contract.
 */

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

function organizationMemberOutput(
  overrides: Partial<OrganizationMemberOutputFixture> = {},
): OrganizationMemberOutputFixture {
  return {
    '@id': '/api/organizations/e2e-org-1/members/e2e-member-1',
    '@type': 'OrganizationMemberOutput',
    id: 'e2e-member-1',
    organizationId: 'e2e-org-1',
    userId: 'e2e-user-1',
    email: 'amelie.rousseau@fireguard.test',
    firstName: 'Amelie',
    lastName: 'Rousseau',
    avatarUrl: null,
    isActive: true,
    joinedAt: '2026-01-05T09:00:00+00:00',
    roleIds: ['e2e-role-owner'],
    roleNames: ['Owner'],
    ...overrides,
  };
}

export interface OrganizationInvitationOutputFixture {
  readonly '@id': string;
  readonly '@type': string;
  readonly id: string;
  readonly organizationId: string;
  readonly email: string;
  readonly status: string;
  readonly invitedByUserId: string;
  readonly invitedByDisplayName?: string | null;
  readonly acceptedByUserId: string | null;
  readonly revokedByUserId: string | null;
  readonly expiresAt: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly roleIds: ReadonlyArray<string>;
}

function organizationInvitationOutput(
  overrides: Partial<OrganizationInvitationOutputFixture> = {},
): OrganizationInvitationOutputFixture {
  return {
    '@id': '/api/organizations/e2e-org-1/invitations/e2e-invitation-1',
    '@type': 'OrganizationInvitationOutput',
    id: 'e2e-invitation-1',
    organizationId: 'e2e-org-1',
    email: 'guillaume.petit@fireguard.test',
    status: 'pending',
    invitedByUserId: 'e2e-user-1',
    invitedByDisplayName: 'Amelie Rousseau',
    acceptedByUserId: null,
    revokedByUserId: null,
    expiresAt: '2026-08-11T09:00:00+00:00',
    createdAt: '2026-07-28T10:00:00+00:00',
    updatedAt: '2026-07-28T10:00:00+00:00',
    roleIds: ['e2e-role-field-agent'],
    ...overrides,
  };
}

export interface OrganizationRoleOutputFixture {
  readonly '@id': string;
  readonly '@type': string;
  readonly id: string;
  readonly organizationId: string;
  readonly name: string;
  readonly description: string | null;
  readonly isSystem: boolean;
  readonly permissions: ReadonlyArray<string>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

function organizationRoleOutput(
  overrides: Partial<OrganizationRoleOutputFixture> = {},
): OrganizationRoleOutputFixture {
  return {
    '@id': '/api/organizations/e2e-org-1/roles/e2e-role-owner',
    '@type': 'OrganizationRoleOutput',
    id: 'e2e-role-owner',
    organizationId: 'e2e-org-1',
    name: 'Owner',
    description: 'Full access to every organization resource.',
    isSystem: true,
    permissions: [],
    createdAt: '2026-01-01T00:00:00+00:00',
    updatedAt: '2026-01-01T00:00:00+00:00',
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

/**
 * A representative subset (17 of the backend's ~30) of
 * `OrganizationPermissionCatalog::definitions()`, spanning nine resources
 * (dashboard, settings, members, roles, facilities, equipment, inspection,
 * interventions, messaging) with a `read`/`write`/`manage` action spread —
 * enough for `OrganizationTeamPage`'s matrix to render several rows and
 * columns without reproducing the entire backend catalog.
 */
const TEAM_PERMISSION_DEFINITIONS: ReadonlyArray<{
  readonly name: string;
  readonly description: string;
}> = [
  {
    name: 'organization.dashboard.read',
    description: 'View organization dashboard analytics and KPIs',
  },
  {
    name: 'organization.settings.write',
    description: 'Manage organization settings (general, notifications, regional)',
  },
  { name: 'organization.members.read', description: 'View organization members' },
  {
    name: 'organization.members.manage',
    description: 'Manage organization members (add, invite, revoke)',
  },
  { name: 'organization.roles.read', description: 'View organization roles' },
  {
    name: 'organization.roles.manage',
    description: 'Manage organization roles (create, update, assign)',
  },
  { name: 'organization.facilities.read', description: 'View organization facilities' },
  {
    name: 'organization.facilities.write',
    description: 'Manage organization facilities (create, update, archive, move, attachments)',
  },
  {
    name: 'organization.equipment.read',
    description: 'View organization equipment and equipment dashboard statistics',
  },
  {
    name: 'organization.equipment.write',
    description: 'Manage organization equipment, assignments, lifecycle, tags, and attachments',
  },
  {
    name: 'organization.inspection.read',
    description:
      'View organization inspections, checklists, non-conformities, and inspection dashboard statistics',
  },
  {
    name: 'organization.inspection.write',
    description:
      'Manage organization inspections, checklists, non-conformities, and attachments/photos',
  },
  {
    name: 'organization.interventions.read',
    description: 'View organization field interventions, validation issues, and attachments',
  },
  {
    name: 'organization.interventions.write',
    description: 'Create and update organization field interventions',
  },
  {
    name: 'organization.messaging.read',
    description: 'View organization conversations and messages',
  },
  {
    name: 'organization.messaging.write',
    description: 'Post, edit, and delete own messages in organization conversations',
  },
  {
    name: 'organization.messaging.manage',
    description: "Archive conversations and moderate (delete) other members' messages",
  },
];

/** Every permission name in {@link TEAM_PERMISSION_DEFINITIONS}, for role fixtures to subset from. */
export const ALL_TEAM_PERMISSION_NAMES: ReadonlyArray<string> = TEAM_PERMISSION_DEFINITIONS.map(
  (definition) => definition.name,
);

const MANAGER_PERMISSIONS: ReadonlyArray<string> = [
  'organization.dashboard.read',
  'organization.members.read',
  'organization.members.manage',
  'organization.roles.read',
  'organization.facilities.read',
  'organization.facilities.write',
  'organization.equipment.read',
  'organization.equipment.write',
  'organization.inspection.read',
  'organization.inspection.write',
  'organization.interventions.read',
  'organization.interventions.write',
  'organization.messaging.read',
  'organization.messaging.write',
];

const FIELD_AGENT_PERMISSIONS: ReadonlyArray<string> = [
  'organization.dashboard.read',
  'organization.facilities.read',
  'organization.equipment.read',
  'organization.equipment.write',
  'organization.inspection.read',
  'organization.inspection.write',
  'organization.interventions.read',
  'organization.interventions.write',
  'organization.messaging.read',
];

const VIEWER_PERMISSIONS: ReadonlyArray<string> = [
  'organization.dashboard.read',
  'organization.members.read',
  'organization.roles.read',
  'organization.facilities.read',
  'organization.equipment.read',
  'organization.inspection.read',
  'organization.interventions.read',
  'organization.messaging.read',
];

/**
 * The full assignable permission catalog (`GET .../permissions`) backing the
 * roles matrix — {@link TEAM_PERMISSION_DEFINITIONS} wrapped as API resources.
 */
export function organizationPermissionCatalog(): ReadonlyArray<OrganizationPermissionOutputFixture> {
  return TEAM_PERMISSION_DEFINITIONS.map((definition, index) => ({
    '@id': `/api/organizations/e2e-org-1/permissions/e2e-permission-${index}`,
    '@type': 'OrganizationPermissionOutput',
    id: `e2e-permission-${index}`,
    name: definition.name,
    description: definition.description,
  }));
}

/**
 * Four roles with distinct permission sets — a non-deletable system role
 * (Owner, every permission) plus three custom roles of shrinking scope
 * (Manager, Field Agent, Viewer) — so the role list shows varied permission
 * counts and the matrix looks different per selected role.
 */
export function organizationTeamRoles(): ReadonlyArray<OrganizationRoleOutputFixture> {
  return [
    organizationRoleOutput({ permissions: ALL_TEAM_PERMISSION_NAMES }),
    organizationRoleOutput({
      '@id': '/api/organizations/e2e-org-1/roles/e2e-role-manager',
      id: 'e2e-role-manager',
      name: 'Manager',
      description: 'Day-to-day operational management, excluding role and billing control.',
      isSystem: false,
      permissions: MANAGER_PERMISSIONS,
    }),
    organizationRoleOutput({
      '@id': '/api/organizations/e2e-org-1/roles/e2e-role-field-agent',
      id: 'e2e-role-field-agent',
      name: 'Field Agent',
      description: 'Executes interventions and manages assigned equipment on site.',
      isSystem: false,
      permissions: FIELD_AGENT_PERMISSIONS,
    }),
    organizationRoleOutput({
      '@id': '/api/organizations/e2e-org-1/roles/e2e-role-viewer',
      id: 'e2e-role-viewer',
      name: 'Viewer',
      description: 'Read-only access across the organization.',
      isSystem: false,
      permissions: VIEWER_PERMISSIONS,
    }),
  ];
}

/**
 * Six members with varied join dates and one (Claire Lefèvre) holding two
 * roles at once — the `roleIds`/`roleNames` plural the members page's role
 * chips and assignment drawer both depend on.
 */
export function organizationTeamMembers(): ReadonlyArray<OrganizationMemberOutputFixture> {
  return [
    organizationMemberOutput(),
    organizationMemberOutput({
      '@id': '/api/organizations/e2e-org-1/members/e2e-member-2',
      id: 'e2e-member-2',
      email: 'bruno.lemaire@fireguard.test',
      firstName: 'Bruno',
      lastName: 'Lemaire',
      joinedAt: '2026-02-12T10:30:00+00:00',
      roleIds: ['e2e-role-manager'],
      roleNames: ['Manager'],
    }),
    organizationMemberOutput({
      '@id': '/api/organizations/e2e-org-1/members/e2e-member-3',
      id: 'e2e-member-3',
      email: 'claire.lefevre@fireguard.test',
      firstName: 'Claire',
      lastName: 'Lefèvre',
      joinedAt: '2026-03-01T08:00:00+00:00',
      roleIds: ['e2e-role-manager', 'e2e-role-field-agent'],
      roleNames: ['Manager', 'Field Agent'],
    }),
    organizationMemberOutput({
      '@id': '/api/organizations/e2e-org-1/members/e2e-member-4',
      id: 'e2e-member-4',
      email: 'david.kovacs@fireguard.test',
      firstName: 'David',
      lastName: 'Kovacs',
      joinedAt: '2026-04-18T14:15:00+00:00',
      roleIds: ['e2e-role-field-agent'],
      roleNames: ['Field Agent'],
    }),
    organizationMemberOutput({
      '@id': '/api/organizations/e2e-org-1/members/e2e-member-5',
      id: 'e2e-member-5',
      email: 'elena.marchetti@fireguard.test',
      firstName: 'Elena',
      lastName: 'Marchetti',
      isActive: false,
      joinedAt: '2026-05-22T11:00:00+00:00',
      roleIds: ['e2e-role-viewer'],
      roleNames: ['Viewer'],
    }),
    organizationMemberOutput({
      '@id': '/api/organizations/e2e-org-1/members/e2e-member-6',
      id: 'e2e-member-6',
      email: 'farid.haddad@fireguard.test',
      firstName: 'Farid',
      lastName: 'Haddad',
      joinedAt: '2026-06-30T16:45:00+00:00',
      roleIds: ['e2e-role-field-agent'],
      roleNames: ['Field Agent'],
    }),
  ];
}

/** Two pending invitations awaiting acceptance, each pre-assigned a role. */
export function organizationTeamInvitations(): ReadonlyArray<OrganizationInvitationOutputFixture> {
  return [
    organizationInvitationOutput(),
    organizationInvitationOutput({
      '@id': '/api/organizations/e2e-org-1/invitations/e2e-invitation-2',
      id: 'e2e-invitation-2',
      email: 'helene.morel@fireguard.test',
      expiresAt: '2026-08-14T10:00:00+00:00',
      createdAt: '2026-08-01T09:30:00+00:00',
      updatedAt: '2026-08-01T09:30:00+00:00',
      roleIds: ['e2e-role-manager'],
    }),
  ];
}
