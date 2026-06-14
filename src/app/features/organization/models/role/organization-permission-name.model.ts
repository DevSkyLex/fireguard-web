/**
 * Constant ORGANIZATION_PERMISSION
 *
 * @description
 * Canonical organization-scoped permission names exposed by the frontend.
 *
 * A const object is preferred over a TypeScript enum here so consumers get
 * autocomplete and strict typing without introducing extra runtime enum code.
 *
 * @since 1.0.0
 */
export const ORGANIZATION_PERMISSION = {
  DASHBOARD_READ: 'organization.dashboard.read',
  MEMBERS_READ: 'organization.members.read',
  MEMBERS_MANAGE: 'organization.members.manage',
  ROLES_READ: 'organization.roles.read',
  ROLES_MANAGE: 'organization.roles.manage',
  FACILITIES_READ: 'organization.facilities.read',
  FACILITIES_WRITE: 'organization.facilities.write',
  EQUIPMENT_READ: 'organization.equipment.read',
  EQUIPMENT_WRITE: 'organization.equipment.write',
  INSPECTION_READ: 'organization.inspection.read',
  INSPECTION_WRITE: 'organization.inspection.write',
  /** Read access to mission pages and mission-linked resources. */
  MISSIONS_READ: 'organization.missions.read',
  /** Write access to mission entities during preparation phase. */
  MISSIONS_WRITE: 'organization.missions.write',
  MISSIONS_PLAN: 'organization.missions.plan',
  MISSIONS_EXECUTE: 'organization.missions.execute',
  MISSIONS_REVIEW: 'organization.missions.review',
  /** Permission required to trigger mission publication. */
  MISSIONS_PUBLISH: 'organization.missions.publish',
  LEGAL_PROFILE_WRITE: 'organization.legal_profile.write',
  ALL: 'organization.*',
} as const;

/**
 * Type OrganizationPermissionName
 *
 * @description
 * Union of all known organization-scoped permission names.
 */
export type OrganizationPermissionName =
  (typeof ORGANIZATION_PERMISSION)[keyof typeof ORGANIZATION_PERMISSION];

/**
 * Constant ORGANIZATION_PERMISSION_NAMES
 *
 * @description
 * Flat list of all known organization-scoped permission names.
 */
export const ORGANIZATION_PERMISSION_NAMES: ReadonlyArray<OrganizationPermissionName> =
  Object.values(ORGANIZATION_PERMISSION);
